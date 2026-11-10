/** Cookies score only when tapped in the air. A bomb ends the run only if it is tapped. */

export const SERIES = 8;
/** A drop that reaches this screen fraction has fallen. */
export const FLOOR_Y = 0.9;
export const PLAY_SPAN = 3.2;
export const PLAY_CAM = 2 * Math.tan((32 * Math.PI) / 180 / 2) * 10;
/** World Y so the feet sit on the arena floor, not in the air. */
export const PLAY_BASE_Y = -1.55;
const FALL = 0.52;
const GAP = 0.85;

export type DropKind = "cookie" | "bomb";

export type Drop = {
  id: number;
  kind: DropKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gone: "caught" | "miss" | "boom" | null;
  ttl: number;
};

export type Run = {
  phase: "idle" | "play" | "clear" | "boom";
  script: DropKind[];
  spawned: number;
  drops: Drop[];
  score: number;
  untilSpawn: number;
  nextId: number;
  caughtThisTick: number;
  bombedThisTick: number;
};

/** First drop is a cookie. Three bombs sit in the rest of the series, with a cookie between them. */
export function makeScript(random = Math.random): DropKind[] {
  const script: DropKind[] = Array.from({ length: SERIES }, () => "cookie");
  const shift = random() < 0.5 ? 0 : 1;
  for (const slot of [2, 4, 6]) script[Math.min(SERIES - 1, slot + shift)] = "bomb";
  return script;
}

export function freshRun(): Run {
  return {
    phase: "idle",
    script: [],
    spawned: 0,
    drops: [],
    score: 0,
    untilSpawn: 0.4,
    nextId: 1,
    caughtThisTick: 0,
    bombedThisTick: 0,
  };
}

/** A cookie tapped in the air scores. A tapped bomb ends the run. A bomb left alone does not. */
export function tapDrop(run: Run, id: number): Run {
  if (run.phase !== "play") return run;
  const hit = run.drops.find((drop) => drop.id === id && !drop.gone);
  if (!hit || hit.y >= FLOOR_Y) return run;
  if (hit.kind === "bomb") {
    return {
      ...run,
      phase: "boom",
      bombedThisTick: 1,
      drops: run.drops.map((drop) => (drop.id === id ? { ...drop, gone: "boom", ttl: 0.45 } : drop)),
    };
  }
  return {
    ...run,
    score: run.score + 1,
    caughtThisTick: 1,
    drops: run.drops.map((drop) => (drop.id === id ? { ...drop, gone: "caught", ttl: 0.35 } : drop)),
  };
}

/** Right to left, left to right, and a sideways drift from above. */
function launch(kind: DropKind, id: number): Drop {
  const roll = Math.random();
  let x = 0.5;
  let vx = 0;
  if (roll < 0.42) {
    x = 0.86 + Math.random() * 0.2;
    vx = -(0.22 + Math.random() * 0.2);
  } else if (roll < 0.7) {
    x = -0.06 + Math.random() * 0.16;
    vx = 0.22 + Math.random() * 0.2;
  } else {
    x = 0.18 + Math.random() * 0.64;
    vx = (Math.random() < 0.5 ? -1 : 1) * (0.16 + Math.random() * 0.26);
  }
  return {
    id,
    kind,
    x,
    y: -0.08,
    vx,
    vy: FALL + Math.random() * 0.16,
    gone: null,
    ttl: 0,
  };
}

export function startRun(script = makeScript()): Run {
  return { ...freshRun(), phase: "play", script: script.slice(0, SERIES) };
}

export function stepRun(run: Run, dtIn: number): Run {
  if (run.phase !== "play") {
    return { ...run, caughtThisTick: 0, bombedThisTick: 0 };
  }
  const dt = Math.min(0.05, Math.max(0, dtIn));
  let score = run.score;
  let caughtThisTick = 0;
  let bombedThisTick = 0;
  let phase: Run["phase"] = "play";
  const drops: Drop[] = [];
  for (const drop of run.drops) {
    if (drop.gone) {
      const ttl = drop.ttl - dt;
      if (ttl > 0) drops.push({ ...drop, ttl });
      continue;
    }
    const y = drop.y + drop.vy * dt;
    const x = drop.x + drop.vx * dt;
    if (y >= FLOOR_Y || x < -0.14 || x > 1.14) {
      drops.push({ ...drop, x, y: Math.min(y, FLOOR_Y), gone: "miss", ttl: 0.28 });
      continue;
    }
    drops.push({ ...drop, x, y });
  }

  let spawned = run.spawned;
  let untilSpawn = run.untilSpawn - dt;
  let nextId = run.nextId;
  const alive = drops.filter((drop) => !drop.gone).length;
  if (phase === "play" && untilSpawn <= 0 && spawned < run.script.length && alive < 3) {
    drops.push(launch(run.script[spawned], nextId));
    nextId += 1;
    spawned += 1;
    untilSpawn = GAP;
  }

  if (phase === "play" && spawned >= run.script.length && drops.every((drop) => drop.gone)) {
    phase = "clear";
  }

  return {
    ...run,
    phase,
    spawned,
    drops,
    score,
    untilSpawn,
    nextId,
    caughtThisTick,
    bombedThisTick,
  };
}

export function stagePoint(nx: number, ny: number, width: number, height: number): { left: number; top: number } {
  const x = (nx - 0.5) * PLAY_SPAN;
  return {
    left: width / 2 + (x * height) / PLAY_CAM,
    top: ny * height,
  };
}

export function rigX(nx: number): number {
  return (nx - 0.5) * PLAY_SPAN;
}
