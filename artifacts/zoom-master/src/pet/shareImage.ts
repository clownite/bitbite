import art from "./kinArt.json";
import type { FamilyId } from "./kin";
import type { LifeForm, LifeMark, LifeRoad, LifeSex } from "./life";

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
  o: "#1a120c",
  h: "#fffdf8",
  s: "#f4e2bc",
  d: "#e2c498",
};

const MALE = ["......111", "......1.1", ".....1..1", ".1111.1..", "1....11..", "1....1...", "1....1...", ".1111...."];
const FEMALE = [".11111.", "1.....1", "1.....1", "1.....1", ".11111.", "...1...", "..111..", "...1..."];
const TREE = ["...33...", "..3223..", ".322223.", "22222222", "..2222..", "...11...", "...11...", "..1111.."];
const FLOWER = [".2.3.2.", "2.232.2", ".22222.", "...1...", "...1..."];

export const SHARE_W = 720;
export const SHARE_H = 960;

export type ShareShot = {
  playerName: string;
  title: string;
  xp: string;
  element: string;
  color: string;
  family: FamilyId;
  form: LifeForm;
  kin: number;
  mark: LifeMark | null;
  sex: LifeSex | null;
  road: LifeRoad | null;
  child: { form: LifeForm; mark: LifeMark | null } | null;
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

function wings(rows: string[]): string[] {
  return rows.map((row, i) => {
    const mid = i > 1 && i < rows.length - 2;
    return `${mid ? "wb" : ".."}..${row}..${mid ? "bw" : ".."}`;
  });
}

function bodySprite(family: FamilyId, form: LifeForm, kin: number): { rows: string[]; ink: Record<string, string> } | null {
  const pack = FAMILIES[family];
  if (form === "adult" || form === "elder" || form === "ascend") {
    const sprite = pack.adults[Math.min(9, Math.max(0, kin))];
    const rows = form === "ascend" ? wings(sprite.rows) : sprite.rows;
    return { rows: outline(rows), ink: { ...sprite.ink, o: "#1a120c", w: "#f4fbff" } };
  }
  if (form !== "baby" && form !== "child" && form !== "teen") return null;
  const sprite = pack[form];
  return { rows: outline(sprite.rows), ink: { ...sprite.ink, o: "#1a120c" } };
}

function stampMark(rows: string[], ink: Record<string, string>, mark: LifeMark | null) {
  if (!mark) return;
  const width = rows[0]?.length ?? 0;
  const height = rows.length;
  const charm = mark === "tint" ? "#ff4d8a" : mark === "spots" ? "#ffe14a" : mark === "tail" ? "#7ad7ff" : "#ffb0c4";
  const x = mark === "tail" ? width - 3 : mark === "ears" ? 2 : Math.floor(width / 2);
  const y = mark === "spots" ? height - 4 : 1;
  ink["#"] = "#1a120c";
  ink["+"] = charm;
  const next = rows.map((row) => row.split(""));
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const py = y + dy;
      const px = x + dx;
      if (py < 0 || px < 0 || py >= height || px >= width) continue;
      next[py][px] = dx === 0 && dy === 0 ? "+" : "#";
    }
  }
  rows.splice(0, rows.length, ...next.map((row) => row.join("")));
}

