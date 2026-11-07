import { useEffect, useState } from "react";
import {
  claimOnceTask,
  getPet,
  markTaskOpened,
  subscribePet,
  TASK_INVITE_ONCE_XP,
  TASK_ONCE_XP,
  type PetState,
} from "../pet/petProgress";
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
  const [pet, setPet] = useState<PetState>(getPet());
  const [group, setGroup] = useState<QuestGroup>("daily");
  useEffect(() => subscribeQuests(() => setRows(questRows(referralCount, crumbsEarned()))), [referralCount]);
  useEffect(() => subscribePet(() => setPet(getPet())), []);

  const openLink = (which: "community" | "chat", url: string) => {
    markTaskOpened(which);
    try {
      const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (link: string) => void; openLink?: (link: string) => void } } }).Telegram?.WebApp;
      if (tg?.openTelegramLink && url.startsWith("https://t.me/")) {
        tg.openTelegramLink(url);
        return;
      }
      if (tg?.openLink) {
        tg.openLink(url);
        return;
      }
    } catch { /**/ }
    window.open(url, "_blank");
  };

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
        {group === "achievement" && (
          <>
            <div className="earn-row">
              <div className="min-w-0">
                <div className="text-sm font-black" style={{ color: "var(--earn-ink)" }}>Join community</div>
                <div className="text-[11px]" style={{ color: "rgba(186,220,236,0.55)" }}>Once · +{TASK_ONCE_XP} XP</div>
              </div>
              {pet.claimedCommunity ? (
                <span className="text-xs font-black" style={{ color: "#7ad7ff" }}>Done</span>
              ) : pet.openedCommunity ? (
                <button type="button" className="earn-cta earn-cta--primary !w-auto px-3" onClick={() => { const n = claimOnceTask("community"); if (n > 0) onReward(`+${n} XP`); }}>Claim</button>
              ) : (
                <button type="button" className="earn-cta earn-cta--ghost !w-auto px-3" onClick={() => openLink("community", "https://t.me/ZoomVerse")}>Open</button>
              )}
            </div>
            <div className="earn-row">
              <div className="min-w-0">
                <div className="text-sm font-black" style={{ color: "var(--earn-ink)" }}>Join chat</div>
                <div className="text-[11px]" style={{ color: "rgba(186,220,236,0.55)" }}>Once · +{TASK_ONCE_XP} XP</div>
              </div>
              {pet.claimedChat ? (
                <span className="text-xs font-black" style={{ color: "#7ad7ff" }}>Done</span>
              ) : pet.openedChat ? (
                <button type="button" className="earn-cta earn-cta--primary !w-auto px-3" onClick={() => { const n = claimOnceTask("chat"); if (n > 0) onReward(`+${n} XP`); }}>Claim</button>
              ) : (
                <button type="button" className="earn-cta earn-cta--ghost !w-auto px-3" onClick={() => openLink("chat", "https://t.me/ZoomVerse_Chat")}>Open</button>
              )}
            </div>
            <div className="earn-row">
              <div className="min-w-0">
                <div className="text-sm font-black" style={{ color: "var(--earn-ink)" }}>Invite a friend</div>
                <div className="text-[11px]" style={{ color: "rgba(186,220,236,0.55)" }}>Once, when a friend joins · +{TASK_INVITE_ONCE_XP} XP</div>
              </div>
              {pet.claimedInviteTask ? (
                <span className="text-xs font-black" style={{ color: "#7ad7ff" }}>Done</span>
              ) : referralCount > 0 ? (
                <button type="button" className="earn-cta earn-cta--primary !w-auto px-3" onClick={() => { const n = claimOnceTask("invite", referralCount); if (n > 0) onReward(`+${n} XP`); }}>Claim</button>
              ) : (
                <button
                  type="button"
                  className="earn-cta earn-cta--ghost !w-auto px-3"
                  onClick={() => {
                    const text = encodeURIComponent("Come farm Crumbs with me.");
                    const url = encodeURIComponent(`https://t.me/TESTZOOMDEV_bot?startapp=${referralCode}`);
                    window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank");
                  }}
                >
                  Invite
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
