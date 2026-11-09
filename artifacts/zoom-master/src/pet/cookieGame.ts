/** One-finger cookie jump. The pet walks. A tap hops. Cookies fall in that lane. */

export const WALK_MIN = 0.18;
export const WALK_MAX = 0.82;
export const JUMP_S = 0.48;
export const CATCH_X = 0.085;
/** Screen fraction where a jump can meet a cookie. Matches the pet's chest at the top of the hop. */
export const CATCH_Y0 = 0.4;
export const CATCH_Y1 = 0.56;
export const FLOOR_Y = 0.9;
export const LIVES = 3;
/** Rig travel from the center, in world units. Shared with the play stage. */
export const PLAY_SPAN = 3.2;
/** World units across the vertical view at fov 32° and camera z = 10. */
export const PLAY_CAM = 2 * Math.tan((32 * Math.PI) / 180 / 2) * 10;
export const PLAY_BASE_Y = -0.72;
export const PLAY_JUMP = 1.05;

export type Crumb = {
  id: number;
  x: number;
  y: number;
  vy: number;
  gone: "ok" | "miss" | null;
  ttl: number;
};

export type Run = {
  phase: "idle" | "play" | "over";
  petX: number;
  dir: 1 | -1;
  jumpT: number;
  cookies: Crumb[];
  score: number;
  misses: number;
  streak: number;
  pace: number;
  fall: number;
  gap: number;
  untilSpawn: number;
  nextId: number;
  caughtThisTick: number;
  missedThisTick: number;
};

export function freshRun(): Run {
  return {
    phase: "idle",
    petX: 0.5,
    dir: 1,
    jumpT: -1,
    cookies: [],
    score: 0,
    misses: 0,
    streak: 0,
    pace: 0.1,
    fall: 0.17,
    gap: 1.45,
    untilSpawn: 0.45,
    nextId: 1,
    caughtThisTick: 0,
    missedThisTick: 0,
  };
}

export function startRun(): Run {
  return { ...freshRun(), phase: "play" };
}

/** 0 on the ground, 1 at the top of the hop. */
export function hop(run: Run): number {
  if (run.jumpT < 0) return 0;
  const p = run.jumpT / JUMP_S;
  if (p >= 1) return 0;
  return Math.sin(p * Math.PI);
}

export function requestJump(run: Run): Run {
  if (run.phase !== "play" || run.jumpT >= 0) return run;
  return { ...run, jumpT: 0 };
}

export function pushCookie(run: Run, x: number, y: number, vy = run.fall): Run {
  return {
    ...run,
    nextId: run.nextId + 1,
    cookies: [...run.cookies, { id: run.nextId, x, y, vy, gone: null, ttl: 0 }],
  };
}

function bandOf(score: number): number {
  return Math.floor(score / 4);
}

export function stepRun(run: Run, dtIn: number, random = Math.random): Run {
  if (run.phase !== "play") return { ...run, caughtThisTick: 0, missedThisTick: 0 };
  const dt = Math.min(0.05, Math.max(0, dtIn));
  let jumpT = run.jumpT;
  if (jumpT >= 0) {
    jumpT += dt;
    if (jumpT >= JUMP_S) jumpT = -1;
  }
  let petX = run.petX + run.dir * run.pace * dt;
  let dir = run.dir;
  if (petX > WALK_MAX) {
    petX = WALK_MAX;
    dir = -1;
  } else if (petX < WALK_MIN) {
    petX = WALK_MIN;
    dir = 1;
  }
  const jumping = { ...run, jumpT };
  const apex = hop(jumping) > 0.62;

  let score = run.score;
  let misses = run.misses;
  let streak = run.streak;
  let caughtThisTick = 0;
  let missedThisTick = 0;
  const cookies: Crumb[] = [];
  for (const crumb of run.cookies) {
    if (crumb.gone) {
      const ttl = crumb.ttl - dt;
      if (ttl > 0) cookies.push({ ...crumb, ttl });
      continue;
    }
    const y = crumb.y + crumb.vy * dt;
    const crossed = y >= CATCH_Y0 && crumb.y <= CATCH_Y1;
    if (apex && crossed && Math.abs(crumb.x - petX) < CATCH_X) {
      score += 1;
      streak += 1;
      caughtThisTick += 1;
      cookies.push({ ...crumb, y: Math.min(y, CATCH_Y1), gone: "ok", ttl: 0.42 });
      continue;
    }
    if (y >= FLOOR_Y) {
      misses += 1;
      streak = 0;
      missedThisTick += 1;
      cookies.push({ ...crumb, y: FLOOR_Y, gone: "miss", ttl: 0.45 });
      continue;
    }
    cookies.push({ ...crumb, y });
  }

  let pace = run.pace;
  let fall = run.fall;
  let gap = run.gap;
  if (bandOf(score) > bandOf(run.score)) {
    pace = Math.min(0.2, pace + 0.012);
    fall = Math.min(0.4, fall + 0.028);
    gap = Math.max(0.72, gap - 0.08);
  }

  let untilSpawn = run.untilSpawn - dt;
  let nextId = run.nextId;
  const alive = cookies.filter((crumb) => !crumb.gone).length;
  if (untilSpawn <= 0 && misses < LIVES && alive < 2) {
    let x = WALK_MIN + random() * (WALK_MAX - WALK_MIN);
    const crowded = cookies.find((crumb) => !crumb.gone && Math.abs(crumb.x - x) < 0.14);
    if (crowded) x = x < 0.5 ? Math.min(WALK_MAX, x + 0.22) : Math.max(WALK_MIN, x - 0.22);
    cookies.push({ id: nextId, x, y: -0.06, vy: fall, gone: null, ttl: 0 });
    nextId += 1;
    untilSpawn = gap;
  }

  return {
    phase: misses >= LIVES ? "over" : "play",
    petX,
    dir,
    jumpT,
    cookies,
    score,
    misses,
    streak,
    pace,
    fall,
    gap,
    untilSpawn,
    nextId,
    caughtThisTick,
    missedThisTick,
  };
}

/** Where a normalized point sits in the arena, using the same x as the 3D pet. */
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
