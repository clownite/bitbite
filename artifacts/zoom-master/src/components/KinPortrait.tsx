import type { CSSProperties } from "react";
import type { FamilyId } from "../pet/kin";
import type { LifeForm, LifeMark } from "../pet/life";
import { stageGaze } from "../pet/eyes";
import { stageImage, stageOf } from "../pet/stageArt";

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
  const stage = stageOf(form);
  const gaze = stage === "egg" ? null : stageGaze(family, form);
  const eyeStyle = gaze
    ? ({
        "--face": String(gaze.face),
        "--lid-l": gaze.left.lid,
        "--lid-r": gaze.right.lid,
        "--eye-lx": `${gaze.left.x}%`,
        "--eye-ly": `${gaze.left.y}%`,
        "--eye-lw": `${gaze.left.w}%`,
        "--eye-lh": `${gaze.left.h}%`,
        "--eye-rx": `${gaze.right.x}%`,
        "--eye-ry": `${gaze.right.y}%`,
        "--eye-rw": `${gaze.right.w}%`,
        "--eye-rh": `${gaze.right.h}%`,
      } as CSSProperties)
    : undefined;
  return (
    <span className="kin-portrait is-photo" data-family={family} data-form={form} style={eyeStyle}>
      <span className="kin-hop">
        <span className="kin-face">
          <img src={stageImage(family, form)} alt="" className="kin-portrait-img" draggable={false} />
          {gaze ? (
            <span className="pet-lids" aria-hidden>
              <i className="pet-lid is-l" />
              <i className="pet-lid is-r" />
            </span>
          ) : null}
        </span>
      </span>
    </span>
  );
}
