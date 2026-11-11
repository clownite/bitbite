import { useEffect, useState } from "react";
import { cleanMess, cure, feed, toggleLight, type CareView } from "../pet/care";
import { settleFarm } from "../pet/crumbs";
import { playClick } from "../audio/sfx";
import { useT } from "../i18n/LanguageContext";

function PixelCookie() {
  return (
    <svg width="18" height="18" viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden>
      <rect x="2" y="0" width="5" height="1" fill="#f2c48a" />
      <rect x="1" y="1" width="7" height="1" fill="#f0b56a" />
      <rect x="0" y="2" width="9" height="5" fill="#e8a85c" />
      <rect x="1" y="7" width="7" height="1" fill="#d4924a" />
      <rect x="2" y="8" width="5" height="1" fill="#c4843e" />
      <rect x="2" y="3" width="1" height="1" fill="#5a3018" />
      <rect x="5" y="2" width="1" height="1" fill="#5a3018" />
      <rect x="6" y="5" width="1" height="1" fill="#5a3018" />
      <rect x="3" y="5" width="1" height="1" fill="#5a3018" />
    </svg>
  );
}

function PixelBowl({ cookies }: { cookies: number }) {
  const spots = [
    { x: 3, y: 3 },
    { x: 9, y: 3 },
    { x: 6, y: 1 },
  ];
  return (
    <svg width="52" height="40" viewBox="0 0 16 12" shapeRendering="crispEdges" aria-hidden>
      {spots.slice(0, cookies).map((spot) => (
        <g key={`${spot.x}-${spot.y}`}>
          <rect x={spot.x} y={spot.y} width="3" height="1" fill="#f2c48a" />
          <rect x={spot.x - 1} y={spot.y + 1} width="5" height="2" fill="#e8a85c" />
          <rect x={spot.x} y={spot.y + 1} width="1" height="1" fill="#5a3018" />
        </g>
      ))}
      <rect x="2" y="5" width="12" height="1" fill="#f4fbff" />
      <rect x="1" y="6" width="14" height="3" fill="#d5e7f6" />
      <rect x="2" y="6" width="2" height="1" fill="#ffffff" />
      <rect x="2" y="9" width="12" height="1" fill="#9eb6cc" />
      <rect x="4" y="10" width="8" height="1" fill="#7f98b0" />
    </svg>
  );
}

function PixelLamp({ on }: { on: boolean }) {
  const glow = on ? "#ffe14a" : "#8aa0b4";
  const glass = on ? "#fff6c2" : "#243140";
  return (
    <svg width="28" height="28" viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden>
      <rect x="3" y="0" width="3" height="1" fill={glow} />
      <rect x="2" y="1" width="5" height="1" fill={glow} />
      <rect x="2" y="2" width="5" height="3" fill={glass} />
      <rect x="3" y="2" width="1" height="1" fill="#ffffff" opacity={on ? 0.9 : 0.25} />
      <rect x="4" y="5" width="1" height="2" fill="#c9d6e2" />
      <rect x="2" y="7" width="5" height="1" fill="#9eb0c2" />
    </svg>
  );
}

/** Bowl, floor crumbs and the bedtime lamp. They sit on the Home card, around the pet. */
export function PetRoom({
  care,
  toast,
}: {
  care: CareView;
  toast: number;
}) {
  const { t } = useT();
  const lampOn = !care.lightOff;
  const [thanks, setThanks] = useState(0);
  const praise = () => {
    window.dispatchEvent(new Event("zoom-pet-hello"));
    setThanks((n) => n + 1);
  };
  useEffect(() => {
    if (thanks <= 0) return;
    const hide = window.setTimeout(() => setThanks(0), 1100);
    return () => window.clearTimeout(hide);
  }, [thanks]);
  if (care.dark) return null;
  return (
    <div className="pet-room-layer">
      <div className="pet-floor" />
      {care.messes.map((crumb) => (
        <button
          key={crumb.id}
          type="button"
          className="pet-mess"
          data-testid="pet-mess"
          style={{ left: `${crumb.left}%`, bottom: `${crumb.bottom}%` }}
          aria-label={t("pet.messy")}
          onClick={() => {
            settleFarm();
            if (cleanMess(crumb.id)) {
            window.dispatchEvent(new Event("zoom-pet-cared"));
            praise();
          }
          }}
        >
          <PixelCookie />
        </button>
      ))}
      <button
        type="button"
        className={care.hungry ? "pet-bowl is-hungry" : "pet-bowl"}
        data-testid="pet-bowl"
        aria-label={care.cookies >= 3 ? t("pet.full") : t("pet.feed")}
        onClick={() => {
          settleFarm();
          if (feed()) {
            window.dispatchEvent(new Event("zoom-pet-eat"));
            window.dispatchEvent(new Event("zoom-pet-cared"));
            praise();
          }
        }}
      >
        <PixelBowl cookies={care.cookies} />
        <span>{care.cookies >= 3 ? t("pet.full") : t("pet.feed")}</span>
      </button>
      {care.showLamp ? (
        <button
          type="button"
          className={lampOn ? "pet-lamp is-on" : "pet-lamp"}
          data-testid="pet-lamp"
          aria-label={lampOn ? t("pet.lightOff") : t("pet.lightOn")}
          aria-pressed={!lampOn}
          onClick={() => {
            settleFarm();
            toggleLight();
            playClick();
          }}
        >
          <PixelLamp on={lampOn} />
        </button>
      ) : null}
      {care.calling && care.bubble ? (
        <div className="pet-call" data-testid="pet-call" role="status">{t(care.bubble)}</div>
      ) : null}
      {care.sick ? (
        <button
          type="button"
          className="pet-cure"
          data-testid="pet-cure"
          onClick={() => {
            settleFarm();
            if (cure()) praise();
          }}
        >
          {t("pet.cure")}
        </button>
      ) : null}
      {thanks > 0 ? (
        <span className="pet-hearts" key={thanks} aria-hidden>
          <i /><i /><i />
        </span>
      ) : null}
      {toast > 0 ? <div className="pet-wake">+{toast} XP</div> : null}
    </div>
  );
}
