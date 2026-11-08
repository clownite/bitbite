import { useEffect, useRef } from "react";

/** The emoji, drawn small and scaled up so the same glyph reads as pixels. */
export function PixelMark({ glyph, label, center = false, size }: { glyph: string; label: string; center?: boolean; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const src = document.createElement("canvas");
    src.width = 64;
    src.height = 64;
    const sctx = src.getContext("2d");
    if (!sctx) return;
    sctx.font = '54px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    sctx.textAlign = "center";
    sctx.textBaseline = "middle";
    sctx.fillText(glyph, 32, 36);
    const pixels = sctx.getImageData(0, 0, 64, 64).data;
    let minX = 64;
    let minY = 64;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        if (pixels[(y * 64 + x) * 4 + 3] < 20) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (maxX <= minX) return;
    const cols = 11;
    const rows = Math.max(11, Math.round(((maxY - minY + 1) / (maxX - minX + 1)) * cols));
    canvas.width = cols;
    canvas.height = rows;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, minX, minY, maxX - minX + 1, maxY - minY + 1, 0, 0, cols, rows);
    if (glyph !== "🍪") return;
    const base = ctx.getImageData(0, 0, cols, rows);
    const chips: { x: number; y: number; c: number[] }[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const r = base.data[i];
        const g = base.data[i + 1];
        const b = base.data[i + 2];
        const a = base.data[i + 3];
        if (a < 40) continue;
        if (r > 70 && r > g + 15 && g > 30 && b < r - 25) chips.push({ x, y, c: [r, g, b, a] });
      }
    }
    if (!chips.length) return;
    let raf = 0;
    const tick = (now: number) => {
      const glimmer = Math.sin(now / 1400) * 10;
      ctx.putImageData(base, 0, 0);
      for (const chip of chips) {
        const n = Math.round(Math.sin(now / 1400 + chip.x) * glimmer);
        const r = Math.max(0, Math.min(255, chip.c[0] + n));
        const g = Math.max(0, Math.min(255, chip.c[1] + n));
        const b = Math.max(0, Math.min(255, chip.c[2] + Math.round(n * 0.4)));
        ctx.fillStyle = `rgba(${r},${g},${b},${chip.c[3] / 255})`;
        ctx.fillRect(chip.x, chip.y, 1, 1);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [glyph]);
  return (
    <canvas
      ref={ref}
      className={center ? "rarity-drop rarity-drop--center" : "rarity-drop"}
      aria-label={label}
      style={size ? { width: size, height: size } : undefined}
    />
  );
}
