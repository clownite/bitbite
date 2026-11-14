import { addPetXp, bindTapHook, getPet, PET_TAP_MAX } from "./petProgress";

/**
 * XP on top of the daily check-in and the 4 pet taps.
 * Only those 4 XP taps count. A full day is the check-in (about 11), the taps (4)
 * and the daily tasks (30). The weekly tasks add 72. Together that is 390 XP a week.
 * One level is 500 XP, about 9 days if every task is cleared.
 * Level 5 (stage 2) is 2000 XP. Level 10 (stage 3) is 4500 XP.
 */
export const QUEST_XP = {
  tap1: 6,
  tap4: 10,
  home15: 8,
  share: 6,
  visits3: 18,
  streak7: 30,
  tapsWeek: 24,
  favorite: 20,
  friendPet: 40,
  tapsMonth: 50,
  streak30: 80,
  crumb: 15,
} as const;

/** Four taps a day, every day of the week. */
const WEEK_TAPS = PET_TAP_MAX * 7;
/** Four taps a day for 30 days. Lands with the 30-day streak, before the GRAM gate. */
const MONTH_TAPS = PET_TAP_MAX * 30;

const HOME_GOAL_MS = 15 * 60 * 1000;
const VISIT_GAP_MS = 30 * 60 * 1000;
const KEY = "biscotto-quests-v1";

type Store = {
  day: string;
  dayTaps: number;
  dayHomeMs: number;
  shared: boolean;
  claimedDaily: string[];
  week: string;
  weekTaps: number;
  weekVisits: number;
  lastVisitAt: number;
  claimedWeekly: string[];
  streak: number;
  lastOpenDay: string;
  lifetimeTaps: number;
  favoriteChosen: boolean;
  claimedAch: string[];
};

export type QuestGroup = "daily" | "weekly" | "achievement";

export type QuestRow = {
  id: string;
  group: QuestGroup;
  title: string;
  detail: string;
  xp: number;
  progress: number;
  goal: number;
  claimed: boolean;
  ready: boolean;
};

const listeners = new Set<() => void>();

function dayKey(now = Date.now()): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function weekKey(now = Date.now()): string {
  const d = new Date(now);
  const day = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)).toISOString().slice(0, 10);
}

function yesterdayKey(now = Date.now()): string {
  return dayKey(now - 24 * 60 * 60 * 1000);
}

function blank(now = Date.now()): Store {
  return {
    day: dayKey(now),
    dayTaps: 0,
    dayHomeMs: 0,
    shared: false,
    claimedDaily: [],
    week: weekKey(now),
    weekTaps: 0,
    weekVisits: 0,
    lastVisitAt: 0,
    claimedWeekly: [],
    streak: 0,
    lastOpenDay: "",
    lifetimeTaps: 0,
    favoriteChosen: false,
    claimedAch: [],
  };
}

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const p = JSON.parse(raw) as Partial<Store>;
    const base = blank();
    return {
      ...base,
      day: typeof p.day === "string" ? p.day : base.day,
      dayTaps: Math.max(0, Math.floor(Number(p.dayTaps) || 0)),
      dayHomeMs: Math.max(0, Number(p.dayHomeMs) || 0),
      shared: !!p.shared,
      claimedDaily: Array.isArray(p.claimedDaily) ? p.claimedDaily.filter((id) => typeof id === "string") : [],
      week: typeof p.week === "string" ? p.week : base.week,
      weekTaps: Math.max(0, Math.floor(Number(p.weekTaps) || 0)),
      weekVisits: Math.max(0, Math.floor(Number(p.weekVisits) || 0)),
      lastVisitAt: Math.max(0, Number(p.lastVisitAt) || 0),
      claimedWeekly: Array.isArray(p.claimedWeekly) ? p.claimedWeekly.filter((id) => typeof id === "string") : [],
      streak: Math.max(0, Math.floor(Number(p.streak) || 0)),
      lastOpenDay: typeof p.lastOpenDay === "string" ? p.lastOpenDay : "",
      lifetimeTaps: Math.max(0, Math.floor(Number(p.lifetimeTaps) || 0)),
      favoriteChosen: !!p.favoriteChosen,
      claimedAch: Array.isArray(p.claimedAch) ? p.claimedAch.filter((id) => typeof id === "string") : [],
    };
  } catch {
    return blank();
  }
}

let state: Store = load();

function emit() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /**/ }
  listeners.forEach((fn) => fn());
}

