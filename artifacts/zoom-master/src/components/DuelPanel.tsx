import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n/LanguageContext";
import { playBite, playClick, playDone, playMiss, playSad } from "../audio/sfx";
import { PETS, petDef, type PetId } from "../pet/catalog";
import { foeMove, makeFighter, strike, type Call, type Fighter, type Move } from "../pet/duel";
import { recordCookies } from "../pet/cookieBoard";
import { noteDisciplinePlay } from "../pet/discipline";
import { addPetXp, getPet, type PetState } from "../pet/petProgress";
import { PetStage } from "./PetStage";

const WIN_POINTS = 5;
const WIN_XP = 8;
const YOUR_TURN = 6;
const THEIR_TURN = 3;
const MOVES: Move[] = ["jab", "guard", "power"];

type Phase = "intro" | "you" | "fly" | "foe" | "over";

function Bar({ fighter, color, align }: { fighter: Fighter; color: string; align: "left" | "right" }) {
  const ratio = fighter.max <= 0 ? 0 : fighter.hp / fighter.max;
  return (
    <div className={align === "right" ? "ring-hp is-foe" : "ring-hp"}>
      <div className="ring-hp-name">
        <strong style={{ color }}>{fighter.name}</strong>
        <span>{fighter.hp}</span>
      </div>
      <div className="ring-hp-track">
        <b style={{ width: `${Math.max(0, ratio) * 100}%` }} />
        <i style={{ width: `${Math.max(0, ratio) * 100}%`, background: color }} />
      </div>
    </div>
  );
}

function abilityLabel(buff: Fighter["ability"] | null, t: (key: string) => string): string | null {
  if (!buff) return null;
  const id = buff === "tide" ? "dolphin" : buff === "blaze" ? "finch" : buff === "overgrow" ? "lynx" : "stag";
  return t(`pet.ability.${id}.name`);
}

