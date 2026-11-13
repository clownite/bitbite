import { getTelegramViewer } from "../utils/telegram";
import { addPetXp } from "./petProgress";
import { nextReset, weekStart } from "./invested";

export { nextReset };

export type XpRow = {
  telegramId: string;
  name: string;
  username: string;
  amount: number;
};

const KEY = "bitbite-xp-board-v1";

const CAST: XpRow[] = [
  { telegramId: "xp-nela", name: "Nela Costa", username: "nela", amount: 140 },
  { telegramId: "xp-pietro", name: "Pietro Sala", username: "pietro", amount: 118 },
  { telegramId: "xp-hana", name: "Hana Ivers", username: "hana", amount: 96 },
  { telegramId: "xp-lev", name: "Lev Orlov", username: "lev", amount: 80 },
  { telegramId: "xp-mina", name: "Mina Cho", username: "mina", amount: 64 },
  { telegramId: "xp-otto", name: "Otto Berg", username: "otto", amount: 48 },
  { telegramId: "xp-rita", name: "Rita Nunes", username: "rita", amount: 36 },
  { telegramId: "xp-samir", name: "Samir Adel", username: "samir", amount: 24 },
  { telegramId: "xp-bea", name: "Bea Kolb", username: "bea", amount: 16 },
  { telegramId: "xp-io", name: "Io Rossi", username: "io", amount: 8 },
];

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

/** Cookies and Numbers both add here. One board, ranked by XP. */
export function awardGameXp(amount: number, now = Date.now()) {
  const n = Math.floor(amount);
  if (!Number.isFinite(n) || n <= 0) return;
  addPetXp(n);
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
}

export function xpLeaders(now = Date.now()): XpRow[] {
  const real = load(now).rows.filter((row) => row.amount > 0);
  const taken = new Set(real.map((row) => row.telegramId));
  return [...real, ...CAST.filter((row) => !taken.has(row.telegramId))]
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name))
    .slice(0, 10);
}
