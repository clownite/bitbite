import { useState } from "react";
import { useT } from "../i18n/LanguageContext";

const KEY = "zoom-guide-v1";

export type GuideTab = "lab" | "farm" | "earn" | "rank" | "wallet";

const STEPS: { tab: GuideTab; id: string }[] = [
  { tab: "lab", id: "home" },
  { tab: "farm", id: "farm" },
  { tab: "earn", id: "earn" },
  { tab: "rank", id: "rank" },
  { tab: "wallet", id: "wallet" },
];

/** The first visit walks Home, Collection, Earn, Top 10 and Profile. */
export function FirstGuide({ onStep }: { onStep: (tab: GuideTab) => void }) {
  const { t } = useT();
  const [step, setStep] = useState(() => (localStorage.getItem(KEY) === "done" ? -1 : 0));
  if (step < 0) return null;
  const page = STEPS[step];
  const last = step === STEPS.length - 1;
  const go = (next: number) => {
    if (next >= STEPS.length) {
      try { localStorage.setItem(KEY, "done"); } catch { /**/ }
      setStep(-1);
      onStep("lab");
      return;
    }
    setStep(next);
    onStep(STEPS[next].tab);
  };
  return (
    <div className="zoom-guide" role="dialog" aria-label="BitBite guide">
      <div className="zoom-guide-card">
        <div className="zoom-guide-kicker">{t(`guide.${page.id}.k`)} · {step + 1}/{STEPS.length}</div>
        <div className="zoom-guide-title">{t(`guide.${page.id}.t`)}</div>
        <p className="zoom-guide-body">{t(`guide.${page.id}.b`)}</p>
        <button type="button" className="zoom-guide-next" onClick={() => go(step + 1)}>
          {last ? t("guide.enter") : t("guide.next")}
        </button>
      </div>
    </div>
  );
}
