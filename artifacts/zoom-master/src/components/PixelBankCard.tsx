import { useLayoutEffect, useRef, useState } from "react";

const GLYPH: Record<string, number[]> = {
  A: [2, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], C: [3, 4, 4, 4, 3], D: [6, 5, 5, 5, 6],
  E: [7, 4, 6, 4, 7], F: [7, 4, 6, 4, 4], G: [3, 4, 5, 5, 3], H: [5, 5, 7, 5, 5],
  I: [7, 2, 2, 2, 7], J: [1, 1, 1, 5, 2], K: [5, 6, 6, 5, 5], L: [4, 4, 4, 4, 7],
  M: [5, 7, 7, 5, 5], N: [5, 7, 5, 5, 5], O: [2, 5, 5, 5, 2], P: [6, 5, 6, 4, 4],
  Q: [2, 5, 5, 7, 1], R: [6, 5, 6, 5, 5], S: [3, 4, 2, 1, 6], T: [7, 2, 2, 2, 2],
  U: [5, 5, 5, 5, 7], V: [5, 5, 5, 5, 2], W: [5, 5, 7, 7, 5], X: [5, 5, 2, 5, 5],
  Y: [5, 5, 2, 2, 2], Z: [7, 1, 2, 4, 7],
  "0": [7, 5, 5, 5, 7], "1": [2, 6, 2, 2, 7], "2": [7, 1, 7, 4, 7], "3": [7, 1, 3, 1, 7],
  "4": [5, 5, 7, 1, 1], "5": [7, 4, 7, 1, 7], "6": [7, 4, 7, 5, 7], "7": [7, 1, 1, 1, 1],
  "8": [7, 5, 7, 5, 7], "9": [7, 5, 7, 1, 7],
  " ": [0, 0, 0, 0, 0], "*": [5, 2, 5, 2, 5], "-": [0, 0, 7, 0, 0], ".": [0, 0, 0, 0, 2],
};

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, scale = 1) {
  ctx.fillStyle = color;
  let cursor = x;
  const step = 4 * scale;
  for (const char of text) {
    const rows = GLYPH[char] ?? GLYPH[" "];
    rows.forEach((bits, row) => {
      for (let col = 0; col < 3; col++) {
        if (bits & (1 << (2 - col))) ctx.fillRect(cursor + col * scale, y + row * scale, scale, scale);
      }
    });
    cursor += step;
  }
}

function paintFront(canvas: HTMLCanvasElement, crumbs: string, serial: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#062033";
  ctx.fillRect(0, 0, 96, 60);
  for (let y = 0; y < 60; y += 2) {
    ctx.fillStyle = y < 24 ? "#0b3d5c" : "#083049";
    for (let x = (y / 2) % 2; x < 96; x += 4) ctx.fillRect(x, y, 1, 1);
  }
  ctx.fillStyle = "#7ad7ff";
  ctx.fillRect(0, 0, 96, 1);
  ctx.fillRect(0, 59, 96, 1);
  ctx.fillRect(0, 0, 1, 60);
  ctx.fillRect(95, 0, 1, 60);
  drawText(ctx, "CRUMBS", 6, 6, "#7ad7ff");
  ctx.fillStyle = "#e7c56a";
  ctx.fillRect(6, 16, 14, 10);
  ctx.fillStyle = "#9a7430";
  for (let i = 0; i < 3; i++) ctx.fillRect(8, 18 + i * 3, 10, 1);
  ctx.fillStyle = "#fff4cc";
  ctx.fillRect(8, 18, 2, 2);
  drawText(ctx, crumbs, 24, 18, "#e8f7ff");
  drawText(ctx, serial, 6, 48, "#9fd4ee");
}

function paintBack(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#041722";
  ctx.fillRect(0, 0, 96, 60);
  ctx.fillStyle = "#071018";
  ctx.fillRect(0, 8, 96, 10);
  ctx.fillStyle = "#10384e";
  for (let x = 0; x < 96; x += 3) ctx.fillRect(x, 8, 1, 10);
  drawText(ctx, "CRUMB WALLET", 6, 26, "#7ad7ff");
  drawText(ctx, "1 CRUMB", 6, 40, "#e8f7ff");
  ctx.fillStyle = "#7ad7ff";
  ctx.fillRect(6, 50, 28, 3);
}

const PAN_KEY = "zoom-card-pan";

/** Sixteen digits, created once for this phone and kept. */
function cardPan(): string {
  try {
    const saved = localStorage.getItem(PAN_KEY);
    if (saved && /^\d{16}$/.test(saved)) return saved;
  } catch { /**/ }
  const digits = Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join("");
  try { localStorage.setItem(PAN_KEY, digits); } catch { /**/ }
  return digits;
}

function grouped(pan: string): string {
  return pan.replace(/(.{4})/g, "$1 ").trim();
}

/** A pixel credit card. The number is this wallet's Crumbs, and a tap makes it hop. */
export function PixelBankCard({ crumbs }: { crumbs: string }) {
  const frontRef = useRef<HTMLCanvasElement>(null);
  const backRef = useRef<HTMLCanvasElement>(null);
  const [hopping, setHopping] = useState(false);
  const serial = useRef(grouped(cardPan()));
  const label = crumbs.replace(/[^0-9.]/g, "").slice(0, 8) || "0.00";

  useLayoutEffect(() => {
    if (frontRef.current) paintFront(frontRef.current, label, serial.current);
    if (backRef.current) paintBack(backRef.current);
  }, [label]);

  return (
    <button
      type="button"
      className={hopping ? "crumb-card-scene is-hop" : "crumb-card-scene"}
      aria-label="Crumb card"
      onClick={() => {
        setHopping(false);
        requestAnimationFrame(() => setHopping(true));
      }}
      onAnimationEnd={() => setHopping(false)}
    >
      <div className="crumb-card-shadow" />
      <div className="crumb-card">
        <canvas ref={frontRef} className="crumb-card-face" width={96} height={60} />
        <canvas ref={backRef} className="crumb-card-face crumb-card-back" width={96} height={60} />
        <div className="crumb-card-edge crumb-card-edge-left" />
        <div className="crumb-card-edge crumb-card-edge-right" />
        <div className="crumb-card-edge crumb-card-edge-top" />
        <div className="crumb-card-edge crumb-card-edge-bottom" />
      </div>
    </button>
  );
}
