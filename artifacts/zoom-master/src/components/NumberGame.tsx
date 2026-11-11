import { useEffect, useRef, useState } from "react";
import { playBite, playMiss } from "../audio/sfx";
import { PetStage } from "./PetStage";
import type { PetState } from "../pet/petProgress";
import { useT } from "../i18n/LanguageContext";

/** The Tamagotchi number game. Your number lands on the left. Two seconds later the other one lands on the right. */

const DIGIT: Record<number, string[]> = {
  1: ["01000", "11000", "01000", "01000", "01000", "01000", "11100"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["01110", "10001", "00001", "00110", "00001", "10001", "01110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
};

const SKULL = [
  ".111111.",
  "11.11.11",
  "11.11.11",
  "11111111",
  ".1.11.1.",
  "..1111..",
  ".11..11.",
];

const COOKIE = [
  ".1111.",
  "112211",
  "121121",
  "112211",
  ".1111.",
];

const HEART = [
  "11.11",
  "11111",
  ".111.",
  "..1..",
];

function paint(canvas: HTMLCanvasElement, rows: string[], ink: Record<string, string>) {
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
      const color = ink[bit];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    });
  });
}

function Sprite({ rows, ink, cell }: { rows: string[]; ink: Record<string, string>; cell: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) paint(ref.current, rows, ink);
  }, [rows, ink]);
  return (
    <canvas
      ref={ref}
      className="num-sprite"
      style={{ width: rows[0].length * cell, height: rows.length * cell }}
    />
  );
}

const CREAM = { "1": "#fff6e4" };
const SKULL_INK = { "1": "#f4f0ea" };
const COOKIE_INK = { "1": "#e2a15a", "2": "#5a3018" };
const HEART_INK = { "1": "#ff5a7a" };

export function NumberGame({ pet, color, lifeScale = 1 }: { pet: PetState; color: string; lifeScale?: number }) {
  const { t } = useT();
  const [phase, setPhase] = useState<"idle" | "mine" | "win" | "lose">("idle");
  const [mine, setMine] = useState(1);
  const [theirs, setTheirs] = useState(1);
  const [mad, setMad] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => {
    timers.current.forEach((id) => window.clearTimeout(id));
  }, []);

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  const start = () => {
    if (phase !== "idle") return;
    const yours = 1 + Math.floor(Math.random() * 9);
    setMine(yours);
    setTheirs(0);
    setPhase("mine");
    later(() => {
      const other = 1 + Math.floor(Math.random() * 9);
      setTheirs(other);
      const won = yours > other;
      setPhase(won ? "win" : "lose");
      if (won) {
        playBite();
        window.dispatchEvent(new CustomEvent("zoom-pet-eat", { detail: { where: "play" } }));
      } else {
        playMiss();
        setMad(true);
        window.dispatchEvent(new CustomEvent("zoom-pet-mad", { detail: { where: "play" } }));
        later(() => setMad(false), 700);
      }
      later(() => setPhase("idle"), 2400);
    }, 2000);
  };

  const showTheirs = phase === "win" || phase === "lose";

  return (
    <div
      className={mad ? "num-arena is-mad" : "num-arena"}
      data-testid="number-game"
      style={{
        background: `radial-gradient(ellipse 70% 28% at 50% 92%, ${color}66, transparent 70%), linear-gradient(180deg, #163044 0%, #071018 72%)`,
        borderColor: `${color}88`,
      }}
    >
      <PetStage pet={pet} frame="play" petId={pet.active} lifeScale={lifeScale} />
      <div className="cookie-floor" />
      {phase === "idle" ? (
        <button type="button" className="cookie-go num-go" data-testid="number-start" onClick={start}>{t("play.start")}</button>
      ) : (
        <div className="num-game">
          <div className="num-side is-you" data-testid="number-you">
            <Sprite rows={DIGIT[mine]} ink={CREAM} cell={4} />
          </div>
          {showTheirs && theirs > 0 ? (
            <div className="num-side is-foe" data-testid="number-foe">
              <Sprite rows={DIGIT[theirs]} ink={CREAM} cell={4} />
            </div>
          ) : null}
          {phase === "win" ? (
            <>
              <i className="num-cookie a" data-testid="number-eat"><Sprite rows={COOKIE} ink={COOKIE_INK} cell={3} /></i>
              <i className="num-cookie b"><Sprite rows={COOKIE} ink={COOKIE_INK} cell={3} /></i>
              <i className="num-heart a"><Sprite rows={HEART} ink={HEART_INK} cell={3} /></i>
              <i className="num-heart b"><Sprite rows={HEART} ink={HEART_INK} cell={3} /></i>
            </>
          ) : null}
          {phase === "lose" ? (
            <div className="num-skull" data-testid="number-skull">
              <Sprite rows={SKULL} ink={SKULL_INK} cell={4} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
