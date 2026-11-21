import { useEffect, useState } from "react";
import type { FamilyId } from "../pet/kin";
import { stageImage } from "../pet/stageArt";
import { PixelCookie } from "./PixelCookie";

/** The egg from the family sheet. The first hour is only a wait. A cookie shows the bite, since an egg has no mouth. */
export function LifeEgg({ family, mini = false }: { family: FamilyId; mini?: boolean }) {
  const [eating, setEating] = useState(false);
  useEffect(() => {
    if (mini) return;
    let hide = 0;
    const onEat = () => {
      setEating(true);
      window.clearTimeout(hide);
      hide = window.setTimeout(() => setEating(false), 2100);
    };
    window.addEventListener("zoom-pet-eat", onEat);
    return () => {
      window.removeEventListener("zoom-pet-eat", onEat);
      window.clearTimeout(hide);
    };
  }, [mini]);
  return (
    <div className={mini ? "life-egg is-mini is-photo" : `life-egg is-photo${eating ? " is-eating" : ""}`} data-family={family} data-testid="life-egg" aria-hidden>
      <span className="life-egg-live">
        <img src={stageImage(family, "egg")} alt="" className="life-egg-photo" draggable={false} />
        {eating ? (
          <span className="pet-bite" aria-hidden>
            <PixelCookie size={22} />
          </span>
        ) : null}
      </span>
    </div>
  );
}
