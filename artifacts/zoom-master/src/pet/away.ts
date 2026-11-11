/** One line about the gap since the pet was last left. Shown once per absence. */

const KEY = "biscotto-away-v1";
const GAP_MS = 15 * 60 * 1000;

type Snap = { at: number; mess: number; bowl: number; toldAt: number; kind: AwayKind | "" };
export type AwayKind = "mess" | "dream" | "bowl" | "hop";

function load(): Snap {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "") as Partial<Snap>;
    return {
      at: Math.max(0, Number(parsed.at) || 0),
      mess: Math.max(0, Number(parsed.mess) || 0),
      bowl: Math.min(1, Math.max(0, Number(parsed.bowl) || 0)),
      toldAt: Math.max(0, Number(parsed.toldAt) || 0),
      kind: parsed.kind === "mess" || parsed.kind === "dream" || parsed.kind === "bowl" || parsed.kind === "hop" ? parsed.kind : "",
    };
  } catch {
    return { at: 0, mess: 0, bowl: 1, toldAt: 0, kind: "" };
  }
}

function save(snap: Snap) {
  try { localStorage.setItem(KEY, JSON.stringify(snap)); } catch { /**/ }
}

/** What changed while the app was closed. Null on the first open and on a short gap. */
export function readAway(mess: number, bowl: number, asleep: boolean, now = Date.now()): AwayKind | null {
  const snap = load();
  if (snap.kind && now - snap.toldAt < 8000) return snap.kind;
  if (snap.at <= 0) return null;
  const gap = now - snap.at;
  if (gap < GAP_MS || snap.toldAt > snap.at) return null;
  const kind: AwayKind = mess > snap.mess ? "mess" : bowl + 0.15 < snap.bowl ? "bowl" : asleep ? "dream" : "hop";
  save({ ...snap, toldAt: now, kind });
  return kind;
}

/** The person tapped the note. It stays gone until the next real absence. */
export function dismissAway(now = Date.now()) {
  const snap = load();
  save({ ...snap, kind: "", toldAt: now });
}

/** Remember this moment as the last time the pet was seen. */
export function markHere(mess: number, bowl: number, now = Date.now()) {
  const snap = load();
  save({ ...snap, at: now, mess, bowl });
}
