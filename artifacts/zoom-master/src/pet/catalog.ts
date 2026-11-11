export type PetId = "dolphin" | "finch" | "lynx" | "stag";
type PetLevel = 1 | 5 | 10;

export type PetElement = {
  id: "water" | "fire" | "grass" | "electric";
  label: string;
  /** The real emoji, shown pixelated. */
  glyph: string;
  color: string;
};

export type PetCombat = {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
};

export type PetAbility = {
  name: string;
  /** What the power does in a duel. */
  text: string;
};

export type PetDef = {
  id: PetId;
  name: string;
  element: PetElement;
  ability: PetAbility;
  /** Level 1 value, then how much is added for each level after 1. */
  base: PetCombat;
  growth: PetCombat;
  /** GRAM to unlock. The dolphin is free. */
  price: number;
  /** Crumbs per day at level 1, 5 and 10. Level 5 is half the final, level 10 is the final. */
  rates: Record<PetLevel, number>;
  note: string;
};

/** Six battle stats. They rise with the pet's level and stop at level 10. */
export function petCombat(pet: PetDef, level: number): PetCombat {
  const steps = Math.min(10, Math.max(1, Math.floor(level))) - 1;
  const at = (base: number, growth: number) => base + growth * steps;
  return {
    hp: at(pet.base.hp, pet.growth.hp),
    attack: at(pet.base.attack, pet.growth.attack),
    defense: at(pet.base.defense, pet.growth.defense),
    specialAttack: at(pet.base.specialAttack, pet.growth.specialAttack),
    specialDefense: at(pet.base.specialDefense, pet.growth.specialDefense),
    speed: at(pet.base.speed, pet.growth.speed),
  };
}

/**
 * Level 1 is the starting farm, level 5 is half the final, level 10 is the final.
 * Paid pets: Emberin 1.50, Lynvyr 3.50, Cervolt 9.00 Crumbs a day at level 10.
 */
export const PETS: PetDef[] = [
  {
    id: "dolphin",
    name: "Aquin",
    element: { id: "water", label: "Water", glyph: "💧", color: "#7ad7ff" },
    ability: { name: "Tidewall", text: "The first hit in a battle deals less damage." },
    base: { hp: 48, attack: 40, defense: 46, specialAttack: 42, specialDefense: 48, speed: 38 },
    growth: { hp: 6, attack: 4, defense: 5, specialAttack: 4, specialDefense: 5, speed: 3 },
    price: 0,
    rates: { 1: 0.05, 5: 0.15, 10: 0.3 },
    note: "Free. Today it farms 0.05 a day, so 1 Crumb takes 20 days. Level 10 is the goal, after the XP season and 9 GRAM.",
  },
  {
    id: "finch",
    name: "Emberin",
    element: { id: "fire", label: "Fire", glyph: "🔥", color: "#ff7a3c" },
    ability: { name: "Blaze", text: "Below half HP, Fire moves hit harder." },
    base: { hp: 40, attack: 38, defense: 36, specialAttack: 52, specialDefense: 38, speed: 50 },
    growth: { hp: 4, attack: 3, defense: 3, specialAttack: 6, specialDefense: 3, speed: 5 },
    price: 45,
    rates: { 1: 0.25, 5: 0.75, 10: 1.5 },
    note: "Today it farms 0.25 a day. At this rate 45 GRAM comes back in 180 days. Level 10 is the goal, after the XP season and 9 GRAM.",
  },
  {
    id: "lynx",
    name: "Lynvyr",
    element: { id: "grass", label: "Grass", glyph: "🌿", color: "#7dce6a" },
    ability: { name: "Overgrow", text: "Below half HP, Grass moves hit harder." },
    base: { hp: 46, attack: 52, defense: 48, specialAttack: 36, specialDefense: 42, speed: 40 },
    growth: { hp: 5, attack: 6, defense: 5, specialAttack: 3, specialDefense: 4, speed: 4 },
    price: 90,
    rates: { 1: 3.5 / 6, 5: 1.75, 10: 3.5 },
    note: "Today it farms 0.583 a day. At this rate 90 GRAM comes back in 154 days. Level 10 is the goal, after the XP season and 9 GRAM.",
  },
  {
    id: "stag",
    name: "Cervolt",
    element: { id: "electric", label: "Electric", glyph: "⚡", color: "#ffe14a" },
    ability: { name: "Surge", text: "If it attacks first, the Electric move hits harder." },
    base: { hp: 38, attack: 40, defense: 34, specialAttack: 50, specialDefense: 36, speed: 56 },
    growth: { hp: 4, attack: 4, defense: 3, specialAttack: 6, specialDefense: 3, speed: 6 },
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
