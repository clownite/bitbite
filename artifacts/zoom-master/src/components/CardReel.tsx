import { useEffect, useState, type ReactNode } from "react";
import { PET_HOME, formatClock, playerClock } from "../pet/clock";
import { disciplinePlays, subscribeDiscipline } from "../pet/discipline";
import { lifeStats } from "../pet/life";
import type { PetId } from "../pet/catalog";
import type { CareView } from "../pet/care";
import { useT } from "../i18n/LanguageContext";
import { runTap } from "../utils/tap";

const SCREENS = ["pet", "clock", "body", "discipline", "hungry", "happy"] as const;

function placeName(place: string, lang: string): string {
  if (lang === "it" && place === "Rome") return "Roma";
  return place;
}

/** Four hearts. A full bowl lights every one. */
export function bowlHearts(bowl: number): number {
  if (bowl >= 0.92) return 4;
  if (bowl <= 0.05) return 0;
  return Math.max(1, Math.min(3, Math.round(bowl * 4)));
}

function MeterHeart({ on }: { on: boolean }) {
  const edge = "#306230";
  if (!on) {
    return (
      <svg width="28" height="26" viewBox="0 0 8 7" shapeRendering="crispEdges" aria-hidden>
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
    <svg width="28" height="26" viewBox="0 0 8 7" shapeRendering="crispEdges" aria-hidden>
      <rect x="1" y="0" width="2" height="1" fill="#0f380f" />
      <rect x="5" y="0" width="2" height="1" fill="#0f380f" />
      <rect x="0" y="1" width="8" height="2" fill="#0f380f" />
      <rect x="1" y="3" width="6" height="1" fill="#0f380f" />
      <rect x="2" y="4" width="4" height="1" fill="#14300a" />
      <rect x="3" y="5" width="2" height="1" fill="#14300a" />
      <rect x="1" y="1" width="1" height="1" fill="#9bbc0f" />
    </svg>
  );
}

function Hearts({ n }: { n: number }) {
  return (
    <div className="card-hearts" aria-label={`${n}/4`}>
      {[0, 1, 2, 3].map((i) => <MeterHeart key={i} on={i < n} />)}
    </div>
  );
}

/** Home card, turned to the right like a Tamagotchi: clock, hearts, age, then the three meters. */
export function CardReel({
  petId,
  petName,
  now,
  care,
  egg,
  children,
}: {
  petId: PetId;
  petName: string;
  now: number;
  care: CareView;
  egg: boolean;
  children: ReactNode;
}) {
  const { t, lang } = useT();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [tick, setTick] = useState(now);
  const [plays, setPlays] = useState(disciplinePlays);
  const screen = SCREENS[index];

  useEffect(() => subscribeDiscipline(() => setPlays(disciplinePlays())), []);

  useEffect(() => setIndex(0), [petId]);
  useEffect(() => {
    if (screen !== "clock") return;
    setTick(Date.now());
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [screen]);

  useEffect(() => {
    const host = document.querySelector("[data-testid=pet-room]");
    if (!host) return;
    let origin: { x: number; y: number } | null = null;
    let swiping = false;
    const down = (event: Event) => {
      const e = event as PointerEvent;
      if ((e.target as HTMLElement | null)?.closest("button")) return;
      origin = { x: e.clientX, y: e.clientY };
      swiping = false;
    };
    const move = (event: Event) => {
      if (!origin) return;
      const e = event as PointerEvent;
      const dx = e.clientX - origin.x;
      const dy = e.clientY - origin.y;
      if (!swiping && Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.2) swiping = true;
      if (swiping) e.stopPropagation();
    };
    const up = (event: Event) => {
      if (!origin) return;
      const e = event as PointerEvent;
      const dx = e.clientX - origin.x;
      origin = null;
      if (!swiping || Math.abs(dx) < 40) {
        swiping = false;
        return;
      }
      e.stopPropagation();
      swiping = false;
      const next = dx < 0 ? 1 : -1;
      setDir(next);
      setIndex((i) => (i + next + SCREENS.length) % SCREENS.length);
    };
    host.addEventListener("pointerdown", down);
    host.addEventListener("pointermove", move, true);
    host.addEventListener("pointerup", up, true);
    return () => {
      host.removeEventListener("pointerdown", down);
      host.removeEventListener("pointermove", move, true);
      host.removeEventListener("pointerup", up, true);
    };
  }, []);

  const go = (next: 1 | -1) => {
    setDir(next);
    setIndex((i) => (i + next + SCREENS.length) % SCREENS.length);
  };

  const stats = lifeStats(petId, now);
  const fed = egg ? 0 : bowlHearts(care.bowl);
  let happy = egg ? 0 : 4;
  if (!egg && care.sick) happy -= 2;
  if (!egg && care.hungry) happy -= 2;
  else if (!egg && care.bowl < 0.5) happy -= 1;
  if (!egg) happy -= Math.min(2, care.messes.length);
  happy = Math.max(0, Math.min(4, happy));
  const discipline = egg ? 0 : Math.max(0, Math.min(4, plays));

  const player = playerClock(tick);
  const home = PET_HOME[petId];
  const homeTime = formatClock(tick, home.zone);

  return (
    <div className="card-reel">
      {children}
      {screen !== "pet" ? (
        <div className={dir < 0 ? "card-status is-back" : "card-status"} data-testid="card-screen" data-screen={screen}>
          {screen === "clock" ? (
            <>
              <div className="card-kicker">{placeName(player.place, lang)}</div>
              <div className="card-time" data-testid="card-time">{player.time}</div>
              <div className="card-sub">{t("card.lives", { name: petName, place: home.place, time: homeTime })}</div>
            </>
          ) : null}
          {screen === "body" ? (
            <div className="card-pair" data-testid="card-body">
              <div>
                <strong>{stats.years}</strong>
                <span>{stats.years === 1 ? t("card.year") : t("card.years")}</span>
              </div>
              <div>
                <strong>{stats.weight}</strong>
                <span>{t("card.grams")}</span>
              </div>
            </div>
          ) : null}
          {screen === "discipline" ? (
            <>
              <div className="card-kicker">{t("card.discipline")}</div>
              <Hearts n={discipline} />
            </>
          ) : null}
          {screen === "hungry" ? (
            <>
              <div className="card-kicker">{fed === 4 ? t("card.full") : t("card.hungry")}</div>
              <Hearts n={fed} />
            </>
          ) : null}
          {screen === "happy" ? (
            <>
              <div className="card-kicker">{t("card.happy")}</div>
              <Hearts n={happy} />
            </>
          ) : null}
        </div>
      ) : null}
      <button type="button" className="card-reel-nav is-prev" aria-label={t("card.prev")} onPointerDown={(event) => runTap(event, () => go(-1))} onTouchStart={(event) => runTap(event, () => go(-1))} />
      <button type="button" className="card-reel-nav is-next" data-testid="card-next" aria-label={t("card.next")} onPointerDown={(event) => runTap(event, () => go(1))} onTouchStart={(event) => runTap(event, () => go(1))} />
      <div className="card-reel-dots" aria-hidden>
        {SCREENS.map((id, i) => <i key={id} className={i === index ? "is-on" : ""} />)}
      </div>
    </div>
  );
}
