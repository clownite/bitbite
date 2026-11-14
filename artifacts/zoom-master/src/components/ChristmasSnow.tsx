import { useMemo } from "react";

const DOTS = 16;
const FLAKES = 12;

/** A quiet fall. A few dots, and a flake now and then. It never takes a tap. */
export function ChristmasSnow() {
  const bits = useMemo(() => {
    const dots = Array.from({ length: DOTS }, (_, id) => ({
      id: `d${id}`,
      flake: false,
      left: `${6 + Math.random() * 88}%`,
      delay: `${-Math.random() * 18}s`,
      duration: `${12 + Math.random() * 10}s`,
      size: `${1.5 + Math.random() * 1.6}px`,
      opacity: 0.28 + Math.random() * 0.28,
      drift: `${-16 + Math.random() * 32}px`,
    }));
    const flakes = Array.from({ length: FLAKES }, (_, id) => ({
      id: `f${id}`,
      flake: true,
      left: `${8 + Math.random() * 84}%`,
      delay: `${-Math.random() * 18}s`,
      duration: `${14 + Math.random() * 8}s`,
      size: `${12 + Math.random() * 6}px`,
      opacity: 0.45 + Math.random() * 0.3,
      drift: `${-24 + Math.random() * 48}px`,
    }));
    return [...dots, ...flakes];
  }, []);

  return (
    <div className="christmas-snow" aria-hidden>
      {bits.map((bit) => (
        <span
          key={bit.id}
          className={bit.flake ? "is-flake" : undefined}
          style={{
            left: bit.left,
            animationDelay: bit.delay,
            animationDuration: bit.duration,
            width: bit.flake ? undefined : bit.size,
            height: bit.flake ? undefined : bit.size,
            fontSize: bit.flake ? bit.size : undefined,
            opacity: bit.opacity,
            ["--drift" as string]: bit.drift,
          }}
        >
          {bit.flake ? "❄" : null}
        </span>
      ))}
    </div>
  );
}
