/** Pixel icons printed on the Tamagotchi shell. */

type Kind = "heart" | "bottle" | "cookie" | "clock" | "face" | "drop" | "blue";

export function TamaMark({ kind }: { kind: Kind }) {
  return (
    <svg width="28" height="28" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
      {kind === "heart" ? <Heart fill="#ff2040" shine="#ff8aa0" deep="#c01030" /> : null}
      {kind === "blue" ? <Heart fill="#3aa0e8" shine="#d7f1ff" deep="#1a6cb0" /> : null}
      {kind === "bottle" ? <Bottle /> : null}
      {kind === "cookie" ? <Cookie /> : null}
      {kind === "clock" ? <Clock /> : null}
      {kind === "face" ? <Face /> : null}
      {kind === "drop" ? <Drop /> : null}
    </svg>
  );
}

function Heart({ fill, shine, deep }: { fill: string; shine: string; deep: string }) {
  return (
    <>
      <rect x="2" y="3" width="4" height="1" fill={fill} />
      <rect x="10" y="3" width="4" height="1" fill={fill} />
      <rect x="1" y="4" width="6" height="2" fill={fill} />
      <rect x="9" y="4" width="6" height="2" fill={fill} />
      <rect x="2" y="6" width="12" height="2" fill={fill} />
      <rect x="3" y="8" width="10" height="1" fill={fill} />
      <rect x="4" y="9" width="8" height="1" fill={deep} />
      <rect x="5" y="10" width="6" height="1" fill={deep} />
      <rect x="6" y="11" width="4" height="1" fill={deep} />
      <rect x="7" y="12" width="2" height="1" fill={deep} />
      <rect x="2" y="4" width="1" height="1" fill={shine} />
    </>
  );
}

function Bottle() {
  return (
    <>
      <rect x="6" y="1" width="4" height="2" fill="#d8ecff" />
      <rect x="7" y="2" width="2" height="2" fill="#7eb6e8" />
      <rect x="4" y="4" width="8" height="1" fill="#1a6cb0" />
      <rect x="3" y="5" width="10" height="8" fill="#3aa0e8" />
      <rect x="4" y="8" width="8" height="3" fill="#f4fbff" />
      <rect x="5" y="6" width="2" height="2" fill="#d7f1ff" />
      <rect x="3" y="13" width="10" height="1" fill="#1a6cb0" />
    </>
  );
}

function Cookie() {
  return (
    <>
      <rect x="4" y="2" width="8" height="1" fill="#e0a15a" />
      <rect x="3" y="3" width="10" height="1" fill="#f2c48a" />
      <rect x="2" y="4" width="12" height="7" fill="#e8b56a" />
      <rect x="3" y="11" width="10" height="1" fill="#f2c48a" />
      <rect x="4" y="12" width="8" height="1" fill="#c4843c" />
      <rect x="5" y="6" width="2" height="2" fill="#5a3018" />
      <rect x="9" y="5" width="2" height="2" fill="#5a3018" />
      <rect x="8" y="8" width="2" height="2" fill="#5a3018" />
    </>
  );
}

function Clock() {
  return (
    <>
      <rect x="5" y="1" width="6" height="1" fill="#f4fbff" />
      <rect x="3" y="2" width="10" height="1" fill="#f4fbff" />
      <rect x="2" y="3" width="12" height="1" fill="#f4fbff" />
      <rect x="1" y="4" width="14" height="7" fill="#f4fbff" />
      <rect x="2" y="11" width="12" height="1" fill="#f4fbff" />
      <rect x="3" y="12" width="10" height="1" fill="#f4fbff" />
      <rect x="5" y="13" width="6" height="1" fill="#f4fbff" />
      <rect x="6" y="3" width="4" height="1" fill="#1a120c" />
      <rect x="3" y="4" width="1" height="7" fill="#1a120c" />
      <rect x="12" y="4" width="1" height="7" fill="#1a120c" />
      <rect x="4" y="11" width="8" height="1" fill="#1a120c" />
      <rect x="7" y="5" width="1" height="4" fill="#1a120c" />
      <rect x="8" y="8" width="3" height="1" fill="#1a120c" />
    </>
  );
}

function Face() {
  return (
    <>
      <rect x="4" y="2" width="8" height="1" fill="#f2c14a" />
      <rect x="3" y="3" width="10" height="1" fill="#f2c14a" />
      <rect x="2" y="4" width="12" height="7" fill="#ffd86a" />
      <rect x="3" y="11" width="10" height="1" fill="#f2c14a" />
      <rect x="4" y="12" width="8" height="1" fill="#e0a83a" />
      <rect x="5" y="6" width="2" height="2" fill="#1a120c" />
      <rect x="9" y="6" width="2" height="2" fill="#1a120c" />
      <rect x="5" y="9" width="6" height="1" fill="#1a120c" />
      <rect x="6" y="6" width="1" height="1" fill="#fff6e4" />
    </>
  );
}

function Drop() {
  return (
    <>
      <rect x="7" y="1" width="2" height="2" fill="#7ad7ff" />
      <rect x="6" y="3" width="4" height="1" fill="#3aa0e8" />
      <rect x="5" y="4" width="6" height="2" fill="#3aa0e8" />
      <rect x="4" y="6" width="8" height="3" fill="#1a8ad4" />
      <rect x="5" y="9" width="6" height="2" fill="#1a8ad4" />
      <rect x="6" y="11" width="4" height="1" fill="#1568a8" />
      <rect x="7" y="12" width="2" height="1" fill="#1568a8" />
      <rect x="5" y="6" width="2" height="2" fill="#d7f4ff" />
    </>
  );
}
