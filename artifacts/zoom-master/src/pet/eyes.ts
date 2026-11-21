import type { FamilyId } from "./kin";
import type { LifeForm } from "./life";
import { stageOf, type StageId } from "./stageArt";

type Eye = { x: number; y: number; w: number; h: number; lid: string };
type Gaze = { face: number; left: Eye; right: Eye };

/**
 * Each eye is a percentage of that stage picture.
 * The lid color is the fur just above that eye, so a closed eye matches the face.
 */
const EYES: Record<FamilyId, Record<Exclude<StageId, "egg">, Gaze>> = {
  water: {
    baby: { face: 106.98, left: { x: 25.0, y: 41.8, w: 14.5, h: 16.3, lid: "#78b7c8" }, right: { x: 59.3, y: 41.8, w: 14.0, h: 16.3, lid: "#a7dae7" } },
    child: { face: 108.33, left: { x: 26.3, y: 40.5, w: 13.6, h: 16.2, lid: "#7cb8c7" }, right: { x: 59.6, y: 40.5, w: 13.2, h: 15.8, lid: "#a3d7e6" } },
    teen: { face: 108.30, left: { x: 27.1, y: 41.3, w: 13.7, h: 16.0, lid: "#78b7c1" }, right: { x: 60.6, y: 41.3, w: 13.7, h: 15.7, lid: "#a0d2e1" } },
    adult: { face: 105.85, left: { x: 27.8, y: 40.1, w: 13.7, h: 15.5, lid: "#75afbf" }, right: { x: 60.8, y: 40.1, w: 13.5, h: 15.5, lid: "#98cbd9" } },
  },
  fire: {
    baby: { face: 134.64, left: { x: 26.8, y: 50.5, w: 15.7, h: 14.1, lid: "#e09a3b" }, right: { x: 66.0, y: 50.7, w: 16.3, h: 14.1, lid: "#efb86c" } },
    child: { face: 121.78, left: { x: 27.6, y: 42.0, w: 14.2, h: 14.6, lid: "#d6933c" }, right: { x: 61.3, y: 41.8, w: 13.3, h: 14.6, lid: "#e1a556" } },
    teen: { face: 100.63, left: { x: 29.2, y: 41.2, w: 11.9, h: 14.7, lid: "#d69030" }, right: { x: 57.2, y: 41.8, w: 11.3, h: 14.7, lid: "#e7a957" } },
    adult: { face: 119.13, left: { x: 29.5, y: 40.3, w: 14.1, h: 14.4, lid: "#cd8a33" }, right: { x: 62.8, y: 41.1, w: 13.1, h: 13.5, lid: "#eeb15b" } },
  },
  grass: {
    baby: { face: 114.94, left: { x: 26.6, y: 40.1, w: 13.6, h: 16.4, lid: "#b0bc6a" }, right: { x: 59.7, y: 40.1, w: 15.6, h: 16.4, lid: "#d4dc93" } },
    child: { face: 119.23, left: { x: 24.4, y: 42.7, w: 15.4, h: 15.4, lid: "#adb86a" }, right: { x: 59.0, y: 42.7, w: 15.0, h: 15.1, lid: "#d4d993" } },
    teen: { face: 117.74, left: { x: 26.8, y: 43.3, w: 14.7, h: 15.4, lid: "#abb667" }, right: { x: 60.8, y: 43.3, w: 14.3, h: 15.4, lid: "#d0d68e" } },
    adult: { face: 116.17, left: { x: 27.7, y: 43.2, w: 14.2, h: 14.8, lid: "#a8b265" }, right: { x: 60.7, y: 43.2, w: 13.9, h: 14.8, lid: "#cbce89" } },
  },
  electric: {
    baby: { face: 100.57, left: { x: 26.4, y: 32.0, w: 14.4, h: 18.3, lid: "#d5a05f" }, right: { x: 62.1, y: 33.1, w: 14.4, h: 17.1, lid: "#f4c383" } },
    child: { face: 134.29, left: { x: 27.6, y: 42.9, w: 14.3, h: 13.8, lid: "#d2a165" }, right: { x: 63.3, y: 43.6, w: 13.3, h: 12.4, lid: "#eec086" } },
    teen: { face: 147.77, left: { x: 27.7, y: 42.6, w: 16.1, h: 13.0, lid: "#d09c64" }, right: { x: 64.7, y: 42.3, w: 15.6, h: 13.3, lid: "#eec187" } },
    adult: { face: 141.57, left: { x: 25.5, y: 44.2, w: 17.2, h: 13.8, lid: "#ca985e" }, right: { x: 64.0, y: 43.9, w: 16.1, h: 14.0, lid: "#eabd86" } },
  },
};

export function stageGaze(family: FamilyId, form: LifeForm): Gaze {
  const stage = stageOf(form);
  return stage === "egg" ? EYES[family].baby : EYES[family][stage];
}
