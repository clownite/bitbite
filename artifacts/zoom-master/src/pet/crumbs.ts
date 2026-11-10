import { dailyFarm } from "./catalog";
import { careProductionFactor } from "./care";
import { getActivePetId, getPet } from "./petProgress";

/** Farmed Crumbs. 1 Crumb withdraws as 1 GRAM, after you accept it from the bot. */

export const CRUMB_GRAM = 1;
export const WITHDRAW_MIN = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

export type CrumbRequest = {
  localId: string;
  serverId: number | null;
  amount: number;
  wallet: string;
  status: "pending" | "paid" | "rejected";
  createdAt: number;
};

type Ledger = {
  balance: number;
  /** Crumbs sitting on the pet. Stops at the pet's daily maximum until Claim. */
  pending: number;
  /** Total Crumbs ever moved into the wallet. Withdrawals do not reduce this. */
  earned: number;
  lastTickAt: number;
  requests: CrumbRequest[];
};

const KEY = "biscotto-crumbs-v2";
const listeners = new Set<() => void>();

function empty(): Ledger {
  return { balance: 0, pending: 0, earned: 0, lastTickAt: Date.now(), requests: [] };
}

function round8(n: number): number {
  return Math.round(n * 1e8) / 1e8;
}

export function formatCrumbs(n: number): string {
  const v = Number.isFinite(n) ? Math.max(0, n) : 0;
  return v.toFixed(4).replace(/(\.\d\d)0+$/, "$1");
}

function load(): Ledger {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw) as Partial<Ledger>;
    const balance = Math.max(0, Number(p.balance) || 0);
    return {
      balance,
      pending: Math.max(0, Number(p.pending) || 0),
      earned: Math.max(0, Number(p.earned ?? balance) || 0),
      lastTickAt: Math.max(0, Number(p.lastTickAt) || Date.now()),
      requests: Array.isArray(p.requests) ? p.requests : [],
    };
  } catch {
    return empty();
  }
}

let state: Ledger = load();

function emit() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /**/ }
  listeners.forEach((fn) => fn());
}

/**
 * The tank fills up to one day and waits for Claim, with the app open or closed.
 * Closing the app keeps the crumbs on the pet. It never pays faster than the pet's rate.
 */
export function settleFarm(now = Date.now()) {
  const from = state.lastTickAt || now;
  const elapsed = Math.max(0, now - from);
  if (elapsed < 1000) return 0;
  const cap = dailyFarm(getActivePetId(), getPet().level);
  const pace = careProductionFactor(now);
  const produced = cap > 0 ? (elapsed / DAY_MS) * cap * pace : 0;
  const room = Math.max(0, cap - state.pending);
  if (room <= 1e-10) {
    state = { ...state, lastTickAt: now };
    emit();
    return 0;
  }
  const gain = Math.min(room, produced);
  state = {
    ...state,
    pending: round8(state.pending + gain),
    lastTickAt: now,
  };
  emit();
  return gain;
}

function watchFarm() {
  const sync = () => settleFarm();
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("pageshow", sync);
  window.addEventListener("pagehide", sync);
  window.addEventListener("focus", sync);
  sync();
}

if (typeof window !== "undefined") queueMicrotask(watchFarm);

export function farmStatus(now = Date.now()) {
  settleFarm(now);
  const cap = currentDailyRate();
  const pending = state.pending;
  return {
    pending,
    cap,
    full: cap > 0 && pending + 1e-8 >= cap,
    ratio: cap > 0 ? Math.min(1, pending / cap) : 0,
  };
}

/** Move whatever the pet is holding into the wallet and start filling again. */
export function claimFarm(now = Date.now()): number {
  settleFarm(now);
  if (state.pending <= 1e-10) return 0;
  const n = state.pending;
  state = {
    ...state,
    balance: round8(state.balance + n),
    earned: round8(state.earned + n),
    pending: 0,
    lastTickAt: now,
  };
  emit();
  return n;
}

export function currentDailyRate(): number {
  return dailyFarm(getActivePetId(), getPet().level);
}

export function getCrumbs(): Ledger {
  return state;
}

export function crumbsEarned(): number {
  return state.earned;
}

export function subscribeCrumbs(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function addCrumbs(amount: number) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return;
  state = { ...state, balance: round8(state.balance + n) };
  emit();
}

export function takeCrumbs(amount: number): boolean {
  const n = Math.floor(amount);
  if (n <= 0 || state.balance + 1e-9 < n) return false;
  state = { ...state, balance: round8(state.balance - n) };
  emit();
  return true;
}

export function rememberRequest(req: CrumbRequest) {
  state = { ...state, requests: [req, ...state.requests].slice(0, 20) };
  emit();
}

export function patchRequest(localId: string, patch: Partial<CrumbRequest>) {
  state = {
    ...state,
    requests: state.requests.map((r) => (r.localId === localId ? { ...r, ...patch } : r)),
  };
  emit();
}

export function refundRequest(localId: string) {
  const row = state.requests.find((r) => r.localId === localId);
  if (!row || row.status === "rejected" || row.status === "paid") return;
  state = {
    ...state,
    balance: state.balance + row.amount,
    requests: state.requests.map((r) => (r.localId === localId ? { ...r, status: "rejected" } : r)),
  };
  emit();
}

export function markRequest(serverId: number, status: "paid" | "rejected") {
  const row = state.requests.find((r) => r.serverId === serverId);
  if (!row || row.status !== "pending") return;
  if (status === "rejected") {
    state = {
      ...state,
      balance: state.balance + row.amount,
      requests: state.requests.map((r) => (r.serverId === serverId ? { ...r, status } : r)),
    };
  } else {
    state = {
      ...state,
      requests: state.requests.map((r) => (r.serverId === serverId ? { ...r, status } : r)),
    };
  }
  emit();
}
