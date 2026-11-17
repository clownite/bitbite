import { addPetXp } from "./petProgress";
import { nextReset } from "./invested";

export { nextReset };
export { recordBoardXp, xpLeaders, type XpRow } from "./xpBoard";

/** Cookies and Numbers. The pet and the weekly board both take the same XP. */
export function awardGameXp(amount: number) {
  const n = Math.floor(amount);
  if (!Number.isFinite(n) || n <= 0) return;
  addPetXp(n);
}
