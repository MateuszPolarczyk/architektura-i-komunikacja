import api, { extractError } from "../api/client";
import * as db from "./db";

const isNetworkError = (e) => !e?.response;

function filterParkingsLocally(list, params = {}) {
  let out = [...list];
  if (params.search) {
    const q = params.search.toLowerCase();
    out = out.filter((p) =>
      [p.name, p.address, p.city].some((v) => (v || "").toLowerCase().includes(q))
    );
  }
  if (params.min_available) {
    const n = Number(params.min_available);
    out = out.filter((p) => (p.available_spots ?? 0) >= n);
  }
  const key = (params.ordering || "name").replace("-", "");
  const dir = params.ordering?.startsWith("-") ? -1 : 1;
  out.sort((a, b) => (a[key] > b[key] ? dir : a[key] < b[key] ? -dir : 0));
  return out;
}

export async function getParkings(params) {
  try {
    const { data } = await api.get("/parkings/", { params });
    const list = data.results ?? data;
    await db.cachePut("parkings", list);
    return { items: list, source: "network" };
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    const cached = await db.cacheGetAll("parkings");
    return { items: filterParkingsLocally(cached, params), source: "cache" };
  }
}

export async function getParking(id) {
  const numId = Number(id);
  try {
    const { data } = await api.get(`/parkings/${id}/`);
    await db.cachePut("parkings", [data]);
    return { item: data, source: "network" };
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    const cached = await db.cacheGet("parkings", numId);
    if (cached) return { item: cached, source: "cache" };
    throw e;
  }
}

function filterScope(list, scope) {
  const now = Date.now();
  if (scope === "active") {
    return list.filter(
      (r) => r.status === "confirmed" && new Date(r.end_time).getTime() > now
    );
  }
  if (scope === "history") {
    return list.filter(
      (r) => r.status === "cancelled" || new Date(r.end_time).getTime() <= now
    );
  }
  return list;
}

export async function getReservations(scope) {
  try {
    const { data } = await api.get("/reservations/", { params: { scope } });
    const list = data.results ?? data;
    await db.cachePut("reservations", list);

    const cached = await db.cacheGetAll("reservations");
    const pendingLocal = cached.filter((r) => r._pending && r.id < 0);
    return { items: filterScope([...list, ...pendingLocal], scope), source: "network" };
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    const cached = await db.cacheGetAll("reservations");
    return { items: filterScope(cached, scope), source: "cache" };
  }
}

export async function getStats() {
  try {
    const { data } = await api.get("/dashboard/stats/");
    await db.metaSet("stats", data);
    return { stats: data, source: "network" };
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    const cached = await db.metaGet("stats");
    return { stats: cached || null, source: "cache" };
  }
}

export async function createReservation(payload, meta = {}) {
  if (navigator.onLine) {
    try {
      const { data } = await api.post("/reservations/", payload);
      await db.cachePut("reservations", [data]);
      return { item: data, queued: false };
    } catch (e) {
      if (!isNetworkError(e)) throw e;
    }
  }

  const tempId = -Date.now();
  const optimistic = {
    id: tempId,
    spot: payload.spot,
    spot_label: meta.spot_label || "—",
    parking_id: meta.parking_id ?? null,
    parking_name: meta.parking_name || "Rezerwacja offline",
    start_time: payload.start_time,
    end_time: payload.end_time,
    status: "confirmed",
    is_active: true,
    created_at: new Date().toISOString(),
    _pending: true,
  };
  await db.cachePut("reservations", [optimistic]);
  await db.outboxAdd({ type: "create", payload, tempId });
  return { item: optimistic, queued: true };
}

export async function cancelReservation(id) {
  if (navigator.onLine && id > 0) {
    try {
      const { data } = await api.post(`/reservations/${id}/cancel/`);
      await db.cachePut("reservations", [data]);
      return { queued: false };
    } catch (e) {
      if (!isNetworkError(e)) throw e;
    }
  }
  const cached = await db.cacheGet("reservations", id);
  if (cached) {
    await db.cachePut("reservations", [
      { ...cached, status: "cancelled", is_active: false, _pending: true },
    ]);
  }
  if (id > 0) await db.outboxAdd({ type: "cancel", id });
  return { queued: true };
}

export async function updateReservation(id, payload) {
  if (navigator.onLine && id > 0) {
    try {
      const { data } = await api.patch(`/reservations/${id}/`, payload);
      await db.cachePut("reservations", [data]);
      return { item: data, queued: false };
    } catch (e) {
      if (!isNetworkError(e)) throw e;
    }
  }
  const cached = await db.cacheGet("reservations", id);
  const merged = { ...cached, ...payload, _pending: true };
  await db.cachePut("reservations", [merged]);
  if (id > 0) await db.outboxAdd({ type: "update", id, payload });
  return { item: merged, queued: true };
}

export async function deleteReservation(id) {
  if (navigator.onLine && id > 0) {
    try {
      await api.delete(`/reservations/${id}/`);
      await db.cacheDelete("reservations", id);
      return { queued: false };
    } catch (e) {
      if (!isNetworkError(e)) throw e;
    }
  }
  await db.cacheDelete("reservations", id);
  if (id < 0) {

    const all = await db.outboxAll();
    const entry = all.find((x) => x.tempId === id);
    if (entry) await db.outboxRemove(entry.localId);
  } else {
    await db.outboxAdd({ type: "delete", id });
  }
  return { queued: true };
}

export { extractError };
