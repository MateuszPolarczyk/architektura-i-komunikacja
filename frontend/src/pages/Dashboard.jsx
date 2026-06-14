import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getParkings, getReservations, getStats } from "../offline/store";
import { useOffline } from "../offline/OfflineContext";
import { useAuth } from "../auth/AuthContext";
import SyncBanner from "../components/SyncBanner";
import Weather from "../components/Weather";
import { IconBuilding, IconCar, IconPin, IconTicket } from "../components/icons";

function StatCard({ label, value, foot, icon }) {
  return (
    <div className="stat-card">
      <div className="head">
        <span className="label">{label}</span>
        <span className="icon">{icon}</span>
      </div>
      <div className="value">{value}</div>
      {foot && <div className="foot">{foot}</div>}
    </div>
  );
}

function Bar({ value, max }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  const cls = pct === 0 ? "bar full" : pct <= 25 ? "bar low" : "bar";
  return (
    <div className={cls}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

function fmt(iso) {
  return new Date(iso).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" });
}

export default function Dashboard() {
  const { user } = useAuth();
  const { version } = useOffline();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [parkings, setParkings] = useState([]);
  const [source, setSource] = useState("network");

  const load = useCallback(async () => {
    const s = await getStats();
    setStats(s.stats);
    setSource(s.source);

    const r = await getReservations();
    const sorted = [...r.items].sort(
      (a, b) => new Date(b.start_time) - new Date(a.start_time)
    );
    setRecent(sorted.slice(0, 6));

    const p = await getParkings({ ordering: "name" });
    setParkings(p.items);
  }, []);

  useEffect(() => {
    load();
  }, [load, version]);

  return (
    <div>
      <div className="dash-top">
        <div className="title">
          <h1 className="page-title">Pulpit</h1>
          <p className="page-sub" style={{ margin: 0 }}>
            Witaj, {user?.first_name || user?.email}.{" "}
            {source === "cache" && "Dane z pamięci podręcznej (offline)."}
          </p>
        </div>
        <div className="wx">
          <Weather />
        </div>
      </div>

      <SyncBanner />

      <div className="stat-grid">
        <StatCard label="Parkingi" value={stats?.parkings ?? "—"} foot="Dostępne lokalizacje" icon={<IconBuilding />} />
        <StatCard label="Wolne miejsca" value={stats?.available_spots ?? "—"} foot={stats ? `z ${stats.total_spots} łącznie` : ""} icon={<IconCar />} />
        <StatCard label="Aktywne rezerwacje" value={stats?.my_active_reservations ?? "—"} foot="Twoje bieżące" icon={<IconTicket />} />
        <StatCard label="Wszystkie rezerwacje" value={stats?.my_total_reservations ?? "—"} foot="Historia konta" icon={<IconPin />} />
      </div>

      <div className="section-head">
        <h2>Ostatnie rezerwacje</h2>
        <Link to="/reservations">Wszystkie →</Link>
      </div>
      {recent.length === 0 ? (
        <div className="card" style={{ marginBottom: 22 }}>
          <p className="muted" style={{ margin: 0 }}>
            Brak rezerwacji. <Link to="/parkings">Znajdź parking →</Link>
          </p>
        </div>
      ) : (
        <div className="table-wrap" style={{ marginBottom: 22 }}>
          <table>
            <thead>
              <tr>
                <th>Parking</th>
                <th>Miejsce</th>
                <th>Termin</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
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
                  <td>
                    <span className={`badge ${r.status}`}>
                      {r.status === "confirmed" ? "Potwierdzona" : "Anulowana"}
                    </span>
                    {r._pending && <span className="badge pending" style={{ marginLeft: 6 }}>offline</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="section-head">
        <h2>Parkingi</h2>
        <Link to="/parkings">Pokaż wszystkie →</Link>
      </div>
      {parkings.length === 0 ? (
        <p className="muted">Brak parkingów.</p>
      ) : (
        <div className="grid">
          {parkings.map((p) => (
            <div key={p.id} className="card mini-parking">
              <div className="between">
                <span className="name">{p.name}</span>
                <span className="free">
                  <b style={{ color: "var(--green)" }}>{p.available_spots}</b> / {p.total_spots}
                </span>
              </div>
              <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                {p.address}
                {p.city ? `, ${p.city}` : ""}
              </p>
              <Bar value={p.available_spots} max={p.total_spots} />
              <div className="between">
                <span className="muted" style={{ fontSize: "0.85rem" }}>
                  {Number(p.hourly_rate).toFixed(2)} zł/h
                </span>
                <button className="btn-sm" onClick={() => navigate(`/parkings/${p.id}`)}>
                  Rezerwuj
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
