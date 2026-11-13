import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useFarm } from "../components/PetFarmButton";
import { petCombat, petDef } from "../pet/catalog";
import { personalPetNumber, petOwnerId } from "../pet/number";
import { getPet, PET_TAP_RECHARGE_MS, petTapStatus, subscribePet, type PetState } from "../pet/petProgress";
import { claimFarm, formatCrumbs, subscribeCrumbs } from "../pet/crumbs";
import { dismissAway, markHere, readAway, type AwayKind } from "../pet/away";
import { careView, subscribeCare, takeCareXp, toggleLight } from "../pet/care";
import { addPetXp } from "../pet/petProgress";
import { playClaim } from "../audio/sfx";
import { noteHumanGesture } from "../pet/human";
import { PetPostcard } from "../components/PetPostcard";
import { PetRoom } from "../components/PetRoom";
import { noteHomeActive } from "../pet/quests";
import { answerLife, eggLeft, familyOf, focusLife, formatLeft, nameLife, readLife, subscribeLife } from "../pet/life";
import { kinName } from "../pet/kin";
import { LifeEgg } from "../components/LifeEgg";
import { LifeCreature } from "../components/LifeCreature";
import { LifeMarks } from "../components/LifeMarks";
import { CardReel } from "../components/CardReel";
import { useT } from "../i18n/LanguageContext";

