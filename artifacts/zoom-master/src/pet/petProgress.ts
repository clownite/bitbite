import type { PetId } from "./catalog";
import { settleFarm } from "./crumbs";

/** One shared pet. Everyone starts on the same base form. */

/** Every level is the same bar. Level 5 opens stage 2. Level 10 opens stage 3. */
export const LEVEL_XP = 1000;
export const PET_LEVELS = 10;
/** Four bars, then 3 GRAM, and the pet becomes level 5. */
export const LEVEL5_XP = LEVEL_XP * 4;
/** Five more bars, then 6 GRAM, and the pet becomes level 10. Nine bars in all. */
export const LEVEL10_XP = LEVEL_XP * 9;
export const LEVEL5_GRAM = 3;
export const LEVEL10_GRAM = 6;

/** One claim every 24h. A week is 80 XP. Each pet level is another 1000 XP. */
export const DAILY_XP = [8, 8, 10, 10, 12, 14, 18] as const;
export const DAILY_XP_WEEK = DAILY_XP.reduce((sum, n) => sum + n, 0);
export const DAY_MS = 24 * 60 * 60 * 1000;
/** Task rewards stay in Crumbs. Each Crumb also pays this much pet XP. */
export const XP_PER_CRUMB = 20;
export const INVITE_XP = 12;
/** Four taps are half of the smallest Earn day (8 XP). One tap is 1 XP. */
/** Daily Earn task, after at least one pet tap. */
export const TASK_INTERACT_XP = 6;
/** One-time community and chat tasks. */
export const TASK_ONCE_XP = 40;
/** One-time bonus when the first friend joins. The 12 XP per invite stays separate. */
export const TASK_INVITE_ONCE_XP = 24;
export const PET_TAP_XP = 1;
export const PET_TAP_MAX = 4;
export const PET_TAP_GAP_MS = 3000;
/** Collection holds five pets. The dolphin takes the first slot. */
export const PET_SLOTS = 5;

export type PetLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type PetStage = 1 | 2 | 3;

export function stageForLevel(level: number): PetStage {
  if (level >= 10) return 3;
  if (level >= 5) return 2;
  return 1;
}

export type PetCore = {
  stage: PetStage;
  xp: number;
  level: PetLevel;
  finished: boolean;
};

export type PetState = PetCore & {
  active: PetId;
  owned: PetId[];
  byId: Partial<Record<PetId, PetCore>>;
  dailyClaims: number;
  nextDailyAt: number;
  creditedInvites: number;
  invitesBaselined: boolean;
  tapDay: string;
  tapCount: number;
  nextTapAt: number;
  interactClaimDay: string;
  openedCommunity: boolean;
  openedChat: boolean;
  claimedCommunity: boolean;
  claimedChat: boolean;
  claimedInviteTask: boolean;
};

const KEY = "biscotto-pet-v4";
const LEGACY_KEY = "biscotto-pet-v3";

const FRESH: PetCore = { stage: 1, xp: 0, level: 1, finished: false };

const START: PetState = {
  ...FRESH,
  active: "dolphin",
  owned: ["dolphin"],
  byId: { dolphin: { ...FRESH } },
  dailyClaims: 0,
  nextDailyAt: 0,
  creditedInvites: 0,
  invitesBaselined: false,
  tapDay: "",
  tapCount: 0,
  nextTapAt: 0,
  interactClaimDay: "",
  openedCommunity: false,
  openedChat: false,
  claimedCommunity: false,
  claimedChat: false,
  claimedInviteTask: false,
};

function asLevel(value: unknown): PetLevel {
  const level = Math.floor(Number(value));
  if (level >= 1 && level <= PET_LEVELS) return level as PetLevel;
  return 1;
}

function coreOf(p: Partial<PetCore> | undefined): PetCore {
  const level = asLevel(p?.level);
  if (level >= PET_LEVELS || p?.finished) return { stage: 3, xp: 0, level: 10, finished: true };
  return {
    stage: stageForLevel(level),
    xp: Math.max(0, Number(p?.xp) || 0),
    level,
    finished: false,
  };
}

/** Old saves used three stage bars and jumped from level 1 to 5 to 10. */
function migrateCore(p: Partial<PetCore> | undefined): PetCore {
  const oldLevel = p?.level === 5 || p?.level === 10 ? p.level : 1;
  const oldStage = p?.stage === 2 || p?.stage === 3 ? p.stage : 1;
  const xp = Math.max(0, Number(p?.xp) || 0);
  if (p?.finished || oldLevel === 10) return { stage: 3, xp: 0, level: 10, finished: true };
  const gained = oldStage === 1 ? xp : oldStage === 2 ? 1000 + xp : 3000 + xp;
  const start = oldLevel === 5 ? 5 : 1;
  let level = start;
  let left = gained;
  const gate = start === 5 ? 9 : 4;
  while (level < gate && left >= LEVEL_XP) {
    left -= LEVEL_XP;
    level += 1;
  }
  return {
    stage: stageForLevel(level),
    xp: left,
    level: level as PetLevel,
    finished: false,
  };
}

