import type { PetId } from "./catalog";
import type { FamilyId } from "./kin";

/** One real day is one year on the card. Old age, if nobody is married, is day 20. */

const KEY = "biscotto-life-v2";
export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

const ASK_WAIT = 8 * HOUR;
const RISE_MS = 8000;

export type LifeForm = "egg" | "baby" | "child" | "teen" | "adult" | "elder" | "ascend";
export type LifeSex = "girl" | "boy";
export type LifeRoad = "tended" | "wild";
export type LifeMark = "ears" | "tail" | "spots" | "tint";

export type LifeView = {
  form: LifeForm;
  sex: LifeSex | null;
  road: LifeRoad | null;
  /** 0 hides the body. The egg draws in its place. */
  scale: number;
  generation: number;
  /** Which adult of the family. Growth stages ignore it and use the first animal. */
  kin: number;
  mark: LifeMark | null;
  visit: boolean;
  spouseKin: number | null;
  child: { form: LifeForm; sex: LifeSex | null; mark: LifeMark | null } | null;
};

type Row = {
  bornAt: number;
  generation: number;
  feeds: number;
  cleans: number;
  sick: number;
  sex: LifeSex | null;
  road: LifeRoad | null;
  kin: number | null;
  mark: LifeMark | null;
  married: boolean;
  childBornAt: number | null;
  childFeeds: number;
  childCleans: number;
  childSick: number;
  childSex: LifeSex | null;
  spouseKin: number | null;
  heirMark: LifeMark | null;
  nextAskAt: number | null;
  ascendUntil: number | null;
};

const MARKS: LifeMark[] = ["ears", "tail", "spots", "tint"];

let focus: PetId = "dolphin";
let rows: Partial<Record<PetId, Row>> = load();
const listeners = new Set<() => void>();

function blank(now = Date.now()): Row {
  return {
    bornAt: now,
    generation: 1,
    feeds: 0,
    cleans: 0,
    sick: 0,
    sex: null,
    road: null,
    kin: null,
    mark: null,
    married: false,
    childBornAt: null,
    childFeeds: 0,
    childCleans: 0,
    childSick: 0,
    childSex: null,
    spouseKin: null,
    heirMark: null,
    nextAskAt: null,
    ascendUntil: null,
  };
}

