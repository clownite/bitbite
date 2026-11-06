export type PetId = "dolphin" | "finch" | "lynx" | "stag";
type PetLevel = 1 | 5 | 10;

export type PetDef = {
  id: PetId;
  name: string;
  /** GRAM to unlock. The dolphin is free. */
  price: number;
  /** Crumbs per day at level 1, 5 and 10. Level 5 is ×3, level 10 is ×6. */
  rates: Record<PetLevel, number>;
  note: string;
};

/**
 * Same shape on every pet: level 5 farms ×3, level 10 farms ×6.
 * A purchase pays itself back in about 8–9 weeks of the extra farm at level 1.
 * One Crumb is still the minimum withdrawal, so even the stag needs 2.5 days at level 1.
 */
export const PETS: PetDef[] = [
  {
    id: "dolphin",
    name: "Dolphin",
    price: 0,
    rates: { 1: 0.05, 5: 0.15, 10: 0.3 },
    note: "Starter. 20 days of farming for 1 Crumb.",
  },
  {
    id: "finch",
    name: "Finch",
    price: 3,
    rates: { 1: 0.1, 5: 0.3, 10: 0.6 },
    note: "×2 the dolphin. The 3 GRAM price comes back in 60 days.",
  },
  {
    id: "lynx",
    name: "Lynx",
    price: 8,
    rates: { 1: 0.2, 5: 0.6, 10: 1.2 },
    note: "×4 the dolphin. The 8 GRAM price comes back in 53 days.",
  },
  {
    id: "stag",
    name: "Stag",
    price: 20,
    rates: { 1: 0.4, 5: 1.2, 10: 2.4 },
    note: "×8 the dolphin. The 20 GRAM price comes back in 57 days.",
  },
];

export function petDef(id: PetId): PetDef {
  return PETS.find((p) => p.id === id) ?? PETS[0];
}

export function dailyFarm(id: PetId, level: PetLevel): number {
  return petDef(id).rates[level];
}

/** How long the current rate needs to produce 1 Crumb, the minimum withdrawal. */
export function timeForOneCrumb(rate: number): string {
  const days = 1 / rate;
  if (days >= 10) return `${Math.round(days)} days`;
  if (days >= 1) return `${days.toFixed(1)} days`;
  return `${(days * 24).toFixed(1)} hours`;
}
