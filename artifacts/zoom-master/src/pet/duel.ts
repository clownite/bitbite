import { petCombat, petDef, type PetId } from "./catalog";

/** A practice strike. The same numbers will face another player once the bot can pair them. */

export type Side = "you" | "foe";

export type Fighter = {
  id: PetId;
  name: string;
  hp: number;
  max: number;
  power: number;
  guard: number;
  speed: number;
  ability: "tide" | "blaze" | "overgrow" | "surge";
  shielded: boolean;
};

export type Blow = { side: Side; damage: number; guard: boolean };

function abilityOf(id: PetId): Fighter["ability"] {
  if (id === "finch") return "blaze";
  if (id === "lynx") return "overgrow";
  if (id === "stag") return "surge";
  return "tide";
}

export function makeFighter(id: PetId, level: number): Fighter {
  const def = petDef(id);
  const stats = petCombat(def, level);
  return {
    id,
    name: def.name,
    hp: stats.hp,
    max: stats.hp,
    power: stats.specialAttack,
    guard: stats.specialDefense,
    speed: stats.speed,
    ability: abilityOf(id),
    shielded: false,
  };
}

/** Both strike, the faster one first. A pet at 0 HP does not answer. */
export function exchange(you: Fighter, foe: Fighter): Blow[] {
  const blows: Blow[] = [];
  const order: [Fighter, Fighter, Side][] = you.speed >= foe.speed
    ? [[you, foe, "you"], [foe, you, "foe"]]
    : [[foe, you, "foe"], [you, foe, "you"]];
  for (const [att, def, side] of order) {
    if (att.hp <= 0 || def.hp <= 0) continue;
    const blow = strike(att, def);
    blows.push({ side, damage: blow.damage, guard: blow.guard });
  }
  return blows;
}

function strike(att: Fighter, def: Fighter): { damage: number; guard: boolean } {
  let power = att.power;
  if ((att.ability === "blaze" || att.ability === "overgrow") && att.hp * 2 < att.max) power *= 1.35;
  if (att.ability === "surge" && att.speed >= def.speed) power *= 1.25;
  let damage = Math.max(1, Math.round((power * 1.15 - def.guard * 0.45) / 3));
  let guard = false;
  if (def.ability === "tide" && !def.shielded) {
    damage = Math.max(1, Math.round(damage * 0.7));
    def.shielded = true;
    guard = true;
  }
  def.hp = Math.max(0, def.hp - damage);
  return { damage, guard };
}
