import { db, usersTable, appSettingsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "./logger";
import { sendBotMessageStatus } from "./notify";

const PET_AWAY_MS = 3 * 24 * 60 * 60 * 1000;
const PET_NEED_MS = 45 * 60 * 1000;
const PET_BOWL_MS = 10 * 60 * 60 * 1000;
const PET_SICK_MS = 2 * 60 * 60 * 1000;
const PAGE = 80;
const CURSOR_KEY = "pet-note-cursor";

const PET_NOTE: Record<string, string> = {
  away: "You have not opened BitBite for a few days. Your pet is waiting for you.",
  sick: "Your pet is sick. Open BitBite and help it.",
  hungry: "Your pet is hungry. Open BitBite and feed it.",
  messy: "Your pet needs a clean. Open BitBite when you can.",
};

type PetBag = {
  updatedAt?: number;
  "biscotto-care-v1"?: string;
  "biscotto-pet-v4"?: string;
  "biscotto-life-v2"?: string;
};

function eggWaiting(bag: PetBag, now: number): boolean {
  try {
    const pet = JSON.parse(bag["biscotto-pet-v4"] || "") as { active?: string };
    const life = JSON.parse(bag["biscotto-life-v2"] || "") as Record<string, { bornAt?: number }>;
    const born = Number(life[pet.active || ""]?.bornAt) || 0;
    return born > 0 && now - born < 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/** The phone steps care while the app is open. Project the same clock here so a closed app can still be hungry. */
function petNeed(bag: PetBag, now: number): "sick" | "hungry" | "messy" | null {
  try {
    const raw = JSON.parse(bag["biscotto-care-v1"] || "") as {
      at?: number;
      bowl?: number;
      nextMessAt?: number;
      messes?: unknown[];
      sick?: boolean;
    };
    const at = Number(raw.at) || 0;
    const elapsed = Math.max(0, now - at);
    const bowl = Math.max(0, Number(raw.bowl) - elapsed / PET_BOWL_MS);
    const hadMess = Array.isArray(raw.messes) && raw.messes.length > 0;
    const messDue = hadMess || (Number(raw.nextMessAt) > 0 && Number(raw.nextMessAt) <= now);
    const hungry = bowl <= 0.05;
    const sick = raw.sick === true || (hungry && messDue && elapsed >= PET_SICK_MS);
    if (sick) return "sick";
    if (hungry) return "hungry";
    if (messDue) return "messy";
  } catch { /**/ }
  return null;
}

/**
 * One page of players per call, then the next page, so nobody is stuck
 * behind the same first rows. A need is sent once after 45 minutes away.
 * The same note is not sent again for the same visit. An absence note
 * goes out after three days. Nothing is sent when the pet is fine.
 */
export async function runPetNotes(): Promise<{ checked: number; sent: number }> {
  const [mark] = await db
    .select({ valueNum: appSettingsTable.valueNum })
    .from(appSettingsTable)
    .where(eq(appSettingsTable.key, CURSOR_KEY))
    .limit(1);
  const offset = Math.max(0, Number(mark?.valueNum) || 0);
  const page = (start: number) => db
    .select({ telegramId: usersTable.telegramId, petSave: usersTable.petSave })
    .from(usersTable)
    .where(sql`${usersTable.petSave} is not null`)
    .orderBy(usersTable.telegramId)
    .offset(start)
    .limit(PAGE);
  let rows = await page(offset);
  let nextOffset = rows.length < PAGE ? 0 : offset + rows.length;
  if (rows.length === 0 && offset > 0) {
    rows = await page(0);
    nextOffset = rows.length < PAGE ? 0 : rows.length;
  }
  if (mark) {
    await db.update(appSettingsTable).set({ valueNum: nextOffset, updatedAt: new Date() }).where(eq(appSettingsTable.key, CURSOR_KEY));
  } else {
    await db.insert(appSettingsTable).values({ key: CURSOR_KEY, valueNum: nextOffset, valueText: "" });
  }

  const now = Date.now();
  let sent = 0;
  for (const row of rows) {
    if (!/^\d{5,16}$/.test(row.telegramId)) continue;
    const bag = (row.petSave ?? null) as PetBag | null;
    const seen = Number(bag?.updatedAt) || 0;
    if (!bag || seen <= 0) continue;
    const away = now - seen;
    const reason = away >= PET_AWAY_MS ? "away" : away >= PET_NEED_MS && !eggWaiting(bag, now) ? petNeed(bag, now) : null;
    if (!reason) continue;
    const stamp = `${seen}:${reason}`;
    const key = `pet-note:${row.telegramId}`;
    const [prev] = await db
      .select({ valueText: appSettingsTable.valueText })
      .from(appSettingsTable)
      .where(eq(appSettingsTable.key, key))
      .limit(1);
    if (prev?.valueText === stamp) continue;
    const result = await sendBotMessageStatus(row.telegramId, PET_NOTE[reason]);
    if (result === "fail") continue;
    if (prev) {
      await db.update(appSettingsTable).set({ valueText: stamp, updatedAt: new Date() }).where(eq(appSettingsTable.key, key));
    } else {
      await db.insert(appSettingsTable).values({ key, valueText: stamp, valueNum: now });
    }
    sent += 1;
    if (result === "ok") logger.info({ telegramId: row.telegramId, reason }, "[pet-cron] sent");
  }
  return { checked: rows.length, sent };
}
