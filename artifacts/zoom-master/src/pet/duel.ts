import { petCombat, petDef, type PetId } from "./catalog";

/** A 1v1 exchange. Stats shade the hit. The move you answer with decides who is hurt. */

export type Side = "you" | "foe";
export type Move = "jab" | "guard" | "power";
export type Call = "counter" | "block" | "clash" | "poke" | "clean" | "whiff";

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
  /** The next hit this fighter takes is softer. Set by a guard, spent on the next attack. */
  braced: boolean;
};

export type Exchange = {
  you: Fighter;
  foe: Fighter;
  youDealt: number;
  foeDealt: number;
  call: Call;
  tide: boolean;
  buff: Fighter["ability"] | null;
};

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
    braced: false,
  };
}

/** One pet attacks. Guard deals nothing and braces the next hit. A missed turn deals nothing. */
export function strike(
  att: Fighter,
  def: Fighter,
  move: Move | null,
): { att: Fighter; def: Fighter; damage: number; call: Call; tide: boolean; buff: Fighter["ability"] | null } {
  const a: Fighter = { ...att };
  const b: Fighter = { ...def };
  if (move == null) {
    return { att: a, def: b, damage: 0, call: "whiff", tide: false, buff: null };
  }
  if (move === "guard") {
    a.braced = true;
    return { att: a, def: b, damage: 0, call: "block", tide: false, buff: null };
  }
  const landed = b.braced ? "half" : "full";
  b.braced = false;
  const hit = soak(a, b, move, landed);
  return {
    att: a,
    def: b,
    damage: hit.damage,
    call: move === "jab" ? "poke" : "clean",
    tide: hit.tide,
    buff: hit.buff,
  };
}

/** How long the startup stays open. A faster foe leaves a shorter read. */
export function readWindow(youSpeed: number, foeSpeed: number): number {
  const edge = foeSpeed - youSpeed;
  return Math.round(Math.min(1400, Math.max(860, 1180 - edge * 5)));
}

/** When the foe's move name appears. A faster foe shows it later. */
export function tellDelay(youSpeed: number, foeSpeed: number): number {
  const edge = Math.max(0, foeSpeed - youSpeed);
  return Math.min(680, Math.round(220 + edge * 7));
}

/** The foe answers your previous move about half the time, and mixes the rest. */
export function foeMove(lastYours: Move | null, rng: () => number): Move {
  const answer: Record<Move, Move> = { jab: "power", power: "guard", guard: "jab" };
  if (lastYours && rng() < 0.55) return answer[lastYours];
  const bag: Move[] = ["jab", "power", "guard"];
  return bag[Math.floor(rng() * bag.length)];
}

/** Guard stops a heavy. A heavy stops a fast poke. A fast poke breaks a guard. */
function beats(a: Move, b: Move): "win" | "lose" | "tie" {
  if (a === b) return "tie";
  if (a === "guard" && b === "power") return "win";
  if (a === "power" && b === "jab") return "win";
  if (a === "jab" && b === "guard") return "win";
  return "lose";
}

function soak(
  att: Fighter,
  def: Fighter,
  move: Move,
  landed: "full" | "chip" | "half",
): { damage: number; tide: boolean; buff: Fighter["ability"] | null } {
  let spa = att.power;
  let buff: Fighter["ability"] | null = null;
  if ((att.ability === "blaze" || att.ability === "overgrow") && att.hp * 2 <= att.max) {
    spa *= 1.28;
    buff = att.ability;
  }
  const gap = Math.max(-4, Math.min(8, (spa - def.guard) * 0.12));
  const mul = move === "jab" ? 0.7 : 1.4;
  let damage = Math.max(1, Math.round((8 + gap) * mul));
  if (att.ability === "surge" && att.speed > def.speed && move === "power" && landed === "full") {
    damage = Math.round(damage * 1.18);
    buff = "surge";
  }
  if (landed === "chip") damage = Math.max(1, Math.round(damage * 0.22));
  if (landed === "half") damage = Math.max(1, Math.round(damage * 0.55));
  let tide = false;
  if (def.ability === "tide" && !def.shielded) {
    damage = Math.max(1, Math.round(damage * 0.72));
    def.shielded = true;
    tide = true;
  }
  def.hp = Math.max(0, def.hp - damage);
  return { damage, tide, buff };
}

/** One exchange. A missed answer eats the foe's move clean. */
export function resolve(you: Fighter, foe: Fighter, yours: Move | null, theirs: Move): Exchange {
  const a = { ...you };
  const b = { ...foe };
  if (!yours) {
    const hit = soak(b, a, theirs, "full");
    return { you: a, foe: b, youDealt: 0, foeDealt: hit.damage, call: "whiff", tide: hit.tide, buff: hit.buff };
  }
  const rel = beats(yours, theirs);
  if (rel === "tie") {
    if (yours === "guard") {
      return { you: a, foe: b, youDealt: 0, foeDealt: 0, call: "block", tide: false, buff: null };
    }
    const left = soak(a, b, yours, "half");
    const right = soak(b, a, theirs, "half");
    return {
      you: a,
      foe: b,
      youDealt: left.damage,
      foeDealt: right.damage,
      call: "clash",
      tide: left.tide || right.tide,
      buff: left.buff ?? right.buff,
    };
  }
  if (rel === "win") {
    if (yours === "guard") {
      const riposte = soak(a, b, "jab", "full");
      return { you: a, foe: b, youDealt: riposte.damage, foeDealt: 0, call: "counter", tide: riposte.tide, buff: riposte.buff };
    }
    const hit = soak(a, b, yours, "full");
    return {
      you: a,
      foe: b,
      youDealt: hit.damage,
      foeDealt: 0,
      call: yours === "jab" ? "poke" : "counter",
      tide: hit.tide,
      buff: hit.buff,
    };
  }
  if (theirs === "guard") {
    const riposte = soak(b, a, "jab", "full");
    return { you: a, foe: b, youDealt: 0, foeDealt: riposte.damage, call: "clean", tide: riposte.tide, buff: riposte.buff };
  }
  const hit = soak(b, a, theirs, "full");
  return { you: a, foe: b, youDealt: 0, foeDealt: hit.damage, call: "clean", tide: hit.tide, buff: hit.buff };
}
