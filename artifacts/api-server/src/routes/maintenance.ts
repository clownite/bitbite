import { Router, type IRouter, type Request } from "express";
import { db } from "@workspace/db";
import { appSettingsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const ADMIN_ID = "8144744644";
const KEY_ENABLED = "maintenance_enabled";
const KEY_MESSAGE = "maintenance_message";
const DEFAULT_MESSAGE = "We're upgrading the game. Back online shortly.";

async function readSettings(): Promise<{ enabled: boolean; message: string; updatedAt: number }> {
  const rows = await db
    .select()
    .from(appSettingsTable)
    .where(sql`${appSettingsTable.key} IN (${KEY_ENABLED}, ${KEY_MESSAGE})`);
  let enabled = false;
  let message = DEFAULT_MESSAGE;
  let updatedAt = 0;
  for (const r of rows) {
    if (r.key === KEY_ENABLED) {
      enabled = Number(r.valueNum ?? 0) === 1;
      updatedAt = Math.max(updatedAt, r.updatedAt.getTime());
    } else if (r.key === KEY_MESSAGE && r.valueText) {
      message = r.valueText;
      updatedAt = Math.max(updatedAt, r.updatedAt.getTime());
    }
  }
  return { enabled, message, updatedAt };
}

router.get("/maintenance/status", async (_req, res) => {
  try {
    const s = await readSettings();
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.json(s);
  } catch (err) {
    console.error("[maintenance/status] error:", err);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json({ enabled: false, message: DEFAULT_MESSAGE, updatedAt: 0 });
  }
});

const SUSPEND_PREFIX = "suspend:";
const DEFAULT_SUSPEND = "Questo account è sospeso.";

function suspendKey(telegramId: string): string {
  return `${SUSPEND_PREFIX}${telegramId}`;
}

const SetBody = z.object({
  adminId: z.string().min(1),
  enabled: z.boolean(),
  message: z.string().max(500).optional(),
});

router.post("/admin/maintenance", async (req, res) => {
  const parsed = SetBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: "Invalid body" });
  const { adminId, enabled, message } = parsed.data;
  // The body-only `adminId` check is NOT a security boundary: the admin id is
  // public (hardcoded), so anyone could send it. The real gate is the
  // cryptographically verified Telegram identity (`req.tgUser`), which an
  // attacker cannot forge without the bot token used for the initData HMAC.
  // Require BOTH: the verified user must exist AND be the admin. This holds
  // even if a route is missing from the protected list. Without this, the
  // endpoint was trivially exploitable.
  if (!req.tgUser || req.tgUser.id !== ADMIN_ID) {
    req.log?.warn(
      {
        path: req.path,
        verifiedId: req.tgUser?.id ?? null,
        claimedAdminId: adminId,
        ip: req.ip,
      },
      "[admin/maintenance] rejected: caller is not the verified admin",
    );
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  try {
    await db
      .insert(appSettingsTable)
      .values({ key: KEY_ENABLED, valueNum: enabled ? 1 : 0, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appSettingsTable.key,
        set: { valueNum: enabled ? 1 : 0, updatedAt: new Date() },
      });
    if (typeof message === "string" && message.trim().length > 0) {
      await db
        .insert(appSettingsTable)
        .values({ key: KEY_MESSAGE, valueText: message.trim(), updatedAt: new Date() })
        .onConflictDoUpdate({
          target: appSettingsTable.key,
          set: { valueText: message.trim(), updatedAt: new Date() },
        });
    }
    const s = await readSettings();
    res.json({ ok: true, ...s });
  } catch (err) {
    console.error("[admin/maintenance] error:", err);
    res.status(500).json({ ok: false, error: "Internal error" });
  }
});

function assertAdmin(req: Request, adminId: string): boolean {
  const verifiedId = (req as Request & { tgUser?: { id?: string } | null }).tgUser?.id ?? null;
  if (verifiedId === ADMIN_ID) return true;
  req.log?.warn(
    { path: req.path, verifiedId, claimedAdminId: adminId, ip: req.ip },
    "[admin] rejected: caller is not the verified admin",
  );
  return false;
}

router.get("/admin/whoami", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: req.tgUser?.id === ADMIN_ID });
});

router.get("/gate/status", async (req, res) => {
  const telegramId = String(req.query["telegramId"] ?? "");
  if (!/^\d{5,16}$/.test(telegramId) || telegramId === ADMIN_ID) {
    res.setHeader("Cache-Control", "no-store");
    res.json({ suspended: false, until: 0, message: "" });
    return;
  }
  try {
    const rows = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, suspendKey(telegramId)));
    const row = rows[0];
    const until = Number(row?.valueNum ?? 0);
    const suspended = until > Date.now();
    res.setHeader("Cache-Control", "no-store");
    res.json({
      suspended,
      until: suspended ? until : 0,
      message: suspended ? (row?.valueText || DEFAULT_SUSPEND) : "",
    });
  } catch (err) {
    console.error("[gate/status] error:", err);
    res.setHeader("Cache-Control", "no-store");
    res.json({ suspended: false, until: 0, message: "" });
  }
});

const SuspendBody = z.object({
  adminId: z.string().min(1),
  telegramId: z.string().regex(/^\d{5,16}$/),
  days: z.number().int().min(1).max(365),
  message: z.string().max(300).optional(),
});

router.post("/admin/suspend", async (req, res) => {
  const parsed = SuspendBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Invalid body" });
    return;
  }
  if (!assertAdmin(req, parsed.data.adminId)) {
    res.status(403).json({ ok: false, error: "Forbidden" });
    return;
  }
  const { telegramId, days, message } = parsed.data;
  if (telegramId === ADMIN_ID) {
    res.status(400).json({ ok: false, error: "Cannot suspend admin" });
    return;
  }
  const until = Date.now() + days * 24 * 60 * 60 * 1000;
  const note = (message ?? "").trim() || DEFAULT_SUSPEND;
  try {
    await db
      .insert(appSettingsTable)
      .values({ key: suspendKey(telegramId), valueNum: until, valueText: note, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appSettingsTable.key,
        set: { valueNum: until, valueText: note, updatedAt: new Date() },
      });
    res.json({ ok: true, telegramId, until, days });
  } catch (err) {
    console.error("[admin/suspend] error:", err);
    res.status(500).json({ ok: false, error: "Internal error" });
  }
});

const ReleaseBody = z.object({
  adminId: z.string().min(1),
  telegramId: z.string().regex(/^\d{5,16}$/),
});

router.post("/admin/release", async (req, res) => {
  const parsed = ReleaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Invalid body" });
    return;
  }
  if (!assertAdmin(req, parsed.data.adminId)) {
    res.status(403).json({ ok: false, error: "Forbidden" });
    return;
  }
  try {
    await db.delete(appSettingsTable).where(eq(appSettingsTable.key, suspendKey(parsed.data.telegramId)));
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin/release] error:", err);
    res.status(500).json({ ok: false, error: "Internal error" });
  }
});

export default router;
