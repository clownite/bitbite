import { PixelMark } from "./PixelMark";

/** The crumb mark, the cookie drawn as pixels like the element glyphs. */
export function ZoomCubeIcon({ size = 18 }: { size?: number }) {
  return <PixelMark glyph="🍪" label="Crumbs" size={size} />;
}
