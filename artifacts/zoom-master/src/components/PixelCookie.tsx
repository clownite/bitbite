/** The same pixel cookie as the ones that fall in Play. */
export function PixelCookie({ dim = false, size = 22 }: { dim?: boolean; size?: number }) {
  const dough = dim ? "#6d5a48" : "#e8a85c";
  const edge = dim ? "#5a493c" : "#c4843e";
  const chip = dim ? "#3a2a22" : "#5a3018";
  return (
    <svg width={size} height={size} viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden>
      <rect x="2" y="0" width="5" height="1" fill={dim ? "#7a6854" : "#f2c48a"} />
      <rect x="1" y="1" width="7" height="1" fill={dim ? "#6a5846" : "#f0b56a"} />
      <rect x="0" y="2" width="9" height="5" fill={dough} />
      <rect x="1" y="7" width="7" height="1" fill={edge} />
      <rect x="2" y="8" width="5" height="1" fill={edge} />
      <rect x="2" y="3" width="1" height="1" fill={chip} />
      <rect x="5" y="2" width="1" height="1" fill={chip} />
      <rect x="6" y="5" width="1" height="1" fill={chip} />
      <rect x="3" y="5" width="1" height="1" fill={chip} />
    </svg>
  );
}