function load(): Partial<Record<PetId, Row>> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null") as Partial<Record<PetId, Partial<Row>>> | null;
    if (!raw) return {};
    const out: Partial<Record<PetId, Row>> = {};
    for (const id of ["dolphin", "finch", "lynx", "stag"] as PetId[]) {
      const row = raw[id];
      if (!row) continue;
      const base = blank(Date.now());
      out[id] = {
        ...base,
        ...row,
        bornAt: Math.max(0, Number(row.bornAt) || Date.now()),
        generation: Math.max(1, Math.floor(Number(row.generation) || 1)),
        feeds: Math.max(0, Number(row.feeds) || 0),
        cleans: Math.max(0, Number(row.cleans) || 0),
        sick: Math.max(0, Number(row.sick) || 0),
        sex: row.sex === "girl" || row.sex === "boy" ? row.sex : null,
        road: row.road === "tended" || row.road === "wild" ? row.road : null,
        kin: Number.isInteger(row.kin) ? Math.max(0, Math.min(9, Number(row.kin))) : null,
        childBornAt: row.childBornAt ? Math.max(0, Number(row.childBornAt)) : null,
        childSex: row.childSex === "girl" || row.childSex === "boy" ? row.childSex : null,
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

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeLife(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function ensure(id: PetId): Row {
  const found = rows[id];
  if (found) return found;
  const row = blank();
  rows = { ...rows, [id]: row };
  save();
  return row;
}

export function formAt(ageMs: number): LifeForm {
  const days = ageMs / DAY;
  if (days < 1) return "egg";
  if (days < 3) return "baby";
  if (days < 6) return "child";
  if (days < 10) return "teen";
  return "adult";
}

function scaleOf(form: LifeForm): number {
  if (form === "egg") return 0;
  if (form === "baby") return 0.72;
  if (form === "child") return 0.84;
  if (form === "teen") return 0.94;
  if (form === "elder") return 0.96;
  return 1;
}

function pickKin(row: Row): number {
  if (row.generation <= 1) return 0;
  const rare = row.road === "tended" && row.sick === 0;
  const table = rare
    ? [4, 5, 7, 9, 2]
    : row.sex === "girl"
      ? [1, 2, 3, 6, 8]
      : [1, 3, 6, 8, 5];
  return table[(row.generation + (row.road === "wild" ? 1 : 0)) % table.length];
}

function proposedSpouse(row: Row): number {
  const kin = row.kin ?? 0;
  return kin === 0 ? 1 : (kin + 3) % 10;
}

function elderMoment(row: Row): number {
  const alone = row.bornAt + 19 * DAY;
  if (!row.childBornAt) return alone;
  return Math.max(alone, row.childBornAt + 6 * DAY);
}

function lock(row: Row, now: number) {
  const age = now - row.bornAt;
  if (!row.sex && age >= DAY) row.sex = row.feeds + row.cleans > 0 ? "girl" : "boy";
  if (!row.road && age >= 3 * DAY) row.road = row.feeds + row.cleans > 0 && row.sick === 0 ? "tended" : "wild";
  if (row.kin == null && age >= 10 * DAY) row.kin = pickKin(row);
  if (row.childBornAt && !row.childSex && now - row.childBornAt >= DAY) {
    row.childSex = row.childFeeds + row.childCleans > 0 ? "girl" : "boy";
  }
}

function passGeneration(row: Row, now: number) {
  const ascendAt = elderMoment(row) + 3 * DAY;
  const heir = row.childBornAt != null;
  if (heir && row.childBornAt) {
    row.bornAt = row.childBornAt;
    row.feeds = row.childFeeds;
    row.cleans = row.childCleans;
    row.sick = row.childSick;
    row.sex = row.childSex;
    row.mark = row.heirMark;
  } else {
    row.bornAt = ascendAt;
    row.feeds = 0;
    row.cleans = 0;
    row.sick = 0;
    row.sex = null;
    row.mark = null;
  }
  row.generation += 1;
  row.road = null;
  row.kin = null;
  row.married = false;
  row.childBornAt = null;
  row.childFeeds = 0;
  row.childCleans = 0;
  row.childSick = 0;
  row.childSex = null;
  row.spouseKin = null;
  row.heirMark = null;
  row.nextAskAt = null;
  row.ascendUntil = null;
  lock(row, now);
}

function advance(row: Row, now: number): boolean {
  const before = `${row.sex}|${row.road}|${row.kin}|${row.childSex}|${row.bornAt}|${row.generation}|${row.ascendUntil}`;
  lock(row, now);
  for (let guard = 0; guard < 40; guard += 1) {
    const ascendAt = elderMoment(row) + 3 * DAY;
    if (now < ascendAt) break;
    const missed = now - ascendAt > RISE_MS;
    if (!missed) {
      if (!row.ascendUntil) row.ascendUntil = now + RISE_MS;
      if (now < row.ascendUntil) break;
    }
    passGeneration(row, now);
  }
  const after = `${row.sex}|${row.road}|${row.kin}|${row.childSex}|${row.bornAt}|${row.generation}|${row.ascendUntil}`;
  return before !== after;
}

function parentForm(row: Row, now: number): LifeForm {
  const base = formAt(Math.max(0, now - row.bornAt));
  if (base !== "adult") return base;
  if (row.ascendUntil) return "ascend";
  if (now >= elderMoment(row)) return "elder";
  return "adult";
}

function visitDue(row: Row, now: number): boolean {
  const age = now - row.bornAt;
  if (row.married || row.childBornAt || row.ascendUntil) return false;
  if (age < 13 * DAY || now >= elderMoment(row)) return false;
  return now >= (row.nextAskAt ?? row.bornAt + 13 * DAY);
}

/** The home pet the room is caring for. */
export function focusLife(id: PetId) {
  focus = id;
}

/** A feed, a clean floor, or a sickness. It counts for whoever is still young enough to change. */
export function noteLife(kind: "feed" | "clean" | "sick") {
  const row = ensure(focus);
  const now = Date.now();
  if (row.childBornAt) {
    const age = now - row.childBornAt;
    if (kind === "feed" && age < 3 * DAY) row.childFeeds += 1;
    if (kind === "clean" && age < 3 * DAY) row.childCleans += 1;
    if (kind === "sick" && age < 3 * DAY) row.childSick += 1;
  } else {
    const age = now - row.bornAt;
    if (kind === "feed" && age < 3 * DAY) row.feeds += 1;
    if (kind === "clean" && age < 3 * DAY) row.cleans += 1;
    if (kind === "sick" && age < 3 * DAY) row.sick += 1;
  }
  save();
}

/** Milliseconds left in the egg day. Zero once it has opened. */
export function eggLeft(id: PetId, now = Date.now()): number {
  const row = ensure(id);
  if (advance(row, now)) save();
  return Math.max(0, DAY - Math.max(0, now - row.bornAt));
}

/** The pet on Home is still inside the egg. */
export function focusIsEgg(now = Date.now()): boolean {
  return eggLeft(focus, now) > 0;
}

/** `m:ss`, then hours, then days. */
export function formatLeft(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Years are life-days. Weight starts with the body and rises when it eats. */
export function lifeStats(id: PetId, now = Date.now()): { years: number; weight: number; feeds: number; cleans: number } {
  const row = ensure(id);
  if (advance(row, now)) save();
  const age = Math.max(0, now - row.bornAt);
  const form = parentForm(row, now);
  const base = form === "egg" ? 5 : form === "baby" ? 10 : form === "child" ? 18 : form === "teen" ? 28 : form === "elder" ? 48 : 40;
  return { years: Math.floor(age / DAY), weight: base + Math.floor(age / DAY) + row.feeds * 2, feeds: row.feeds, cleans: row.cleans };
}

export function familyOf(id: PetId): FamilyId {
  if (id === "finch") return "fire";
  if (id === "lynx") return "grass";
  if (id === "stag") return "electric";
  return "water";
}

/** The body for this day. Sex locks on day 2, the road on day 4, the animal on day 11. */
export function readLife(id: PetId, now = Date.now()): LifeView {
  const row = ensure(id);
  if (advance(row, now)) save();
  const form = parentForm(row, now);
  const child = row.childBornAt
    ? {
        form: formAt(Math.max(0, now - row.childBornAt)),
        sex: row.childSex,
        mark: row.heirMark,
      }
    : null;
  return {
    form,
    sex: row.sex,
    road: row.road,
    scale: scaleOf(form),
    generation: row.generation,
    kin: row.kin ?? 0,
    mark: row.mark,
    visit: visitDue(row, now),
    spouseKin: visitDue(row, now) ? proposedSpouse(row) : row.spouseKin,
    child,
  };
}

/** Yes keeps the child. No asks again eight hours later, until day 20. */
export function answerLife(id: PetId, yes: boolean, now = Date.now()) {
  const row = ensure(id);
  advance(row, now);
  if (!visitDue(row, now)) {
    save();
    return;
  }
  if (yes) {
    row.married = true;
    row.childBornAt = now;
    row.childFeeds = 0;
    row.childCleans = 0;
    row.childSick = 0;
    row.childSex = null;
    row.spouseKin = proposedSpouse(row);
    row.heirMark = MARKS[(row.spouseKin ?? 0) % MARKS.length];
    row.nextAskAt = null;
  } else {
    row.nextAskAt = now + ASK_WAIT;
  }
  save();
  emit();
}