function roll(now = Date.now()) {
  const day = dayKey(now);
  const week = weekKey(now);
  if (state.day !== day) {
    state = { ...state, day, dayTaps: 0, dayHomeMs: 0, shared: false, claimedDaily: [] };
  }
  if (state.week !== week) {
    state = { ...state, week, weekTaps: 0, weekVisits: 0, claimedWeekly: [] };
  }
}

export function subscribeQuests(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function noteVisit(now = Date.now()) {
  roll(now);
  const today = dayKey(now);
  let streak = state.streak;
  if (state.lastOpenDay !== today) {
    streak = state.lastOpenDay === yesterdayKey(now) ? state.streak + 1 : 1;
  }
  const visited = now - state.lastVisitAt >= VISIT_GAP_MS;
  state = {
    ...state,
    streak,
    lastOpenDay: today,
    weekVisits: state.weekVisits + (visited ? 1 : 0),
    lastVisitAt: visited ? now : state.lastVisitAt,
  };
  emit();
}

export function notePetTap(now = Date.now()) {
  roll(now);
  state = {
    ...state,
    dayTaps: state.dayTaps + 1,
    weekTaps: state.weekTaps + 1,
    lifetimeTaps: state.lifetimeTaps + 1,
  };
  emit();
  return { day: state.dayTaps, week: state.weekTaps, life: state.lifetimeTaps };
}

bindTapHook(notePetTap);

/** The pet already remembers today's taps. Catch the quests up when they fell behind. */
function catchUpTaps(now = Date.now()) {
  roll(now);
  const pet = getPet();
  const fromPet = pet.tapDay === dayKey(now) ? Math.max(0, Math.min(PET_TAP_MAX, pet.tapCount)) : 0;
  if (fromPet <= state.dayTaps) return;
  const extra = fromPet - state.dayTaps;
  state = {
    ...state,
    dayTaps: fromPet,
    weekTaps: state.weekTaps + extra,
    lifetimeTaps: state.lifetimeTaps + extra,
  };
  emit();
}

export function noteHomeActive(ms: number, now = Date.now()) {
  if (ms <= 0) return;
  roll(now);
  state = { ...state, dayHomeMs: state.dayHomeMs + ms };
  emit();
}

const HOME_SINCE = "zoom-home-since";

/** Home stays open while the mini app is put away. The clock starts once. */
export function markHomeBackground(now = Date.now()) {
  try {
    if (localStorage.getItem(HOME_SINCE)) return;
    localStorage.setItem(HOME_SINCE, String(now));
  } catch { /**/ }
}

/** Add the time the mini app spent down, then clear the mark. */
export function collectHomeBackground(now = Date.now()) {
  let from = 0;
  try {
    from = Number(localStorage.getItem(HOME_SINCE)) || 0;
    localStorage.removeItem(HOME_SINCE);
  } catch { /**/ }
  if (from > 0 && now > from) noteHomeActive(now - from, now);
}

export function noteShare(now = Date.now()) {
  roll(now);
  if (state.shared) return;
  state = { ...state, shared: true };
  emit();
}

export function noteFavorite() {
  if (state.favoriteChosen) return;
  state = { ...state, favoriteChosen: true };
  emit();
}

function rows(referralCount: number, crumbsEarned: number): QuestRow[] {
  const dailyClaimed = new Set(state.claimedDaily);
  const weeklyClaimed = new Set(state.claimedWeekly);
  const achClaimed = new Set(state.claimedAch);
  const list: QuestRow[] = [
    { id: "tap1", group: "daily", title: "Tap your pet", detail: "Today. One of the 4 XP taps", xp: QUEST_XP.tap1, progress: state.dayTaps, goal: 1, claimed: dailyClaimed.has("tap1"), ready: false },
    { id: "tap4", group: "daily", title: "Use today's 4 taps", detail: "Today", xp: QUEST_XP.tap4, progress: state.dayTaps, goal: PET_TAP_MAX, claimed: dailyClaimed.has("tap4"), ready: false },
    { id: "home15", group: "daily", title: "Keep Home open for 15 minutes", detail: "Today, while this tab is on screen", xp: QUEST_XP.home15, progress: state.dayHomeMs, goal: HOME_GOAL_MS, claimed: dailyClaimed.has("home15"), ready: false },
    { id: "share", group: "daily", title: "Share your pet card", detail: "Today", xp: QUEST_XP.share, progress: state.shared ? 1 : 0, goal: 1, claimed: dailyClaimed.has("share"), ready: false },
    { id: "visits3", group: "weekly", title: "Visit 3 times this week", detail: "A new visit counts after 30 minutes away", xp: QUEST_XP.visits3, progress: state.weekVisits, goal: 3, claimed: weeklyClaimed.has("visits3"), ready: false },
    { id: "streak7", group: "weekly", title: "Open the app 7 days in a row", detail: "This week", xp: QUEST_XP.streak7, progress: Math.min(state.streak, 7), goal: 7, claimed: weeklyClaimed.has("streak7"), ready: false },
    { id: "tapsWeek", group: "weekly", title: "Tap your pet 28 times", detail: "This week. Four taps a day", xp: QUEST_XP.tapsWeek, progress: state.weekTaps, goal: WEEK_TAPS, claimed: weeklyClaimed.has("tapsWeek"), ready: false },
    { id: "favorite", group: "achievement", title: "Choose your favorite pet", detail: "Once. It is the pet on Home.", xp: QUEST_XP.favorite, progress: state.favoriteChosen ? 1 : 0, goal: 1, claimed: achClaimed.has("favorite"), ready: false },
    { id: "friendPet", group: "achievement", title: "A friend bought a pet", detail: "Once, when a friend joins", xp: QUEST_XP.friendPet, progress: referralCount > 0 ? 1 : 0, goal: 1, claimed: achClaimed.has("friendPet"), ready: false },
    { id: "tapsMonth", group: "achievement", title: "Tap your pet 120 times", detail: "Once. Four taps a day for 30 days", xp: QUEST_XP.tapsMonth, progress: state.lifetimeTaps, goal: MONTH_TAPS, claimed: achClaimed.has("tapsMonth"), ready: false },
    { id: "streak30", group: "achievement", title: "Open the app 30 days in a row", detail: "Once", xp: QUEST_XP.streak30, progress: Math.min(state.streak, 30), goal: 30, claimed: achClaimed.has("streak30"), ready: false },
    { id: "crumb", group: "achievement", title: "Earn 1 Crumb", detail: "Once, from the farm", xp: QUEST_XP.crumb, progress: crumbsEarned >= 1 ? 1 : 0, goal: 1, claimed: achClaimed.has("crumb"), ready: false },
  ];
  return list.map((row) => ({ ...row, ready: !row.claimed && row.progress >= row.goal }));
}

export function questRows(referralCount: number, crumbsEarned: number, now = Date.now()): QuestRow[] {
  catchUpTaps(now);
  return rows(referralCount, crumbsEarned);
}

/** True when a task on the Earn screen can be collected. */
export function tasksWaiting(referralCount: number, crumbsEarned: number): boolean {
  if (questRows(referralCount, crumbsEarned).some((row) => row.ready)) return true;
  const pet = getPet();
  if (pet.openedCommunity && !pet.claimedCommunity) return true;
  if (pet.openedChat && !pet.claimedChat) return true;
  if (!pet.claimedInviteTask && referralCount > 0) return true;
  return false;
}

export function claimQuest(id: string, referralCount: number, crumbsEarned: number, now = Date.now()): number {
  roll(now);
  const row = rows(referralCount, crumbsEarned).find((item) => item.id === id);
  if (!row?.ready) return 0;
  if (row.group === "daily") state = { ...state, claimedDaily: [...state.claimedDaily, id] };
  else if (row.group === "weekly") state = { ...state, claimedWeekly: [...state.claimedWeekly, id] };
  else state = { ...state, claimedAch: [...state.claimedAch, id] };
  const gained = addPetXp(row.xp);
  if (gained <= 0) {
    if (row.group === "daily") state = { ...state, claimedDaily: state.claimedDaily.filter((item) => item !== id) };
    else if (row.group === "weekly") state = { ...state, claimedWeekly: state.claimedWeekly.filter((item) => item !== id) };
    else state = { ...state, claimedAch: state.claimedAch.filter((item) => item !== id) };
    emit();
    return 0;
  }
  emit();
  return gained;
}

export function formatQuestProgress(row: QuestRow): string {
  if (row.id === "home15") {
    const mins = Math.min(15, Math.floor(row.progress / 60000));
    return `${mins}/15 min`;
  }
  if (row.goal === 1) return row.progress >= 1 ? "Ready" : "Not yet";
  return `${Math.min(row.progress, row.goal)}/${row.goal}`;
}
