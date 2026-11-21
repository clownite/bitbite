import { usersTable, tonWithdrawalsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { mergeHolds, mergeLedgers, parseLedger, type CrumbHold, type CrumbLedger } from "./crumbLedger";

const KEY = "biscotto-crumbs-v2";

type Bag = Record<string, unknown> & { updatedAt?: number };
type Sql = Pick<typeof import("@workspace/db").db, "select" | "update">;

function bagOf(value: unknown): Bag {
  return value && typeof value === "object" ? { ...(value as Bag) } : {};
}

function ledgerOf(bag: Bag): CrumbLedger {
  const raw = bag[KEY];
  return parseLedger(typeof raw === "string" ? raw : null);
}

export async function crumbHolds(tx: Sql, telegramId: string): Promise<CrumbHold[]> {
  const rows = await tx
    .select({
      id: tonWithdrawalsTable.id,
      amountTon: tonWithdrawalsTable.amountTon,
      walletAddress: tonWithdrawalsTable.walletAddress,
      status: tonWithdrawalsTable.status,
      txHash: tonWithdrawalsTable.txHash,
      createdAt: tonWithdrawalsTable.createdAt,
    })
    .from(tonWithdrawalsTable)
    .where(eq(tonWithdrawalsTable.telegramId, telegramId));
  return rows.flatMap((row) => {
    if (row.txHash !== "crumbs") return [];
    const status = row.status === "paid" || row.status === "rejected" ? row.status : "pending";
    return [{
      id: row.id,
      amount: Number(row.amountTon),
      wallet: row.walletAddress,
      status,
      createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : Date.now(),
    } satisfies CrumbHold];
  });
}

/** Rewrite the saved wallet so a synced phone cannot put a held withdrawal back. */
export async function settleIncomingBag(tx: Sql, telegramId: string, incoming: Bag): Promise<Bag> {
  const [row] = await tx
    .select({ petSave: usersTable.petSave })
    .from(usersTable)
    .where(eq(usersTable.telegramId, telegramId))
    .for("update")
    .limit(1);
  const prev = bagOf(row?.petSave);
  const holds = await crumbHolds(tx, telegramId);
  const raw = incoming[KEY];
  const incomingLedger = parseLedger(typeof raw === "string" ? raw : (typeof prev[KEY] === "string" ? prev[KEY] : null));
  const ledger = mergeLedgers(ledgerOf(prev), incomingLedger, holds);
  return { ...incoming, [KEY]: JSON.stringify(ledger), updatedAt: Date.now() };
}

/** After a withdrawal changes state, fold that state into the saved wallet. */
export async function reapplyCrumbBag(tx: Sql, telegramId: string): Promise<number> {
  const [row] = await tx
    .select({ petSave: usersTable.petSave })
    .from(usersTable)
    .where(eq(usersTable.telegramId, telegramId))
    .for("update")
    .limit(1);
  const prev = bagOf(row?.petSave);
  const holds = await crumbHolds(tx, telegramId);
  const ledger = mergeHolds(ledgerOf(prev), holds);
  const updatedAt = Date.now();
  const save = { ...prev, [KEY]: JSON.stringify(ledger), updatedAt };
  if (row) {
    await tx.update(usersTable).set({ petSave: save }).where(eq(usersTable.telegramId, telegramId));
  }
  return updatedAt;
}
