/** The pet stays on the ground. Cookies and bombs fall. A tap ducks. */

export const SERIES = 8;
export const DUCK_S = 0.45;
/** The line where a falling thing meets the pet. */
export const GRAB_Y = 0.78;
export const PLAY_SPAN = 3.2;
export const PLAY_CAM = 2 * Math.tan((32 * Math.PI) / 180 / 2) * 10;
/** World Y so the feet sit on the arena floor, not in the air. */
export const PLAY_BASE_Y = -1.55;
const FALL = 0.32;
const GAP = 1.2;

export type DropKind = "cookie" | "bomb";

export type Drop = {
  id: number;
  kind: DropKind;
  y: number;
  vy: number;
  gone: "caught" | "dodged" | "boom" | null;
  ttl: number;
};

export type Run = {
  phase: "idle" | "play" | "clear" | "boom";
  script: DropKind[];
  spawned: number;
  drops: Drop[];
  duckT: number;
  score: number;
  untilSpawn: number;
  nextId: number;
  caughtThisTick: number;
  duckedThisTick: number;
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
    duckT: -1,
    score: 0,
    untilSpawn: 0.4,
    nextId: 1,
    caughtThisTick: 0,
    duckedThisTick: 0,
    bombedThisTick: 0,
  };
}

export function startRun(script = makeScript()): Run {
  return { ...freshRun(), phase: "play", script: script.slice(0, SERIES) };
}

export function requestDuck(run: Run): Run {
  if (run.phase !== "play") return run;
  if (run.duckT >= 0 && run.duckT < DUCK_S) return run;
  return { ...run, duckT: 0 };
}

export function ducking(run: Run): boolean {
  return run.duckT >= 0 && run.duckT < DUCK_S;
}

/** 0 upright, 1 at the bottom of the crouch. */
export function crouch(run: Run): number {
  if (!ducking(run)) return 0;
  return Math.sin((run.duckT / DUCK_S) * Math.PI);
}

export function stepRun(run: Run, dtIn: number): Run {
  if (run.phase !== "play") {
    return { ...run, caughtThisTick: 0, duckedThisTick: 0, bombedThisTick: 0 };
  }
  const dt = Math.min(0.05, Math.max(0, dtIn));
  let duckT = run.duckT;
  if (duckT >= 0) {
    duckT += dt;
    if (duckT >= DUCK_S) duckT = -1;
  }
  const low = duckT >= 0 && duckT < DUCK_S;
  let score = run.score;
  let caughtThisTick = 0;
  let duckedThisTick = 0;
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
    if (drop.y < GRAB_Y && y >= GRAB_Y) {
      if (drop.kind === "bomb") {
        if (low) {
          duckedThisTick += 1;
          drops.push({ ...drop, y: GRAB_Y, gone: "dodged", ttl: 0.35 });
        } else {
          bombedThisTick += 1;
          phase = "boom";
          drops.push({ ...drop, y: GRAB_Y, gone: "boom", ttl: 0.6 });
        }
      } else if (low) {
        duckedThisTick += 1;
        drops.push({ ...drop, y: GRAB_Y, gone: "dodged", ttl: 0.35 });
      } else {
        score += 1;
        caughtThisTick += 1;
        drops.push({ ...drop, y: GRAB_Y, gone: "caught", ttl: 0.4 });
      }
      continue;
    }
    drops.push({ ...drop, y });
  }

  let spawned = run.spawned;
  let untilSpawn = run.untilSpawn - dt;
  let nextId = run.nextId;
  const alive = drops.filter((drop) => !drop.gone).length;
  if (phase === "play" && untilSpawn <= 0 && spawned < run.script.length && alive < 3) {
    drops.push({
      id: nextId,
      kind: run.script[spawned],
      y: -0.08,
      vy: FALL,
      gone: null,
      ttl: 0,
    });
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
    duckT,
    score,
    untilSpawn,
    nextId,
    caughtThisTick,
    duckedThisTick,
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