/** One attack at a time. Any of the four pets can be the opponent. */
export function DuelPanel({ pet }: { pet: PetState }) {
  const { t } = useT();
  const [you, setYou] = useState<Fighter | null>(null);
  const [foe, setFoe] = useState<Fighter | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [yours, setYours] = useState<Move | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [dealt, setDealt] = useState({ you: 0, foe: 0 });
  const [note, setNote] = useState<string | null>(null);
  const [left, setLeft] = useState(YOUR_TURN);
  const [winner, setWinner] = useState<string | null>(null);
  const [won, setWon] = useState(false);
  const [recap, setRecap] = useState({ you: 0, youMax: 1, foe: 0, foeMax: 1, youName: "", foeName: "" });
  const timers = useRef<number[]>([]);
  const clock = useRef<number | null>(null);
  const youRef = useRef<Fighter | null>(null);
  const foeRef = useRef<Fighter | null>(null);
  const phaseRef = useRef<Phase>("intro");
  const leftRef = useRef(YOUR_TURN);
  const lastRef = useRef<Move | null>(null);
  const lock = useRef(false);
  const paid = useRef(false);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  const stopClock = () => {
    if (clock.current != null) window.clearInterval(clock.current);
    clock.current = null;
  };

  useEffect(() => () => {
    clearTimers();
    stopClock();
  }, []);

  const setPhaseSafe = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const setPair = (mine: Fighter, other: Fighter) => {
    youRef.current = mine;
    foeRef.current = other;
    setYou(mine);
    setFoe(other);
  };

  const end = (youWon: boolean, name: string) => {
    stopClock();
    const mine = youRef.current;
    const other = foeRef.current;
    setRecap({
      you: mine?.hp ?? 0,
      youMax: mine?.max ?? 1,
      foe: other?.hp ?? 0,
      foeMax: other?.max ?? 1,
      youName: mine?.name ?? "",
      foeName: other?.name ?? "",
    });
    setWinner(name);
    setWon(youWon);
    setPhaseSafe("over");
    noteDisciplinePlay();
    if (youWon) playDone(0.12);
    else playSad(0.12);
    if (youWon && !paid.current) {
      paid.current = true;
      recordCookies(WIN_POINTS);
      addPetXp(WIN_XP);
    }
  };

  const theirGo = () => {
    if (lock.current || phaseRef.current !== "foe") return;
    const mine = youRef.current;
    const other = foeRef.current;
    if (!mine || !other) return;
    lock.current = true;
    stopClock();
    const move = foeMove(lastRef.current, Math.random);
    const blow = strike(other, mine, move);
    setDealt({ you: 0, foe: blow.damage });
    setCall(blow.call);
    setNote(abilityLabel(blow.buff, t));
    setPair(blow.def, blow.att);
    setPhaseSafe("fly");
    if (blow.damage > 0) playMiss();
    else playClick();
    later(() => {
      if (blow.def.hp <= 0) {
        end(false, blow.att.name);
        return;
      }
      startYou(blow.def, blow.att);
    }, 820);
  };

  const yourGo = (move: Move | null) => {
    if (lock.current || phaseRef.current !== "you") return;
    const mine = youRef.current;
    const other = foeRef.current;
    if (!mine || !other) return;
    lock.current = true;
    stopClock();
    lastRef.current = move;
    const blow = strike(mine, other, move);
    setYours(move);
    setDealt({ you: blow.damage, foe: 0 });
    setCall(blow.call);
    setNote(abilityLabel(blow.buff, t));
    setPair(blow.att, blow.def);
    setPhaseSafe("fly");
    if (blow.damage > 0) playBite();
    else playClick();
    later(() => {
      if (blow.def.hp <= 0) {
        end(true, blow.att.name);
        return;
      }
      startFoe(blow.att, blow.def);
    }, 820);
  };

  const arm = (seconds: number, onZero: () => void) => {
    stopClock();
    leftRef.current = seconds;
    setLeft(seconds);
    clock.current = window.setInterval(() => {
      leftRef.current -= 1;
      setLeft(leftRef.current);
      if (leftRef.current <= 0) {
        stopClock();
        onZero();
      }
    }, 1000);
  };

  const startYou = (mine: Fighter, other: Fighter) => {
    setPair(mine, other);
    setYours(null);
    setCall(null);
    setDealt({ you: 0, foe: 0 });
    setNote(null);
    lock.current = false;
    setPhaseSafe("you");
    arm(YOUR_TURN, () => yourGo(null));
  };

  const startFoe = (mine: Fighter, other: Fighter) => {
    setPair(mine, other);
    setCall(null);
    setDealt({ you: 0, foe: 0 });
    lock.current = false;
    setPhaseSafe("foe");
    arm(THEIR_TURN, () => theirGo());
  };

  const begin = (id: PetId) => {
    clearTimers();
    stopClock();
    const mine = getPet();
    const yoursNow = makeFighter(mine.active, mine.level);
    const foeNow = makeFighter(id, mine.level);
    lastRef.current = null;
    paid.current = false;
    lock.current = true;
    setWinner(null);
    setWon(false);
    setYours(null);
    setCall(null);
    setPair(yoursNow, foeNow);
    setPhaseSafe("intro");
    later(() => startYou(yoursNow, foeNow), 640);
  };

  const answer = (move: Move) => {
    if (phaseRef.current !== "you") return;
    setYours(move);
    playClick();
    yourGo(move);
  };

  if (!you || !foe) {
    return (
      <div className="duel-pick" data-testid="duel-pick">
        <p>{t("play.duelPick")}</p>
        <div className="duel-select">
          {PETS.map((def) => (
            <button key={def.id} type="button" className="duel-card" data-testid={`duel-${def.id}`} onClick={() => begin(def.id)}>
              <span style={{ color: def.element.color }}>{def.element.glyph}</span>
              <strong>{def.name}</strong>
              <small>{t(`pet.ability.${def.id}.name`)}</small>
            </button>
          ))}
        </div>
        <p className="duel-hint">{t("play.duelHint")}</p>
      </div>
    );
  }

  const youColor = petDef(you.id).element.color;
  const foeColor = petDef(foe.id).element.color;
  const foePet = { ...pet, level: pet.level, stage: pet.stage, active: foe.id };
  const showClock = phase === "you" || phase === "foe";

  return (
    <div className="duel-wrap">
      <div className={`ring ${phase === "fly" && (dealt.you > 0 || dealt.foe > 0) ? "is-shake" : ""}`} data-testid="duel">
        <div className="ring-top">
          <Bar fighter={you} color={youColor} align="left" />
          <div className="ring-clock" data-testid="duel-time">
            <b>{showClock ? left : "–"}</b>
            <small>{phase === "foe" ? t("play.theirTurn") : t("play.yourTurn")}</small>
          </div>
          <Bar fighter={foe} color={foeColor} align="right" />
        </div>
        <div
          className="ring-body"
          style={{
            background: `radial-gradient(ellipse 42% 55% at 22% 78%, ${youColor}55, transparent 70%), radial-gradient(ellipse 42% 55% at 78% 78%, ${foeColor}55, transparent 70%), linear-gradient(180deg, #071018 0%, #102433 58%, #071018 100%)`,
          }}
        >
          <div className={`ring-fighter you ${phase === "fly" && dealt.foe > 0 ? "is-hit" : ""}`}>
            <PetStage pet={pet} frame="duel" petId={you.id} side="left" />
          </div>
          <div className={`ring-fighter foe ${phase === "fly" && dealt.you > 0 ? "is-hit" : ""}`}>
            <PetStage pet={foePet} frame="duel" petId={foe.id} side="right" />
          </div>
          <div className="ring-floor" />
          {phase === "fly" && dealt.you > 0 ? <i className="ring-shot you" style={{ background: youColor, boxShadow: `0 0 18px ${youColor}` }} /> : null}
          {phase === "fly" && dealt.foe > 0 ? <i className="ring-shot foe" style={{ background: foeColor, boxShadow: `0 0 18px ${foeColor}` }} /> : null}
          {phase === "intro" ? <div className="ring-call">{t("play.fight")}</div> : null}
          {phase === "fly" && call ? (
            <div className={`ring-call is-${call}`}>
              {t(`play.call.${call}`)}
              {note ? <small>{note}</small> : null}
            </div>
          ) : null}
          {phase === "fly" && dealt.foe > 0 ? <b className="ring-num you">{dealt.foe}</b> : null}
          {phase === "fly" && dealt.you > 0 ? <b className="ring-num foe">{dealt.you}</b> : null}
          {phase === "over" && winner ? (
            <div className="ring-over" data-testid="duel-over">
              <strong>{won ? t("play.duelYou") : t("play.duelThem")}</strong>
              <span>{t("play.duelWin", { name: winner })}</span>
              <span className="ring-recap">
                {t("play.duelHp", {
                  youName: recap.youName,
                  you: recap.you,
                  youMax: recap.youMax,
                  foeName: recap.foeName,
                  foe: recap.foe,
                  foeMax: recap.foeMax,
                })}
              </span>
              <span>{won ? `${t("play.duelPoints", { n: WIN_POINTS })} · ${t("play.duelXp", { n: WIN_XP })}` : t("play.duelNone")}</span>
              <div className="ring-over-actions">
                <button type="button" className="cookie-go" data-testid="duel-again" onClick={() => begin(foe.id)}>{t("play.duelAgain")}</button>
                <button type="button" className="cookie-go is-quiet" data-testid="duel-other" onClick={() => { setYou(null); setFoe(null); }}>{t("play.duelOther")}</button>
              </div>
            </div>
          ) : null}
        </div>
        <div className="ring-moves">
          {MOVES.map((move) => (
            <button
              key={move}
              type="button"
              className={yours === move ? "is-on" : ""}
              style={yours === move ? { background: youColor, borderColor: youColor } : undefined}
              data-testid={`duel-${move}`}
              disabled={phase !== "you"}
              onClick={() => answer(move)}
            >
              <strong>{t(`play.move.${you.id}.${move}`)}</strong>
              <small>{t(`play.move.${move}`)}</small>
            </button>
          ))}
        </div>
      </div>
      <p className="duel-hint">{t("play.duelHint")}</p>
    </div>
  );
}
