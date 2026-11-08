/** Tiny pixel marks beside the six battle stats. */

const PIXELS: Record<string, string[]> = {
  hp: [
    "0110110",
    "1111111",
    "1111111",
    "0111110",
    "0011100",
    "0001000",
  ],
  atk: [
    "0000111",
    "0001110",
    "1111100",
    "0111000",
    "0010000",
    "0100000",
  ],
  def: [
    "0111110",
    "1111111",
    "1111111",
    "1111111",
    "0111110",
    "0011100",
  ],
  spa: [
    "0001000",
    "0111110",
    "0011100",
    "1110111",
    "0011100",
    "0100010",
  ],
  spd: [
    "0111110",
    "1100011",
    "1111111",
    "0111110",
    "0011100",
    "0110110",
  ],
  spe: [
    "1100110",
    "1100110",
    "0110110",
    "0011100",
    "0110110",
    "1100011",
  ],
};

export function StatGlyph({ id }: { id: keyof typeof PIXELS }) {
  const rows = PIXELS[id];
  return (
    <svg viewBox="0 0 7 6" width="14" height="12" aria-hidden style={{ display: "block", margin: "0 auto 2px", imageRendering: "pixelated" }}>
      {rows.flatMap((row, y) => row.split("").map((bit, x) => (
        bit === "1" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#e8f7ff" /> : null
      )))}
    </svg>
  );
}
