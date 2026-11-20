import { useMemo } from "react";

const DOTS = 64;
const PUFFS = 16;
const FLAKES = 8;

/** Real snow first: small grains and soft clumps. A few flakes mark the season. */
export function ChristmasSnow() {
  const bits = useMemo(() => {
    const dots = Array.from({ length: DOTS }, (_, id) => ({
      id: `d${id}`,
      kind: "dot" as const,
      left: `${Math.random() * 100}%`,
      delay: `${-Math.random() * 22}s`,
      duration: `${7 + Math.random() * 14}s`,
      size: `${1.4 + Math.random() * 2.2}px`,
      opacity: 0.35 + Math.random() * 0.5,
      drift: `${-18 + Math.random() * 36}px`,
    }));
    const puffs = Array.from({ length: PUFFS }, (_, id) => ({
      id: `p${id}`,
      kind: "puff" as const,
      left: `${Math.random() * 100}%`,
      delay: `${-Math.random() * 20}s`,
      duration: `${10 + Math.random() * 12}s`,
      size: `${4 + Math.random() * 5}px`,
      opacity: 0.28 + Math.random() * 0.35,
      drift: `${-28 + Math.random() * 56}px`,
    }));
    const flakes = Array.from({ length: FLAKES }, (_, id) => ({
      id: `f${id}`,
      kind: "flake" as const,
      left: `${6 + Math.random() * 88}%`,
      delay: `${-Math.random() * 18}s`,
      duration: `${14 + Math.random() * 8}s`,
      size: `${11 + Math.random() * 6}px`,
      opacity: 0.55 + Math.random() * 0.3,
      drift: `${-24 + Math.random() * 48}px`,
    }));
    return [...dots, ...puffs, ...flakes];
  }, []);

  return (
    <div className="christmas-snow" aria-hidden>
      {bits.map((bit) => (
        <span
          key={bit.id}
          className={bit.kind === "dot" ? undefined : `is-${bit.kind}`}
          style={{
            left: bit.left,
            animationDelay: bit.delay,
            animationDuration: bit.duration,
            width: bit.kind === "flake" ? undefined : bit.size,
            height: bit.kind === "flake" ? undefined : bit.size,
            fontSize: bit.kind === "flake" ? bit.size : undefined,
            opacity: bit.opacity,
            ["--drift" as string]: bit.drift,
          }}
        >
          {bit.kind === "flake" ? "❄" : null}
        </span>
      ))}
    </div>
  );
}
