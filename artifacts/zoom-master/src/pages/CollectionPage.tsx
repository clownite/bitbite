import { useEffect, useState } from "react";
import { LifeEgg } from "../components/LifeEgg";
import { LifeCreature } from "../components/LifeCreature";
import { familyOf, readLife } from "../pet/life";
import { PetFarmPanel } from "../components/PetFarmButton";
import { dailyFarm, formatRate, petDef, type PetId } from "../pet/catalog";
import { personalPetNumber, petOwnerId } from "../pet/number";
import { PetCombatSheet } from "../components/PetCombatSheet";
import {
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
import { startStagePayment } from "../pet/payPet";
import { noteFavorite } from "../pet/quests";
import { runTap } from "../utils/tap";
import { useT } from "../i18n/LanguageContext";

const cardShell = {
  position: "relative" as const,
  height: 168,
  borderRadius: 2,
  overflow: "hidden",
  background: "#8bac0f",
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
  void onPay;
  void gram;
  const active = petDef(pet.active);
  const rate = dailyFarm(pet.active, pet.level);
  const one = rate > 0 ? 1 / rate : 0;
  const crumbTime = one >= 1
    ? t("pet.roiDays", { n: one >= 10 ? Math.round(one) : one.toFixed(1) })
    : t("pet.hours", { n: (one * 24).toFixed(1) });

  return (
    <div className="gb-collection">
      <div className="gb-collection-head">
        <div>{t("pet.nav.collection").toUpperCase()}</div>
        <div>{pet.owned.length}/{PET_SLOTS}</div>
      </div>

      <div className="gb-collection-grid">
        {Array.from({ length: PET_SLOTS }, (_, index) => {
          const id = pet.owned[index] as PetId | undefined;
          const selected = id != null && id === pet.active;
          if (!id) {
            return (
              <button
                key={`empty-${index}`}
                type="button"
                aria-label={t("pet.openShop")}
                className="gb-plus"
                onPointerDown={(event) => runTap(event, () => onOpenShop?.())}
                onTouchStart={(event) => runTap(event, () => onOpenShop?.())}
              >
                <span>+</span>
              </button>
            );
          }
          const color = petDef(id).element.color;
          const life = readLife(id);
          return (
            <div
              key={id}
              className="gb-slot"
              onClick={() => {
                setActivePet(id);
                noteFavorite();
              }}
              style={{
                ...cardShell,
                border: "2px solid #16300c",
                background: "#5f7e12",
                boxShadow: "inset 0 3px 0 rgba(10, 30, 0, 0.18), 0 2px 0 #3d5a10",
              }}
            >
              {life.form === "egg" ? <LifeEgg color={color} mini /> : (
                <LifeCreature family={familyOf(id)} form={life.form} kin={life.kin} mark={life.mark} mini />
              )}
              <div style={{ position: "absolute", left: 8, right: 8, bottom: 8, textAlign: "center", pointerEvents: "none", color: "#0f380f" }}>
                <div style={{ fontSize: 14, fontWeight: 900 }}>{petDef(id).name}</div>
                <div style={{ fontSize: 11, fontWeight: 800 }}>{t(`pet.element.${petDef(id).element.id}`)}</div>
                {selected ? <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.06em" }}>{t("pet.onHome")}</div> : null}
              </div>
            </div>
          );
        })}
      </div>

      <section className="collection-extra" style={{ marginTop: 16, display: ready ? "block" : "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#306230" }}>{personalPetNumber(ownerId, pet.active)}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f380f" }}>{active.name}</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0f380f" }}>
            {t("pet.stageShort", { s: pet.stage, l: pet.level })}
          </div>
        </div>
        <div style={{ marginTop: 8, height: 8, borderRadius: 0, background: "#8bac0f", border: "2px solid #0f380f", overflow: "hidden" }}>
          <div style={{ width: `${pet.finished ? 100 : Math.min(100, (pet.xp / goal) * 100)}%`, height: "100%", background: "#0f380f" }} />
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: "#306230" }}>
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
            disabled={!ready}
            onClick={() => {
              if (cost == null) return;
              startStagePayment(cost, pet.level < 5 ? 5 : 10);
            }}
            style={{
              marginTop: 12,
              width: "100%",
              border: "3px solid #0f380f",
              borderRadius: 2,
              padding: "12px 14px",
              fontWeight: 800,
              background: "#d7d3c4",
              color: "#0f380f",
              boxShadow: "3px 3px 0 #0f380f",
            }}
          >
            {t("pet.payLevel", { n: pet.level < 5 ? LEVEL5_GRAM : LEVEL10_GRAM, lv: pet.level < 5 ? 5 : 10 })}
          </button>
        )}
        <div style={{ marginTop: 10, fontSize: 11, color: "#306230" }}>
          {t("pet.keep")}
        </div>
      </section>
    </div>
  );
}
