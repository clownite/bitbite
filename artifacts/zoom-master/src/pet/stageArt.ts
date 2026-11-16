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

export type StageId = "egg" | "baby" | "child" | "teen" | "adult";

const ART: Record<FamilyId, Record<StageId, string>> = {
  water: { egg: waterEgg, baby: waterBaby, child: waterChild, teen: waterTeen, adult: waterAdult },
  fire: { egg: fireEgg, baby: fireBaby, child: fireChild, teen: fireTeen, adult: fireAdult },
  grass: { egg: grassEgg, baby: grassBaby, child: grassChild, teen: grassTeen, adult: grassAdult },
  electric: { egg: electricEgg, baby: electricBaby, child: electricChild, teen: electricTeen, adult: electricAdult },
};

/** Egg, baby, child, teen, then one adult picture for every grown form. */
export function stageOf(form: LifeForm): StageId {
  if (form === "egg" || form === "baby" || form === "child" || form === "teen") return form;
  return "adult";
}

export function stageImage(family: FamilyId, form: LifeForm): string {
  return ART[family][stageOf(form)];
}

const loaded = new Map<string, HTMLImageElement>();

export function preloadStages(): void {
  if (typeof Image === "undefined") return;
  for (const row of Object.values(ART)) {
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
