import { useEffect, useRef, useState, type CSSProperties } from "react";
import ShoppingBag from "lucide-react/dist/esm/icons/shopping-bag.js";
import { SettingsMenu } from "../components/SettingsMenu";
import { cookieSvg } from "../components/PixelCookie";
import { ZoomCubeIcon } from "../components/ZoomCubeIcon";
import { useCrumbsBalance, useFarm } from "../components/PetFarmButton";
import { petCombat, petDef } from "../pet/catalog";
import { getPet, petTapStatus, subscribePet, type PetState } from "../pet/petProgress";
import { claimFarm, formatCrumbs, settleFarm, subscribeCrumbs } from "../pet/crumbs";
import { dismissAway, markHere, readAway, type AwayKind } from "../pet/away";
import { careView, cleanMess, cure, feed, subscribeCare, takeCareXp, toggleLight } from "../pet/care";
import { addPetXp } from "../pet/petProgress";
import { playClaim, playHappy, playNo } from "../audio/sfx";
import { TamaMark } from "../components/TamaMark";
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
  const { t, lang } = useT();
  const crumbs = useCrumbsBalance();
  const [pet, setPet] = useState<PetState>(getPet());
  const [now, setNow] = useState(() => Date.now());
  const [care, setCare] = useState(() => careView());
  const [wakeToast, setWakeToast] = useState(0);
  const [sheet, setSheet] = useState<null | "ability" | "hp" | "tap" | "stage">(null);
  const [away, setAway] = useState<AwayKind | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [pick, setPick] = useState(2);
  const centerRef = useRef<HTMLButtonElement>(null);
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
  const picks = ["info", "clean", "feed", "claim"] as const;
  const chosenPick = picks[pick] ?? "feed";
  const pickLabel = chosenPick === "info"
    ? t("pet.sheet.ability")
    : chosenPick === "clean"
      ? (care.sick ? t("pet.cure") : t("pet.messy"))
      : chosenPick === "feed"
        ? (care.cookies >= 3 ? t("pet.full") : t("pet.feed"))
        : t("pet.claim");
  const flyCrumbs = (from: DOMRect) => {
    const wallet = document.querySelector("[data-crumb-wallet]");
    const to = wallet?.getBoundingClientRect();
    if (!to) return;
    for (let i = 0; i < 6; i++) {
      const crumb = document.createElement("span");
      crumb.className = "crumb-fly";
      crumb.innerHTML = cookieSvg(18);
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
  };
  const movePick = (dir: -1 | 1) => setPick((i) => (i + dir + picks.length) % picks.length);
  const usePick = () => {
    if (chosenPick === "info") {
      const order = ["ability", "hp", "tap", "stage"] as const;
      setSheet((open) => {
        if (!open) return "ability";
        const at = order.indexOf(open);
        return at >= order.length - 1 ? null : order[at + 1];
      });
      return;
    }
    if (chosenPick === "clean") {
      settleFarm();
      const mess = care.messes[0];
      if (mess && cleanMess(mess.id)) {
        playHappy();
        window.dispatchEvent(new Event("zoom-pet-cared"));
      } else if (care.sick && cure()) {
        playHappy();
      } else {
        playNo();
      }
      return;
    }
    if (chosenPick === "feed") {
      settleFarm();
      if (feed()) {
        playHappy();
        window.dispatchEvent(new Event("zoom-pet-eat"));
        window.dispatchEvent(new Event("zoom-pet-cared"));
      } else {
        playNo();
      }
      return;
    }
    if (farm.pending < 0.0001 || care.dark) {
      playNo();
      return;
    }
    claimFarm();
    playClaim();
    const from = centerRef.current?.getBoundingClientRect();
    if (from) flyCrumbs(from);
  };
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
        <div className="tama" data-testid="tama-shell">
          <div className="tama-face">
            <div className="tama-icons tama-status" aria-hidden>
              <span className={!egg && !care.hungry && !care.sick && care.messes.length === 0 ? "is-hot" : ""}><TamaMark kind="heart" /></span>
              <span className={care.sick ? "is-hot" : ""}><TamaMark kind="bottle" /></span>
              <span className={care.hungry ? "is-hot" : ""}><TamaMark kind="cookie" /></span>
              <span className={egg ? "is-hot" : ""}><TamaMark kind="clock" /></span>
            </div>
            {life.givenName ? null : (
              <form
                className="life-name"
                data-testid="life-name"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (nameLife(pet.active, nameDraft)) setNameDraft("");
                }}
              >
                <p>{egg ? t("life.nameTitle") : t("life.namePet")}</p>
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
            )}
          <div className="tama-lcd" data-testid="pet-room">
            <div className="tama-sun" aria-hidden>
              <svg width="28" height="28" viewBox="0 0 9 9" shapeRendering="crispEdges">
                <rect x="4" y="0" width="1" height="2" fill="#ffe14a" />
                <rect x="4" y="7" width="1" height="2" fill="#ffe14a" />
                <rect x="0" y="4" width="2" height="1" fill="#ffe14a" />
                <rect x="7" y="4" width="2" height="1" fill="#ffe14a" />
                <rect x="1" y="1" width="1" height="1" fill="#ffe14a" />
                <rect x="7" y="1" width="1" height="1" fill="#ffe14a" />
                <rect x="1" y="7" width="1" height="1" fill="#ffe14a" />
                <rect x="7" y="7" width="1" height="1" fill="#ffe14a" />
                <rect x="3" y="3" width="3" height="3" fill="#ffe56a" />
                <rect x="4" y="3" width="1" height="1" fill="#fff6c2" />
              </svg>
            </div>
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
            {life.givenName ? (
              <div className="life-given" data-testid="life-given">{life.givenName}</div>
            ) : null}
            {chosenPick === "claim" ? (
              <div className="tama-readout" data-testid="tama-crumbs">
                <strong>{formatCrumbs(farm.pending)}</strong>
                <span>{t("pet.farm")}</span>
              </div>
            ) : null}
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
          </div>
            <div className="tama-icons" role="tablist">
              {([
                ["info", "face"],
                ["clean", "drop"],
                ["feed", "heart"],
                ["claim", "blue"],
              ] as const).map(([id, kind], index) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={pick === index}
                  data-testid={`tama-${id}`}
                  className={pick === index ? "is-on" : ""}
                  onClick={() => setPick(index)}
                >
                  <TamaMark kind={kind} />
                </button>
              ))}
            </div>
            <div className="tama-caption" data-testid="tama-caption">{pickLabel}</div>
            <div className="tama-keys">
              <button type="button" className="tama-key" data-testid="tama-left" aria-label={t("card.prev")} onClick={() => movePick(-1)}>←</button>
              <button
                type="button"
                ref={centerRef}
                className={chosenPick === "claim" ? "tama-key is-center claim-3d" : "tama-key is-center"}
                data-testid="tama-center"
                aria-label={pickLabel}
                onClick={usePick}
              />
              <button type="button" className="tama-key" data-testid="tama-right" aria-label={t("card.next")} onClick={() => movePick(1)}>→</button>
            </div>
          </div>
        </div>
      </div>

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
