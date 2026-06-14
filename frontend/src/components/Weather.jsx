import { useEffect, useState } from "react";

const WMO = {
  0: ["☀️", "Bezchmurnie"],
  1: ["🌤️", "Przeważnie słonecznie"],
  2: ["⛅", "Częściowe zachmurzenie"],
  3: ["☁️", "Pochmurno"],
  45: ["🌫️", "Mgła"],
  48: ["🌫️", "Szadź"],
  51: ["🌦️", "Mżawka"],
  61: ["🌧️", "Deszcz"],
  63: ["🌧️", "Deszcz"],
  65: ["🌧️", "Silny deszcz"],
  71: ["🌨️", "Śnieg"],
  80: ["🌦️", "Przelotne opady"],
  95: ["⛈️", "Burza"],
};

export default function Weather({ lat = 51.107, lon = 17.038, place = "Wrocław" }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code,wind_speed_10m`;
    fetch(url)
      .then((r) => r.json())
      .then((j) => setData(j.current))
      .catch(() => setError(true));
  }, [lat, lon]);

  const [icon, desc] = data ? WMO[data.weather_code] || ["🌡️", "—"] : ["", ""];

  return (
    <div className="card">
      <div className="label" style={{ color: "var(--muted)", fontSize: "0.72rem", letterSpacing: "0.07em", textTransform: "uppercase", fontWeight: 700 }}>
        Pogoda · {place}
      </div>
      {error ? (
        <p className="muted" style={{ marginBottom: 0 }}>Brak danych pogodowych (offline).</p>
      ) : !data ? (
        <p className="muted" style={{ marginBottom: 0 }}>Ładowanie pogody…</p>
      ) : (
        <div className="weather" style={{ marginTop: 12 }}>
          <span className="ico">{icon}</span>
          <div>
            <div className="temp">{Math.round(data.temperature_2m)}°C</div>
            <div className="desc">
              {desc} · wiatr {Math.round(data.wind_speed_10m)} km/h
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
