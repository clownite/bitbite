import { useLayoutEffect, useRef } from "react";
import art from "../pet/kinArt.json";
import type { FamilyId } from "../pet/kin";
import type { LifeForm, LifeMark } from "../pet/life";

type Sprite = { rows: string[]; ink: Record<string, string> };
type FamilyArt = { baby: Sprite; child: Sprite; teen: Sprite; adults: Sprite[] };

const FAMILIES = art as Record<FamilyId, FamilyArt>;

const EGG = [
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

const EGG_INK: Record<string, string> = {
  h: "#fffdf8",
  s: "#f4e2bc",
  d: "#e2c498",
  p: "#7ad7ff",
};

function outline(rows: string[]): string[] {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const g = rows.map((row) => [...row]);
  const o = g.map((row) => [...row]);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (g[y][x] !== ".") continue;
      for (const [dy, dx] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
        const ny = y + dy;
        const nx = x + dx;
        if (ny >= 0 && ny < h && nx >= 0 && nx < w && g[ny][nx] !== ".") {
          o[y][x] = "o";
          break;
        }
      }
    }
  }
  return o.map((row) => row.join(""));
}

function paint(canvas: HTMLCanvasElement, rows: string[], ink: Record<string, string>, mark: LifeMark | null) {
  const width = rows[0]?.length ?? 1;
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
      ctx.fillStyle = bit === "o" ? "#1a120c" : ink[bit] || "#ffffff";
      ctx.fillRect(x, y, 1, 1);
    });
  });
  if (!mark) return;
  const charm = mark === "tint" ? "#ff4d8a" : mark === "spots" ? "#ffe14a" : mark === "tail" ? "#7ad7ff" : "#ffb0c4";
  const x = mark === "tail" ? width - 3 : mark === "ears" ? 2 : Math.floor(width / 2);
  const y = mark === "spots" ? height - 4 : 1;
  ctx.fillStyle = "#1a120c";
  ctx.fillRect(x - 1, y - 1, 3, 3);
  ctx.fillStyle = charm;
  ctx.fillRect(x, y, 1, 1);
}

/** Adult body from before old age, or the stage the living pet is in now. */
export function KinPortrait({
  family,
  form,
  kin,
  mark = null,
}: {
  family: FamilyId;
  form: LifeForm;
  kin: number;
  mark?: LifeMark | null;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (form === "egg") {
      paint(canvas, outline(EGG), EGG_INK, null);
      return;
    }
    const pack = FAMILIES[family];
    const grown = form === "adult" || form === "elder" || form === "ascend";
    const sprite = grown
      ? pack.adults[Math.min(9, Math.max(0, kin))]
      : pack[form === "baby" || form === "child" || form === "teen" ? form : "baby"];
    paint(canvas, outline(sprite.rows), sprite.ink, mark);
  }, [family, form, kin, mark]);

  return <canvas ref={ref} className="kin-portrait" />;
}
