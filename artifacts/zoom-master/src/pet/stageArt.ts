import type { FamilyId } from "./kin";
import type { LifeForm } from "./life";
import waterEgg from "./stage/water-egg.png";
import waterBaby from "./stage/water-baby.png";
import waterChild from "./stage/water-child.png";
import waterTeen from "./stage/water-teen.png";
import waterAdult from "./stage/water-adult.png";
import fireEgg from "./stage/fire-egg.png";
import fireBaby from "./stage/fire-baby.png";
import fireChild from "./stage/fire-child.png";
import fireTeen from "./stage/fire-teen.png";
import fireAdult from "./stage/fire-adult.png";
import grassEgg from "./stage/grass-egg.png";
import grassBaby from "./stage/grass-baby.png";
import grassChild from "./stage/grass-child.png";
import grassTeen from "./stage/grass-teen.png";
import grassAdult from "./stage/grass-adult.png";
import electricEgg from "./stage/electric-egg.png";
import electricBaby from "./stage/electric-baby.png";
import electricChild from "./stage/electric-child.png";
import electricTeen from "./stage/electric-teen.png";
import electricAdult from "./stage/electric-adult.png";
import waterEggBase from "./stage/water-egg-base.png";
import waterBabyBase from "./stage/water-baby-base.png";
import waterChildBase from "./stage/water-child-base.png";
import waterTeenBase from "./stage/water-teen-base.png";
import waterAdultBase from "./stage/water-adult-base.png";
import fireEggBase from "./stage/fire-egg-base.png";
import fireBabyBase from "./stage/fire-baby-base.png";
import fireChildBase from "./stage/fire-child-base.png";
import fireTeenBase from "./stage/fire-teen-base.png";
import fireAdultBase from "./stage/fire-adult-base.png";
import grassEggBase from "./stage/grass-egg-base.png";
import grassBabyBase from "./stage/grass-baby-base.png";
import grassChildBase from "./stage/grass-child-base.png";
import grassTeenBase from "./stage/grass-teen-base.png";
import grassAdultBase from "./stage/grass-adult-base.png";
import electricEggBase from "./stage/electric-egg-base.png";
import electricBabyBase from "./stage/electric-baby-base.png";
import electricChildBase from "./stage/electric-child-base.png";
import electricTeenBase from "./stage/electric-teen-base.png";
import electricAdultBase from "./stage/electric-adult-base.png";
import waterEggLid from "./stage/water-egg-lid.png";
import waterBabyLid from "./stage/water-baby-lid.png";
import waterChildLid from "./stage/water-child-lid.png";
import waterTeenLid from "./stage/water-teen-lid.png";
import waterAdultLid from "./stage/water-adult-lid.png";
import fireEggLid from "./stage/fire-egg-lid.png";
import fireBabyLid from "./stage/fire-baby-lid.png";
import fireChildLid from "./stage/fire-child-lid.png";
import fireTeenLid from "./stage/fire-teen-lid.png";
import fireAdultLid from "./stage/fire-adult-lid.png";
import grassEggLid from "./stage/grass-egg-lid.png";
import grassBabyLid from "./stage/grass-baby-lid.png";
import grassChildLid from "./stage/grass-child-lid.png";
import grassTeenLid from "./stage/grass-teen-lid.png";
import grassAdultLid from "./stage/grass-adult-lid.png";
import electricEggLid from "./stage/electric-egg-lid.png";
import electricBabyLid from "./stage/electric-baby-lid.png";
import electricChildLid from "./stage/electric-child-lid.png";
import electricTeenLid from "./stage/electric-teen-lid.png";
import electricAdultLid from "./stage/electric-adult-lid.png";

export type StageId = "egg" | "baby" | "child" | "teen" | "adult";

const ART: Record<FamilyId, Record<StageId, string>> = {
  water: { egg: waterEgg, baby: waterBaby, child: waterChild, teen: waterTeen, adult: waterAdult },
  fire: { egg: fireEgg, baby: fireBaby, child: fireChild, teen: fireTeen, adult: fireAdult },
  grass: { egg: grassEgg, baby: grassBaby, child: grassChild, teen: grassTeen, adult: grassAdult },
  electric: { egg: electricEgg, baby: electricBaby, child: electricChild, teen: electricTeen, adult: electricAdult },
};

const BASE: Record<FamilyId, Record<StageId, string>> = {
  water: { egg: waterEggBase, baby: waterBabyBase, child: waterChildBase, teen: waterTeenBase, adult: waterAdultBase },
  fire: { egg: fireEggBase, baby: fireBabyBase, child: fireChildBase, teen: fireTeenBase, adult: fireAdultBase },
  grass: { egg: grassEggBase, baby: grassBabyBase, child: grassChildBase, teen: grassTeenBase, adult: grassAdultBase },
  electric: { egg: electricEggBase, baby: electricBabyBase, child: electricChildBase, teen: electricTeenBase, adult: electricAdultBase },
};

const LID: Record<FamilyId, Record<StageId, string>> = {
  water: { egg: waterEggLid, baby: waterBabyLid, child: waterChildLid, teen: waterTeenLid, adult: waterAdultLid },
  fire: { egg: fireEggLid, baby: fireBabyLid, child: fireChildLid, teen: fireTeenLid, adult: fireAdultLid },
  grass: { egg: grassEggLid, baby: grassBabyLid, child: grassChildLid, teen: grassTeenLid, adult: grassAdultLid },
  electric: { egg: electricEggLid, baby: electricBabyLid, child: electricChildLid, teen: electricTeenLid, adult: electricAdultLid },
};

/** Egg, baby, child, teen, then one adult picture for every grown form. */
export function stageOf(form: LifeForm): StageId {
  if (form === "egg" || form === "baby" || form === "child" || form === "teen") return form;
  return "adult";
}

export function stageImage(family: FamilyId, form: LifeForm): string {
  return ART[family][stageOf(form)];
}

/** The oval under the feet. It does not hop. */
export function stageBase(family: FamilyId, form: LifeForm): string {
  return BASE[family][stageOf(form)];
}

/** Face-colored lids. Shown for a blink, then hidden. */
export function stageLid(family: FamilyId, form: LifeForm): string {
  return LID[family][stageOf(form)];
}

const loaded = new Map<string, HTMLImageElement>();

export function preloadStages(): void {
  if (typeof Image === "undefined") return;
  for (const row of [...Object.values(ART), ...Object.values(BASE), ...Object.values(LID)]) {
    for (const src of Object.values(row)) {
      if (loaded.has(src)) continue;
      const img = new Image();
      img.src = src;
      loaded.set(src, img);
    }
  }
}

export function stageElement(family: FamilyId, form: LifeForm): HTMLImageElement | null {
  preloadStages();
  const img = loaded.get(stageImage(family, form));
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

preloadStages();
