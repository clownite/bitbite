import { useEffect, useRef, useState } from "react";
import ShoppingBag from "lucide-react/dist/esm/icons/shopping-bag.js";
import { SettingsMenu } from "../components/SettingsMenu";
import { ZoomCubeIcon } from "../components/ZoomCubeIcon";
import { useCrumbsBalance, useFarm } from "../components/PetFarmButton";
import { PetStage } from "../components/PetStage";
import { petDef } from "../pet/catalog";
import { personalPetNumber, petOwnerId } from "../pet/number";
import { PixelMark } from "../components/PixelMark";
import { getPet, PET_TAP_RECHARGE_MS, petTapStatus, subscribePet, xpLabel, type PetState } from "../pet/petProgress";
import { claimFarm, formatCrumbs } from "../pet/crumbs";
import { noteHomeActive } from "../pet/quests";
import { useT } from "../i18n/LanguageContext";

/** A glow that travels the pet card forever. The loop length matches the border, so it never jumps. */
function PetCardTrace({ color }: { color: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = svgRef.current;
    const host = svg?.parentElement;
    if (!svg || !host) return;
    const fit = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (width < 2 || height < 2) return;
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      const inset = 2.5;
      const rects = [...svg.querySelectorAll("rect")];
      for (const rect of rects) {
        rect.setAttribute("x", String(inset));
        rect.setAttribute("y", String(inset));
        rect.setAttribute("width", String(width - inset * 2));
        rect.setAttribute("height", String(height - inset * 2));
        rect.setAttribute("rx", "23.5");
        rect.setAttribute("ry", "23.5");
      }
      const length = rects[0]?.getTotalLength() ?? 0;
      if (length <= 0) return;
      const head = length * 0.34;
      svg.style.setProperty("--trace", `${length}px`);
      const dash = `${head}px ${length - head}px`;
      for (const rect of rects) {
        if (rect.classList.contains("pet-card-trace-track")) continue;
        rect.style.strokeDasharray = dash;
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);
  return (
    <svg ref={svgRef} className="pet-card-trace" style={{ ["--trace-color" as string]: color }} aria-hidden>
      <rect className="pet-card-trace-track" />
      <rect className="pet-card-trace-glow" />
      <rect className="pet-card-trace-line" />
    </svg>
  );
}

function HeartShape({ tone }: { tone: "full" | "empty" }) {
  if (tone === "empty") {
    const edge = "#8ea3b8";
    return (
      <svg width="11" height="10" viewBox="0 0 8 7" shapeRendering="crispEdges" aria-hidden>
        <rect x="1" y="0" width="2" height="1" fill={edge} />
        <rect x="5" y="0" width="2" height="1" fill={edge} />
        <rect x="0" y="1" width="1" height="2" fill={edge} />
        <rect x="7" y="1" width="1" height="2" fill={edge} />
        <rect x="1" y="3" width="1" height="1" fill={edge} />
        <rect x="6" y="3" width="1" height="1" fill={edge} />
        <rect x="2" y="4" width="1" height="1" fill={edge} />
        <rect x="5" y="4" width="1" height="1" fill={edge} />
        <rect x="3" y="5" width="2" height="1" fill={edge} />
      </svg>
    );
  }
  return (
    <svg width="11" height="10" viewBox="0 0 8 7" shapeRendering="crispEdges" aria-hidden>
      <rect x="1" y="0" width="2" height="1" fill="#ff3355" />
      <rect x="5" y="0" width="2" height="1" fill="#ff3355" />
      <rect x="0" y="1" width="8" height="2" fill="#ff2040" />
      <rect x="1" y="3" width="6" height="1" fill="#ff2040" />
      <rect x="2" y="4" width="4" height="1" fill="#e01838" />
      <rect x="3" y="5" width="2" height="1" fill="#e01838" />
      <rect x="1" y="1" width="1" height="1" fill="#ff8aa0" />
    </svg>
  );
}

function ChargingHeart({ startedAt }: { startedAt: number }) {
  const [elapsed] = useState(() => Math.min(PET_TAP_RECHARGE_MS, Math.max(0, Date.now() - startedAt)));
  return (
    <span className="tap-heart">
      <HeartShape tone="empty" />
      <span
        className="tap-heart-fill"
        style={{
          clipPath: `inset(${(1 - elapsed / PET_TAP_RECHARGE_MS) * 100}% 0 0 0)`,
          animationDuration: `${PET_TAP_RECHARGE_MS}ms`,
          animationDelay: `${-elapsed}ms`,
        }}
      >
        <HeartShape tone="full" />
      </span>
    </span>
  );
}

function rechargeLabel(ms: number): string {
  const capped = Math.max(0, Math.min(ms, PET_TAP_RECHARGE_MS));
  const totalMinutes = Math.ceil(capped / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 1 && minutes === 0) return `${hours}h`;
  if (hours >= 1) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${Math.max(1, minutes)}m`;
}

/** Home is the active pet and its Crumb farm. The model forge is gone. */
export function LabPage({
  onOpenShop,
  muted = false,
  setMuted,
  active = true,
  telegramId,
}: {
  onOpenShop?: () => void;
  muted?: boolean;
  setMuted?: (next: boolean | ((prev: boolean) => boolean)) => void;
  active?: boolean;
  telegramId?: string | null;
}) {
  const ownerId = petOwnerId(telegramId);
  const { t } = useT();
  const crumbs = useCrumbsBalance();
  const [pet, setPet] = useState<PetState>(getPet());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => subscribePet(() => {
    setPet(getPet());
    setNow(Date.now());
  }), []);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const taps = petTapStatus(now);
  const rechargeMs = taps.nextReadyAt > now ? taps.nextReadyAt - now : 0;
  const farm = useFarm();
  const chosen = petDef(pet.active);
  const elementName = t(`pet.element.${chosen.element.id}`);
  const stats = [
    { id: "element", label: elementName, value: "rarity" },
    { id: "hp", label: "HP", value: "hearts" },
    { id: "tap", label: t("pet.tap"), value: `${taps.count}/4` },
    { id: "stage", label: t("pet.stage"), value: String(pet.stage) },
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
      <div
        className="absolute left-0 right-0 z-20"
        style={{
          top: "max(108px, calc(env(safe-area-inset-top, 0px) + 102px))",
          bottom: "calc(84px + env(safe-area-inset-bottom, 0px) + 10px)",
          padding: "0 14px",
        }}
      >
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            borderRadius: 26,
            overflow: "hidden",
            background: `radial-gradient(ellipse 92% 58% at 50% 28%, ${chosen.element.color}cc 0%, ${chosen.element.color}55 40%, transparent 72%), linear-gradient(180deg, ${chosen.element.color}55 0%, #071018 58%, #05080e 100%)`,
            border: "1px solid rgba(122, 215, 255, 0.22)",
            boxShadow: `0 0 0 1px rgba(0,0,0,0.6), 0 0 32px ${chosen.element.color}55, 0 16px 40px rgba(0,0,0,0.35)`,
          }}
        >
          <div style={{ flex: 1, minHeight: 0, position: "relative", margin: "12px 8px 0" }}>
            <PetStage pet={pet} frame="lab" petId={pet.active} />
          </div>
          <div style={{ padding: "0 12px 12px" }}>
            <div style={{ marginBottom: 8, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
              <div style={{ textAlign: "center", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#7ad7ff" }}>
                {personalPetNumber(ownerId, pet.active)} {chosen.name} · {t("pet.stageLine", { s: pet.stage, l: pet.level })}
                <span style={{ color: "rgba(186,220,236,0.7)", fontWeight: 700 }}> · {xpLabel(pet)} · {taps.count}/{taps.max}</span>
              </div>
              <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#041018", background: chosen.element.color, borderRadius: 999, padding: "3px 7px" }}>
                {elementName}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 12px 12px 14px",
                borderRadius: 18,
                background: "rgba(0, 0, 0, 0.45)",
                border: "1px solid rgba(122, 215, 255, 0.35)",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", color: "rgba(186,220,236,0.7)" }}>{t("pet.farm")}</div>
                <div style={{ marginTop: 2, fontSize: 26, fontWeight: 900, color: "#ffffff", lineHeight: 1 }}>{formatCrumbs(farm.pending)}</div>
                <div style={{ marginTop: 4, fontSize: 11, color: "rgba(186,220,236,0.7)" }}>{formatCrumbs(farm.cap)} {t("pet.perDay")} · {t("pet.level", { n: pet.level })}</div>
              </div>
              <button
                type="button"
                className={farm.pending >= 0.0001 ? "claim-3d" : "claim-3d is-empty"}
                style={{ ["--claim" as string]: chosen.element.color }}
                disabled={farm.pending < 0.0001}
                onClick={() => { claimFarm(); }}
              >
                {t("pet.claim")}
              </button>
            </div>
            <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {stats.map((stat) => (
                <div key={stat.id} style={{ borderRadius: 14, padding: "8px 4px 7px", textAlign: "center", background: "rgba(0, 0, 0, 0.35)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {stat.value === "rarity" ? (
                    <PixelMark glyph={chosen.element.glyph} label={elementName} center />
                  ) : stat.value === "hearts" ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "center", gap: 2, height: 16, alignItems: "center" }} aria-label={`${taps.max - taps.count} of ${taps.max} lives`}>
                        {taps.hearts.map((heart, index) => (
                          heart.startedAt == null
                            ? <HeartShape key={`ready-${index}`} tone="full" />
                            : <ChargingHeart key={`${heart.startedAt}-${index}`} startedAt={heart.startedAt} />
                        ))}
                      </div>
                      {rechargeMs > 0 ? (
                        <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.04em", color: "rgba(186,220,236,0.7)" }}>{rechargeLabel(rechargeMs)}</div>
                      ) : null}
                    </>
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#ffffff" }}>{stat.value}</div>
                  )}
                  <div style={{ marginTop: 2, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: "rgba(186,220,236,0.55)" }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <PetCardTrace color={chosen.element.color} />
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none">
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
