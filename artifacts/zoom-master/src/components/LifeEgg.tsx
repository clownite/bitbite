import { useLayoutEffect, useRef } from "react";

/** A Tamagotchi egg, one pixel at a time. o outline, h shine, s shell, d shade, p the pet's spot. */
const SHELL = [
  ".....oooooo.....",
  "....ohhhhhho....",
  "...ohssssssho...",
  "...osssssssso...",
  "..osssssssssso..",
  "..osssspssssso..",
  "..osssssssssso..",
  "..ossssssspsso..",
  "..osssssssssso..",
  "...osssssssso...",
  "...osddddddso...",
  "....oddddddo....",
  ".....oooooo.....",
];

const SHADOW = [
  "....xxxxxxxx....",
  "......xxxx......",
];

const INK: Record<string, string> = {
  o: "#1a120c",
  h: "#fffdf8",
  s: "#f4e2bc",
  d: "#e2c498",
};

function paint(canvas: HTMLCanvasElement, rows: string[], spot: string) {
  const width = rows[0].length;
  const height = rows.length;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);
  rows.forEach((row, y) => {
    [...row].forEach((bit, x) => {
      if (bit === ".") return;
      ctx.fillStyle = bit === "p" ? spot : bit === "x" ? "rgba(0,0,0,0.45)" : INK[bit];
      ctx.fillRect(x, y, 1, 1);
    });
  });
}

/** The Tamagotchi egg sits still. The first hour is only a wait. */
export function LifeEgg({ color, mini = false }: { color: string; mini?: boolean }) {
  const shellRef = useRef<HTMLCanvasElement>(null);
  const shadowRef = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    if (shellRef.current) paint(shellRef.current, SHELL, color);
    if (shadowRef.current) paint(shadowRef.current, SHADOW, color);
  }, [color]);
  return (
    <div className={mini ? "life-egg is-mini" : "life-egg"} data-testid="life-egg" aria-hidden>
      <canvas ref={shadowRef} className="life-egg-shadow" />
      <canvas ref={shellRef} className="life-egg-shell" />
    </div>
  );
}
