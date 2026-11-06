/** Placeholder mark: a chocolate-chip cookie with a small flying bob. */
interface ZoomCubeIconProps {
  size?: number;
}

export function ZoomCubeIcon({ size = 18 }: ZoomCubeIconProps) {
  return (
    <span
      className="cookie-fly"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
        lineHeight: 0,
      }}
      aria-hidden
    >
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <ellipse cx="32" cy="56" rx="16" ry="3.5" fill="#6a3412" opacity="0.35" />
        <circle cx="32" cy="30" r="22" fill="#e39a42" />
        <circle cx="28" cy="26" r="14" fill="#f6c57a" opacity="0.9" />
        <path d="M16 24c3-9 12-14 22-11" stroke="#ffe4b8" strokeWidth="3" strokeLinecap="round" />
        <circle cx="24" cy="28" r="3.2" fill="#5c3317" />
        <circle cx="38" cy="22" r="2.6" fill="#4a2812" />
        <circle cx="40" cy="36" r="3.4" fill="#5c3317" />
        <circle cx="27" cy="40" r="2.4" fill="#4a2812" />
        <circle cx="33" cy="24" r="1.7" fill="#6b3d1c" />
      </svg>
    </span>
  );
}