function blit(ctx: CanvasRenderingContext2D, rows: string[], ink: Record<string, string>, x: number, y: number, scale: number, spot = "#f4e2bc") {
  rows.forEach((row, py) => {
    [...row].forEach((bit, px) => {
      if (bit === ".") return;
      ctx.fillStyle = bit === "p" ? spot : bit === "x" ? "rgba(0,0,0,0.45)" : (ink[bit] || "#ffffff");
      ctx.fillRect(x + px * scale, y + py * scale, scale, scale);
    });
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > max) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

function jpeg(canvas: HTMLCanvasElement, quality: number): string {
  const url = canvas.toDataURL("image/jpeg", quality);
  const cut = url.indexOf(",");
  return cut >= 0 ? url.slice(cut + 1) : url;
}

/** The home card only: this pet, the player's name, and the line already on the card. */
export function drawShareCard(shot: ShareShot): { image: string; thumb: string } | null {
  const canvas = document.createElement("canvas");
  canvas.width = SHARE_W;
  canvas.height = SHARE_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = "#1a2410";
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);
  const lcdX = 28;
  const lcdY = 24;
  const lcdW = SHARE_W - 56;
  const lcdH = SHARE_H - 48;
  ctx.fillStyle = "#9bbc0f";
  ctx.fillRect(lcdX, lcdY, lcdW, lcdH);
  ctx.strokeStyle = "#0f380f";
  ctx.lineWidth = 8;
  ctx.strokeRect(lcdX + 8, lcdY + 8, lcdW - 16, lcdH - 16);

  ctx.fillStyle = "#0f380f";
  ctx.font = "800 28px Fredoka, Nunito, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("BITBITE", lcdX + 28, lcdY + 52);
  ctx.textAlign = "right";
  ctx.fillText(shot.playerName.slice(0, 18), lcdX + lcdW - 28, lcdY + 52);

  const sprite = shot.form === "egg"
    ? { rows: EGG, ink: EGG_INK }
    : bodySprite(shot.family, shot.form, shot.kin);
  if (sprite && shot.form !== "egg" && shot.mark) stampMark(sprite.rows, sprite.ink, shot.mark);
  if (sprite) {
    const scale = shot.form === "egg" ? 16 : 18;
    const pw = sprite.rows[0].length * scale;
    const ph = sprite.rows.length * scale;
    const px = Math.round((SHARE_W - pw) / 2);
    const py = Math.round(430 - ph / 2);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(SHARE_W / 2, py + ph + 18, pw * 0.34, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    blit(ctx, sprite.rows, sprite.ink, px, py, scale, shot.color);
  }

  if (shot.child) {
    const mini = shot.child.form === "egg"
      ? { rows: EGG, ink: EGG_INK }
      : bodySprite(shot.family, shot.child.form, 0);
    if (mini && shot.child.form !== "egg" && shot.child.mark) stampMark(mini.rows, mini.ink, shot.child.mark);
    if (mini) blit(ctx, mini.rows, mini.ink, 500, 560, 8, shot.color);
  }

  if (shot.form !== "egg" && shot.sex) {
    blit(ctx, shot.sex === "boy" ? MALE : FEMALE, { "1": "#0f380f" }, 56, 100, 5);
    if (shot.road) {
      const rows = shot.road === "wild" ? TREE : FLOWER;
      const ink = shot.road === "wild"
        ? { "1": "#8a5a32", "2": "#3fa84a", "3": "#8fd98a" }
        : { "1": "#3fa84a", "2": "#ff4d8a", "3": "#ffe14a" };
      blit(ctx, rows, ink, 36, 168, 5);
    }
  }

  ctx.fillStyle = "#8bac0f";
  ctx.fillRect(lcdX + 20, 760, lcdW - 40, 150);
  ctx.textAlign = "left";
  ctx.fillStyle = "#0f380f";
  ctx.font = "800 26px Fredoka, Nunito, sans-serif";
  const lines = wrap(ctx, shot.title, 470);
  lines.forEach((line, i) => ctx.fillText(line, lcdX + 36, 804 + i * 34));
  ctx.font = "700 22px Fredoka, Nunito, sans-serif";
  ctx.fillText(shot.xp, lcdX + 36, 804 + lines.length * 34 + 8);

  const badge = shot.element.slice(0, 16);
  ctx.font = "800 18px Fredoka, Nunito, sans-serif";
  const bw = Math.ceil(ctx.measureText(badge).width) + 28;
  const bx = lcdX + lcdW - bw - 36;
  ctx.fillStyle = "#0f380f";
  ctx.fillRect(bx, 792, bw, 36);
  ctx.fillStyle = "#c6e35a";
  ctx.textAlign = "center";
  ctx.fillText(badge, bx + bw / 2, 816);

  const thumb = document.createElement("canvas");
  thumb.width = 240;
  thumb.height = 320;
  const tctx = thumb.getContext("2d");
  if (!tctx) return null;
  tctx.imageSmoothingEnabled = true;
  tctx.drawImage(canvas, 0, 0, 240, 320);
  return { image: jpeg(canvas, 0.86), thumb: jpeg(thumb, 0.8) };
}
