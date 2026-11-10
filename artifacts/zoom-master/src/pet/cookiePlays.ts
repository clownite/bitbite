/** Three finished series a day. A bomb does not spend one. The count lives on the phone. */

export const PLAYS_PER_DAY = 3;

const KEY = "biscotto-cookie-plays-v1";

export type PlayDay = { day: string; used: number };

/** The player's local calendar day. Midnight on their phone starts a new three. */
export function dayKey(now = Date.now()): string {
  const date = new Date(now);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function freshPlays(now = Date.now()): PlayDay {
  return { day: dayKey(now), used: 0 };
}

export function normalizePlays(saved: Partial<PlayDay> | null | undefined, now = Date.now()): PlayDay {
  const today = dayKey(now);
  if (!saved || saved.day !== today) return freshPlays(now);
  const used = Math.floor(Number(saved.used) || 0);
  return { day: today, used: Math.max(0, Math.min(PLAYS_PER_DAY, used)) };
}

export function playsLeft(saved: PlayDay, now = Date.now()): number {
  return Math.max(0, PLAYS_PER_DAY - normalizePlays(saved, now).used);
}

export function spendPlay(saved: PlayDay, now = Date.now()): PlayDay {
  const current = normalizePlays(saved, now);
  if (current.used >= PLAYS_PER_DAY) return current;
  return { day: current.day, used: current.used + 1 };
}

function read(now = Date.now()): PlayDay {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "") as Partial<PlayDay>;
    return normalizePlays(parsed, now);
  } catch {
    return freshPlays(now);
  }
}

function write(day: PlayDay) {
  try { localStorage.setItem(KEY, JSON.stringify(day)); } catch { /**/ }
}

export function cookiePlays(now = Date.now()): PlayDay {
  const day = read(now);
  write(day);
  return day;
}

/** A finished series spends one play. Calling this on a bomb run is the wrong door. */
export function noteFinishedSeries(now = Date.now()): PlayDay {
  const next = spendPlay(read(now), now);
  write(next);
  return next;
}
