import { useEffect, useState } from "react";
import { useT } from "../i18n/LanguageContext";
import { postcardAt, postcardLine } from "../pet/postcards";
import { grantXp } from "../pet/petProgress";
import { hapticSoft } from "../utils/haptic";
import { runTap } from "../utils/tap";

/** First letter after a short while on Home, then a quiet gap, and only a few a day. */
const FIRST_MS = 18_000;
const AGAIN_MS = 6 * 60_000;
const DAY_CAP = 3;
const LETTER_XP = 2;
const KEY = "zoom-postcard-v1";

type Saved = { day: string; count: number; nextAt: number; recent: number[] };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): Saved {
  const day = today();
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "") as Partial<Saved>;
    if (parsed.day === day) {
      return {
        day,
        count: Number(parsed.count) || 0,
        nextAt: Number(parsed.nextAt) || 0,
        recent: Array.isArray(parsed.recent) ? parsed.recent.filter((n) => typeof n === "number") : [],
      };
    }
  } catch { /**/ }
  return { day, count: 0, nextAt: 0, recent: [] };
}

function save(saved: Saved) {
  try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /**/ }
}

type Phase = "closed" | "writing" | "away";

/**
 * A pixel postcard from the pet.
 * It shakes until you open it, writes one letter at a time, and stays until you tap it away.
 */
export function PetPostcard({ active, petName, soon = false }: { active: boolean; petName: string; soon?: boolean }) {
  const { lang, t } = useT();
  const [phase, setPhase] = useState<Phase | null>(null);
  const [lineId, setLineId] = useState<number | null>(null);
  const [shown, setShown] = useState("");
  const [hearts, setHearts] = useState(false);
  const full = lineId == null ? "" : postcardAt(lang, petName, lineId);

  useEffect(() => {
    if (!active) return;
    let timer = 0;
    const plan = () => {
      const saved = load();
      if (saved.count >= DAY_CAP) return;
      if (soon && saved.count === 0 && (!saved.nextAt || saved.nextAt - Date.now() > 2000)) {
        saved.nextAt = Date.now() + 1200;
        save(saved);
      }
      if (!saved.nextAt) {
        saved.nextAt = Date.now() + FIRST_MS;
        save(saved);
      }
      const due = saved.nextAt;
      timer = window.setTimeout(() => {
        if (document.hidden || document.querySelector(".zoom-guide")) {
          timer = window.setTimeout(plan, 4000);
          return;
        }
        const now = load();
        if (now.count >= DAY_CAP) return;
        const line = postcardLine(lang, petName, now.recent);
        now.recent = [line.id, ...now.recent].slice(0, 8);
        now.count += 1;
        now.nextAt = Date.now() + AGAIN_MS;
        save(now);
        setLineId(line.id);
        setShown("");
        setHearts(false);
        setPhase("closed");
        hapticSoft();
      }, Math.max(0, due - Date.now()));
    };
    plan();
    return () => window.clearTimeout(timer);
  }, [active, lang, petName, soon]);

  useEffect(() => {
    if (phase !== "writing") return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(full.slice(0, i));
      if (i >= full.length) window.clearInterval(id);
    }, 28);
    return () => window.clearInterval(id);
  }, [phase, full]);

  useEffect(() => {
    if (phase !== "away") return;
    const id = window.setTimeout(() => setPhase(null), 700);
    return () => window.clearTimeout(id);
  }, [phase]);

  if (!phase) return null;

  const onNote = () => {
    if (phase === "closed") {
      setPhase("writing");
      setHearts(true);
      grantXp(LETTER_XP);
      hapticSoft();
      window.dispatchEvent(new Event("zoom-pet-hello"));
      return;
    }
    if (phase === "writing") setPhase("away");
  };

  return (
    <>
      <button
        type="button"
        className={phase === "closed" ? "pet-note is-shake" : phase === "away" ? "pet-note is-open is-away" : "pet-note is-open"}
        onPointerDown={(event) => runTap(event, onNote)}
        onTouchStart={(event) => runTap(event, onNote)}
        aria-label={t("pet.letter")}
      >
        <span className="pet-note-stamp" />
        {phase === "closed" ? (
          <span className="pet-note-mark">?</span>
        ) : (
          <span className="pet-note-body">
            {shown}
            {phase === "writing" && shown.length < full.length ? <i className="pet-note-caret" /> : null}
            {shown.length >= full.length ? <span className="pet-note-xp">+{LETTER_XP} XP</span> : null}
          </span>
        )}
      </button>
      {hearts && (
        <span className="pet-hearts" aria-hidden>
          <i /><i /><i />
        </span>
      )}
    </>
  );
}
