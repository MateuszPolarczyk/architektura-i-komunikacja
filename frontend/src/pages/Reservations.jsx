import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  cancelReservation,
  deleteReservation,
  extractError,
  getReservations,
  updateReservation,
} from "../offline/store";
import { useOffline } from "../offline/OfflineContext";
import SyncBanner from "../components/SyncBanner";

function fmt(iso) {
  return new Date(iso).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" });
}
function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function Reservations() {
  const { version } = useOffline();
  const [scope, setScope] = useState("active");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("network");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { items, source } = await getReservations(scope);
      setItems(items.sort((a, b) => new Date(b.start_time) - new Date(a.start_time)));
      setSource(source);
    } catch {
      setError("Nie udało się pobrać rezerwacji.");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    load();
  }, [load, version]);

  async function cancel(id) {
    if (!window.confirm("Anulować tę rezerwację?")) return;
    try {
      await cancelReservation(id);
      await load();
    } catch (err) {
      alert(extractError(err));
    }
  }

  async function remove(id) {
    if (!window.confirm("Usunąć tę rezerwację na stałe?")) return;
    try {
      await deleteReservation(id);
      await load();
    } catch (err) {
      alert(extractError(err));
    }
  }

  function openEdit(r) {
    setEditing(r);
    setStart(toLocalInput(r.start_time));
    setEnd(toLocalInput(r.end_time));
    setError("");
  }

  async function saveEdit(e) {
    e.preventDefault();
    try {
      await updateReservation(editing.id, {
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
      });
      setEditing(null);
      await load();
    } catch (err) {
      setError(extractError(err, "Nie udało się zmienić terminu."));
    }
  }

  return (
    <div>
      <h1 className="page-title">Moje rezerwacje</h1>
      <p className="page-sub">
        Zarządzaj swoimi rezerwacjami
        {source === "cache" && " · dane offline (pamięć podręczna)"}
      </p>

      <SyncBanner />

      <div className="tabs">
        <button className={scope === "active" ? "active" : ""} onClick={() => setScope("active")}>
          Aktywne
        </button>
        <button className={scope === "history" ? "active" : ""} onClick={() => setScope("history")}>
          Historia
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <p className="muted">Ładowanie…</p>
      ) : items.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Brak rezerwacji. {scope === "active" && <Link to="/parkings">Znajdź parking →</Link>}
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Parking</th>
                <th>Miejsce</th>
                <th>Od</th>
                <th>Do</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.parking_id ? (
                      <Link to={`/parkings/${r.parking_id}`}>{r.parking_name}</Link>
                    ) : (
                      r.parking_name
                    )}
                  </td>
                  <td>{r.spot_label}</td>
                  <td>{fmt(r.start_time)}</td>
                  <td>{fmt(r.end_time)}</td>
                  <td>
                    <span className={`badge ${r.status}`}>
                      {r.status === "confirmed" ? "Potwierdzona" : "Anulowana"}
                    </span>
                    {r._pending && <span className="badge pending" style={{ marginLeft: 6 }}>offline</span>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="row" style={{ justifyContent: "flex-end" }}>
                      {r.is_active && (
                        <>
                          <button className="btn-ghost btn-sm" onClick={() => openEdit(r)}>
                            Zmień
                          </button>
                          <button className="btn-danger btn-sm" onClick={() => cancel(r.id)}>
                            Anuluj
                          </button>
                        </>
                      )}
                      <button className="btn-ghost btn-sm" onClick={() => remove(r.id)}>
                        Usuń
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="card modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Zmiana terminu — {editing.spot_label}</h2>
            <form onSubmit={saveEdit}>
              <div className="field">
                <label>Od</label>
                <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
              </div>
              <div className="field">
                <label>Do</label>
                <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />
              </div>
              {error && <div className="error">{error}</div>}
              <div className="row" style={{ justifyContent: "flex-end" }}>
                <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>
                  Anuluj
                </button>
                <button type="submit">Zapisz</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
