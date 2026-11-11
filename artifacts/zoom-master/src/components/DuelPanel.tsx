import { useRef, useState } from "react";
import { useT } from "../i18n/LanguageContext";
import { petDef, type PetId } from "../pet/catalog";
import { exchange, makeFighter, type Fighter } from "../pet/duel";
import { addPetXp, getPet, type PetState } from "../pet/petProgress";

const WIN_XP = 8;

function Bar({ fighter, color }: { fighter: Fighter; color: string }) {
  const ratio = fighter.max <= 0 ? 0 : fighter.hp / fighter.max;
  return (
    <div className="duel-row">
      <div className="duel-name">
        <strong>{fighter.name}</strong>
        <span>{fighter.hp}</span>
      </div>
      <div className="duel-bar">
        <i style={{ width: `${Math.max(0, ratio) * 100}%`, background: color }} />
      </div>
    </div>
  );
}

/** A practice duel against another pet you own. The strike uses the card stats. */
export function DuelPanel({ pet }: { pet: PetState }) {
  const { t } = useT();
  const foes = pet.owned.filter((id) => id !== pet.active);
  const [you, setYou] = useState<Fighter | null>(null);
  const [foe, setFoe] = useState<Fighter | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [over, setOver] = useState(false);
  const paid = useRef(false);

  const begin = (id: PetId) => {
    const mine = getPet();
    const other = mine.byId[id];
    setYou(makeFighter(mine.active, mine.level));
    setFoe(makeFighter(id, other?.level ?? 1));
    setLines([]);
    setOver(false);
    paid.current = false;
  };

  const strike = () => {
    if (!you || !foe || over) return;
    const blows = exchange(you, foe);
    const written = blows.map((blow) => {
      const name = blow.side === "you" ? you.name : foe.name;
      const line = t("play.duelLog", { name, n: blow.damage });
      return blow.guard ? `${line} ${t("play.duelGuard")}` : line;
    });
    const yours = you.hp;
    const theirs = foe.hp;
    setYou({ ...you });
    setFoe({ ...foe });
    if (yours <= 0 || theirs <= 0) {
      setOver(true);
      const winner = yours > 0 ? you.name : foe.name;
      const extra = yours > 0 ? ` ${t("play.duelXp", { n: WIN_XP })}` : "";
      if (yours > 0 && !paid.current) {
        paid.current = true;
        addPetXp(WIN_XP);
      }
      setLines([`${t("play.duelWin", { name: winner })}${extra}`, ...written]);
      return;
    }
    setLines((prev) => [...written, ...prev].slice(0, 4));
  };

  if (foes.length === 0) {
    return <p className="duel-empty">{t("play.duelNeed")}</p>;
  }

  if (!you || !foe) {
    return (
      <div className="duel-pick" data-testid="duel-pick">
        <p>{t("play.duelPick")}</p>
        {foes.map((id) => {
          const def = petDef(id);
          return (
            <button key={id} type="button" className="cookie-go" data-testid={`duel-${id}`} onClick={() => begin(id)}>
              {def.element.glyph} {def.name}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="duel" data-testid="duel">
      <Bar fighter={you} color={petDef(you.id).element.color} />
      <Bar fighter={foe} color={petDef(foe.id).element.color} />
      <div className="duel-log">
        {lines.map((line, index) => <p key={`${index}-${line}`}>{line}</p>)}
      </div>
      {over ? (
        <button type="button" className="cookie-go" onClick={() => { setYou(null); setFoe(null); }}>{t("play.duelAgain")}</button>
      ) : (
        <button type="button" className="cookie-go" data-testid="duel-hit" onClick={strike}>{t("play.duelHit")}</button>
      )}
    </div>
  );
}
