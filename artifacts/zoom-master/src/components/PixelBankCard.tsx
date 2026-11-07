import { useLayoutEffect, useRef } from "react";

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
  " ": [0, 0, 0, 0, 0], "*": [5, 2, 5, 2, 5], "-": [0, 0, 7, 0, 0],
};

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  let cursor = x;
  for (const char of text) {
    const rows = GLYPH[char] ?? GLYPH[" "];
    rows.forEach((bits, row) => {
      for (let col = 0; col < 3; col++) {
        if (bits & (1 << (2 - col))) ctx.fillRect(cursor + col, y + row, 1, 1);
      }
    });
    cursor += 4;
  }
}

function paintFront(canvas: HTMLCanvasElement, name: string, serial: string) {
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
  drawText(ctx, "BISCOTTO", 6, 6, "#7ad7ff");
  ctx.fillStyle = "#e7c56a";
  ctx.fillRect(6, 18, 14, 10);
  ctx.fillStyle = "#9a7430";
  for (let i = 0; i < 3; i++) ctx.fillRect(8, 20 + i * 3, 10, 1);
  ctx.fillStyle = "#fff4cc";
  ctx.fillRect(8, 20, 2, 2);
  drawText(ctx, name, 6, 36, "#e8f7ff");
  drawText(ctx, serial, 6, 48, "#9fd4ee");
  ctx.fillStyle = "#7ad7ff";
  ctx.fillRect(78, 18, 12, 12);
  ctx.fillStyle = "#062033";
  ctx.fillRect(82, 22, 4, 4);
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

function cleanName(name: string): string {
  const letters = name.toUpperCase().replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  return (letters || "YOU").slice(0, 12);
}

/** Four digits drawn on the card. Not a real card number. */
export function cardSerial(seed: string): string {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const digits = String(Math.abs(hash) % 10000).padStart(4, "0");
  return `**** ${digits}`;
}

/** A pixel credit card. It turns in 3D above the Crumb balance. */
export function PixelBankCard({ name, serial }: { name: string; serial: string }) {
  const frontRef = useRef<HTMLCanvasElement>(null);
  const backRef = useRef<HTMLCanvasElement>(null);
  const label = cleanName(name);

  useLayoutEffect(() => {
    if (frontRef.current) paintFront(frontRef.current, label, serial);
    if (backRef.current) paintBack(backRef.current);
  }, [label, serial]);

  return (
    <div className="crumb-card-scene" aria-hidden>
      <div className="crumb-card-shadow" />
      <div className="crumb-card">
        <canvas ref={frontRef} className="crumb-card-face" width={96} height={60} />
        <canvas ref={backRef} className="crumb-card-face crumb-card-back" width={96} height={60} />
        <div className="crumb-card-edge crumb-card-edge-left" />
        <div className="crumb-card-edge crumb-card-edge-right" />
        <div className="crumb-card-edge crumb-card-edge-top" />
        <div className="crumb-card-edge crumb-card-edge-bottom" />
      </div>
    </div>
  );
}
