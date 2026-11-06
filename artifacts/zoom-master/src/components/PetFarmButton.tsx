import { useEffect, useState } from "react";
import { collectFarm, FARM_CRUMBS, farmReady, farmWaitMs, getCrumbs, subscribeCrumbs } from "../pet/crumbs";

function formatWait(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/** Slow farm from the pet. One Crumb every 8 hours on the base dolphin. */
export function PetFarmButton() {
  const [ready, setReady] = useState(farmReady());
  const [wait, setWait] = useState(farmWaitMs());
  useEffect(() => {
    const pull = () => {
      setReady(farmReady());
      setWait(farmWaitMs());
    };
    pull();
    const unsub = subscribeCrumbs(pull);
    const id = window.setInterval(pull, 1000);
    return () => {
      unsub();
      window.clearInterval(id);
    };
  }, []);

  return (
    <button
      type="button"
      disabled={!ready}
      onClick={() => { collectFarm(); }}
      style={{
        border: "none",
        borderRadius: 999,
        padding: "10px 16px",
        fontWeight: 900,
        letterSpacing: "0.04em",
        background: ready ? "#f0b15a" : "rgba(42, 24, 16, 0.82)",
        color: ready ? "#2a1810" : "rgba(255,244,228,0.7)",
        borderColor: "rgba(240, 177, 90, 0.35)",
        boxShadow: ready ? "0 8px 20px rgba(240, 177, 90, 0.25)" : "none",
      }}
    >
      {ready ? `Farm · +${FARM_CRUMBS} Crumb` : `Next farm in ${formatWait(wait)}`}
    </button>
  );
}

export function useCrumbsBalance(): number {
  const [n, setN] = useState(getCrumbs().balance);
  useEffect(() => subscribeCrumbs(() => setN(getCrumbs().balance)), []);
  return n;
}
