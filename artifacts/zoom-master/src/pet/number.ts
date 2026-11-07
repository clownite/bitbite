import type { PetId } from "./catalog";
import { getBrowserDevTelegramId, getVerifiedTelegramUserId } from "../utils/telegram";

const LOCAL_OWNER_KEY = "zoom-pet-owner";
const PET_ORDER: PetId[] = ["dolphin", "finch", "lynx", "stag"];

/**
 * Who this pet belongs to. A Telegram id when the Mini App has one,
 * otherwise a code kept on this device so a browser preview still has its own numbers.
 */
export function petOwnerId(explicit?: string | null): string {
  const given = explicit?.trim();
  if (given) return given;
  const live = getVerifiedTelegramUserId() ?? getBrowserDevTelegramId();
  if (live) return live;
  return localOwnerId();
}

function localOwnerId(): string {
  try {
    const existing = localStorage.getItem(LOCAL_OWNER_KEY);
    if (existing && /^[a-z0-9-]{8,80}$/i.test(existing)) return existing;
    const next = `local-${crypto.randomUUID()}`;
    localStorage.setItem(LOCAL_OWNER_KEY, next);
    return next;
  } catch {
    return "local-guest";
  }
}

function mix(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Personal tag for this player's copy of a pet. Same player and pet always
 * get the same tag. Another player, or another pet, gets a different one.
 * Six digits, because three would repeat once more than 999 players exist.
 */
export function personalPetNumber(ownerId: string, petId: PetId): string {
  const used = new Set<number>();
  let chosen = 0;
  for (const id of PET_ORDER) {
    let n = mix(`${ownerId}:${id}`) % 1_000_000;
    while (used.has(n)) n = (n + 1) % 1_000_000;
    used.add(n);
    if (id === petId) chosen = n;
  }
  return `#${String(chosen).padStart(6, "0")}`;
}
