import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { SettingsMenu } from "../components/SettingsMenu";
import { ZoomCubeIcon } from "../components/ZoomCubeIcon";
import { PetFarmPanel, useCrumbsBalance } from "../components/PetFarmButton";
import { PetStage } from "../components/PetStage";
import { getPet, petTapStatus, subscribePet, xpLabel, type PetState } from "../pet/petProgress";
import { formatCrumbs } from "../pet/crumbs";
import { useT } from "../i18n/LanguageContext";

/** Home is the active pet and its Crumb farm. The model forge is gone. */
export function LabPage({
  onOpenShop,
  muted = false,
  setMuted,
}: {
  onOpenShop?: () => void;
  muted?: boolean;
  setMuted?: (next: boolean | ((prev: boolean) => boolean)) => void;
}) {
  const { t } = useT();
  const crumbs = useCrumbsBalance();
  const [pet, setPet] = useState<PetState>(getPet());
  useEffect(() => subscribePet(() => setPet(getPet())), []);
  const taps = petTapStatus();

  return (
    <div className="relative h-full overflow-hidden">
      <div className="absolute inset-0">
        <PetStage pet={pet} frame="lab" petId={pet.active} />
        <div
          className="absolute left-0 right-0 z-20 flex justify-center pointer-events-none"
          style={{ bottom: 132, padding: "0 16px" }}
        >
          <div className="pointer-events-auto" style={{ width: "min(420px, 100%)" }}>
            <div style={{ marginBottom: 8, textAlign: "center", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#7ad7ff" }}>
              {pet.finished ? "LEVEL 10" : `STAGE ${pet.stage}/3 · LEVEL ${pet.level}`}
              <span style={{ color: "rgba(186,220,236,0.7)", fontWeight: 700 }}> · {xpLabel(pet)} · {taps.count}/{taps.max}</span>
            </div>
            <PetFarmPanel />
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
