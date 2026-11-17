import { getTelegramViewer } from "../utils/telegram";
import { weekStart } from "./invested";

export type XpRow = {
  telegramId: string;
  name: string;
  username: string;
  amount: number;
};

/** v2 drops the old week, so the board starts empty. */
const KEY = "bitbite-xp-board-v2";

type Saved = { week: string; rows: XpRow[] };

function load(now = Date.now()): Saved {
  const week = weekStart(now);
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "") as Partial<Saved>;
    if (parsed.week === week && Array.isArray(parsed.rows)) {
      return {
        week,
        rows: parsed.rows.flatMap((row) => {
          if (!row || typeof row.telegramId !== "string") return [];
          const amount = Math.floor(Number(row.amount));
          if (!Number.isFinite(amount) || amount <= 0) return [];
          return [{
            telegramId: row.telegramId,
            name: typeof row.name === "string" && row.name ? row.name : "You",
            username: typeof row.username === "string" ? row.username : "",
            amount,
          }];
        }),
      };
    }
  } catch { /**/ }
  return { week, rows: [] };
}

function save(saved: Saved) {
  try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /**/ }
}

/** Any XP that actually landed on the pet. A new week starts from zero. */
export function recordBoardXp(amount: number, now = Date.now()) {
  const n = Math.floor(amount);
  if (!Number.isFinite(n) || n <= 0) return;
  const who = getTelegramViewer();
  const id = who.id || "local";
  const saved = load(now);
  const existing = saved.rows.find((row) => row.telegramId === id);
  if (existing) {
    existing.amount += n;
    existing.name = who.name || existing.name;
    existing.username = who.username;
  } else {
    saved.rows.push({ telegramId: id, name: who.name || "You", username: who.username, amount: n });
  }
  save(saved);
  try { window.dispatchEvent(new Event("zoom-xp-board")); } catch { /**/ }
}

export function xpLeaders(now = Date.now()): XpRow[] {
  return load(now).rows
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name))
    .slice(0, 10);
}
