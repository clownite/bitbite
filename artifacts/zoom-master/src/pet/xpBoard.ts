import { getTelegramViewer } from "../utils/telegram";
import { weekStart } from "./invested";

export type XpRow = {
  telegramId: string;
  name: string;
  username: string;
  amount: number;
  photoUrl?: string | null;
};

/** A full board for the first weeks. Real scores sit in with these. */
const GUESTS: XpRow[] = [
  { telegramId: "guest-mira", name: "Mira", username: "mira", amount: 920 },
  { telegramId: "guest-luca", name: "Luca", username: "luca", amount: 840 },
  { telegramId: "guest-hana", name: "Hana", username: "hana", amount: 760 },
  { telegramId: "guest-owen", name: "Owen", username: "owen", amount: 690 },
  { telegramId: "guest-noor", name: "Noor", username: "noor", amount: 610 },
  { telegramId: "guest-sasha", name: "Sasha", username: "sasha", amount: 540 },
  { telegramId: "guest-jules", name: "Jules", username: "jules", amount: 470 },
  { telegramId: "guest-theo", name: "Theo", username: "theo", amount: 390 },
  { telegramId: "guest-mina", name: "Mina", username: "mina", amount: 310 },
  { telegramId: "guest-aria", name: "Aria", username: "aria", amount: 240 },
];

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
            photoUrl: typeof row.photoUrl === "string" ? row.photoUrl : null,
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
    existing.photoUrl = who.photoUrl;
  } else {
    saved.rows.push({ telegramId: id, name: who.name || "You", username: who.username, amount: n, photoUrl: who.photoUrl });
  }
  save(saved);
  try { window.dispatchEvent(new Event("zoom-xp-board")); } catch { /**/ }
}

export function xpLeaders(now = Date.now()): XpRow[] {
  const rows = load(now).rows.filter((row) => row.amount > 0);
  const seen = new Set(rows.map((row) => row.telegramId));
  for (const guest of GUESTS) {
    if (rows.length >= 10) break;
    if (!seen.has(guest.telegramId)) rows.push(guest);
  }
  return rows
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name))
    .slice(0, 10);
}
