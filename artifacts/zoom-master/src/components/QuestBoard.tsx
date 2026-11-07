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
  const [group, setGroup] = useState<QuestGroup>("daily");
  useEffect(() => subscribeQuests(() => setRows(questRows(referralCount, crumbsEarned()))), [referralCount]);

  const share = () => {
    const pet = getPet();
    const text = encodeURIComponent(`My pet is stage ${pet.stage}, level ${pet.level}. Come farm Crumbs.`);
    const url = encodeURIComponent(`https://t.me/TESTZOOMDEV_bot?startapp=${referralCode}`);
    noteShare();
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank");
  };

  const visible = rows.filter((row) => row.group === group);

  return (
    <section className="earn-panel">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {GROUPS.map((item) => {
          const on = item.id === group;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setGroup(item.id)}
              style={{
                borderRadius: 14,
                border: on ? "1px solid #7ad7ff" : "1px solid rgba(122,215,255,0.18)",
                background: on ? "#7ad7ff" : "rgba(0,0,0,0.35)",
                color: on ? "#041018" : "#e8f7ff",
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: "0.04em",
                padding: "10px 6px",
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {visible.map((row) => (
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
  );
}
