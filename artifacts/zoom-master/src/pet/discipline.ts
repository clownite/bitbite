/** Discipline hearts. A finished game fills one, up to four, the way a Tamagotchi did. */

const KEY = "biscotto-discipline-v1";
const MAX = 4;

let plays = load();
const listeners = new Set<() => void>();

function load(): number {
  try {
    return Math.max(0, Math.min(MAX, Math.floor(Number(localStorage.getItem(KEY)) || 0)));
  } catch {
    return 0;
  }
}

function save() {
  try { localStorage.setItem(KEY, String(plays)); } catch { /**/ }
  listeners.forEach((fn) => fn());
}

export function disciplinePlays(): number {
  return plays;
}

/** One finished cookie series, number match, or duel. */
export function noteDisciplinePlay() {
  if (plays >= MAX) return;
  plays += 1;
  save();
}

export function subscribeDiscipline(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
