import { useEffect, useState } from "react";
import ShoppingBag from "lucide-react/dist/esm/icons/shopping-bag.js";
import { SettingsMenu } from "../components/SettingsMenu";
import { ZoomCubeIcon } from "../components/ZoomCubeIcon";
import { useCrumbsBalance, useFarm } from "../components/PetFarmButton";
import { PetStage } from "../components/PetStage";
import { dailyFarm, petDef } from "../pet/catalog";
import { getPet, petTapStatus, stageGoal, subscribePet, xpLabel, type PetState } from "../pet/petProgress";
import { claimFarm, formatCrumbs } from "../pet/crumbs";
import { noteHomeActive } from "../pet/quests";
import { useT } from "../i18n/LanguageContext";

/** Home is the active pet and its Crumb farm. The model forge is gone. */
export function LabPage({
  onOpenShop,
  muted = false,
  setMuted,
  active = true,
}: {
  onOpenShop?: () => void;
  muted?: boolean;
  setMuted?: (next: boolean | ((prev: boolean) => boolean)) => void;
  active?: boolean;
}) {
  const { t } = useT();
  const crumbs = useCrumbsBalance();
  const [pet, setPet] = useState<PetState>(getPet());
  useEffect(() => subscribePet(() => setPet(getPet())), []);
  const taps = petTapStatus();
  const farm = useFarm();
  const chosen = petDef(pet.active);
  const goal = stageGoal(pet.stage);
  const bondRaw = pet.finished ? 100 : Math.min(100, (pet.xp / goal) * 100);
  const bond = bondRaw >= 10 || bondRaw === 0 ? String(Math.round(bondRaw)) : bondRaw.toFixed(1);
  const farmScore = Math.max(1, Math.round((dailyFarm(pet.active, pet.level) / 9) * 100));
  const stats = [
    { label: "Farm", value: String(farmScore) },
    { label: "Bond", value: bond },
    { label: "Care", value: `${taps.count}/4` },
    { label: "Stage", value: String(pet.stage) },
  ];
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      if (!document.hidden) noteHomeActive(1000);
    }, 1000);
    return () => window.clearInterval(id);
  }, [active]);

  return (
    <div className="relative h-full overflow-hidden">
      <div className="absolute inset-0">
        <PetStage pet={pet} frame="lab" petId={pet.active} />
        <div
          className="absolute left-0 right-0 z-20 flex justify-center pointer-events-none"
          style={{ bottom: 132, padding: "0 16px" }}
        >
          <div className="pointer-events-auto" style={{ width: "min(420px, 100%)" }}>
            <div style={{ marginBottom: 8, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
              <div style={{ textAlign: "center", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#7ad7ff" }}>
                {chosen.name} · {pet.finished ? "LEVEL 10" : `STAGE ${pet.stage}/3 · LEVEL ${pet.level}`}
                <span style={{ color: "rgba(186,220,236,0.7)", fontWeight: 700 }}> · {xpLabel(pet)} · {taps.count}/{taps.max}</span>
              </div>
              <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#041018", background: chosen.element.color, borderRadius: 999, padding: "3px 7px" }}>
                {chosen.element.label}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 12px 12px 14px",
                borderRadius: 18,
                background: "rgba(4, 10, 16, 0.92)",
                border: "1px solid rgba(122, 215, 255, 0.45)",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", color: "rgba(186,220,236,0.7)" }}>FARM</div>
                <div style={{ marginTop: 2, fontSize: 26, fontWeight: 900, color: "#ffffff", lineHeight: 1 }}>{formatCrumbs(farm.pending)}</div>
                <div style={{ marginTop: 4, fontSize: 11, color: "rgba(186,220,236,0.7)" }}>{formatCrumbs(farm.cap)} / day · stage {pet.stage}</div>
              </div>
              <button
                type="button"
                disabled={farm.pending < 0.0001}
                onClick={() => { claimFarm(); }}
                style={{
                  border: "none",
                  borderRadius: 14,
                  padding: "14px 16px",
                  fontWeight: 900,
                  letterSpacing: "0.06em",
                  background: farm.pending >= 0.0001 ? "#f0b15a" : "rgba(255,255,255,0.08)",
                  color: farm.pending >= 0.0001 ? "#1a0e06" : "rgba(255,255,255,0.35)",
                }}
              >
                CLAIM
              </button>
            </div>
            <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {stats.map((stat) => (
                <div key={stat.label} style={{ borderRadius: 14, padding: "8px 4px 7px", textAlign: "center", background: "rgba(4, 10, 16, 0.88)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#ffffff" }}>{stat.value}</div>
                  <div style={{ marginTop: 2, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: "rgba(186,220,236,0.55)" }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="absolute left-0 right-0 z-30 flex items-center justify-center gap-2 px-3 pointer-events-none"
          style={{ top: "max(56px, calc(env(safe-area-inset-top, 0px) + 50px))" }}
        >
          <div className="pointer-events-auto flex-shrink-0">
            <SettingsMenu muted={muted} setMuted={setMuted ?? (() => {})} headerButton />
          </div>
          <div
            className="px-4 py-2 rounded-full pointer-events-auto flex-shrink-0 flex items-center gap-2"
            style={{
              background: "rgba(0, 0, 0, 0.62)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.35)",
            }}
          >
            <span
              className="font-black text-base tracking-wide whitespace-nowrap inline-flex items-center gap-1.5"
              style={{ color: "#ffffff", letterSpacing: "0.06em" }}
            >
              <ZoomCubeIcon size={18} />
              {formatCrumbs(crumbs)}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenShop}
            aria-label={t("header.openShop")}
            className="flex items-center justify-center active:scale-95 flex-shrink-0 pointer-events-auto"
            style={{
              width: 42,
              height: 42,
              borderRadius: 999,
              background: "rgba(0, 0, 0, 0.62)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              color: "#ffffff",
            }}
          >
            <ShoppingBag size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
