/** Ten finished games a day, for Cookies and for Numbers. A bomb does not spend one. */

export const PLAYS_PER_DAY = 10;

const KEY = "biscotto-cookie-plays-v1";
const NUMBER_KEY = "biscotto-number-plays-v1";

export type PlayDay = { day: string; used: number };

/** The player's local calendar day. Midnight on their phone starts a new ten. */
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

function read(key: string, now = Date.now()): PlayDay {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "") as Partial<PlayDay>;
    return normalizePlays(parsed, now);
  } catch {
    return freshPlays(now);
  }
}

function write(key: string, day: PlayDay) {
  try { localStorage.setItem(key, JSON.stringify(day)); } catch { /**/ }
}

export function cookiePlays(now = Date.now()): PlayDay {
  const day = read(KEY, now);
  write(KEY, day);
  return day;
}

/** A finished series spends one play. Calling this on a bomb run is the wrong door. */
export function noteFinishedSeries(now = Date.now()): PlayDay {
  const next = spendPlay(read(KEY, now), now);
  write(KEY, next);
  return next;
}

export function numberPlays(now = Date.now()): PlayDay {
  const day = read(NUMBER_KEY, now);
  write(NUMBER_KEY, day);
  return day;
}

/** One finished Numbers match spends one of the ten. */
export function noteNumberPlay(now = Date.now()): PlayDay {
  const next = spendPlay(read(NUMBER_KEY, now), now);
  write(NUMBER_KEY, next);
  return next;
}
