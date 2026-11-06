import { useEffect, useState, type CSSProperties } from "react";
import { PetStage } from "../components/PetStage";
import { PetFarmPanel } from "../components/PetFarmButton";
import { PETS, petDef, timeForOneCrumb, type PetId } from "../pet/catalog";
import {
  confirmGramUpgrade,
  getPet,
  gramCost,
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

      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
        {PETS.map((item) => {
          const owned = pet.owned.includes(item.id);
          const selected = pet.active === item.id;
          return (
            <article
              key={item.id}
              style={{
                borderRadius: 22,
                padding: "14px 14px 12px",
                background: selected ? "rgba(8, 28, 40, 0.95)" : "rgba(4, 10, 16, 0.8)",
                border: `1px solid ${selected ? "rgba(122,215,255,0.55)" : "rgba(122,215,255,0.16)"}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 900, color: "#e8f7ff" }}>{item.name}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#7ad7ff" }}>
                  {item.price === 0 ? "Free" : `${item.price} GRAM`}
                </div>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,244,228,0.72)" }}>
                {item.rates[1].toFixed(2)} / day · lv5 {item.rates[5].toFixed(2)} · lv10 {item.rates[10].toFixed(2)}
              </div>
              <div style={{ marginTop: 2, fontSize: 11, color: "rgba(255,244,228,0.45)" }}>
                1 Crumb in {timeForOneCrumb(item.rates[1])} at level 1, {timeForOneCrumb(item.rates[5])} at level 5, {timeForOneCrumb(item.rates[10])} at level 10.
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: "rgba(255,244,228,0.55)" }}>{item.note}</div>
              <div style={{ marginTop: 10 }}>
                {selected ? (
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#7ad7ff" }}>Selected</span>
                ) : owned ? (
                  <button type="button" onClick={() => setActivePet(item.id as PetId)} style={miniBtn}>
                    Use this pet
                  </button>
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(186,220,236,0.7)" }}>
                    In the shop · {item.price} GRAM
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

const miniBtn: CSSProperties = {
  border: "none",
  borderRadius: 14,
  padding: "8px 12px",
  fontWeight: 900,
  background: "#7ad7ff",
  color: "#041018",
};
