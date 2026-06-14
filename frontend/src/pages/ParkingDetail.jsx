import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createReservation, extractError, getParking } from "../offline/store";
import { useOffline } from "../offline/OfflineContext";
import SyncBanner from "../components/SyncBanner";
import ParkingMap from "../components/ParkingMap";

const TYPE_LABEL = { standard: "Standard", electric: "EV", disabled: "Niepełnospr." };

function defaultWindow() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return { start, end };
}

function toLocalInput(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function ParkingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { version } = useOffline();
  const [parking, setParking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("network");
  const [selected, setSelected] = useState(null);

  const win = defaultWindow();
  const [start, setStart] = useState(toLocalInput(win.start));
  const [end, setEnd] = useState(toLocalInput(win.end));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState("map");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { item, source } = await getParking(id);
      setParking(item);
      setSource(source);
    } catch {
      setError("Nie udało się pobrać parkingu (brak danych offline).");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load, version]);

  function openReserve(spot) {
    if (spot.status === "occupied" || spot.status === "inactive") return;
    setSelected(spot);
    setError("");
    setSuccess("");
  }

  async function submitReservation(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { queued } = await createReservation(
        {
          spot: selected.id,
          start_time: new Date(start).toISOString(),
          end_time: new Date(end).toISOString(),
        },
        {
          spot_label: selected.label,
          parking_id: parking.id,
          parking_name: parking.name,
        }
      );
      setSuccess(
        queued
          ? `Rezerwacja miejsca ${selected.label} zapisana offline — zostanie wysłana po połączeniu.`
          : `Zarezerwowano miejsce ${selected.label}.`
      );
      setSelected(null);
      await load();
    } catch (err) {
      setError(extractError(err, "Rezerwacja nie powiodła się."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Ładowanie…</p>;
  if (!parking) return <div className="error">{error}</div>;

  return (
    <div>
      <p style={{ marginTop: 0 }}>
        <Link to="/parkings">← Wszystkie parkingi</Link>
      </p>

      <SyncBanner />

      <div style={{ textAlign: "center" }}>
        <h1 className="page-title" style={{ marginBottom: 4 }}>{parking.name}</h1>

        <div className="info-badges">
          <div className="info-badge price">
            <div className="lbl">Cena</div>
            <div className="val">{Number(parking.hourly_rate).toFixed(2)} zł/h</div>
          </div>
          <div className="info-badge free">
            <div className="lbl">Wolne miejsca</div>
            <div className="val">{parking.available_spots} / {parking.total_spots}</div>
          </div>
        </div>

        <p className="muted" style={{ margin: "0 0 4px" }}>
          {parking.address}
          {parking.city ? `, ${parking.city}` : ""}
          {source === "cache" && " · dane offline"}
        </p>
        {parking.description && (
          <p className="muted" style={{ margin: 0 }}>{parking.description}</p>
        )}
      </div>

      <div className="between" style={{ marginBottom: 4 }}>
        <div className="legend" style={{ margin: 0 }}>
          <span><span className="dot" style={{ background: "var(--green)" }} />Wolne</span>
          <span><span className="dot" style={{ background: "var(--amber)" }} />Zarezerwowane</span>
          <span><span className="dot" style={{ background: "var(--red)" }} />Zajęte</span>
          <span><span className="dot" style={{ background: "var(--gray)" }} />Niedostępne</span>
        </div>
        <div className="tabs" style={{ margin: 0 }}>
          <button className={view === "map" ? "active" : ""} onClick={() => setView("map")}>
            Mapa
          </button>
          <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>
            Lista
          </button>
        </div>
      </div>

      {success && <div className="success">{success}</div>}

      {view === "map" ? (
        <>
          <ParkingMap
            spots={parking.spots || []}
            selectedId={selected?.id}
            onSelect={openReserve}
          />
          <p className="muted" style={{ fontSize: "0.82rem", marginTop: 6 }}>
            Kliknij wolne (zielone) miejsce na mapie, aby je zarezerwować. ♿ — miejsce dla
            niepełnosprawnych, ⚡ — ładowarka EV.
          </p>
        </>
      ) : (
        <div className="spots-grid">
          {(parking.spots || []).map((spot) => (
            <div
              key={spot.id}
              className={`spot ${spot.status} ${selected?.id === spot.id ? "selected" : ""}`}
              onClick={() => openReserve(spot)}
              title={`Status: ${spot.status}`}
            >
              <div className="label">{spot.label}</div>
              <div className="type">{TYPE_LABEL[spot.spot_type]}</div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="card modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Rezerwacja — {selected.label}</h2>
            <form onSubmit={submitReservation}>
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
                <button type="button" className="btn-ghost" onClick={() => setSelected(null)}>
                  Anuluj
                </button>
                <button type="submit" disabled={busy}>
                  {busy ? "Rezerwowanie…" : "Zarezerwuj"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <p style={{ marginTop: 24 }}>
        <button className="btn-ghost" onClick={() => navigate("/reservations")}>
          Moje rezerwacje →
        </button>
      </p>
    </div>
  );
}
