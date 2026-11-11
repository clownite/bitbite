import type { PetId } from "./catalog";

/** Where each pet lives. The card clock uses the player's country, and this one beside it. */
export const PET_HOME: Record<PetId, { place: string; zone: string }> = {
  dolphin: { place: "Positano", zone: "Europe/Rome" },
  finch: { place: "Kyoto", zone: "Asia/Tokyo" },
  lynx: { place: "Rovaniemi", zone: "Europe/Helsinki" },
  stag: { place: "Innsbruck", zone: "Europe/Vienna" },
};

export function formatClock(now: number, zone: string): string {
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: zone };
  try {
    return new Intl.DateTimeFormat("en-GB", opts).format(new Date(now));
  } catch {
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(now));
  }
}

/** The player's clock: the country where this phone plays. */
export function playerClock(now = Date.now()): { place: string; time: string } {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const place = zone.split("/").pop()?.replace(/_/g, " ") || zone;
  return { place, time: formatClock(now, zone) };
}
