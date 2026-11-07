import { useState } from "react";

const KEY = "zoom-guide-v1";

export type GuideTab = "lab" | "farm" | "earn" | "rank" | "wallet";

const STEPS: { tab: GuideTab; kicker: string; title: string; body: string }[] = [
  {
    tab: "lab",
    kicker: "HOME",
    title: "A life that keeps Zoom turning",
    body: "Your pet farms Crumbs while it stays here. Claim them, and the pet grows. Every Crumb you keep is a little more life in the Zoom ecosystem.",
  },
  {
    tab: "farm",
    kicker: "COLLECTION",
    title: "Choose who stays home",
    body: "Tap a pet and it is added to Home. Each element farms at its own pace. Five places, one companion on the card.",
  },
  {
    tab: "earn",
    kicker: "EARN",
    title: "A day has small jobs",
    body: "Tasks pay Crumbs and XP. A visit, a tap, a friend who joins. That is how a day in Zoom moves forward.",
  },
  {
    tab: "rank",
    kicker: "TOP 10",
    title: "The week keeps a list",
    body: "GRAM you put into Zoom is remembered until Monday. The board resets, and the prizes are XP.",
  },
  {
    tab: "wallet",
    kicker: "PROFILE",
    title: "The wallet is the quiet part",
    body: "Crumbs you claimed wait here. When you are ready, ask to withdraw them. Nothing leaves until you accept it in the bot.",
  },
];

/** The first visit walks Home, Collection, Earn, Top 10 and Profile. */
export function FirstGuide({ onStep }: { onStep: (tab: GuideTab) => void }) {
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
    <div className="zoom-guide" role="dialog" aria-label="Zoom guide">
      <div className="zoom-guide-card">
        <div className="zoom-guide-kicker">{page.kicker} · {step + 1}/{STEPS.length}</div>
        <div className="zoom-guide-title">{page.title}</div>
        <p className="zoom-guide-body">{page.body}</p>
        <button type="button" className="zoom-guide-next" onClick={() => go(step + 1)}>
          {last ? "Enter" : "Next"}
        </button>
      </div>
    </div>
  );
}
