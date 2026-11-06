/** One shared pet. Everyone starts on the same base form. */

export const STAGE_XP: Record<1 | 2 | 3, number> = { 1: 1000, 2: 2000, 3: 3000 };
/** First gate was not given a number. 3 GRAM unlocks level 5; 6 GRAM finishes at level 10. */
export const LEVEL5_GRAM = 3;
export const LEVEL10_GRAM = 6;

export type PetLevel = 1 | 5 | 10;

export type PetState = {
  stage: 1 | 2 | 3;
  xp: number;
  level: PetLevel;
  finished: boolean;
};

const KEY = "biscotto-pet-v1";

const START: PetState = { stage: 1, xp: 0, level: 1, finished: false };

function load(): PetState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...START };
    const p = JSON.parse(raw) as Partial<PetState>;
    const stage = p.stage === 2 || p.stage === 3 ? p.stage : 1;
    const level: PetLevel = p.level === 5 || p.level === 10 ? p.level : 1;
    return {
      stage,
      xp: Math.max(0, Math.min(STAGE_XP[stage], Number(p.xp) || 0)),
      level,
      finished: !!p.finished,
    };
  } catch {
    return { ...START };
  }
}

let state: PetState = load();
const listeners = new Set<() => void>();

function emit() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /**/ }
  listeners.forEach((fn) => fn());
}

export function getPet(): PetState {
  return state;
}

export function subscribePet(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function stageGoal(stage: 1 | 2 | 3): number {
  return STAGE_XP[stage];
}

export function gramCost(pet: PetState): number | null {
  if (pet.finished) return null;
  if (pet.stage !== 3 || pet.xp < STAGE_XP[3]) return null;
  if (pet.level === 1) return LEVEL5_GRAM;
  if (pet.level === 5) return LEVEL10_GRAM;
  return null;
}

/** XP only fills the current stage. Stage 3 waits for the GRAM payment. */
export function addPetXp(amount: number) {
  if (state.finished || amount <= 0) return;
  if (state.stage === 3 && state.xp >= STAGE_XP[3]) return;
  const goal = STAGE_XP[state.stage];
  const xp = Math.min(goal, state.xp + amount);
  if (xp >= goal && state.stage < 3) {
    state = { ...state, stage: (state.stage + 1) as 2 | 3, xp: 0 };
  } else {
    state = { ...state, xp };
  }
  emit();
}

/** Call only after GRAM has been spent. */
export function confirmGramUpgrade() {
  if (state.finished || state.stage !== 3 || state.xp < STAGE_XP[3]) return;
  if (state.level === 1) {
    state = { stage: 1, xp: 0, level: 5, finished: false };
  } else if (state.level === 5) {
    state = { stage: 3, xp: STAGE_XP[3], level: 10, finished: true };
  }
  emit();
}
