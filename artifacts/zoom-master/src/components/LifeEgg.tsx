/** The Tamagotchi egg: a rest, a hop, a smaller hop, then a rest. */
export function LifeEgg({ color, mini = false }: { color: string; mini?: boolean }) {
  return (
    <div className={mini ? "life-egg is-mini" : "life-egg"} data-testid="life-egg" aria-hidden>
      <i className="life-egg-shadow" />
      <i className="life-egg-shell" style={{ ["--spot" as string]: color }} />
    </div>
  );
}
