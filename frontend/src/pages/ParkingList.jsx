import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { parkingIcon } from "../components/leafletIcon";
import { getParkings } from "../offline/store";
import { useOffline } from "../offline/OfflineContext";
import SyncBanner from "../components/SyncBanner";

export default function ParkingList() {
  const navigate = useNavigate();
  const { version } = useOffline();
  const [parkings, setParkings] = useState([]);
  const [search, setSearch] = useState("");
  const [minAvailable, setMinAvailable] = useState("");
  const [ordering, setOrdering] = useState("name");
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("network");
  const [error, setError] = useState("");
  const didLoad = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { ordering };
      if (search) params.search = search;
      if (minAvailable) params.min_available = minAvailable;
      const { items, source } = await getParkings(params);
      setParkings(items);
      setSource(source);
    } catch {
      setError("Nie udało się pobrać listy parkingów.");
    } finally {
      setLoading(false);
      didLoad.current = true;
    }
  }, [search, minAvailable, ordering]);

  useEffect(() => {
    const t = setTimeout(load, didLoad.current ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, version]);

  const center = useMemo(() => {
    const withCoords = parkings.filter((p) => p.latitude && p.longitude);
    if (!withCoords.length) return [53.766, 12.575];
    const lat = withCoords.reduce((s, p) => s + Number(p.latitude), 0) / withCoords.length;
    const lng = withCoords.reduce((s, p) => s + Number(p.longitude), 0) / withCoords.length;
    return [lat, lng];
  }, [parkings]);

  return (
    <div>
      <h1 className="page-title">Parkingi</h1>
      <p className="page-sub">
        {parkings.length} lokalizacji
        {source === "cache" && " · dane offline (pamięć podręczna)"}
      </p>

      <SyncBanner />

      <div className="toolbar">
        <div className="field">
          <label>Szukaj (nazwa / adres / miasto)</label>
          <input value={search} placeholder="np. Rynek" onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="field">
          <label>Min. wolnych miejsc</label>
          <input
            type="number"
            min="0"
            value={minAvailable}
            placeholder="0"
            onChange={(e) => setMinAvailable(e.target.value)}
            style={{ width: 130 }}
          />
        </div>
        <div className="field">
          <label>Sortuj</label>
          <select value={ordering} onChange={(e) => setOrdering(e.target.value)}>
            <option value="name">Nazwa (A-Z)</option>
            <option value="hourly_rate">Cena rosnąco</option>
            <option value="-hourly_rate">Cena malejąco</option>
          </select>
        </div>
      </div>

      <MapContainer center={center} zoom={11} key={`${center[0]}-${parkings.length}`}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {parkings
          .filter((p) => p.latitude && p.longitude)
          .map((p) => (
            <Marker key={p.id} position={[Number(p.latitude), Number(p.longitude)]} icon={parkingIcon}>
              <Popup>
                <strong>{p.name}</strong>
                <br />
                {p.address}
                <br />
                Wolne: {p.available_spots} / {p.total_spots}
                <br />
                <Link to={`/parkings/${p.id}`}>Zobacz miejsca →</Link>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {error && <div className="error">{error}</div>}
      {loading ? (
        <p className="muted">Ładowanie…</p>
      ) : parkings.length === 0 ? (
        <p className="muted">Brak parkingów spełniających kryteria.</p>
      ) : (
        <div className="grid">
          {parkings.map((p) => (
            <div
              key={p.id}
              className="card parking-card"
              onClick={() => navigate(`/parkings/${p.id}`)}
            >
              <h3>{p.name}</h3>
              <p className="addr">
                {p.address}
                {p.city ? `, ${p.city}` : ""}
              </p>
              <div className="stats">
                <span>
                  Wolne: <b>{p.available_spots}</b> / {p.total_spots}
                </span>
                <span className="muted">{Number(p.hourly_rate).toFixed(2)} zł/h</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
