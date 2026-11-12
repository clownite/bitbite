import { PixelCookie } from "./PixelCookie";

/** The crumb mark. Same cookie as the ones that fall in Play. */
export function ZoomCubeIcon({ size = 18 }: { size?: number }) {
  return (
    <span className="cookie-still">
      <PixelCookie size={size} />
    </span>
  );
}
