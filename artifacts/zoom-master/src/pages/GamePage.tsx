import { useEffect, useRef, useState } from "react";
import { DuelPanel } from "../components/DuelPanel";
import { LifeEgg } from "../components/LifeEgg";
import { NumberGame } from "../components/NumberGame";
import { PetStage } from "../components/PetStage";
import { petDef } from "../pet/catalog";
import { ackCookieBanner, cookieBoard, nextReset, recordCookies, xpForPlace, type BoardRow } from "../pet/cookieBoard";
import { cookiePlays, noteFinishedSeries, PLAYS_PER_DAY, playsLeft, type PlayDay } from "../pet/cookiePlays";
import {
  freshRun, rigX, SERIES, stagePoint, startRun, stepRun, tapDrop, type Run,
} from "../pet/cookieGame";
import { playPose } from "../pet/playPose";
import { getPet, subscribePet, type PetState } from "../pet/petProgress";
import { eggLeft, focusLife, formatLeft, readLife } from "../pet/life";
import { playBite, playClick, playMiss } from "../audio/sfx";
import { hapticSoft } from "../utils/haptic";
import { PixelCookie } from "../components/PixelCookie";
import { useT } from "../i18n/LanguageContext";

function PixelBomb() {
  return (
    <svg width="22" height="22" viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden>
      <rect x="4" y="0" width="1" height="1" fill="#ffb020" />
      <rect x="4" y="1" width="1" height="2" fill="#f4f7fb" />
      <rect x="2" y="3" width="5" height="1" fill="#2a3140" />
      <rect x="1" y="4" width="7" height="3" fill="#1a1e28" />
      <rect x="2" y="7" width="5" height="1" fill="#2a3140" />
      <rect x="2" y="4" width="1" height="1" fill="#8d97a8" />
    </svg>
  );
}

function Board({ rows, yours, place, onClose }: { rows: BoardRow[]; yours: number; place: number; onClose: () => void }) {
  const { t } = useT();
  return (
    <div className="cookie-sheet" data-testid="cookie-board" onClick={onClose} role="presentation">
      <div className="cookie-sheet-card" onClick={(event) => event.stopPropagation()}>
        <div className="cookie-board-kicker">{t("rank.title")}</div>
        <div className="cookie-rows">
          {rows.map((row, index) => {
            const rank = index + 1;
            const isYou = rank === place;
            return (
              <div key={row.telegramId} className={isYou ? "cookie-row is-you" : "cookie-row"}>
                <span className="cookie-place">{rank}</span>
                <span className="cookie-name">
                  {row.name.split(" ")[0]}
                  {isYou ? <em>{t("rank.you")}</em> : null}
                </span>
                <span className="cookie-count">{row.amount}</span>
              </div>
            );
          })}
          {place === 0 && yours > 0 ? (
            <div className="cookie-row is-you">
              <span className="cookie-place">·</span>
              <span className="cookie-name">{t("rank.you")}</span>
              <span className="cookie-count">{yours}</span>
            </div>
          ) : null}
        </div>
        <div className="cookie-prizes">
          <div className="cookie-board-kicker">{t("play.prizes")}</div>
          <div className="cookie-prize-grid">
            {[1, 2, 3].map((placeNo) => (
              <div key={placeNo}>
                <span>#{placeNo}</span>
                <strong>{xpForPlace(placeNo)} XP</strong>
              </div>
            ))}
            <div>
              <span>#4–10</span>
              <strong>{xpForPlace(4)} XP</strong>
            </div>
          </div>
        </div>
        <button type="button" className="cookie-go" onClick={onClose}>{t("play.close")}</button>
      </div>
    </div>
  );
}