function EggAsk({ time, explain, label }: { time: string; explain: string; label: string }) {
  const [small, setSmall] = useState(false);
  return (
    <button
      type="button"
      className={small ? "egg-hint is-small" : "egg-hint"}
      aria-expanded={!small}
      aria-label={label}
      data-testid="egg-wait-home"
      onClick={() => setSmall((v) => !v)}
    >
      <strong>{time}</strong>
      <span>{explain}</span>
    </button>
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
  const { t, lang } = useT();
  const [pet, setPet] = useState<PetState>(getPet());
  const [now, setNow] = useState(() => Date.now());
  const [care, setCare] = useState(() => careView());
  const [wakeToast, setWakeToast] = useState(0);
  const [sheet, setSheet] = useState<null | "ability" | "hp" | "tap" | "stage">(null);
  const [away, setAway] = useState<AwayKind | null>(null);
  const [nameDraft, setNameDraft] = useState("");
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
  focusLife(pet.active);
  const life = readLife(pet.active, now);
  const egg = life.form === "egg";
  const rising = life.form === "ascend";
  useEffect(() => subscribeLife(() => setNow(Date.now())), []);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), egg || rising ? 250 : 30_000);
    return () => window.clearInterval(id);
  }, [egg, rising]);
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
  const chosen = petDef(pet.active);
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
  const runClaim = () => {
    if (care.dark) return;
    const got = claimFarm();
    if (got <= 0) return;
    playClaim();
  };
  useEffect(() => {
    const onClaim = () => runClaim();
    window.addEventListener("zoom-home-claim", onClaim);
    return () => window.removeEventListener("zoom-home-claim", onClaim);
  });

  return (
    <div className="relative h-full overflow-hidden">
      <div
        className="absolute left-0 right-0 z-20"
        style={{
          top: 0,
          bottom: 0,
          padding: 0,
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
            background: "transparent",
            border: "none",
            boxShadow: "none",
            color: "#0f380f",
          }}
        >
          <div className="gb-home-top">
            <span>BITBITE</span>
            <span>{life.givenName || chosen.name}</span>
          </div>
          <div className="gb-home-pet" data-testid="pet-room">
            <CardReel petId={pet.active} petName={chosen.name} now={now} care={care} egg={life.form === "egg"}>
            {life.form === "egg" ? <LifeEgg color={chosen.element.color} /> : (
              <LifeCreature
                family={familyOf(pet.active)}
                form={life.form}
                kin={life.kin}
                mark={life.mark}
                asleep={care.asleep || care.dark}
                asking={life.visit}
                onTap
              />
            )}
            {life.child ? (
              <div className="life-heir" data-testid="life-heir">
                {life.child.form === "egg" ? <LifeEgg color={chosen.element.color} mini /> : (
                  <LifeCreature family={familyOf(pet.active)} form={life.child.form} kin={0} mark={life.child.mark} mini />
                )}
              </div>
            ) : null}
            {life.visit && life.spouseKin != null ? (
              <div className="life-ask" data-testid="life-ask">
                <p>{t("life.ask", { name: kinName(familyOf(pet.active), life.spouseKin, lang) })}</p>
                <div>
                  <button type="button" onClick={() => { answerLife(pet.active, true); setNow(Date.now()); }}>{t("life.yes")}</button>
                  <button type="button" className="is-no" onClick={() => { answerLife(pet.active, false); setNow(Date.now()); }}>{t("life.no")}</button>
                </div>
              </div>
            ) : null}
            {life.form === "egg" ? (
              <EggAsk
                time={t("life.waitLeft", { time: formatLeft(eggLeft(pet.active, now)) })}
                explain={t("life.evolve")}
                label={t("life.eggAsk")}
              />
            ) : null}
            {life.form !== "egg" && life.sex ? <LifeMarks sex={life.sex} road={life.road} /> : null}
            {pet.stage > 1 ? <div className={pet.stage === 3 ? "grown-ring s3" : "grown-ring"} style={{ "--ink": chosen.element.color } as CSSProperties} /> : null}
            {pet.stage === 3 ? <div className="grown-star" style={{ color: chosen.element.color }}>✦</div> : null}
            {away && life.form !== "egg" ? (
              <button type="button" className="away-note" data-testid="away-note" onClick={() => { dismissAway(); setAway(null); }}>
                <span>{t("away.title")}</span>
                {t(`away.${away}`)}
              </button>
            ) : null}
            <PetPostcard active={active && !care.dark && life.form !== "egg"} petName={chosen.name} />
            <PetRoom care={care} toast={wakeToast} waiting={life.form === "egg"} />
            </CardReel>
          </div>
          <div className="gb-home-body">
            <div className="gb-home-line">
              {chosen.name} · {t(`life.${life.form === "egg" ? "egg" : life.form}`)} · {t("life.generation", { n: life.generation })} · {t("pet.stage").toUpperCase()} {pet.stage}/3
            </div>
            <div className="gb-farm">
              <div>{t("pet.farm")} {formatCrumbs(farm.pending)}</div>
              <div>{formatCrumbs(farm.cap)} / day</div>
            </div>
            <button
                type="button"
                className={farm.pending >= 0.0001 ? "claim-3d" : "claim-3d is-empty"}
                style={{ ["--claim" as string]: chosen.element.color }}
                disabled={farm.pending < 0.0001 || care.dark}
                onClick={(event) => {
                  noteHumanGesture(event.isTrusted);
                  runClaim();
                }}
              >
                <b className="gb-a-mark" aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
                    <circle cx="13" cy="13" r="11" fill="#e6ebd0" stroke="#2f3d1c" strokeWidth="1.7" />
                    <path fill="#1a2410" d="M13 6.2 7.2 20h2.6l1.1-3h4.2l1.1 3H18.8L13 6.2zm0 5.2 1.35 3.6h-2.7L13 11.4z" />
                  </svg>
                </b>
                {t("pet.claim")}
              </button>
            <div className="gb-stats">
              {stats.map((stat) => (
                <button
                  key={stat.id}
                  type="button"
                  className="gb-stat"
                  data-testid={`stat-${stat.id}`}
                  aria-expanded={sheet === stat.id}
                  onClick={() => setSheet((open) => (open === stat.id ? null : stat.id))}
                >
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#0f380f" }}>
                    {stat.id === "ability" ? abilityName : stat.id === "hp" ? `HP ${stat.value}` : stat.id === "tap" ? stat.label : `${stat.label} ${stat.value}`}
                  </div>
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

      {!life.givenName ? (
        <form
          className="life-name"
          data-testid="life-name"
          onSubmit={(event) => {
            event.preventDefault();
            if (nameLife(pet.active, nameDraft)) setNameDraft("");
          }}
        >
          <p>{t("life.namePet")}</p>
          <p>{t("life.nameBody")}</p>
          <input
            value={nameDraft}
            maxLength={16}
            placeholder={t("life.namePh")}
            aria-label={t("life.namePh")}
            autoComplete="off"
            onChange={(event) => setNameDraft(event.target.value.slice(0, 16))}
          />
          <button type="submit" disabled={!nameDraft.trim()}>{t("life.nameSave")}</button>
        </form>
      ) : null}

      {sheet && !care.dark ? (
        <button
          type="button"
          className="home-sheet"
          data-testid="home-sheet"
          onClick={() => setSheet(null)}
        >
          <span className="sheet-grip" />
          <strong>{t(`pet.sheet.${sheet}`)}</strong>
          <span>{sheetBody}</span>
        </button>
      ) : null}

      <span data-crumb-wallet hidden />
    </div>
  );
}
