import { useEffect, useState } from "react";
import { getPet } from "../pet/petProgress";
import { crumbsEarned } from "../pet/crumbs";
import {
  claimQuest,
  formatQuestProgress,
  noteShare,
  questRows,
  subscribeQuests,
  type QuestGroup,
  type QuestRow,
} from "../pet/quests";

const GROUPS: { id: QuestGroup; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "achievement", label: "Achievements" },
];

export function QuestBoard({
  referralCount,
  referralCode,
  onReward,
}: {
  referralCount: number;
  referralCode: string;
  onReward: (message: string) => void;
}) {
  const [rows, setRows] = useState<QuestRow[]>(() => questRows(referralCount, crumbsEarned()));
  useEffect(() => subscribeQuests(() => setRows(questRows(referralCount, crumbsEarned()))), [referralCount]);

  const share = () => {
    const pet = getPet();
    const text = encodeURIComponent(`My pet is stage ${pet.stage}, level ${pet.level}. Come farm Crumbs.`);
    const url = encodeURIComponent(`https://t.me/TESTZOOMDEV_bot?startapp=${referralCode}`);
    noteShare();
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank");
  };

  return (
    <div className="flex flex-col gap-3">
      {GROUPS.map((group) => (
        <section key={group.id} className="earn-panel">
          <div className="earn-section-kicker" style={{ color: "var(--earn-cyan)" }}>{group.label}</div>
          <div className="mt-2 flex flex-col gap-2">
            {rows.filter((row) => row.group === group.id).map((row) => (
              <div key={row.id} className="earn-row">
                <div className="min-w-0">
                  <div className="text-sm font-black" style={{ color: "var(--earn-ink)" }}>{row.title}</div>
                  <div className="text-[11px]" style={{ color: "rgba(186,220,236,0.55)" }}>
                    {row.detail} · {formatQuestProgress(row)} · +{row.xp} XP
                  </div>
                </div>
                {row.id === "share" && !row.claimed && !row.ready ? (
                  <button type="button" className="earn-cta earn-cta--ghost !w-auto px-3" onClick={share}>Share</button>
                ) : row.claimed ? (
                  <span className="text-xs font-black" style={{ color: "#7ad7ff" }}>Done</span>
                ) : (
                  <button
                    type="button"
                    className={`earn-cta !w-auto px-3 ${row.ready ? "earn-cta--primary" : ""}`}
                    disabled={!row.ready}
                    onClick={() => {
                      const gained = claimQuest(row.id, referralCount, crumbsEarned());
                      if (gained > 0) onReward(`+${gained} XP`);
                    }}
                  >
                    {row.ready ? "Claim" : formatQuestProgress(row)}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
