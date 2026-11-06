import { useEffect, useState } from "react";
import { PetStage } from "../components/PetStage";
import { PetFarmButton } from "../components/PetFarmButton";
import {
  confirmGramUpgrade,
  getPet,
  gramCost,
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
      <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.16em", color: "#f0b15a" }}>
        COLLECTION
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,244,228,0.62)" }}>
        Everyone starts with the same dolphin.
      </div>

      <article
        style={{
          marginTop: 16,
          borderRadius: 28,
          overflow: "hidden",
          background: "rgba(58, 32, 20, 0.92)",
          border: "1px solid rgba(240, 177, 90, 0.28)",
          boxShadow: "0 16px 40px rgba(20, 8, 2, 0.35)",
        }}
      >
        <div style={{ position: "relative", height: 280, background: "radial-gradient(circle at 50% 60%, #5a321c, #1a0e0a 72%)" }}>
          <PetStage pet={pet} frame="collection" />
          <div style={{ position: "absolute", left: 14, top: 14, fontSize: 11, fontWeight: 900, letterSpacing: "0.14em", color: "#ffe7c2", pointerEvents: "none" }}>
            LEVEL {pet.level}
          </div>
        </div>
        <div style={{ padding: "14px 16px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#fff4e4" }}>Dolphin</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#f0b15a" }}>
              Stage {pet.stage}/3
            </div>
          </div>
          <div style={{ marginTop: 10, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, (pet.xp / goal) * 100)}%`, height: "100%", background: "linear-gradient(90deg, #c47a2e, #f0b15a)" }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,244,228,0.55)" }}>
            {pet.finished ? "Level 10. This one is finished." : xpLabel(pet)}
          </div>
          <div style={{ marginTop: 4, fontSize: 10, color: "rgba(255,244,228,0.4)" }}>
            Drag to move. Pinch or scroll to resize. Farm pays 1 Crumb every 8 hours.
          </div>
          <div style={{ marginTop: 12 }}>
            <PetFarmButton />
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
                background: canPay ? "#f0b15a" : "rgba(255,255,255,0.08)",
                color: canPay ? "#2a1810" : "rgba(255,244,228,0.4)",
              }}
            >
              {pet.level === 1
                ? `Pay ${LEVEL5_GRAM} GRAM · level 5`
                : `Pay ${LEVEL10_GRAM} GRAM · level 10`}
            </button>
          )}
          {ready && !canPay && (
            <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,180,120,0.8)" }}>
              You have {gram.toFixed(2)} GRAM.
            </div>
          )}
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
        </div>
      </article>
    </div>
  );
}
