import { useEffect, useState } from "react";
import { claimFarm, farmStatus, formatCrumbs, getCrumbs, settleFarm, subscribeCrumbs } from "../pet/crumbs";

type FarmView = ReturnType<typeof farmStatus>;

export function useFarm(): FarmView {
  const [view, setView] = useState<FarmView>(farmStatus());
  useEffect(() => {
    const pull = () => setView(farmStatus());
    pull();
    const unsub = subscribeCrumbs(pull);
    const id = window.setInterval(pull, 1000);
    return () => {
      unsub();
      window.clearInterval(id);
    };
  }, []);
  return view;
}

/** Tank for the active pet. It fills to that pet's maximum, then waits for Claim. */
export function PetFarmPanel() {
  const farm = useFarm();
  const full = farm.full;
  const canClaim = farm.pending >= 0.0001;

  return (
    <div
      style={{
        width: "min(420px, 100%)",
        padding: "12px 14px 14px",
        borderRadius: 18,
        background: "rgba(4, 10, 16, 0.92)",
        border: "1px solid rgba(122, 215, 255, 0.45)",
        color: "#e8f7ff",
        boxShadow: "0 10px 28px rgba(0, 0, 0, 0.35)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.16em" }}>FARM</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: full ? "#7ad7ff" : "rgba(186,220,236,0.7)" }}>
          {full ? "Full" : "Filling"}
        </div>
      </div>
      <div style={{ marginTop: 8, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div
          style={{
            width: `${Math.round(farm.ratio * 100)}%`,
            height: "100%",
            background: "#7ad7ff",
          }}
        />
      </div>
      <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {formatCrumbs(farm.pending)} / {formatCrumbs(farm.cap)}
      </div>
      <button
        type="button"
        disabled={!canClaim}
        onClick={() => { claimFarm(); }}
        style={{
          marginTop: 10,
          width: "100%",
          border: "none",
          borderRadius: 12,
          padding: "11px 14px",
          fontWeight: 800,
          letterSpacing: "0.08em",
          background: canClaim ? "#7ad7ff" : "rgba(255,255,255,0.06)",
          color: canClaim ? "#041018" : "rgba(232,247,255,0.35)",
        }}
      >
        {canClaim ? `Claim · ${formatCrumbs(farm.pending)}` : "Claim"}
      </button>
    </div>
  );
}

export function useCrumbsBalance(): number {
  const [n, setN] = useState(getCrumbs().balance);
  useEffect(() => {
    const pull = () => {
      settleFarm();
      setN(getCrumbs().balance);
    };
    pull();
    const unsub = subscribeCrumbs(pull);
    const id = window.setInterval(pull, 5000);
    return () => {
      unsub();
      window.clearInterval(id);
    };
  }, []);
  return n;
}
