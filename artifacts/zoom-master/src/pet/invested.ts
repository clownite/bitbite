import { getTelegramViewer } from "../utils/telegram";

/** GRAM spent in the app this week. The board clears every Monday. */

const KEY = "biscotto-gram-invested-v1";

export type InvestorRow = {
  telegramId: string;
  name: string;
  username: string;
  amount: number;
};

type Saved = { week: string; rows: InvestorRow[] };

export function weekStart(now = Date.now()): string {
  const d = new Date(now);
  const day = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)).toISOString().slice(0, 10);
}

export function nextReset(now = Date.now()): string {
  const start = new Date(`${weekStart(now)}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() + 7);
  return start.toISOString().slice(0, 10);
}

function load(now = Date.now()): Saved {
  const week = weekStart(now);
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "") as Partial<Saved>;
    if (parsed.week === week && Array.isArray(parsed.rows)) {
      return { week, rows: parsed.rows.filter((row) => row && typeof row.telegramId === "string") };
    }
  } catch { /**/ }
  return { week, rows: [] };
}

function save(saved: Saved) {
  try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /**/ }
}

/** Call after GRAM has actually been spent on a pet or a level. */
export function recordGramInvested(amount: number, now = Date.now()) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  const who = getTelegramViewer();
  const id = who.id || "local";
  const saved = load(now);
  const existing = saved.rows.find((row) => row.telegramId === id);
  if (existing) {
    existing.amount = Math.round((existing.amount + amount) * 1000) / 1000;
    existing.name = who.name;
    existing.username = who.username;
  } else {
    saved.rows.push({ telegramId: id, name: who.name, username: who.username, amount });
  }
  save(saved);
}

export function weeklyInvestors(now = Date.now()): InvestorRow[] {
  return load(now).rows
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
}

/** Shown now, paid in XP from the following reset. Nobody receives GRAM. */
export const UPCOMING_PRIZES: { place: string; prize: string }[] = [
  { place: "1", prize: "80 XP" },
  { place: "2", prize: "50 XP" },
  { place: "3", prize: "30 XP" },
  { place: "4–10", prize: "15 XP" },
];
