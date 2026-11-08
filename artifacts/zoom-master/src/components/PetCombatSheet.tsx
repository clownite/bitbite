import { petCombat, petDef, type PetId } from "../pet/catalog";
import { StatGlyph } from "./StatGlyph";

const LABELS = [
  ["hp", "HP", "hp"],
  ["atk", "Atk", "attack"],
  ["def", "Def", "defense"],
  ["spa", "Sp.A", "specialAttack"],
  ["spd", "Sp.D", "specialDefense"],
  ["spe", "Spe", "speed"],
] as const;

/** The six battle stats at this level, plus the ability. Battles do not run yet. */
export function PetCombatSheet({ id, level }: { id: PetId; level: number }) {
  const pet = petDef(id);
  const stats = petCombat(pet, level);
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: pet.element.color }}>{pet.ability.name}</div>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "rgba(186,220,236,0.5)" }}>LV {level}</div>
      </div>
      <div style={{ marginTop: 2, fontSize: 11, lineHeight: 1.35, color: "rgba(186,220,236,0.6)" }}>{pet.ability.text}</div>
      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
        {LABELS.map(([glyph, label, key]) => (
          <div key={key} style={{ borderRadius: 10, padding: "6px 2px 5px", textAlign: "center", background: "rgba(122,215,255,0.06)" }}>
            <StatGlyph id={glyph} />
            <div style={{ fontSize: 8, letterSpacing: "0.06em", color: "rgba(186,220,236,0.5)" }}>{label}</div>
            <div style={{ marginTop: 2, fontSize: 13, fontWeight: 800, color: "#e8f7ff" }}>{stats[key]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
