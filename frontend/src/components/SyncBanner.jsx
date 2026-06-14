import { useEffect, useState } from "react";
import { useOffline } from "../offline/OfflineContext";
import * as db from "../offline/db";

export default function SyncBanner() {
  const { online, pending, failed, syncing, sync, clearFailed } = useOffline();
  const [failedItems, setFailedItems] = useState([]);

  useEffect(() => {
    db.outboxAll().then((all) =>
      setFailedItems(all.filter((e) => e.status === "failed"))
    );
  }, [failed]);

  if (failedItems.length > 0) {
    return (
      <div
        className="card"
        style={{ borderColor: "var(--red)", background: "var(--red-soft)", marginBottom: 18 }}
      >
        <div className="between">
          <div>
            <b>Konflikt synchronizacji</b>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              {failedItems.length}{" "}
              {failedItems.length === 1 ? "zmiana offline została odrzucona" : "zmiany offline zostały odrzucone"}{" "}
              przez serwer (np. miejsce zostało w międzyczasie zajęte).
            </p>
            <ul className="muted" style={{ margin: "8px 0 0", fontSize: "0.85rem" }}>
              {failedItems.slice(0, 3).map((f) => (
                <li key={f.localId}>
                  {f.type === "create" ? "Rezerwacja" : f.type} — {f.error}
                </li>
              ))}
            </ul>
          </div>
          <button className="btn-danger btn-sm" onClick={clearFailed}>
            Odrzuć
          </button>
        </div>
      </div>
    );
  }

  if (!online && pending > 0) {
    return (
      <div className="card" style={{ borderColor: "var(--amber)", background: "var(--amber-soft)", marginBottom: 18 }}>
        Pracujesz offline — {pending} zmian(y) zostaną zsynchronizowane po
        odzyskaniu połączenia.
      </div>
    );
  }

  if (online && pending > 0) {
    return (
      <div className="card" style={{ borderColor: "var(--blue)", background: "var(--blue-soft)", marginBottom: 18 }}>
        <div className="between">
          <span>{pending} zmian(y) oczekują na synchronizację.</span>
          <button className="btn-sm" disabled={syncing} onClick={sync}>
            {syncing ? "Synchronizacja…" : "Synchronizuj teraz"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
