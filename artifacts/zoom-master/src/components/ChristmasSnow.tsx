import { useMemo } from "react";

const FLAKES = 26;

/** A light Christmas fall. It sits over the app and does not take taps. */
export function ChristmasSnow() {
  const flakes = useMemo(
    () =>
      Array.from({ length: FLAKES }, (_, id) => ({
        id,
        left: `${Math.random() * 100}%`,
        delay: `${-Math.random() * 18}s`,
        duration: `${14 + Math.random() * 12}s`,
        size: `${1.5 + Math.random() * 2.2}px`,
        opacity: 0.22 + Math.random() * 0.38,
        drift: `${-20 + Math.random() * 40}px`,
      })),
    [],
  );

  return (
    <div className="christmas-snow" aria-hidden>
      {flakes.map((flake) => (
        <span
          key={flake.id}
          style={{
            left: flake.left,
            animationDelay: flake.delay,
            animationDuration: flake.duration,
            width: flake.size,
            height: flake.size,
            opacity: flake.opacity,
            ["--drift" as string]: flake.drift,
          }}
        />
      ))}
    </div>
  );
}
