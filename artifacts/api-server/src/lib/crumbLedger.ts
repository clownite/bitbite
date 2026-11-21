/** Crumb withdrawals. The same rules run when a request is filed, when the phone syncs, and when a request is accepted or declined. A hold is taken once. A decline gives it back once. */

export type CrumbRequest = {
  localId: string;
  serverId: number | null;
  amount: number;
  wallet: string;
  status: "pending" | "paid" | "rejected";
  createdAt: number;
};

export type CrumbLedger = {
  balance: number;
  pending: number;
  earned: number;
  lastTickAt: number;
  requests: CrumbRequest[];
  applied: Record<string, "held" | "returned">;
};

export type CrumbHold = {
  id: number;
  amount: number;
  wallet: string;
  status: "pending" | "paid" | "rejected";
  createdAt: number;
};

function round8(n: number): number {
  return Math.round(n * 1e8) / 1e8;
}

function emptyLedger(): CrumbLedger {
  return { balance: 0, pending: 0, earned: 0, lastTickAt: Date.now(), requests: [], applied: {} };
}

export function parseLedger(raw: string | null | undefined): CrumbLedger {
  if (!raw) return emptyLedger();
  try {
    const p = JSON.parse(raw) as Partial<CrumbLedger>;
    const requests = Array.isArray(p.requests) ? p.requests.flatMap((row) => {
      const amount = Math.round(Number(row?.amount) || 0);
      const status = row?.status === "paid" || row?.status === "rejected" ? row.status : "pending";
      if (amount <= 0) return [];
      return [{
        localId: typeof row?.localId === "string" ? row.localId : `srv-${row?.serverId ?? "x"}`,
        serverId: Number.isFinite(Number(row?.serverId)) ? Number(row?.serverId) : null,
        amount,
        wallet: typeof row?.wallet === "string" ? row.wallet : "",
        status,
        createdAt: Number(row?.createdAt) || 0,
      } satisfies CrumbRequest];
    }) : [];
    const applied: CrumbLedger["applied"] = {};
    if (p.applied && typeof p.applied === "object") {
      for (const [key, value] of Object.entries(p.applied)) {
        if (value === "held" || value === "returned") applied[key] = value;
      }
    }
    return seedApplied({
      balance: Math.max(0, Number(p.balance) || 0),
      pending: Math.max(0, Number(p.pending) || 0),
      earned: Math.max(0, Number(p.earned) || 0),
      lastTickAt: Math.max(0, Number(p.lastTickAt) || Date.now()),
      requests,
      applied,
    });
  } catch {
    return emptyLedger();
  }
}

/** A request already stored on the phone has already moved the balance. Remember that, so a later sync does not move it again. */
export function seedApplied(ledger: CrumbLedger): CrumbLedger {
  const applied = { ...ledger.applied };
  for (const row of ledger.requests) {
    if (!row.serverId) continue;
    const key = String(row.serverId);
    if (applied[key]) continue;
    applied[key] = row.status === "rejected" ? "returned" : "held";
  }
  return { ...ledger, applied };
}

function remember(requests: CrumbRequest[], hold: CrumbHold, status: CrumbRequest["status"]): CrumbRequest[] {
  const idx = requests.findIndex((row) => row.serverId === hold.id);
  if (idx >= 0) {
    const next = requests.slice();
    next[idx] = { ...next[idx], status, amount: Math.round(hold.amount), wallet: hold.wallet || next[idx].wallet };
    return next;
  }
  return [{
    localId: `srv-${hold.id}`,
    serverId: hold.id,
    amount: Math.round(hold.amount),
    wallet: hold.wallet,
    status,
    createdAt: hold.createdAt,
  }, ...requests].slice(0, 20);
}

/** Apply the server's withdrawal list to one ledger. Safe to call again. */
export function mergeHolds(ledger: CrumbLedger, holds: CrumbHold[]): CrumbLedger {
  const seeded = seedApplied(ledger);
  let balance = seeded.balance;
  let requests = seeded.requests.slice();
  const applied = { ...seeded.applied };
  for (const hold of holds) {
    const amount = Math.round(hold.amount);
    if (!Number.isFinite(hold.id) || amount <= 0) continue;
    const key = String(hold.id);
    const mark = applied[key];
    if (hold.status === "rejected") {
      if (mark === "held") balance = round8(balance + amount);
      applied[key] = "returned";
      requests = remember(requests, hold, "rejected");
      continue;
    }
    const status = hold.status === "paid" ? "paid" : "pending";
    if (mark !== "held" && mark !== "returned") {
      balance = round8(Math.max(0, balance - amount));
      applied[key] = "held";
    }
    requests = remember(requests, hold, status);
  }
  return { ...seeded, balance: round8(Math.max(0, balance)), requests, applied };
}

/**
 * The phone pushes its whole wallet. Keep new farmed Crumbs, and put a hold
 * back if that push arrived from before the hold was saved.
 */
export function mergeLedgers(prev: CrumbLedger, incoming: CrumbLedger, holds: CrumbHold[]): CrumbLedger {
  const older = seedApplied(prev);
  const newer = seedApplied(incoming);
  let balance = newer.balance;
  const applied: CrumbLedger["applied"] = { ...newer.applied };
  for (const hold of holds) {
    const key = String(hold.id);
    const amount = Math.round(hold.amount);
    if (amount <= 0) continue;
    const before = older.applied[key];
    const after = newer.applied[key];
    if (hold.status === "rejected") {
      if (before === "returned" || after === "returned") {
        applied[key] = "returned";
        if (before === "returned" && after === "held") balance = round8(balance + amount);
      } else if (before === "held" || after === "held") {
        balance = round8(balance + amount);
        applied[key] = "returned";
      } else {
        applied[key] = "returned";
      }
      continue;
    }
    if (before === "held" && after !== "held") balance = round8(Math.max(0, balance - amount));
    if (before === "held" || after === "held") applied[key] = "held";
  }
  return mergeHolds({ ...newer, balance: round8(Math.max(0, balance)), applied }, holds);
}
