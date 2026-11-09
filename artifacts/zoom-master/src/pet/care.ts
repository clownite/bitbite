/** The pet's room on Home. The wallet farm keeps running. Care only slows it a little. */

export const BOWL_MS = 10 * 60 * 60 * 1000;
export const MESS_MS = 4 * 60 * 60 * 1000;
export const CARE_XP = 8;
const MAX_MESS = 4;
const STEP_MS = 60_000;

export const MESS_SLOTS = [
  { left: 32, bottom: 16 },
  { left: 48, bottom: 8 },
  { left: 60, bottom: 18 },
  { left: 70, bottom: 8 },
] as const;

export type FloorCrumb = { id: number; slot: number };

export type CareState = {
  at: number;
  bowl: number;
  nextMessAt: number;
  messes: FloorCrumb[];
  lightOff: boolean;
  wakeFor: string;
  wakeXp: number;
};

const KEY = "biscotto-care-v1";
const listeners = new Set<() => void>();

function fresh(now = Date.now()): CareState {
  return {
    at: now,
    bowl: 1,
    nextMessAt: now + MESS_MS,
    messes: [],
    lightOff: false,
    wakeFor: "",
    wakeXp: 0,
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function load(): CareState {
  const born = fresh();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return born;
    const p = JSON.parse(raw) as Partial<CareState>;
    const messes = Array.isArray(p.messes)
      ? p.messes.flatMap((row) => {
          const id = Number(row?.id);
          const slot = Number(row?.slot);
          if (!Number.isFinite(id) || slot < 0 || slot >= MAX_MESS) return [];
          return [{ id, slot }];
        }).slice(0, MAX_MESS)
      : [];
    return {
      at: Math.max(0, Number(p.at) || born.at),
      bowl: clamp01(Number(p.bowl)),
      nextMessAt: Math.max(0, Number(p.nextMessAt) || born.nextMessAt),
      messes,
      lightOff: p.lightOff === true,
      wakeFor: typeof p.wakeFor === "string" ? p.wakeFor : "",
      wakeXp: Math.max(0, Number(p.wakeXp) || 0),
    };
  } catch {
    return born;
  }
}

let state: CareState = typeof localStorage === "undefined" ? fresh() : load();

function commit(next: CareState, notify: boolean) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /**/ }
  if (notify) listeners.forEach((fn) => fn());
}

export function subscribeCare(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Night is 22:00–07:00 on the phone clock. */
export function isAsleep(now = Date.now()): boolean {
  const hour = new Date(now).getHours();
  return hour >= 22 || hour < 7;
}

/** The night that already ended, once the clock is between 07:00 and 22:00. */
export function finishedNightId(now = Date.now()): string | null {
  if (isAsleep(now)) return null;
  const day = new Date(now);
  day.setDate(day.getDate() - 1);
  return `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
}

/** Full bowl and a clean floor stay at 1. An empty bowl and four crumbs land near 0.7. */
export function carePace(bowl: number, mess: number): number {
  const hunger = bowl <= 0.05 ? 0.84 : bowl < 0.2 ? 0.93 : 1;
  const dirt = 1 - Math.min(MAX_MESS, Math.max(0, mess)) * 0.04;
  return Math.round(hunger * dirt * 1000) / 1000;
}

function freeSlot(messes: FloorCrumb[]): number {
  const used = new Set(messes.map((crumb) => crumb.slot));
  for (let slot = 0; slot < MAX_MESS; slot += 1) {
    if (!used.has(slot)) return slot;
  }
  return 0;
}

export function stepCare(current: CareState, now: number): { state: CareState; factor: number } {
  const elapsed = Math.max(0, now - current.at);
  if (elapsed < 1000) return { state: current, factor: carePace(current.bowl, current.messes.length) };
  let bowl = current.bowl;
  let nextMessAt = current.nextMessAt;
  const messes = current.messes.slice();
  let cursor = current.at;
  let weighted = 0;
  while (cursor < now) {
    const slice = Math.min(STEP_MS, now - cursor);
    weighted += carePace(bowl, messes.length) * slice;
    bowl = Math.max(0, bowl - slice / BOWL_MS);
    const sliceEnd = cursor + slice;
    while (messes.length < MAX_MESS && nextMessAt <= sliceEnd) {
      messes.push({ id: nextMessAt, slot: freeSlot(messes) });
      nextMessAt += MESS_MS;
    }
    if (messes.length >= MAX_MESS && nextMessAt <= sliceEnd) nextMessAt = sliceEnd + MESS_MS;
    cursor = sliceEnd;
  }
  const night = finishedNightId(now);
  const grant = night != null && current.lightOff && current.wakeFor !== night;
  return {
    factor: weighted / elapsed,
    state: {
      ...current,
      at: now,
      bowl,
      nextMessAt,
      messes,
      wakeFor: grant ? night : current.wakeFor,
      wakeXp: current.wakeXp + (grant ? CARE_XP : 0),
    },
  };
}

function visibleKey(row: CareState): string {
  const cookies = row.bowl <= 0.05 ? 0 : Math.ceil(row.bowl * 3);
  return `${cookies}|${row.messes.map((crumb) => crumb.id).join(",")}|${row.lightOff}|${row.wakeXp}|${row.wakeFor}`;
}

/** Move the room forward and return the average farm pace for that gap. */
export function careProductionFactor(now = Date.now()): number {
  const stepped = stepCare(state, now);
  commit(stepped.state, visibleKey(state) !== visibleKey(stepped.state));
  return stepped.factor;
}

export function feed(now = Date.now()): boolean {
  const stepped = stepCare(state, now).state;
  if (stepped.bowl > 0.92) {
    commit(stepped, visibleKey(state) !== visibleKey(stepped));
    return false;
  }
  const next = { ...stepped, bowl: 1 };
  commit(next, true);
  return true;
}

export function cleanMess(id: number, now = Date.now()): boolean {
  const stepped = stepCare(state, now).state;
  if (!stepped.messes.some((crumb) => crumb.id === id)) {
    commit(stepped, visibleKey(state) !== visibleKey(stepped));
    return false;
  }
  commit({ ...stepped, messes: stepped.messes.filter((crumb) => crumb.id !== id) }, true);
  return true;
}

export function toggleLight(now = Date.now()) {
  const stepped = stepCare(state, now).state;
  commit({ ...stepped, lightOff: !stepped.lightOff }, true);
}

export function takeCareXp(): number {
  if (state.wakeXp <= 0) return 0;
  const amount = state.wakeXp;
  commit({ ...state, wakeXp: 0 }, true);
  return amount;
}

export type CareView = {
  bowl: number;
  cookies: number;
  messes: { id: number; slot: number; left: number; bottom: number }[];
  lightOff: boolean;
  asleep: boolean;
  dark: boolean;
  factor: number;
  wakeXp: number;
  hungry: boolean;
  showLamp: boolean;
};

export function careView(now = Date.now()): CareView {
  const asleep = isAsleep(now);
  const cookies = state.bowl <= 0.05 ? 0 : Math.min(3, Math.ceil(state.bowl * 3));
  return {
    bowl: state.bowl,
    cookies,
    messes: state.messes.map((crumb) => ({ ...crumb, ...MESS_SLOTS[crumb.slot] ?? MESS_SLOTS[0] })),
    lightOff: state.lightOff,
    asleep,
    dark: asleep && state.lightOff,
    factor: carePace(state.bowl, state.messes.length),
    wakeXp: state.wakeXp,
    hungry: state.bowl < 0.2,
    showLamp: asleep || state.lightOff,
  };
}
