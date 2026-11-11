import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n/LanguageContext";
import { playBite, playClick, playMiss } from "../audio/sfx";
import { petDef, type PetId } from "../pet/catalog";
import {
  foeMove,
  makeFighter,
  readWindow,
  resolve,
  tellDelay,
  type Call,
  type Exchange,
  type Fighter,
  type Move,
} from "../pet/duel";
import { addPetXp, getPet, type PetState } from "../pet/petProgress";
import { PetStage } from "./PetStage";

const WIN_XP = 8;
const MOVES: Move[] = ["jab", "guard", "power"];

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

/** Two pets, three answers, one round at a time. The startup is the tell. */
export function DuelPanel({ pet }: { pet: PetState }) {
  const { t } = useT();
  const foes = pet.owned.filter((id) => id !== pet.active);
  const [you, setYou] = useState<Fighter | null>(null);
  const [foe, setFoe] = useState<Fighter | null>(null);
  const [phase, setPhase] = useState<"intro" | "read" | "fly" | "over">("intro");
  const [yours, setYours] = useState<Move | null>(null);
  const [theirs, setTheirs] = useState<Move>("jab");
  const [call, setCall] = useState<Call | null>(null);
  const [told, setTold] = useState(false);
  const [dealt, setDealt] = useState({ you: 0, foe: 0 });
  const [note, setNote] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [windowMs, setWindowMs] = useState(1100);
  const [winner, setWinner] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const yoursRef = useRef<Move | null>(null);
  const lastRef = useRef<Move | null>(null);
  const paid = useRef(false);
  const foeLevel = useRef<PetState["level"]>(1);
  const foeStage = useRef<PetState["stage"]>(1);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  useEffect(() => () => clearTimers(), []);

  const openRead = (mine: Fighter, other: Fighter) => {
    const pick = foeMove(lastRef.current, Math.random);
    const ms = readWindow(mine.speed, other.speed);
    yoursRef.current = null;
    setYou(mine);
    setFoe(other);
    setTheirs(pick);
    setYours(null);
    setCall(null);
    setTold(false);
    setDealt({ you: 0, foe: 0 });
    setNote(null);
    setPhase("read");
    setWindowMs(ms);
    setRound((n) => n + 1);
    later(() => setTold(true), tellDelay(mine.speed, other.speed));
    later(() => finish(mine, other, pick), ms);
  };

  const finish = (mine: Fighter, other: Fighter, foePick: Move) => {
    clearTimers();
    const chosen = yoursRef.current;
    lastRef.current = chosen;
    const result: Exchange = resolve(mine, other, chosen, foePick);
    setYou(result.you);
    setFoe(result.foe);
    setCall(result.call);
    setDealt({ you: result.youDealt, foe: result.foeDealt });
    setNote(result.buff ? t(`pet.ability.${result.buff === "tide" ? "dolphin" : result.buff === "blaze" ? "finch" : result.buff === "overgrow" ? "lynx" : "stag"}.name`) : result.tide ? t("pet.ability.dolphin.name") : null);
    setPhase("fly");
    if (result.youDealt > 0) playBite();
    else if (result.foeDealt > 2) playMiss();
    else playClick();
    later(() => {
      if (result.you.hp <= 0 || result.foe.hp <= 0) {
        const name = result.you.hp > 0 ? result.you.name : result.foe.name;
        setWinner(name);
        setPhase("over");
        if (result.you.hp > 0 && !paid.current) {
          paid.current = true;
          addPetXp(WIN_XP);
        }
        return;
      }
      openRead(result.you, result.foe);
    }, 760);
  };

  const begin = (id: PetId) => {
    clearTimers();
    const mine = getPet();
    const other = mine.byId[id];
    foeLevel.current = other?.level ?? 1;
    foeStage.current = other?.stage ?? 1;
    const yoursNow = makeFighter(mine.active, mine.level);
    const foeNow = makeFighter(id, foeLevel.current);
    lastRef.current = null;
    paid.current = false;
    setWinner(null);
    setYou(yoursNow);
    setFoe(foeNow);
    setPhase("intro");
    setCall(null);
    setYours(null);
    yoursRef.current = null;
    later(() => openRead(yoursNow, foeNow), 680);
  };

  const answer = (move: Move) => {
    if (phase !== "read" || yoursRef.current) return;
    yoursRef.current = move;
    setYours(move);
    playClick();
  };

  if (foes.length === 0) {
    return <p className="duel-empty">{t("play.duelNeed")}</p>;
  }

  if (!you || !foe) {
    return (
      <div className="duel-pick" data-testid="duel-pick">
        <p>{t("play.duelPick")}</p>
        <div className="duel-select">
          {foes.map((id) => {
            const def = petDef(id);
            return (
              <button key={id} type="button" className="duel-card" data-testid={`duel-${id}`} onClick={() => begin(id)}>
                <span style={{ color: def.element.color }}>{def.element.glyph}</span>
                <strong>{def.name}</strong>
                <small>{t(`pet.ability.${id}.name`)}</small>
              </button>
            );
          })}
        </div>
        <p className="duel-hint">{t("play.duelHint")}</p>
      </div>
    );
  }

  const youColor = petDef(you.id).element.color;
  const foeColor = petDef(foe.id).element.color;
  const foePet = { ...pet, level: foeLevel.current, stage: foeStage.current, active: foe.id };

  return (
    <div className="duel-wrap">
      <div className={`ring ${phase === "fly" && (dealt.you > 0 || dealt.foe > 0) ? "is-shake" : ""}`} data-testid="duel">
        <div className="ring-top">
          <Bar fighter={you} color={youColor} align="left" />
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
          {phase === "read" ? <div className="ring-time"><i key={round} style={{ animationDuration: `${windowMs}ms` }} /></div> : null}
          {phase === "intro" ? <div className="ring-call">{t("play.fight")}</div> : null}
          {phase === "read" && told ? (
            <div className="ring-tell" style={{ color: foeColor }}>{t(`play.move.${foe.id}.${theirs}`)}</div>
          ) : null}
          {phase === "fly" && call ? (
            <div className={`ring-call is-${call}`}>
              {t(`play.call.${call}`)}
              {note ? <small>{note}</small> : null}
            </div>
          ) : null}
          {phase === "fly" && dealt.foe > 0 ? <b className="ring-num you">{dealt.foe}</b> : null}
          {phase === "fly" && dealt.you > 0 ? <b className="ring-num foe">{dealt.you}</b> : null}
          {phase === "over" && winner ? (
            <div className="ring-over">
              <strong>{t("play.ko")}</strong>
              <span>{t("play.duelWin", { name: winner })}{you.hp > 0 ? ` ${t("play.duelXp", { n: WIN_XP })}` : ""}</span>
              <button type="button" className="cookie-go" onClick={() => { setYou(null); setFoe(null); }}>{t("play.duelAgain")}</button>
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
              disabled={phase !== "read" || yours != null}
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
