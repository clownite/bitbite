import { useEffect, useRef, useState } from "react";
import ShoppingBag from "lucide-react/dist/esm/icons/shopping-bag.js";
import { SettingsMenu } from "../components/SettingsMenu";
import { ZoomCubeIcon } from "../components/ZoomCubeIcon";
import { useCrumbsBalance, useFarm } from "../components/PetFarmButton";
import { PetStage } from "../components/PetStage";
import { petDef } from "../pet/catalog";
import { getPet, petTapStatus, subscribePet, xpLabel, type PetState } from "../pet/petProgress";
import { claimFarm, formatCrumbs } from "../pet/crumbs";
import { noteHomeActive } from "../pet/quests";
import { useT } from "../i18n/LanguageContext";

/** A glow that travels the pet card forever. The loop length matches the border, so it never jumps. */
function PetCardTrace() {
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
    <svg ref={svgRef} className="pet-card-trace" aria-hidden>
      <rect className="pet-card-trace-track" />
      <rect className="pet-card-trace-glow" />
      <rect className="pet-card-trace-line" />
    </svg>
  );
}

/** The water-drop emoji, drawn small and scaled up so the same glyph reads as pixels. */
function PixelWaterDrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const src = document.createElement("canvas");
    src.width = 64;
    src.height = 64;
    const sctx = src.getContext("2d");
    if (!sctx) return;
    sctx.font = '54px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    sctx.textAlign = "center";
    sctx.textBaseline = "middle";
    sctx.fillText("💧", 32, 36);
    const pixels = sctx.getImageData(0, 0, 64, 64).data;
    let minX = 64;
    let minY = 64;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        if (pixels[(y * 64 + x) * 4 + 3] < 20) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (maxX <= minX) return;
    const cols = 11;
    const rows = Math.max(11, Math.round(((maxY - minY + 1) / (maxX - minX + 1)) * cols));
    canvas.width = cols;
    canvas.height = rows;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, minX, minY, maxX - minX + 1, maxY - minY + 1, 0, 0, cols, rows);
  }, []);
  return <canvas ref={ref} className="rarity-drop" aria-label="Water drop" />;
}

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
  const stats = [
    { label: chosen.element.label, value: "rarity" },
    { label: "HP", value: "hearts" },
    { label: "Tap", value: `${taps.count}/4` },
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
                {chosen.name} · STAGE {pet.stage}/3 · LEVEL {pet.level}
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
                background: "rgba(0, 0, 0, 0.45)",
                border: "1px solid rgba(122, 215, 255, 0.35)",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", color: "rgba(186,220,236,0.7)" }}>FARM</div>
                <div style={{ marginTop: 2, fontSize: 26, fontWeight: 900, color: "#ffffff", lineHeight: 1 }}>{formatCrumbs(farm.pending)}</div>
                <div style={{ marginTop: 4, fontSize: 11, color: "rgba(186,220,236,0.7)" }}>{formatCrumbs(farm.cap)} / day · level {pet.level}</div>
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
                <div key={stat.label} style={{ borderRadius: 14, padding: "8px 4px 7px", textAlign: "center", background: "rgba(0, 0, 0, 0.35)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {stat.value === "rarity" ? (
                    <PixelWaterDrop />
                  ) : stat.value === "hearts" ? (
                    <div style={{ display: "flex", justifyContent: "center", gap: 3, height: 16, alignItems: "center" }} aria-label="3 lives">
                      {[0, 1, 2].map((heart) => (
                        <svg key={heart} width="12" height="11" viewBox="0 0 8 7" shapeRendering="crispEdges" aria-hidden>
                          <rect x="1" y="0" width="2" height="1" fill="#ff3355" />
                          <rect x="5" y="0" width="2" height="1" fill="#ff3355" />
                          <rect x="0" y="1" width="8" height="2" fill="#ff2040" />
                          <rect x="1" y="3" width="6" height="1" fill="#ff2040" />
                          <rect x="2" y="4" width="4" height="1" fill="#e01838" />
                          <rect x="3" y="5" width="2" height="1" fill="#e01838" />
                          <rect x="1" y="1" width="1" height="1" fill="#ff8aa0" />
                        </svg>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#ffffff" }}>{stat.value}</div>
                  )}
                  <div style={{ marginTop: 2, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: "rgba(186,220,236,0.55)" }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <PetCardTrace />
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
