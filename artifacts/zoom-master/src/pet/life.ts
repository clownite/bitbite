import type { PetId } from "./catalog";

/** Hours of life. Level 5 and 10 stay the money stages. This clock only changes the body. */

const KEY = "biscotto-life-v1";
export const HOUR = 60 * 60 * 1000;

export type LifeForm = "egg" | "baby" | "child" | "teen" | "adult";
export type LifeSex = "girl" | "boy";
export type LifeRoad = "tended" | "wild";

export type LifeView = {
  form: LifeForm;
  sex: LifeSex | null;
  road: LifeRoad | null;
  /** 0 hides the body. The egg draws in its place. */
  scale: number;
};

type Row = {
  bornAt: number;
  feeds: number;
  cleans: number;
  sick: number;
  sex: LifeSex | null;
  road: LifeRoad | null;
};

let focus: PetId = "dolphin";
let rows: Partial<Record<PetId, Row>> = load();

function load(): Partial<Record<PetId, Row>> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null") as Partial<Record<PetId, Partial<Row>>> | null;
    if (!raw) return {};
    const out: Partial<Record<PetId, Row>> = {};
    for (const id of ["dolphin", "finch", "lynx", "stag"] as PetId[]) {
      const row = raw[id];
      if (!row) continue;
      out[id] = {
        bornAt: Math.max(0, Number(row.bornAt) || Date.now()),
        feeds: Math.max(0, Number(row.feeds) || 0),
        cleans: Math.max(0, Number(row.cleans) || 0),
        sick: Math.max(0, Number(row.sick) || 0),
        sex: row.sex === "girl" || row.sex === "boy" ? row.sex : null,
        road: row.road === "tended" || row.road === "wild" ? row.road : null,
      };
    }
    return out;
  } catch {
    return {};
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch { /**/ }
}

function ensure(id: PetId): Row {
  const found = rows[id];
  if (found) return found;
  const row: Row = { bornAt: Date.now(), feeds: 0, cleans: 0, sick: 0, sex: null, road: null };
  rows = { ...rows, [id]: row };
  save();
  return row;
}

export function formAt(ageMs: number): LifeForm {
  const hours = ageMs / HOUR;
  if (hours < 1) return "egg";
  if (hours < 3) return "baby";
  if (hours < 8) return "child";
  if (hours < 24) return "teen";
  return "adult";
}

function scaleOf(form: LifeForm): number {
  if (form === "egg") return 0;
  if (form === "baby") return 0.62;
  if (form === "child") return 0.8;
  if (form === "teen") return 0.92;
  return 1;
}

/** The home pet the room is caring for. */
export function focusLife(id: PetId) {
  focus = id;
}

/** A feed, a clean floor, or a sickness, counted only while that choice can still change the body. */
export function noteLife(kind: "feed" | "clean" | "sick") {
  const row = ensure(focus);
  const age = Date.now() - row.bornAt;
  if (kind === "feed" && age < 3 * HOUR) row.feeds += 1;
  if (kind === "clean" && age < 3 * HOUR) row.cleans += 1;
  if (kind === "sick" && age < 3 * HOUR) row.sick += 1;
  save();
}

/** The body for this hour. The first hour locks girl or boy. The third hour locks the road. */
export function readLife(id: PetId, now = Date.now()): LifeView {
  const row = ensure(id);
  const age = Math.max(0, now - row.bornAt);
  let dirty = false;
  if (!row.sex && age >= HOUR) {
    row.sex = row.feeds + row.cleans > 0 ? "girl" : "boy";
    dirty = true;
  }
  if (!row.road && age >= 3 * HOUR) {
    row.road = row.feeds + row.cleans > 0 && row.sick === 0 ? "tended" : "wild";
    dirty = true;
  }
  if (dirty) save();
  const form = formAt(age);
  return { form, sex: row.sex, road: row.road, scale: scaleOf(form) };
}
