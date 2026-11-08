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
  const w = canvas.width;
  const h = canvas.height;
  const sky = ctx.createLinearGradient(0, 0, w, h);
  sky.addColorStop(0, "#1a6ea3");
  sky.addColorStop(0.45, "#0d466e");
  sky.addColorStop(1, "#08283f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.ellipse(w * 0.82, h * 0.2, 90, 50, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e7c56a";
  ctx.fillRect(36, 78, 58, 44);
  ctx.fillStyle = "#9a7430";
  for (let i = 0; i < 4; i++) ctx.fillRect(42, 86 + i * 8, 46, 2);
  ctx.font = "700 28px Fredoka, Nunito, sans-serif";
  ctx.fillStyle = "#f4fbff";
  ctx.fillText("CRUMBS", 112, 108);
  ctx.font = "600 34px Fredoka, Nunito, sans-serif";
  ctx.fillText(serial, 36, 210);
  ctx.font = "600 22px Fredoka, Nunito, sans-serif";
  ctx.fillStyle = "#d5ecf8";
  ctx.fillText(crumbs, 36, 268);
}

const MOTTOS = [
  "A small life, kept.",
  "Quiet luck, every day.",
  "Hold the warm light.",
  "One crumb at a time.",
  "The night stays kind.",
  "Soft gold, steady hands.",
  "Keep what you grow.",
  "A world that answers.",
];
const MOTTO_KEY = "zoom-card-motto";

function cardMotto(pan: string): string {
  try {
    const saved = localStorage.getItem(MOTTO_KEY);
    if (saved && MOTTOS.includes(saved)) return saved;
  } catch { /**/ }
  let hash = 0;
  for (const ch of pan) hash = (hash * 33 + ch.charCodeAt(0)) >>> 0;
  const line = MOTTOS[hash % MOTTOS.length];
  try { localStorage.setItem(MOTTO_KEY, line); } catch { /**/ }
  return line;
}

function paintBack(canvas: HTMLCanvasElement, motto: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const sky = ctx.createLinearGradient(0, 0, w, h);
  sky.addColorStop(0, "#0c3148");
  sky.addColorStop(1, "#061824");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#05080c";
  ctx.fillRect(0, h * 0.16, w, h * 0.16);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "600 22px Fredoka, Nunito, sans-serif";
  ctx.fillText(motto, 28, h * 0.62);
  ctx.fillStyle = "#d7e7f2";
  ctx.fillRect(28, h * 0.78, 92, 28);
  ctx.fillStyle = "#0c3148";
  ctx.font = "700 16px Fredoka, Nunito, sans-serif";
  ctx.fillText("CVC", 36, h * 0.78 + 19);
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
  const motto = useRef(cardMotto(serial.current.replace(/\s/g, "")));
  const label = crumbs.replace(/[^0-9.]/g, "").slice(0, 8) || "0.00";

  useLayoutEffect(() => {
    if (frontRef.current) paintFront(frontRef.current, label, serial.current);
    if (backRef.current) paintBack(backRef.current, motto.current);
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
        <canvas ref={frontRef} className="crumb-card-face" width={544} height={340} />
        <canvas ref={backRef} className="crumb-card-face crumb-card-back" width={544} height={340} />
        <div className="crumb-card-edge crumb-card-edge-left" />
        <div className="crumb-card-edge crumb-card-edge-right" />
        <div className="crumb-card-edge crumb-card-edge-top" />
        <div className="crumb-card-edge crumb-card-edge-bottom" />
      </div>
    </button>
  );
}
