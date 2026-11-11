import { useEffect, useState } from "react";
import { PetStage } from "../components/PetStage";
import { LifeEgg } from "../components/LifeEgg";
import { readLife } from "../pet/life";
import { PixelMark } from "../components/PixelMark";
import { PetFarmPanel } from "../components/PetFarmButton";
import { dailyFarm, formatRate, petDef, type PetId } from "../pet/catalog";
import { personalPetNumber, petOwnerId } from "../pet/number";
import { PetCombatSheet } from "../components/PetCombatSheet";
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
import { recordGramInvested } from "../pet/invested";
import { noteFavorite } from "../pet/quests";
import { useT } from "../i18n/LanguageContext";

const cardShell = {
  position: "relative" as const,
  height: 168,
  borderRadius: 18,
  overflow: "hidden",
  background: "#071018",
};

export function CollectionPage({
  gram,
  onPay,
  telegramId,
  onOpenShop,
}: {
  gram: number;
  onPay: (cost: number) => boolean;
  telegramId?: string | null;
  onOpenShop?: () => void;
}) {
  const { t } = useT();
  const ownerId = petOwnerId(telegramId);
  const [pet, setPet] = useState<PetState>(getPet());
  useEffect(() => subscribePet(() => setPet(getPet())), []);

  const goal = stageGoal(pet.stage);
  const cost = gramCost(pet);
  const ready = cost != null;
  const canPay = ready && gram + 1e-9 >= cost;
  const active = petDef(pet.active);
  const rate = dailyFarm(pet.active, pet.level);
  const one = rate > 0 ? 1 / rate : 0;
  const crumbTime = one >= 1
    ? t("pet.roiDays", { n: one >= 10 ? Math.round(one) : one.toFixed(1) })
    : t("pet.hours", { n: (one * 24).toFixed(1) });

  return (
    <div className="h-full overflow-y-auto" style={{ padding: "8px 16px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.16em", color: "#7ad7ff" }}>{t("pet.nav.collection").toUpperCase()}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(186,220,236,0.55)" }}>{pet.owned.length}/{PET_SLOTS} · 5 max</div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {Array.from({ length: PET_SLOTS }, (_, index) => {
          const id = pet.owned[index] as PetId | undefined;
          const selected = id != null && id === pet.active;
          if (!id) {
            return (
              <button
                key={`empty-${index}`}
                type="button"
                aria-label={t("pet.openShop")}
                onClick={onOpenShop}
                style={{
                  ...cardShell,
                  display: "grid",
                  placeItems: "center",
                  border: "1px solid rgba(122,215,255,0.18)",
                  background: "rgba(255,255,255,0.02)",
                  color: "#7ad7ff",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 36, fontWeight: 300, lineHeight: 1 }}>+</span>
              </button>
            );
          }
          const color = petDef(id).element.color;
          const life = readLife(id);
          return (
            <div
              key={id}
              onClick={() => {
                setActivePet(id);
                noteFavorite();
              }}
              style={{
                ...cardShell,
                border: `1px solid ${color}`,
                background: `radial-gradient(ellipse 80% 70% at 50% 40%, ${color}55, #071018 72%)`,
                boxShadow: `0 0 18px ${color}66`,
              }}
            >
              <PetStage pet={pet} frame="collection" petId={id} lifeScale={life.scale} />
              {life.form === "egg" ? <LifeEgg color={color} mini /> : null}
              <div style={{ position: "absolute", top: 8, right: 8, zIndex: 2, pointerEvents: "none" }}>
                <PixelMark glyph={petDef(id).element.glyph} label={t(`pet.element.${petDef(id).element.id}`)} />
              </div>
              <div style={{ position: "absolute", left: 10, top: 10, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#e8f7ff", pointerEvents: "none" }}>
                {selected ? t("pet.onHome") : `${index + 1}/${PET_SLOTS}`}
              </div>
              <div style={{ position: "absolute", left: 10, right: 10, bottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", pointerEvents: "none" }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: petDef(id).element.color }}>{personalPetNumber(ownerId, id)}</span>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#e8f7ff" }}>{petDef(id).name}</span>
                </span>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", color: "#041018", background: color, borderRadius: 999, padding: "2px 6px" }}>{t(`pet.element.${petDef(id).element.id}`)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <section style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: active.element.color }}>{personalPetNumber(ownerId, pet.active)}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#e8f7ff" }}>{active.name}</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#7ad7ff" }}>
            {t("pet.stageShort", { s: pet.stage, l: pet.level })}
          </div>
        </div>
        <div style={{ marginTop: 8, height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div style={{ width: `${pet.finished ? 100 : Math.min(100, (pet.xp / goal) * 100)}%`, height: "100%", background: "#7ad7ff" }} />
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: "rgba(186,220,236,0.6)" }}>
          {pet.finished ? t("pet.finished") : xpLabel(pet)}
          {" · "}
          {formatRate(rate)} {t("pet.perDay")} · {t("pet.forCrumb", { time: crumbTime })}
        </div>
        <PetCombatSheet id={pet.active} level={pet.level} />
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
              recordGramInvested(cost);
              confirmGramUpgrade();
            }}
            style={{
              marginTop: 12,
              width: "100%",
              border: "none",
              borderRadius: 14,
              padding: "12px 14px",
              fontWeight: 800,
              background: canPay ? "#7ad7ff" : "rgba(255,255,255,0.06)",
              color: canPay ? "#041018" : "rgba(186,220,236,0.35)",
            }}
          >
            {t("pet.payLevel", { n: pet.level < 5 ? LEVEL5_GRAM : LEVEL10_GRAM, lv: pet.level < 5 ? 5 : 10 })}
          </button>
        )}
        <div style={{ marginTop: 10, fontSize: 11, color: "rgba(186,220,236,0.55)" }}>
          {t("pet.keep")}
        </div>
      </section>
    </div>
  );
}
