import { useLayoutEffect, useRef, useState } from "react";
import art from "../pet/kinArt.json";
import type { FamilyId } from "../pet/kin";
import type { LifeForm, LifeMark } from "../pet/life";
import { notePetTap } from "../pet/quests";
import { tapPet } from "../pet/petProgress";
import { translate, type Lang } from "../i18n/translations";

type Sprite = { rows: string[]; ink: Record<string, string> };
type FamilyArt = { baby: Sprite; child: Sprite; teen: Sprite; adults: Sprite[] };

const FAMILIES = art as Record<FamilyId, FamilyArt>;

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

function paint(canvas: HTMLCanvasElement, rows: string[], ink: Record<string, string>, mark: LifeMark | null) {
  const framed = outline(rows);
  const width = framed[0].length;
  const height = framed.length;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);
  framed.forEach((row, y) => {
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

function ui(key: string, vars?: Record<string, string | number>): string {
  let lang: Lang = "en";
  try {
    const saved = localStorage.getItem("zoom-lang");
    if (saved === "it" || saved === "es" || saved === "fil" || saved === "ru" || saved === "uk") lang = saved;
  } catch { /**/ }
  return translate(lang, key, vars);
}

/** The Tamagotchi body. It hops in place. The shadow stays on the floor. */
export function LifeCreature({
  family,
  form,
  kin,
  mark = null,
  mini = false,
  asleep = false,
  asking = false,
  onTap = false,
}: {
  family: FamilyId;
  form: LifeForm;
  kin: number;
  mark?: LifeMark | null;
  mini?: boolean;
  asleep?: boolean;
  asking?: boolean;
  onTap?: boolean;
}) {
  const bodyRef = useRef<HTMLCanvasElement>(null);
  const shadowRef = useRef<HTMLCanvasElement>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const rising = form === "ascend";
  const pack = FAMILIES[family];
  const grown = form === "adult" || form === "elder" || form === "ascend";
  const sprite = grown ? pack.adults[Math.min(9, Math.max(0, kin))] : pack[form === "baby" || form === "child" || form === "teen" ? form : "baby"];
  const rows = rising ? wings(sprite.rows) : sprite.rows;

  useLayoutEffect(() => {
    if (bodyRef.current) paint(bodyRef.current, rows, sprite.ink, mark ?? null);
    if (shadowRef.current) {
      const blob = ["....xxxx....", "..xxxxxxxx.."];
      const canvas = shadowRef.current;
      canvas.width = blob[0].length;
      canvas.height = blob.length;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      blob.forEach((row, y) => {
        [...row].forEach((bit, x) => {
          if (bit !== "x") return;
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          ctx.fillRect(x, y, 1, 1);
        });
      });
    }
  }, [rows, sprite, mark]);

  const tap = () => {
    if (!onTap || asleep) return;
    const result = tapPet();
    if (result.reason === "ok") {
      notePetTap();
      setFlash(ui("pet.xpFlash", { xp: result.xp, n: result.count, max: result.max }));
    } else if (result.reason === "wait") setFlash(ui("pet.wait"));
    else if (result.reason === "gate") setFlash(ui("pet.payGram"));
    else setFlash(ui("pet.tapFull", { max: result.max }));
    window.setTimeout(() => setFlash(null), 1200);
  };

  const width = Math.max(rows[0]?.length ?? 12, 12);
  return (
    <div
      className={`life-pet${mini ? " is-mini" : ""}${asleep ? " is-asleep" : ""}${rising ? " is-rise" : ""}${form === "elder" ? " is-elder" : ""}${asking ? " is-asking" : ""}`}
      style={{ width: `calc(${width} * var(--cell))`, marginLeft: `calc(${width} * var(--cell) / -2)` }}
      data-testid={mini ? "life-pet-mini" : "life-pet"}
      onClick={onTap ? tap : undefined}
    >
      <canvas ref={shadowRef} className="life-pet-shadow" />
      <canvas ref={bodyRef} className="life-pet-body" style={{ width: `calc(${width} * var(--cell))` }} />
      {flash ? <span className="life-pet-flash">{flash}</span> : null}
    </div>
  );
}
