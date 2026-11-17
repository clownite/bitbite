import type { LifeForm } from "../pet/life";

/** Two lids over the eyes. They shut for a blink, then open again. */
export function PetLids({ form }: { form: LifeForm }) {
  if (form === "egg") return null;
  return (
    <span className="pet-lids" aria-hidden>
      <span className="pet-lid is-l" />
      <span className="pet-lid is-r" />
    </span>
  );
}
