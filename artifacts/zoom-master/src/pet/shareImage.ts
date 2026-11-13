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
    return { rows, ink: { ...sprite.ink, o: "#1a120c", w: "#f4fbff" } };
  }
  if (form !== "baby" && form !== "child" && form !== "teen") return null;
  const sprite = pack[form];
  return { rows: sprite.rows, ink: { ...sprite.ink, o: "#1a120c" } };
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

function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return `rgba(122,215,255,${alpha})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
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

  const radius = 36;
  ctx.beginPath();
  ctx.roundRect(0, 0, SHARE_W, SHARE_H, radius);
  ctx.clip();
  ctx.fillStyle = "#071018";
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);
  const glow = ctx.createRadialGradient(SHARE_W / 2, 280, 20, SHARE_W / 2, 280, 420);
  glow.addColorStop(0, rgba(shot.color, 0.85));
  glow.addColorStop(0.42, rgba(shot.color, 0.28));
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);
  const fade = ctx.createLinearGradient(0, 0, 0, SHARE_H);
  fade.addColorStop(0, rgba(shot.color, 0.22));
  fade.addColorStop(0.58, "rgba(7,16,24,0.2)");
  fade.addColorStop(1, "#05080e");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);

  ctx.fillStyle = "#e8f7ff";
  ctx.font = "800 34px Fredoka, Nunito, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(shot.playerName.slice(0, 32), SHARE_W / 2, 72);

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
    blit(ctx, shot.sex === "boy" ? MALE : FEMALE, { "1": shot.sex === "boy" ? "#7ad7ff" : "#ff4d8a" }, 36, 108, 5);
    if (shot.road) {
      const rows = shot.road === "wild" ? TREE : FLOWER;
      const ink = shot.road === "wild"
        ? { "1": "#8a5a32", "2": "#3fa84a", "3": "#8fd98a" }
        : { "1": "#3fa84a", "2": "#ff4d8a", "3": "#ffe14a" };
      blit(ctx, rows, ink, 36, 168, 5);
    }
  }

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 760, SHARE_W, 200);
  ctx.textAlign = "left";
  ctx.fillStyle = "#7ad7ff";
  ctx.font = "800 26px Fredoka, Nunito, sans-serif";
  const lines = wrap(ctx, shot.title, 470);
  lines.forEach((line, i) => ctx.fillText(line, 36, 818 + i * 34));
  ctx.fillStyle = "rgba(186,220,236,0.85)";
  ctx.font = "700 22px Fredoka, Nunito, sans-serif";
  ctx.fillText(shot.xp, 36, 818 + lines.length * 34 + 8);

  const badge = shot.element.slice(0, 16);
  ctx.font = "800 18px Fredoka, Nunito, sans-serif";
  const bw = Math.ceil(ctx.measureText(badge).width) + 28;
  const bx = SHARE_W - bw - 28;
  ctx.fillStyle = shot.color;
  ctx.beginPath();
  ctx.roundRect(bx, 792, bw, 36, 18);
  ctx.fill();
  ctx.fillStyle = "#041018";
  ctx.textAlign = "center";
  ctx.fillText(badge, bx + bw / 2, 816);

  ctx.strokeStyle = "rgba(122,215,255,0.4)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(8, 8, SHARE_W - 16, SHARE_H - 16, 30);
  ctx.stroke();

  const thumb = document.createElement("canvas");
  thumb.width = 240;
  thumb.height = 320;
  const tctx = thumb.getContext("2d");
  if (!tctx) return null;
  tctx.imageSmoothingEnabled = true;
  tctx.drawImage(canvas, 0, 0, 240, 320);
  return { image: jpeg(canvas, 0.86), thumb: jpeg(thumb, 0.8) };
}