/** Cookies and bombs fall on a pet that stays on the ground. A finished series is the score. */
export function GamePage({ active }: { active: boolean }) {
  const { t } = useT();
  const [pet, setPet] = useState<PetState>(() => getPet());
  const [run, setRun] = useState<Run>(() => freshRun());
  const [board, setBoard] = useState(() => cookieBoard());
  const [plays, setPlays] = useState<PlayDay>(() => cookiePlays());
  const [boardOpen, setBoardOpen] = useState(false);
  const [hint, setHint] = useState(true);
  const [mode, setMode] = useState<"cookies" | "duel" | "numbers">("cookies");
  const [now, setNow] = useState(() => Date.now());
  const [size, setSize] = useState({ w: 0, h: 0 });
  const runRef = useRef(run);
  runRef.current = run;
  const arenaRef = useRef<HTMLDivElement>(null);
  const sized = useRef({ w: 0, h: 0 });
  const recorded = useRef(false);
  const color = petDef(pet.active).element.color;

  useEffect(() => subscribePet(() => setPet(getPet())), []);
  focusLife(pet.active);
  const life = readLife(pet.active, now);
  const waiting = life.form === "egg";
  useEffect(() => {
    if (!waiting) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [waiting]);

  useEffect(() => {
    const pull = () => {
      setBoard(cookieBoard());
      setPlays(cookiePlays());
    };
    pull();
    window.addEventListener("focus", pull);
    return () => window.removeEventListener("focus", pull);
  }, []);

  useEffect(() => {
    if (run.phase !== "clear" || recorded.current) return;
    recorded.current = true;
    if (run.score > 0) recordCookies(run.score);
    setPlays(noteFinishedSeries());
    setBoard(cookieBoard());
  }, [run.phase, run.score]);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const arena = arenaRef.current;
    const measure = () => {
      if (!arena) return;
      const w = Math.round(arena.clientWidth);
      const h = Math.round(arena.clientHeight);
      if (w === sized.current.w && h === sized.current.h) return;
      sized.current = { w, h };
      setSize({ w, h });
    };
    measure();
    const seen = new ResizeObserver(measure);
    if (arena) seen.observe(arena);
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const prev = runRef.current;
      if (prev.phase === "play") {
        const next = stepRun(prev, dt);
        runRef.current = next;
        if (next.bombedThisTick > 0) playMiss();
        setRun(next);
      }
      const sway = Math.sin(now / 700) * 0.12;
      playPose.x = rigX(0.5);
      playPose.y = Math.sin(now / 520) * 0.012;
      playPose.face = sway;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      seen.disconnect();
    };
  }, [active, mode]);

  const left = playsLeft(plays);
  const begin = () => {
    if (playsLeft(cookiePlays()) <= 0) {
      setPlays(cookiePlays());
      return;
    }
    const next = startRun();
    runRef.current = next;
    recorded.current = false;
    setRun(next);
    setHint(true);
  };

  const tap = (id: number) => {
    const next = tapDrop(runRef.current, id);
    if (next === runRef.current) return;
    runRef.current = next;
    setRun(next);
    setHint(false);
    if (next.caughtThisTick > 0) {
      playBite();
      hapticSoft();
    } else playClick();
  };

  return (
    <div className="cookie-page">
      <div className="cookie-scroll">
        <header className="cookie-head">
          <div className="cookie-head-row">
            <div>
              <div className="cookie-board-kicker">{t("play.kicker")}</div>
              <h2>{waiting ? t("life.egg") : mode === "numbers" ? t("play.numbers") : mode === "duel" ? t("play.duel") : t("play.title")}</h2>
              {mode === "cookies" && !waiting ? <div className="cookie-plays" data-testid="cookie-plays">{t("play.plays", { left, max: PLAYS_PER_DAY })}</div> : null}
            </div>
            {waiting ? null : (
              <button type="button" className="cookie-board-btn" data-testid="cookie-board-open" onClick={() => setBoardOpen(true)}>
                {t("play.board")}
              </button>
            )}
          </div>
          {waiting ? <p>{t("life.wait")}</p> : mode === "numbers" ? <p>{t("play.numbersHint")}</p> : mode === "cookies" ? <p>{t("play.blurb", { day: nextReset() })}</p> : null}
          {waiting ? null : (
            <div className="play-switch">
              <button type="button" className={mode === "cookies" ? "is-on" : ""} disabled={run.phase === "play"} onClick={() => setMode("cookies")}>{t("play.cookiesTab")}</button>
              <button type="button" className={mode === "numbers" ? "is-on" : ""} data-testid="numbers-tab" disabled={run.phase === "play"} onClick={() => setMode("numbers")}>{t("play.numbers")}</button>
              <button type="button" className={mode === "duel" ? "is-on" : ""} data-testid="duel-tab" disabled={run.phase === "play"} onClick={() => setMode("duel")}>{t("play.duel")}</button>
            </div>
          )}
        </header>

        {waiting ? (
          <div className="egg-wait" data-testid="egg-wait">
            <LifeEgg color={color} />
            <strong data-testid="egg-left">{t("life.waitLeft", { time: formatLeft(eggLeft(pet.active, now)) })}</strong>
          </div>
        ) : null}

        {!waiting && mode === "duel" ? <DuelPanel pet={pet} /> : null}
        {!waiting && mode === "numbers" ? <NumberGame pet={pet} color={color} lifeScale={life.scale} /> : null}

        {board.banner ? (
          <button
            type="button"
            className="cookie-banner"
            data-testid="cookie-banner"
            onClick={() => {
              ackCookieBanner();
              setBoard(cookieBoard());
            }}
          >
            {board.banner.waiting
              ? t("play.waiting", { xp: board.banner.xp })
              : t("play.paid", { xp: board.banner.xp, n: board.banner.place })}
          </button>
        ) : null}

        {!waiting && mode === "cookies" ? <div
          ref={arenaRef}
          className={run.phase === "boom" ? "cookie-arena is-boom" : "cookie-arena"}
          data-testid="cookie-arena"
          style={{
            background: `radial-gradient(ellipse 70% 28% at 50% 92%, ${color}66, transparent 70%), linear-gradient(180deg, #163044 0%, #071018 72%)`,
            borderColor: `${color}88`,
          }}
        >
          <PetStage pet={pet} frame="play" petId={pet.active} lifeScale={life.scale} />
          <div className="cookie-floor" />
          {size.w > 0 && run.drops.map((drop) => {
            const point = stagePoint(drop.x, drop.y, size.w, size.h);
            const gone = drop.gone === "caught" ? "is-caught" : drop.gone === "miss" ? "is-miss" : drop.gone === "boom" ? "is-boom" : "";
            return (
              <button
                key={drop.id}
                type="button"
                className={`cookie-bit ${gone}`}
                data-testid={drop.kind === "bomb" ? "fall-bomb" : "fall-cookie"}
                style={{ left: point.left, top: point.top }}
                disabled={drop.gone != null}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  tap(drop.id);
                }}
              >
                {drop.kind === "bomb" ? <PixelBomb /> : <PixelCookie dim={drop.gone === "miss"} />}
              </button>
            );
          })}
          <div className="cookie-hud">
            <div className="cookie-lives">{run.phase === "play" ? `${run.spawned}/${SERIES}` : ""}</div>
            <div className="cookie-score" data-testid="cookie-score">{run.score}</div>
          </div>
          {run.phase === "play" && hint ? <div className="cookie-hint">{t("play.hint")}</div> : null}
          {run.phase === "idle" && left > 0 ? (
            <button type="button" className="cookie-go" data-testid="cookie-start" onClick={begin}>
              <PixelCookie size={18} />
              {t("play.start")}
            </button>
          ) : null}
          {run.phase === "idle" && left === 0 ? (
            <div className="cookie-over" data-testid="cookie-plays-done">
              <strong>{t("play.playsDone")}</strong>
            </div>
          ) : null}
          {run.phase === "clear" || run.phase === "boom" ? (
            <div className="cookie-over" data-testid="cookie-over">
              <strong>{run.phase === "boom" ? t("play.boom") : t("play.over")}</strong>
              <span>{run.phase === "boom" ? t("play.lost") : t("play.caught", { n: run.score })}</span>
              {run.phase === "clear" ? <span>{t("play.weekYou", { n: board.yours })}</span> : null}
              {left > 0 ? (
                <button type="button" className="cookie-go" data-testid="cookie-again" onClick={begin}>{t("play.again")}</button>
              ) : (
                <span data-testid="cookie-plays-done">{t("play.playsDone")}</span>
              )}
            </div>
          ) : null}
        </div> : null}
      </div>
      {boardOpen ? <Board rows={board.rows} yours={board.yours} place={board.place} onClose={() => setBoardOpen(false)} /> : null}
    </div>
  );
}
