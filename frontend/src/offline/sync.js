import api, { extractError } from "../api/client";
import * as db from "./db";

export async function flushOutbox() {
  const entries = (await db.outboxAll()).filter((e) => e.status === "pending");
  let synced = 0;
  let failed = 0;

  for (const entry of entries) {
    try {
      if (entry.type === "create") {
        const { data } = await api.post("/reservations/", entry.payload);
        if (entry.tempId) await db.cacheDelete("reservations", entry.tempId);
        await db.cachePut("reservations", [data]);
      } else if (entry.type === "cancel") {
        const { data } = await api.post(`/reservations/${entry.id}/cancel/`);
        await db.cachePut("reservations", [data]);
      } else if (entry.type === "update") {
        const { data } = await api.patch(`/reservations/${entry.id}/`, entry.payload);
        await db.cachePut("reservations", [data]);
      } else if (entry.type === "delete") {
        await api.delete(`/reservations/${entry.id}/`);
        await db.cacheDelete("reservations", entry.id);
      }
      await db.outboxRemove(entry.localId);
      synced++;
    } catch (e) {
      if (e.response) {

        await db.outboxUpdate(entry.localId, {
          status: "failed",
          error: extractError(e),
        });
        if (entry.type === "create" && entry.tempId) {
          await db.cacheDelete("reservations", entry.tempId);
        }
        failed++;
      } else {

        break;
      }
    }
  }

  await db.metaSet("lastSync", new Date().toISOString());
  return { synced, failed };
}

export async function discardFailed() {
  const entries = await db.outboxAll();
  for (const e of entries) {
    if (e.status === "failed") await db.outboxRemove(e.localId);
  }
}
