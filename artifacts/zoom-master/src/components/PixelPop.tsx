/** One pixel heart, and a pixel clover. They only show after an action. */
export function PixelHeart() {
  return (
    <svg width="24" height="21" viewBox="0 0 8 7" shapeRendering="crispEdges" aria-hidden>
      <rect x="1" y="0" width="2" height="1" fill="#ff3355" />
      <rect x="5" y="0" width="2" height="1" fill="#ff3355" />
      <rect x="0" y="1" width="8" height="2" fill="#ff2040" />
      <rect x="1" y="1" width="1" height="1" fill="#ff8aa0" />
      <rect x="1" y="3" width="6" height="1" fill="#ff2040" />
      <rect x="2" y="4" width="4" height="1" fill="#e01838" />
      <rect x="3" y="5" width="2" height="1" fill="#e01838" />
    </svg>
  );
}

export function PixelClover() {
  return (
    <svg width="21" height="21" viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden>
      <rect x="1" y="0" width="2" height="1" fill="#3fbe45" />
      <rect x="4" y="0" width="2" height="1" fill="#3fbe45" />
      <rect x="0" y="1" width="3" height="2" fill="#2f9a36" />
      <rect x="4" y="1" width="3" height="2" fill="#2f9a36" />
      <rect x="1" y="1" width="1" height="1" fill="#8ee58a" />
      <rect x="5" y="1" width="1" height="1" fill="#8ee58a" />
      <rect x="3" y="2" width="1" height="4" fill="#1f6b28" />
      <rect x="0" y="4" width="3" height="2" fill="#2f9a36" />
      <rect x="4" y="4" width="3" height="2" fill="#2f9a36" />
      <rect x="1" y="4" width="1" height="1" fill="#8ee58a" />
      <rect x="5" y="4" width="1" height="1" fill="#8ee58a" />
    </svg>
  );
}
