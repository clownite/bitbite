/** Farmed Crumbs. 1 Crumb withdraws as 1 GRAM, after you accept it from the bot. */

export const CRUMB_GRAM = 1;
export const FARM_CRUMBS = 1;
export const FARM_MS = 8 * 60 * 60 * 1000;
export const WITHDRAW_MIN = 1;

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
  nextFarmAt: number;
  requests: CrumbRequest[];
};

const KEY = "biscotto-crumbs-v1";
const listeners = new Set<() => void>();

function empty(): Ledger {
  return { balance: 0, nextFarmAt: 0, requests: [] };
}

function load(): Ledger {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw) as Partial<Ledger>;
    return {
      balance: Math.max(0, Math.floor(Number(p.balance) || 0)),
      nextFarmAt: Math.max(0, Number(p.nextFarmAt) || 0),
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

export function getCrumbs(): Ledger {
  return state;
}

export function subscribeCrumbs(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function farmReady(now = Date.now()): boolean {
  return now >= state.nextFarmAt;
}

export function farmWaitMs(now = Date.now()): number {
  return Math.max(0, state.nextFarmAt - now);
}

/** Base dolphin. Bought models will farm more than this. */
export function collectFarm(now = Date.now()): number {
  if (!farmReady(now)) return 0;
  state = {
    ...state,
    balance: state.balance + FARM_CRUMBS,
    nextFarmAt: now + FARM_MS,
  };
  emit();
  return FARM_CRUMBS;
}

export function addCrumbs(amount: number) {
  const n = Math.floor(amount);
  if (n <= 0) return;
  state = { ...state, balance: state.balance + n };
  emit();
}

export function takeCrumbs(amount: number): boolean {
  const n = Math.floor(amount);
  if (n <= 0 || state.balance < n) return false;
  state = { ...state, balance: state.balance - n };
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
