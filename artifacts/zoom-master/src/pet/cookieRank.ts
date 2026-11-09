/** Weekly cookie board math. No storage, so the places can be checked on their own. */

export type BoardRow = {
  telegramId: string;
  name: string;
  username: string;
  amount: number;
};

/** A full week of steady play sits around the top. A short run still enters the list. */
export const COOKIE_CAST: BoardRow[] = [
  { telegramId: "cookie-nela", name: "Nela Costa", username: "nela", amount: 36 },
  { telegramId: "cookie-pietro", name: "Pietro Sala", username: "pietro", amount: 31 },
  { telegramId: "cookie-hana", name: "Hana Ivers", username: "hana", amount: 27 },
  { telegramId: "cookie-lev", name: "Lev Orlov", username: "lev", amount: 22 },
  { telegramId: "cookie-mina", name: "Mina Cho", username: "mina", amount: 18 },
  { telegramId: "cookie-otto", name: "Otto Berg", username: "otto", amount: 15 },
  { telegramId: "cookie-rita", name: "Rita Nunes", username: "rita", amount: 12 },
  { telegramId: "cookie-samir", name: "Samir Adel", username: "samir", amount: 9 },
  { telegramId: "cookie-bea", name: "Bea Kolb", username: "bea", amount: 6 },
  { telegramId: "cookie-io", name: "Io Rossi", username: "io", amount: 4 },
];

const PRIZES = [80, 50, 30, 15, 15, 15, 15, 15, 15, 15];

export function xpForPlace(place: number): number {
  if (place < 1 || place > PRIZES.length) return 0;
  return PRIZES[place - 1];
}

export function mergeBoard(real: BoardRow[], cast: BoardRow[] = COOKIE_CAST): BoardRow[] {
  const taken = new Set(real.map((row) => row.telegramId));
  return [...real.filter((row) => row.amount > 0), ...cast.filter((row) => !taken.has(row.telegramId))]
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name))
    .slice(0, 10);
}

/** 1-based place, or 0 when the id is outside the ten. */
export function placeOf(board: BoardRow[], id: string): number {
  const index = board.findIndex((row) => row.telegramId === id);
  return index < 0 ? 0 : index + 1;
}
