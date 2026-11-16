import type { FamilyId } from "../pet/kin";
import { stageImage } from "../pet/stageArt";

/** The egg from the family sheet. The first hour is only a wait. */
export function LifeEgg({ family, mini = false }: { family: FamilyId; mini?: boolean }) {
  return (
    <div className={mini ? "life-egg is-mini is-photo" : "life-egg is-photo"} data-testid="life-egg" aria-hidden>
      <img src={stageImage(family, "egg")} alt="" className="life-egg-photo" draggable={false} />
    </div>
  );
}
