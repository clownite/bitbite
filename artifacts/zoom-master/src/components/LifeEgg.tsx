import type { FamilyId } from "../pet/kin";
import { stageBase, stageImage, stageLid } from "../pet/stageArt";

/** The egg from the family sheet. The first hour is only a wait. */
export function LifeEgg({ family, mini = false }: { family: FamilyId; mini?: boolean }) {
  return (
    <div className={mini ? "life-egg is-mini is-photo" : "life-egg is-photo"} data-family={family} data-testid="life-egg" aria-hidden>
      <img src={stageBase(family, "egg")} alt="" className="life-egg-base" draggable={false} />
      <span className="life-egg-live">
        <img src={stageImage(family, "egg")} alt="" className="life-egg-photo" draggable={false} />
        <img src={stageLid(family, "egg")} alt="" className="life-egg-lid" draggable={false} />
      </span>
    </div>
  );
}
