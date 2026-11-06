/** One shared pet. Everyone starts on the same base form. */

export const STAGE_XP: Record<1 | 2 | 3, number> = { 1: 1000, 2: 2000, 3: 3000 };
/** 1000 + 2000 + 3000. Two of these, with a GRAM gate between them, finish the pet. */
export const CYCLE_XP = 6000;
/** First gate was not given a number. 3 GRAM unlocks level 5; 6 GRAM finishes at level 10. */
export const LEVEL5_GRAM = 3;
export const LEVEL10_GRAM = 6;

/** One claim every 24h. Seven days, then it repeats. A week is 2500 XP. */
export const DAILY_XP = [200, 200, 300, 300, 400, 500, 600] as const;
export const DAILY_XP_WEEK = DAILY_XP.reduce((sum, n) => sum + n, 0);
export const DAY_MS = 24 * 60 * 60 * 1000;
/** Task rewards stay in Crumbs. Each Crumb also pays this much pet XP. */
export const XP_PER_CRUMB = 20;
export const INVITE_XP = 250;

export type PetLevel = 1 | 5 | 10;

export type PetState = {
  stage: 1 | 2 | 3;
  xp: number;
  level: PetLevel;
  finished: boolean;
  dailyClaims: number;
  nextDailyAt: number;
  creditedInvites: number;
  invitesBaselined: boolean;
};

const KEY = "biscotto-pet-v2";

const START: PetState = {
  stage: 1,
  xp: 0,
  level: 1,
  finished: false,
  dailyClaims: 0,
  nextDailyAt: 0,
  creditedInvites: 0,
  invitesBaselined: false,
};

function load(): PetState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...START };
    const p = JSON.parse(raw) as Partial<PetState>;
    const stage = p.stage === 2 || p.stage === 3 ? p.stage : 1;
    const level: PetLevel = p.level === 5 || p.level === 10 ? p.level : 1;
    return {
      stage,
      xp: Math.max(0, Number(p.xp) || 0),
      level,
      finished: !!p.finished,
      dailyClaims: Math.max(0, Math.floor(Number(p.dailyClaims) || 0)),
      nextDailyAt: Math.max(0, Number(p.nextDailyAt) || 0),
      creditedInvites: Math.max(0, Math.floor(Number(p.creditedInvites) || 0)),
      invitesBaselined: !!p.invitesBaselined,
    };
  } catch {
    return { ...START };
  }
}

let state: PetState = load();
const listeners = new Set<() => void>();

function emit() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /**/ }
  listeners.forEach((fn) => fn());
}

function applyXp(amount: number) {
  if (amount <= 0 || state.finished) return;
  let xp = state.xp + amount;
  let stage = state.stage;
  while (stage < 3 && xp >= STAGE_XP[stage]) {
    xp -= STAGE_XP[stage];
    stage = (stage + 1) as 2 | 3;
  }
  state = { ...state, stage, xp };
}

export function getPet(): PetState {
  return state;
}

export function subscribePet(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function stageGoal(stage: 1 | 2 | 3): number {
  return STAGE_XP[stage];
}

export function xpFromCrumbs(crumbs: number): number {
  if (crumbs <= 0) return 0;
  return Math.round(crumbs) * XP_PER_CRUMB;
}

export function cycleFilled(pet: PetState): number {
  const before = pet.stage === 1 ? 0 : pet.stage === 2 ? STAGE_XP[1] : STAGE_XP[1] + STAGE_XP[2];
  return before + Math.min(pet.xp, STAGE_XP[pet.stage]);
}

export function xpLabel(pet: PetState): string {
  if (pet.finished) return "Finished";
  const goal = STAGE_XP[pet.stage];
  if (pet.stage === 3 && pet.xp > goal) return `${goal} / ${goal} XP · ${Math.floor(pet.xp - goal)} banked`;
  return `${Math.floor(pet.xp)} / ${goal} XP`;
}

export function gramCost(pet: PetState): number | null {
  if (pet.finished) return null;
  if (pet.stage !== 3 || pet.xp < STAGE_XP[3]) return null;
  if (pet.level === 1) return LEVEL5_GRAM;
  if (pet.level === 5) return LEVEL10_GRAM;
  return null;
}

export function xpBlocked(pet: PetState): "done" | "gate" | null {
  if (pet.finished) return "done";
  if (pet.stage === 3 && pet.xp >= STAGE_XP[3] && gramCost(pet) != null) return "gate";
  return null;
}

/** XP only comes from Earn. Extra past stage 3 is kept for the next cycle. */
export function addPetXp(amount: number): number {
  if (amount <= 0 || xpBlocked(state)) return 0;
  applyXp(amount);
  emit();
  return amount;
}

export type DailyXpStatus = {
  canClaim: boolean;
  blocked: "done" | "gate" | null;
  nextReward: number;
  upcomingDay: number;
  claimedThrough: number;
  nextDailyAt: number;
};

export function dailyXpStatus(now = Date.now()): DailyXpStatus {
  const blocked = xpBlocked(state);
  const cyclePos = state.dailyClaims % 7;
  const waiting = now < state.nextDailyAt;
  const claimedThrough = waiting ? (cyclePos === 0 ? 7 : cyclePos) : cyclePos;
  return {
    canClaim: !waiting && !blocked,
    blocked,
    nextReward: DAILY_XP[cyclePos],
    upcomingDay: cyclePos + 1,
    claimedThrough,
    nextDailyAt: state.nextDailyAt,
  };
}

export function claimDailyPetXp(now = Date.now()): number {
  const status = dailyXpStatus(now);
  if (!status.canClaim) return 0;
  const gained = addPetXp(status.nextReward);
  if (gained <= 0) return 0;
  state = {
    ...state,
    dailyClaims: state.dailyClaims + 1,
    nextDailyAt: now + DAY_MS,
  };
  emit();
  return gained;
}

/** First call remembers the current invite count and pays nothing. Later invites pay. */
export function syncReferralXp(count: number): number {
  const safe = Math.max(0, Math.floor(count) || 0);
  if (!state.invitesBaselined) {
    state = { ...state, invitesBaselined: true, creditedInvites: safe };
    emit();
    return 0;
  }
  const extra = safe - state.creditedInvites;
  if (extra <= 0) return 0;
  state = { ...state, creditedInvites: safe };
  if (xpBlocked(state)) {
    emit();
    return 0;
  }
  const gained = extra * INVITE_XP;
  applyXp(gained);
  emit();
  return gained;
}

/** Call only after GRAM has been spent. Banked XP carries into the next cycle. */
export function confirmGramUpgrade() {
  if (state.finished || state.stage !== 3 || state.xp < STAGE_XP[3]) return;
  const extra = state.xp - STAGE_XP[3];
  if (state.level === 1) {
    state = { ...state, stage: 1, xp: 0, level: 5, finished: false };
    if (extra > 0) applyXp(extra);
  } else if (state.level === 5) {
    state = { ...state, stage: 3, xp: STAGE_XP[3], level: 10, finished: true };
  }
  emit();
}