function syncActive(draft: PetState): PetState {
  const core = coreOf(draft);
  return {
    ...draft,
    ...core,
    byId: { ...draft.byId, [draft.active]: core },
  };
}

function load(): PetState {
  try {
    const current = localStorage.getItem(KEY);
    const legacy = current ? null : localStorage.getItem(LEGACY_KEY);
    const raw = current ?? legacy;
    if (!raw) return { ...START };
    const p = JSON.parse(raw) as Partial<PetState>;
    const readCore = current ? coreOf : migrateCore;
    const owned = (Array.isArray(p.owned) ? p.owned : ["dolphin"]).filter(
      (id): id is PetId => id === "dolphin" || id === "finch" || id === "lynx" || id === "stag",
    );
    if (!owned.includes("dolphin")) owned.unshift("dolphin");
    const active: PetId = owned.includes(p.active as PetId) ? (p.active as PetId) : "dolphin";
    const byId: Partial<Record<PetId, PetCore>> = {};
    for (const id of owned) byId[id] = readCore(p.byId?.[id] ?? (id === "dolphin" ? p : undefined));
    const core = byId[active] ?? { ...FRESH };
    return {
      ...core,
      active,
      owned,
      byId,
      dailyClaims: Math.max(0, Math.floor(Number(p.dailyClaims) || 0)),
      nextDailyAt: Math.max(0, Number(p.nextDailyAt) || 0),
      creditedInvites: Math.max(0, Math.floor(Number(p.creditedInvites) || 0)),
      invitesBaselined: !!p.invitesBaselined,
      interactClaimDay: typeof p.interactClaimDay === "string" ? p.interactClaimDay : "",
      openedCommunity: !!p.openedCommunity,
      openedChat: !!p.openedChat,
      claimedCommunity: !!p.claimedCommunity,
      claimedChat: !!p.claimedChat,
      claimedInviteTask: !!p.claimedInviteTask,
      tapDay: typeof p.tapDay === "string" ? p.tapDay : "",
      tapCount: Math.max(0, Math.floor(Number(p.tapCount) || 0)),
      nextTapAt: Math.max(0, Number(p.nextTapAt) || 0),
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
  let level = state.level;
  while (xp >= LEVEL_XP && level < PET_LEVELS) {
    const next = level + 1;
    if (next === 5 || next === 10) break;
    xp -= LEVEL_XP;
    level = next as PetLevel;
  }
  state = syncActive({ ...state, level, xp, stage: stageForLevel(level), finished: false });
}

export function getPet(): PetState {
  return state;
}

export function getActivePetId(): PetId {
  return state.active;
}

export function setActivePet(id: PetId) {
  if (!state.owned.includes(id) || state.active === id) return;
  settleFarm();
  const core = state.byId[id] ?? { ...FRESH };
  state = syncActive({ ...state, active: id, ...core });
  emit();
}

export function buyPet(id: PetId) {
  if (id === "dolphin" || state.owned.includes(id) || state.owned.length >= PET_SLOTS) return;
  settleFarm();
  const core = { ...FRESH };
  state = syncActive({
    ...state,
    owned: [...state.owned, id],
    byId: { ...state.byId, [id]: core },
    active: id,
    ...core,
  });
  emit();
}

export function subscribePet(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function stageGoal(_stage?: PetStage): number {
  return LEVEL_XP;
}

export function xpFromCrumbs(crumbs: number): number {
  if (crumbs <= 0) return 0;
  return Math.round(crumbs) * XP_PER_CRUMB;
}

export function cycleFilled(pet: PetState): number {
  if (pet.finished) return LEVEL10_XP;
  return (pet.level - 1) * LEVEL_XP + pet.xp;
}

export function xpLabel(pet: PetState): string {
  if (pet.finished) return "Finished";
  const shown = Math.floor(Math.min(pet.xp, LEVEL_XP));
  const banked = Math.floor(pet.xp - LEVEL_XP);
  if (banked > 0) return `${LEVEL_XP} / ${LEVEL_XP} XP · ${banked} banked`;
  return `${shown} / ${LEVEL_XP} XP`;
}

export function gramCost(pet: PetState): number | null {
  if (pet.finished || pet.xp < LEVEL_XP) return null;
  if (pet.level === 4) return LEVEL5_GRAM;
  if (pet.level === 9) return LEVEL10_GRAM;
  return null;
}

export function xpBlocked(pet: PetState): "done" | "gate" | null {
  if (pet.finished) return "done";
  if (gramCost(pet) != null) return "gate";
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

function todayKey(now = Date.now()): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function petTapStatus(now = Date.now()) {
  const day = todayKey(now);
  const count = state.tapDay === day ? state.tapCount : 0;
  const wait = Math.max(0, state.nextTapAt - now);
  return {
    count,
    max: PET_TAP_MAX,
    wait,
    can: count < PET_TAP_MAX && wait <= 0 && !xpBlocked(state),
  };
}

export type TapResult = {
  xp: number;
  count: number;
  max: number;
  reason: "ok" | "wait" | "done" | "gate";
};

/**
 * A full week is 390 XP. Each level is 1000 XP, about 18 days.
 * Level 5, and stage 2, arrive after 4000 XP. Level 10, and stage 3, after 9000.
 */
export function basePetStageDays(): { reachLevel5: number; reachLevel10: number } {
  const perWeek = DAILY_XP_WEEK + PET_TAP_MAX * 7 * PET_TAP_XP + 30 * 7 + 72;
  const perDay = perWeek / 7;
  return {
    reachLevel5: Math.round(LEVEL5_XP / perDay),
    reachLevel10: Math.round(LEVEL10_XP / perDay),
  };
}

export function interactTaskStatus(now = Date.now()) {
  const day = todayKey(now);
  const tapped = petTapStatus(now).count > 0;
  const claimed = state.interactClaimDay === day;
  return {
    tapped,
    claimed,
    can: tapped && !claimed && !xpBlocked(state),
  };
}

export function claimInteractTask(now = Date.now()): number {
  if (!interactTaskStatus(now).can) return 0;
  state = { ...state, interactClaimDay: todayKey(now) };
  const gained = addPetXp(TASK_INTERACT_XP);
  if (gained <= 0) {
    state = { ...state, interactClaimDay: "" };
    emit();
  }
  return gained;
}

export function markTaskOpened(which: "community" | "chat") {
  if (which === "community" && !state.openedCommunity) state = { ...state, openedCommunity: true };
  if (which === "chat" && !state.openedChat) state = { ...state, openedChat: true };
  emit();
}

export function claimOnceTask(which: "community" | "chat" | "invite", invites = 0): number {
  if (xpBlocked(state)) return 0;
  if (which === "community") {
    if (!state.openedCommunity || state.claimedCommunity) return 0;
    state = { ...state, claimedCommunity: true };
    const gained = addPetXp(TASK_ONCE_XP);
    if (gained <= 0) state = { ...state, claimedCommunity: false };
    return gained;
  }
  if (which === "chat") {
    if (!state.openedChat || state.claimedChat) return 0;
    state = { ...state, claimedChat: true };
    const gained = addPetXp(TASK_ONCE_XP);
    if (gained <= 0) state = { ...state, claimedChat: false };
    return gained;
  }
  if (state.claimedInviteTask || invites < 1) return 0;
  state = { ...state, claimedInviteTask: true };
  const gained = addPetXp(TASK_INVITE_ONCE_XP);
  if (gained <= 0) state = { ...state, claimedInviteTask: false };
  return gained;
}

/** One of the four daily taps. A click during the 3s pause or after the fourth does not add XP. */
export function tapPet(now = Date.now()): TapResult {
  const day = todayKey(now);
  const count = state.tapDay === day ? state.tapCount : 0;
  const blocked = xpBlocked(state);
  if (blocked === "gate") return { xp: 0, count, max: PET_TAP_MAX, reason: "gate" };
  if (blocked === "done" || count >= PET_TAP_MAX) return { xp: 0, count, max: PET_TAP_MAX, reason: "done" };
  if (now < state.nextTapAt) return { xp: 0, count, max: PET_TAP_MAX, reason: "wait" };
  state = { ...state, tapDay: day, tapCount: count + 1, nextTapAt: now + PET_TAP_GAP_MS };
  const gained = addPetXp(PET_TAP_XP);
  if (gained <= 0) {
    state = { ...state, tapDay: day, tapCount: count, nextTapAt: 0 };
    emit();
    return { xp: 0, count, max: PET_TAP_MAX, reason: "done" };
  }
  return { xp: gained, count: count + 1, max: PET_TAP_MAX, reason: "ok" };
}

/** Call only after GRAM has been spent. Banked XP carries into the next level. */
export function confirmGramUpgrade() {
  const cost = gramCost(state);
  if (cost == null) return;
  settleFarm();
  const extra = state.xp - LEVEL_XP;
  if (state.level === 4) {
    state = syncActive({ ...state, stage: 2, xp: 0, level: 5, finished: false });
    if (extra > 0) applyXp(extra);
  } else if (state.level === 9) {
    state = syncActive({ ...state, stage: 3, xp: 0, level: 10, finished: true });
  }
  emit();
}
