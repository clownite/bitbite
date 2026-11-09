import { addPetXp } from "./petProgress";
import { nextReset, weekStart } from "./invested";
import { getTelegramViewer } from "../utils/telegram";
import { COOKIE_CAST, mergeBoard, placeOf, xpForPlace, type BoardRow } from "./cookieRank";

export { nextReset, xpForPlace };
export type { BoardRow };

const KEY = "biscotto-cookie-board-v1";

type Banner = { xp: number; place: number; waiting: boolean };

type Saved = {
  week: string;
  rows: BoardRow[];
  pendingXp: number;
  banner: Banner | null;
};

function viewerId(): string {
  return getTelegramViewer().id || "local";
}

function empty(now = Date.now()): Saved {
  return { week: weekStart(now), rows: [], pendingXp: 0, banner: null };
}

function load(): Saved {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "") as Partial<Saved>;
    const rows = Array.isArray(parsed.rows)
      ? parsed.rows.flatMap((row) => {
          if (!row || typeof row.telegramId !== "string") return [];
          const amount = Number(row.amount);
          if (!Number.isFinite(amount) || amount <= 0) return [];
          return [{
            telegramId: row.telegramId,
            name: typeof row.name === "string" && row.name ? row.name : "You",
            username: typeof row.username === "string" ? row.username : "",
            amount,
          }];
        })
      : [];
    const banner = parsed.banner && typeof parsed.banner.xp === "number" && typeof parsed.banner.place === "number"
      ? { xp: parsed.banner.xp, place: parsed.banner.place, waiting: parsed.banner.waiting === true }
      : null;
    return {
      week: typeof parsed.week === "string" ? parsed.week : "",
      rows,
      pendingXp: Math.max(0, Number(parsed.pendingXp) || 0),
      banner,
    };
  } catch {
    return empty();
  }
}

function save(saved: Saved) {
  try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /**/ }
}

function flush(saved: Saved): number {
  if (saved.pendingXp <= 0) return 0;
  const got = addPetXp(saved.pendingXp);
  if (got <= 0) return 0;
  saved.pendingXp = 0;
  if (saved.banner) saved.banner = { ...saved.banner, waiting: false };
  return got;
}

/** Close last week, pay the top 10 in XP, and open the new list. Safe to call often. */
export function settleCookieWeek(now = Date.now()): { granted: number; banner: Banner | null } {
  const saved = load();
  const week = weekStart(now);
  if (saved.week !== week) {
    const id = viewerId();
    const place = placeOf(mergeBoard(saved.rows), id);
    const xp = xpForPlace(place);
    if (xp > 0) {
      saved.pendingXp += xp;
      saved.banner = { xp, place, waiting: false };
    } else {
      saved.banner = null;
    }
    saved.week = week;
    saved.rows = [];
  }
  const granted = flush(saved);
  if (saved.banner && saved.pendingXp > 0) saved.banner = { ...saved.banner, waiting: true };
  save(saved);
  return { granted, banner: saved.banner };
}

export function ackCookieBanner() {
  const saved = load();
  saved.banner = null;
  save(saved);
}

/** Add cookies caught in the game. Does not touch the four Home taps. */
export function recordCookies(count: number, now = Date.now()) {
  const amount = Math.floor(count);
  if (!Number.isFinite(amount) || amount <= 0) return;
  settleCookieWeek(now);
  const saved = load();
  const who = getTelegramViewer();
  const id = who.id || "local";
  const existing = saved.rows.find((row) => row.telegramId === id);
  if (existing) {
    existing.amount += amount;
    existing.name = who.name || existing.name;
    existing.username = who.username;
  } else {
    saved.rows.push({ telegramId: id, name: who.name || "You", username: who.username, amount });
  }
  save(saved);
}

export function cookieBoard(now = Date.now()): { rows: BoardRow[]; yours: number; place: number; banner: Banner | null } {
  const saved = load();
  const week = weekStart(now);
  const rows = saved.week === week ? saved.rows : [];
  const id = viewerId();
  const yours = rows.find((row) => row.telegramId === id)?.amount ?? 0;
  const board = mergeBoard(rows);
  return { rows: board, yours, place: placeOf(board, id), banner: saved.week === week ? saved.banner : null };
}

export { COOKIE_CAST };
