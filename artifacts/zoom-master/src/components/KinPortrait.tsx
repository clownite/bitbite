import type { FamilyId } from "../pet/kin";
import type { LifeForm, LifeMark } from "../pet/life";
import { stageBase, stageImage, stageLid } from "../pet/stageArt";

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
  return (
    <span className="kin-portrait is-photo" data-family={family} data-form={form}>
      <img src={stageBase(family, form)} alt="" className="kin-base" draggable={false} />
      <span className="kin-hop">
        <img src={stageImage(family, form)} alt="" className="kin-portrait-img" draggable={false} />
        <img src={stageLid(family, form)} alt="" className="kin-lid" draggable={false} />
      </span>
    </span>
  );
}
