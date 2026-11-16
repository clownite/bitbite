import type { FamilyId } from "../pet/kin";
import type { LifeForm, LifeMark } from "../pet/life";
import { stageImage } from "../pet/stageArt";

/** Grown portrait, or the stage the living pet is in now. */
export function KinPortrait({
  family,
  form,
  kin,
  mark = null,
}: {
  family: FamilyId;
  form: LifeForm;
  kin: number;
  mark?: LifeMark | null;
}) {
  void kin;
  void mark;
  return <img src={stageImage(family, form)} alt="" className="kin-portrait is-photo" draggable={false} />;
}
