import { Router, type IRouter, type Request } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { VerifiedTgUser } from "../lib/telegram-auth";

function getTgUser(req: Request): VerifiedTgUser | null {
  return (req as Request & { tgUser?: VerifiedTgUser | null }).tgUser ?? null;
}

const router: IRouter = Router();

const KEYS = [
  "biscotto-pet-v4",
  "biscotto-crumbs-v2",
  "biscotto-life-v2",
  "biscotto-life-archive-v1",
  "biscotto-care-v1",
  "biscotto-quests-v1",
] as const;

type Bag = Partial<Record<(typeof KEYS)[number], string>> & { updatedAt?: number };

function allowed(raw: unknown): Bag | null {
  if (!raw || typeof raw !== "object") return null;
  const src = raw as Record<string, unknown>;
  const bag: Bag = {};
  for (const key of KEYS) {
    const value = src[key];
    if (typeof value === "string" && value.length < 200_000) bag[key] = value;
  }
  const updatedAt = Number(src.updatedAt);
  if (Number.isFinite(updatedAt) && updatedAt > 0) bag.updatedAt = updatedAt;
  return bag;
}

function samePlayer(req: Request, telegramId: string): boolean {
  const tg = getTgUser(req);
  return !tg || tg.id === telegramId;
}

router.get("/pet/save", async (req, res) => {
  const telegramId = String(req.query.telegramId || "");
  if (!telegramId || !samePlayer(req, telegramId)) return res.status(400).json({ ok: false });
  try {
    const [row] = await db
      .select({ petSave: usersTable.petSave })
      .from(usersTable)
      .where(eq(usersTable.telegramId, telegramId))
      .limit(1);
    const bag = (row?.petSave ?? null) as Bag | null;
    res.json({ ok: true, updatedAt: bag?.updatedAt ?? 0, bags: bag });
  } catch {
    res.status(500).json({ ok: false });
  }
});

router.post("/pet/save", async (req, res) => {
  const telegramId = String(req.body?.telegramId || "");
  const bag = allowed(req.body?.save);
  if (!telegramId || !bag || !samePlayer(req, telegramId)) return res.status(400).json({ ok: false });
  const save = { ...bag, updatedAt: Date.now() };
  try {
    const updated = await db
      .update(usersTable)
      .set({ petSave: save })
      .where(eq(usersTable.telegramId, telegramId))
      .returning({ telegramId: usersTable.telegramId });
    if (!updated.length) {
      await db.insert(usersTable).values({ telegramId, petSave: save });
    }
    res.json({ ok: true, updatedAt: save.updatedAt });
  } catch {
    res.status(500).json({ ok: false });
  }
});

export default router;
