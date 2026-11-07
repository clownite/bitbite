export type PetId = "dolphin" | "finch" | "lynx" | "stag";
type PetLevel = 1 | 5 | 10;

export type PetElement = {
  id: "water" | "air" | "earth" | "forest";
  label: string;
  color: string;
};

export type PetDef = {
  id: PetId;
  name: string;
  element: PetElement;
  /** GRAM to unlock. The dolphin is free. */
  price: number;
  /** Crumbs per day at level 1, 5 and 10. Level 5 is half the final, level 10 is the final. */
  rates: Record<PetLevel, number>;
  note: string;
};

/**
 * Level 1 is the starting farm, level 5 is half the final, level 10 is the final.
 * Paid pets: Finch 1.50, Lynx 3.50, Stag 9.00 Crumbs a day at level 10.
 */
export const PETS: PetDef[] = [
  {
    id: "dolphin",
    name: "Dolphin",
    element: { id: "water", label: "Water", color: "#7ad7ff" },
    price: 0,
    rates: { 1: 0.05, 5: 0.15, 10: 0.3 },
    note: "Free. Today it farms 0.05 a day, so 1 Crumb takes 20 days. Level 10 is the goal, after the XP season and 9 GRAM.",
  },
  {
    id: "finch",
    name: "Finch",
    element: { id: "air", label: "Air", color: "#d7ecff" },
    price: 45,
    rates: { 1: 0.25, 5: 0.75, 10: 1.5 },
    note: "Today it farms 0.25 a day. At this rate 45 GRAM comes back in 180 days. Level 10 is the goal, after the XP season and 9 GRAM.",
  },
  {
    id: "lynx",
    name: "Lynx",
    element: { id: "earth", label: "Earth", color: "#e7b56a" },
    price: 90,
    rates: { 1: 3.5 / 6, 5: 1.75, 10: 3.5 },
    note: "Today it farms 0.583 a day. At this rate 90 GRAM comes back in 154 days. Level 10 is the goal, after the XP season and 9 GRAM.",
  },
  {
    id: "stag",
    name: "Stag",
    element: { id: "forest", label: "Forest", color: "#8dcea0" },
    price: 250,
    rates: { 1: 1.5, 5: 4.5, 10: 9 },
    note: "Today it farms 1.50 a day. At this rate 250 GRAM comes back in 167 days. Level 10 is the goal, after the XP season and 9 GRAM.",
  },
];

export function petDef(id: PetId): PetDef {
  return PETS.find((p) => p.id === id) ?? PETS[0];
}

/** Production stays on three steps. Levels 1–4 use level 1, 5–9 use level 5, 10 uses level 10. */
export function farmTier(level: number): PetLevel {
  if (level >= 10) return 10;
  if (level >= 5) return 5;
  return 1;
}

export function dailyFarm(id: PetId, level: number): number {
  return petDef(id).rates[farmTier(level)];
}

/** Two decimals, or three when the rate does not land on a hundredth. */
export function formatRate(rate: number): string {
  const thousandths = Math.round(rate * 1000) / 1000;
  const text = thousandths.toFixed(3).replace(/0+$/, "");
  const [whole, frac = ""] = text.split(".");
  return `${whole}.${frac.padEnd(2, "0")}`;
}

/** How long the current rate needs to produce 1 Crumb, the minimum withdrawal. */
export function timeForOneCrumb(rate: number): string {
  const days = 1 / rate;
  if (days >= 10) return `${Math.round(days)} days`;
  if (days >= 1) return `${days.toFixed(1)} days`;
  return `${(days * 24).toFixed(1)} hours`;
}
