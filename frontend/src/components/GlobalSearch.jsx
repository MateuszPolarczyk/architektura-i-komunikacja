import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getParkings, getReservations } from "../offline/store";
import { IconSearch } from "./icons";

function fmt(iso) {
  return new Date(iso).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" });
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [parkings, setParkings] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setParkings([]);
      setReservations([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const p = await getParkings({ search: q });
        const r = await getReservations();
        const ql = q.toLowerCase();
        const matchedRes = r.items.filter(
          (x) =>
            String(x.id).includes(q) ||
            (x.parking_name || "").toLowerCase().includes(ql) ||
            (x.spot_label || "").toLowerCase().includes(ql)
        );
        setParkings(p.items.slice(0, 6));
        setReservations(matchedRes.slice(0, 6));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const hasResults = parkings.length > 0 || reservations.length > 0;

  function openParking(p) {
    setDetail({ type: "parking", data: p });
    setOpen(false);
  }
  function openReservation(r) {
    setDetail({ type: "reservation", data: r });
    setOpen(false);
  }

  return (
    <div className="search-wrap" ref={wrapRef}>
      <div className="search">
        <IconSearch width={18} height={18} />
        <input
          placeholder="Szukaj parkingu, adresu lub nr rezerwacji…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
        />
      </div>

      {open && query.trim() && (
        <div className="search-dropdown">
          {loading && !hasResults ? (
            <div className="search-empty">Szukam…</div>
          ) : !hasResults ? (
            <div className="search-empty">Brak wyników dla „{query}".</div>
          ) : (
            <>
              {parkings.length > 0 && (
                <>
                  <div className="search-group-title">Parkingi</div>
                  {parkings.map((p) => (
                    <div key={`p-${p.id}`} className="search-item" onClick={() => openParking(p)}>
                      <div className="si-main">
                        <div className="si-title">{p.name}</div>
                        <div className="si-sub">
                          {p.address}
                          {p.city ? `, ${p.city}` : ""}
                        </div>
                      </div>
                      <span className="free" style={{ whiteSpace: "nowrap", color: "var(--green)", fontWeight: 700 }}>
                        {p.available_spots}/{p.total_spots}
                      </span>
                    </div>
                  ))}
                </>
              )}
              {reservations.length > 0 && (
                <>
                  <div className="search-group-title">Rezerwacje</div>
                  {reservations.map((r) => (
                    <div key={`r-${r.id}`} className="search-item" onClick={() => openReservation(r)}>
                      <div className="si-main">
                        <div className="si-title">
                          #{r.id} · {r.parking_name}
                        </div>
                        <div className="si-sub">
                          Miejsce {r.spot_label} · {fmt(r.start_time)}
                        </div>
                      </div>
                      <span className={`badge ${r.status}`}>
                        {r.status === "confirmed" ? "Potwierdzona" : "Anulowana"}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}

      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div className="card modal" onClick={(e) => e.stopPropagation()}>
            {detail.type === "parking" ? (
              <>
                <h2 style={{ marginTop: 0 }}>{detail.data.name}</h2>
                <div className="detail-row"><span className="k">Adres</span><span className="v">{detail.data.address}</span></div>
                {detail.data.city && <div className="detail-row"><span className="k">Miasto</span><span className="v">{detail.data.city}</span></div>}
                <div className="detail-row"><span className="k">Cena</span><span className="v">{Number(detail.data.hourly_rate).toFixed(2)} zł/h</span></div>
                <div className="detail-row"><span className="k">Wolne miejsca</span><span className="v" style={{ color: "var(--green)" }}>{detail.data.available_spots} / {detail.data.total_spots}</span></div>
                <div className="row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
                  <button className="btn-ghost" onClick={() => setDetail(null)}>Zamknij</button>
                  <button onClick={() => { const id = detail.data.id; setDetail(null); setQuery(""); navigate(`/parkings/${id}`); }}>
                    Otwórz parking
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 style={{ marginTop: 0 }}>Rezerwacja #{detail.data.id}</h2>
                <div className="detail-row"><span className="k">Parking</span><span className="v">{detail.data.parking_name}</span></div>
                <div className="detail-row"><span className="k">Miejsce</span><span className="v">{detail.data.spot_label}</span></div>
                <div className="detail-row"><span className="k">Od</span><span className="v">{fmt(detail.data.start_time)}</span></div>
                <div className="detail-row"><span className="k">Do</span><span className="v">{fmt(detail.data.end_time)}</span></div>
                <div className="detail-row"><span className="k">Status</span><span className="v"><span className={`badge ${detail.data.status}`}>{detail.data.status === "confirmed" ? "Potwierdzona" : "Anulowana"}</span></span></div>
                <div className="row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
                  <button className="btn-ghost" onClick={() => setDetail(null)}>Zamknij</button>
                  <button onClick={() => { setDetail(null); setQuery(""); navigate("/reservations"); }}>
                    Moje rezerwacje
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
