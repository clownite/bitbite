import { useEffect, useState } from "react";
import { PetStage } from "../components/PetStage";
import { PetFarmPanel } from "../components/PetFarmButton";
import { petDef, timeForOneCrumb, type PetId } from "../pet/catalog";
import {
  confirmGramUpgrade,
  getPet,
  gramCost,
  PET_SLOTS,
  setActivePet,
  stageGoal,
  subscribePet,
  xpLabel,
  LEVEL5_GRAM,
  LEVEL10_GRAM,
  type PetState,
} from "../pet/petProgress";

export function CollectionPage({
  gram,
  onPay,
}: {
  gram: number;
  onPay: (cost: number) => boolean;
}) {
  const [pet, setPet] = useState<PetState>(getPet());
  useEffect(() => subscribePet(() => setPet(getPet())), []);

  const goal = stageGoal(pet.stage);
  const cost = gramCost(pet);
  const ready = cost != null;
  const canPay = ready && gram + 1e-9 >= cost;

  return (
    <div className="h-full overflow-y-auto" style={{ padding: "18px 16px 24px" }}>
      <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.16em", color: "#7ad7ff" }}>
        COLLECTION
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: "rgba(186,220,236,0.7)", lineHeight: 1.45 }}>
        The dolphin farms 0.05 Crumbs a day. Level 5 is 0.15. Level 10 is 0.30. One Crumb is the smallest withdrawal, so the starter needs 20 days.
      </div>

      <article
        style={{
          marginTop: 16,
          borderRadius: 28,
          overflow: "hidden",
          background: "rgba(4, 10, 16, 0.94)",
          border: "1px solid rgba(122, 215, 255, 0.28)",
          boxShadow: "0 16px 40px rgba(20, 8, 2, 0.35)",
        }}
      >
        <div style={{ position: "relative", height: 280, background: "radial-gradient(circle at 50% 60%, #123044, #05080c 72%)" }}>
          <PetStage pet={pet} frame="collection" petId={pet.active} />
          <div style={{ position: "absolute", left: 14, top: 14, fontSize: 11, fontWeight: 900, letterSpacing: "0.14em", color: "#ffe7c2", pointerEvents: "none" }}>
            LEVEL {pet.level}
          </div>
        </div>
        <div style={{ padding: "14px 16px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#e8f7ff" }}>{petDef(pet.active).name}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#7ad7ff" }}>
              Stage {pet.stage}/3
            </div>
          </div>
          <div style={{ marginTop: 10, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, (pet.xp / goal) * 100)}%`, height: "100%", background: "#7ad7ff" }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,244,228,0.55)" }}>
            {pet.finished ? "Level 10. This one is finished." : xpLabel(pet)}
          </div>
          <div style={{ marginTop: 4, fontSize: 10, color: "rgba(255,244,228,0.4)" }}>
            This pet farms {petDef(pet.active).rates[pet.level]} / day
            {" · "}
            {timeForOneCrumb(petDef(pet.active).rates[pet.level])} for 1 Crumb.
          </div>
          <div style={{ marginTop: 12 }}>
            <PetFarmPanel />
          </div>

          {ready && (
            <button
              type="button"
              disabled={!canPay}
              onClick={() => {
                if (!canPay || cost == null) return;
                if (!onPay(cost)) return;
                confirmGramUpgrade();
              }}
              style={{
                marginTop: 14,
                width: "100%",
                border: "none",
                borderRadius: 16,
                padding: "12px 14px",
                fontWeight: 900,
                letterSpacing: "0.06em",
                background: canPay ? "#7ad7ff" : "rgba(255,255,255,0.08)",
                color: canPay ? "#041018" : "rgba(186,220,236,0.4)",
              }}
            >
              {pet.level === 1
                ? `Pay ${LEVEL5_GRAM} GRAM · level 5`
                : `Pay ${LEVEL10_GRAM} GRAM · level 10`}
            </button>
          )}
          {ready && !canPay && (
            <div style={{ marginTop: 8, fontSize: 11, color: "rgba(122,215,255,0.8)" }}>
              You have {gram.toFixed(2)} GRAM.
            </div>
          )}
          {pet.active === "dolphin" && (
          <div style={{ marginTop: 12, fontSize: 10, color: "rgba(255,244,228,0.38)" }}>
            Voxel Dolphin by{" "}
            <a href="https://sketchfab.com/pratamacam" target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
              pratamacam
            </a>
            {" · "}
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
              CC BY 4.0
            </a>
          </div>
          )}
        </div>
      </article>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
        {Array.from({ length: PET_SLOTS }, (_, index) => {
          const id = pet.owned[index] as PetId | undefined;
          const selected = id != null && id === pet.active;
          return (
            <button
              key={index}
              type="button"
              disabled={!id}
              onClick={() => { if (id) setActivePet(id); }}
              style={{
                aspectRatio: "1",
                borderRadius: 16,
                border: selected ? "1px solid #7ad7ff" : "1px solid rgba(122,215,255,0.16)",
                background: id ? "rgba(8, 28, 40, 0.9)" : "rgba(255,255,255,0.03)",
                color: "#e8f7ff",
                fontSize: 10,
                fontWeight: 800,
                padding: 4,
              }}
            >
              {id ? petDef(id).name : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
