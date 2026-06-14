const SPOT_W = 68;
const SPOT_H = 112;
const LANE = 64;
const PAD = 18;

const FILL = {
  free: "rgba(31,157,82,0.55)",
  reserved: "rgba(201,138,18,0.6)",
  occupied: "rgba(210,59,59,0.6)",
  inactive: "rgba(150,160,165,0.4)",
};

function Spot({ spot, x, y, flip, selected, onSelect }) {
  const clickable = spot.status === "free" || spot.status === "reserved";
  const isDisabled = spot.spot_type === "disabled";
  const isEv = spot.spot_type === "electric";

  const numY = flip ? y + 22 : y + SPOT_H - 14;
  const badgeY = flip ? y + SPOT_H - 34 : y + 12;

  return (
    <g
      className={`pmap-spot ${clickable ? "" : "no-click"} ${selected ? "sel" : ""}`}
      onClick={() => clickable && onSelect(spot)}
    >
      <rect
        x={x + 3}
        y={flip ? y + SPOT_H - 5 : y}
        width={SPOT_W - 6}
        height={5}
        fill="#e6a91e"
        rx={1}
      />
      <rect
        className="pmap-cell"
        x={x + 3}
        y={y + 4}
        width={SPOT_W - 6}
        height={SPOT_H - 8}
        rx={4}
        fill={FILL[spot.status] || FILL.inactive}
        stroke="#e6a91e"
        strokeWidth={1.5}
      />
      {isDisabled && (
        <>
          <rect x={x + SPOT_W / 2 - 15} y={badgeY} width={30} height={30} rx={5} fill="#e6a91e" />
          <text
            x={x + SPOT_W / 2}
            y={badgeY + 22}
            textAnchor="middle"
            fontSize={20}
            fill="#23306b"
          >
            ♿
          </text>
        </>
      )}
      {isEv && (
        <text x={x + SPOT_W / 2} y={badgeY + 22} textAnchor="middle" fontSize={20}>
          ⚡
        </text>
      )}
      <text
        x={x + SPOT_W / 2}
        y={numY}
        textAnchor="middle"
        fontSize={15}
        fontWeight="700"
        fill="#fff"
      >
        {spot.label}
      </text>
    </g>
  );
}

export default function ParkingMap({ spots = [], selectedId, onSelect }) {
  if (!spots.length) {
    return <p className="muted">Brak miejsc do wyświetlenia.</p>;
  }

  const perRow = Math.ceil(spots.length / 2);
  const top = spots.slice(0, perRow);
  const bottom = spots.slice(perRow);

  const width = PAD * 2 + perRow * SPOT_W;
  const height = PAD * 2 + SPOT_H * 2 + LANE;
  const laneY = PAD + SPOT_H;

  return (
    <div className="pmap-wrap">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: "block", minWidth: width }}
      >
        <rect x={0} y={0} width={width} height={height} fill="#3c4147" />

        <line
          x1={PAD}
          y1={laneY + LANE / 2}
          x2={width - PAD}
          y2={laneY + LANE / 2}
          stroke="#f2f2f2"
          strokeWidth={3}
          strokeDasharray="26 20"
          opacity={0.8}
        />

        {top.map((s, i) => (
          <Spot
            key={s.id}
            spot={s}
            x={PAD + i * SPOT_W}
            y={PAD}
            flip={false}
            selected={s.id === selectedId}
            onSelect={onSelect}
          />
        ))}
        {bottom.map((s, i) => (
          <Spot
            key={s.id}
            spot={s}
            x={PAD + i * SPOT_W}
            y={laneY + LANE}
            flip
            selected={s.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </svg>
    </div>
  );
}
