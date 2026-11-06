import { useEffect, useState } from "react";
import { timeForOneCrumb } from "../pet/catalog";
import { currentDailyRate, formatCrumbs, getCrumbs, settleFarm, subscribeCrumbs } from "../pet/crumbs";

/** The pet farms on its own. This only shows the rate. One Crumb is the withdrawal. */
export function PetFarmButton() {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const pull = () => {
      settleFarm();
      const rate = currentDailyRate();
      setLabel(`${formatCrumbs(rate)} / day · ${timeForOneCrumb(rate)} for 1 Crumb`);
    };
    pull();
    const unsub = subscribeCrumbs(pull);
    const id = window.setInterval(pull, 5000);
    return () => {
      unsub();
      window.clearInterval(id);
    };
  }, []);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "8px 14px",
        fontWeight: 800,
        fontSize: 12,
        letterSpacing: "0.02em",
        background: "rgba(42, 24, 16, 0.82)",
        color: "#ffe7c2",
        border: "1px solid rgba(240, 177, 90, 0.35)",
      }}
    >
      Farm {label || "…"}
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
