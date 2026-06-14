import L from "leaflet";

export const parkingIcon = L.divIcon({
  className: "pin-icon",
  html: `
    <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 11 15 25 15 25s15-14 15-25C30 6.7 23.3 0 15 0z"
            fill="#1f6b3f" stroke="#ffffff" stroke-width="2"/>
      <circle cx="15" cy="15" r="7.5" fill="#ffffff"/>
      <text x="15" y="19" text-anchor="middle" font-size="11" font-weight="700"
            fill="#1f6b3f" font-family="system-ui, sans-serif">P</text>
    </svg>`,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -38],
});

export default L;
