import { useEffect, useRef, useState, type CSSProperties } from "react";
import ShoppingBag from "lucide-react/dist/esm/icons/shopping-bag.js";
import { SettingsMenu } from "../components/SettingsMenu";
import { ZoomCubeIcon } from "../components/ZoomCubeIcon";
import { useCrumbsBalance, useFarm } from "../components/PetFarmButton";
import { PetStage } from "../components/PetStage";
import { petCombat, petDef } from "../pet/catalog";
import { personalPetNumber, petOwnerId } from "../pet/number";
import { PixelMark } from "../components/PixelMark";
import { getPet, PET_TAP_RECHARGE_MS, petTapStatus, subscribePet, xpLabel, type PetState } from "../pet/petProgress";
import { claimFarm, formatCrumbs, subscribeCrumbs } from "../pet/crumbs";
import { markHere, readAway, type AwayKind } from "../pet/away";
import { careView, subscribeCare, takeCareXp, toggleLight } from "../pet/care";
import { addPetXp } from "../pet/petProgress";
import { playClaim } from "../audio/sfx";
import { PetPostcard } from "../components/PetPostcard";
import { PetRoom } from "../components/PetRoom";
import { noteHomeActive } from "../pet/quests";
import { focusLife, readLife } from "../pet/life";
import { LifeEgg } from "../components/LifeEgg";
import { useT } from "../i18n/LanguageContext";

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
  const [care, setCare] = useState(() => careView());
  const [wakeToast, setWakeToast] = useState(0);
  const [sheet, setSheet] = useState<null | "ability" | "hp" | "tap" | "stage">(null);
  const [away, setAway] = useState<AwayKind | null>(null);
  useEffect(() => {
    const look = () => {
      const seen = careView();
      const kind = readAway(seen.messes.length, seen.bowl, seen.asleep);
      if (kind) setAway(kind);
    };
    const leave = () => {
      const now = careView();
      markHere(now.messes.length, now.bowl);
    };
    look();
    leave();
    const onVis = () => {
      if (document.hidden) leave();
      else look();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      leave();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  useEffect(() => subscribePet(() => {
    setPet(getPet());
    setNow(Date.now());
  }), []);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    const pull = () => setCare(careView());
    const unsubCare = subscribeCare(pull);
    const unsubFarm = subscribeCrumbs(pull);
    return () => {
      unsubCare();
      unsubFarm();
    };
  }, []);
  useEffect(() => {
    if (care.wakeXp <= 0) return;
    const amount = takeCareXp();
    if (amount <= 0) return;
    const gained = addPetXp(amount);
    if (gained <= 0) return;
    setWakeToast(gained);
    window.setTimeout(() => setWakeToast(0), 1600);
  }, [care.wakeXp]);
  const taps = petTapStatus(now);
  const farm = useFarm();
  focusLife(pet.active);
  const life = readLife(pet.active, now);
  const chosen = petDef(pet.active);
  const elementName = t(`pet.element.${chosen.element.id}`);
  const abilityName = t(`pet.ability.${pet.active}.name`);
  const abilityText = t(`pet.ability.${pet.active}.text`);
  const hp = petCombat(chosen, pet.level).hp;
  const stats = [
    { id: "ability" as const, label: abilityName, value: "mark" },
    { id: "hp" as const, label: "HP", value: String(hp) },
    { id: "tap" as const, label: t("pet.tap"), value: "hearts" },
    { id: "stage" as const, label: t("pet.stage"), value: String(pet.stage) },
  ];
  const sheetBody = sheet === "ability"
    ? t("pet.sheet.abilityBody", { name: abilityName, text: abilityText })
    : sheet === "hp"
      ? t("pet.sheet.hpBody", { n: hp })
      : sheet === "tap"
        ? t("pet.sheet.tapBody", { n: taps.count, max: taps.max })
        : sheet === "stage"
          ? t("pet.sheet.stageBody", { s: pet.stage, l: pet.level })
          : "";
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
          <div style={{ flex: 1, minHeight: 0, position: "relative", margin: "12px 8px 0" }} data-testid="pet-room">
            <PetStage pet={pet} frame="lab" petId={pet.active} lifeScale={life.scale} room={{ asleep: care.asleep, dark: care.dark, sick: care.sick, calling: care.calling, hungry: care.hungry }} />
            {life.form === "egg" ? <LifeEgg color={chosen.element.color} /> : null}
            {life.form !== "egg" && life.sex ? <div className={`life-mark is-${life.sex}${life.road ? ` is-${life.road}` : ""}`} aria-hidden /> : null}
            {pet.stage > 1 ? <div className={pet.stage === 3 ? "grown-ring s3" : "grown-ring"} style={{ "--ink": chosen.element.color } as CSSProperties} /> : null}
            {pet.stage === 3 ? <div className="grown-star" style={{ color: chosen.element.color }}>✦</div> : null}
            {away ? (
              <button type="button" className="away-note" data-testid="away-note" onClick={() => setAway(null)}>
                <span>{t("away.title")}</span>
                {t(`away.${away}`)}
              </button>
            ) : null}
            <PetPostcard active={active && !care.dark} petName={chosen.name} />
            <PetRoom care={care} toast={wakeToast} />
          </div>
          <div style={{ padding: "0 12px 12px" }}>
            <div style={{ marginBottom: 8, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
              <div style={{ textAlign: "center", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#7ad7ff" }}>
                {personalPetNumber(ownerId, pet.active)} {chosen.name} · {t(`life.${life.form}`)} · {t("pet.stageLine", { s: pet.stage, l: pet.level })}
                <span style={{ color: "rgba(186,220,236,0.7)", fontWeight: 700 }}> · {xpLabel(pet)}</span>
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
                <div style={{ marginTop: 4, fontSize: 11, color: "rgba(186,220,236,0.7)" }}>
                  {formatCrumbs(farm.cap)} {t("pet.perDay")} · {t("pet.level", { n: pet.level })}
                  {care.factor < 0.97 ? ` · ${care.sick ? t("pet.sick") : care.hungry ? t("pet.hungry") : t("pet.messy")}` : ""}
                </div>
              </div>
              <button
                type="button"
                className={farm.pending >= 0.0001 ? "claim-3d" : "claim-3d is-empty"}
                style={{ ["--claim" as string]: chosen.element.color }}
                disabled={farm.pending < 0.0001 || care.dark}
                onClick={(event) => {
                  claimFarm();
                  playClaim();
                  const from = event.currentTarget.getBoundingClientRect();
                  const wallet = document.querySelector("[data-crumb-wallet]");
                  const to = wallet?.getBoundingClientRect();
                  if (!to) return;
                  for (let i = 0; i < 6; i++) {
                    const crumb = document.createElement("span");
                    crumb.className = "crumb-fly";
                    crumb.textContent = "🍪";
                    crumb.style.left = `${from.left + from.width / 2}px`;
                    crumb.style.top = `${from.top + from.height / 2}px`;
                    document.body.appendChild(crumb);
                    const dx = to.left + to.width / 2 - (from.left + from.width / 2) + (i - 2.5) * 6;
                    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
                    crumb.animate([
                      { transform: "translate(-50%, -50%) scale(0.4) rotateX(0deg)", opacity: 1 },
                      { transform: `translate(calc(-50% + ${dx * 0.45}px), calc(-50% + ${dy * 0.35 - 28}px)) scale(1.15) rotateY(180deg)`, opacity: 1, offset: 0.45 },
                      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.35) rotateY(360deg)`, opacity: 0.15 },
                    ], { duration: 720, delay: i * 50, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" }).onfinish = () => crumb.remove();
                  }
                }}
              >
                {t("pet.claim")}
              </button>
            </div>
            <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {stats.map((stat) => (
                <button
                  key={stat.id}
                  type="button"
                  data-testid={`stat-${stat.id}`}
                  aria-expanded={sheet === stat.id}
                  onClick={() => setSheet((open) => (open === stat.id ? null : stat.id))}
                  style={{ borderRadius: 14, padding: "8px 4px 7px", textAlign: "center", background: sheet === stat.id ? "rgba(122, 215, 255, 0.16)" : "rgba(0, 0, 0, 0.35)", border: "1px solid rgba(255,255,255,0.08)", color: "inherit", font: "inherit", cursor: "pointer" }}
                >
                  {stat.value === "mark" ? (
                    <PixelMark glyph={chosen.element.glyph} label={elementName} center />
                  ) : stat.value === "hearts" ? (
                    <div style={{ display: "flex", justifyContent: "center", gap: 2, height: 16, alignItems: "center" }} aria-label={`${taps.max - taps.count} of ${taps.max}`}>
                      {taps.hearts.map((heart, index) => (
                        heart.startedAt == null
                          ? <HeartShape key={`ready-${index}`} tone="full" />
                          : <ChargingHeart key={`${heart.startedAt}-${index}`} startedAt={heart.startedAt} />
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#ffffff" }}>{stat.value}</div>
                  )}
                  <div style={{ marginTop: 2, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: "rgba(186,220,236,0.55)" }}>{stat.label}</div>
                </button>
              ))}
            </div>
          </div>
          {care.dark ? (
            <div className="home-night" data-testid="home-night">
              <div className="pet-zzz" aria-hidden>
                <span>Z</span>
                <span>Z</span>
                <span>Z</span>
              </div>
              <button
                type="button"
                className="pet-lamp"
                data-testid="pet-lamp"
                aria-label={t("pet.lightOn")}
                onClick={() => toggleLight()}
              >
                <svg width="28" height="28" viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden>
                  <rect x="3" y="0" width="3" height="1" fill="#8aa0b4" />
                  <rect x="2" y="1" width="5" height="1" fill="#8aa0b4" />
                  <rect x="2" y="2" width="5" height="3" fill="#243140" />
                  <rect x="4" y="5" width="1" height="2" fill="#c9d6e2" />
                  <rect x="2" y="7" width="5" height="1" fill="#9eb0c2" />
                </svg>
              </button>
            </div>
          ) : null}
          <PetCardTrace color={chosen.element.color} />
        </div>
      </div>

      {sheet && !care.dark ? (
        <button
          type="button"
          className="home-sheet"
          data-testid="home-sheet"
          onClick={() => setSheet(null)}
        >
          <strong>{t(`pet.sheet.${sheet}`)}</strong>
          <span>{sheetBody}</span>
        </button>
      ) : null}

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
              <span data-crumb-wallet><ZoomCubeIcon size={18} /></span>
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
