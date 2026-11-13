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
  noteShare,
  questRows,
  subscribeQuests,
  type QuestGroup,
  type QuestRow,
} from "../pet/quests";
import { useT } from "../i18n/LanguageContext";
import { openPetShare, openTelegramChat, warmPetShare } from "../pet/shareCard";

const COMMUNITY_URL = "https://t.me/bitbitecookie";
const CHAT_URL = "https://t.me/bitbitechats";

const GROUPS: { id: QuestGroup }[] = [
  { id: "daily" },
  { id: "weekly" },
  { id: "achievement" },
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
  const { t } = useT();
  const [rows, setRows] = useState<QuestRow[]>(() => questRows(referralCount, crumbsEarned()));
  const [pet, setPet] = useState<PetState>(getPet());
  const [group, setGroup] = useState<QuestGroup>("daily");
  const [shareHint, setShareHint] = useState("");
  useEffect(() => subscribeQuests(() => setRows(questRows(referralCount, crumbsEarned()))), [referralCount]);
  useEffect(() => subscribePet(() => setPet(getPet())), []);
  useEffect(() => {
    const share = rows.find((row) => row.id === "share");
    if (!share || share.claimed || share.ready) return;
    warmPetShare();
  }, [rows, pet.active, pet.level, pet.stage, pet.xp]);

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

  const sendShare = () => {
    setShareHint("");
    const status = openPetShare((sent) => {
      if (sent) noteShare();
    });
    if (status === "wait") setShareHint(t("quest.shareSoon"));
    if (status === "missing") setShareHint(t("quest.shareFail"));
  };

  const visible = rows;

  return (
    <section className="earn-panel">
      <div className="gb-quest-tabs" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {GROUPS.map((item) => {
          const on = item.id === group;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setGroup(item.id)}
              style={{
                borderRadius: 2,
                border: "3px solid #0f380f",
                background: on ? "#0f380f" : "#8bac0f",
                color: on ? "#c6e35a" : "#0f380f",
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: "0.04em",
                padding: "10px 6px",
              }}
            >
              {t(`quest.${item.id}`)}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {visible.map((row) => (
          <div key={row.id} className="earn-row gb-quest">
            <div className="min-w-0">
              <div className="text-sm font-black" style={{ color: "var(--earn-ink)" }}>{t(`quest.${row.id}`)}</div>
            </div>
            {row.id === "share" && !row.claimed && !row.ready ? (
              <button type="button" className="gb-quest-xp" data-testid="share-pet" onClick={sendShare}>+{row.xp} XP</button>
            ) : row.claimed ? (
              <span className="gb-quest-xp">{t("quest.done")}</span>
            ) : (
              <button
                type="button"
                className="gb-quest-xp"
                disabled={!row.ready}
                onClick={() => {
                  const gained = claimQuest(row.id, referralCount, crumbsEarned());
                  if (gained > 0) onReward(`+${gained} XP`);
                }}
              >
                +{row.xp} XP
              </button>
            )}
          </div>
        ))}
        {(
          <>
            <div className="earn-row gb-quest">
              <div className="text-sm font-black" style={{ color: "var(--earn-ink)" }}>{t("quest.community")}</div>
              {pet.claimedCommunity ? (
                <span className="gb-quest-xp">{t("quest.done")}</span>
              ) : (
                <button type="button" className="gb-quest-xp" onClick={() => pet.openedCommunity ? (claimOnceTask("community") > 0 && onReward(`+${TASK_ONCE_XP} XP`)) : openLink("community", COMMUNITY_URL)}>+{TASK_ONCE_XP} XP</button>
              )}
            </div>
            <div className="earn-row gb-quest">
              <div className="text-sm font-black" style={{ color: "var(--earn-ink)" }}>{t("quest.chat")}</div>
              {pet.claimedChat ? (
                <span className="gb-quest-xp">{t("quest.done")}</span>
              ) : (
                <button type="button" className="gb-quest-xp" onClick={() => pet.openedChat ? (claimOnceTask("chat") > 0 && onReward(`+${TASK_ONCE_XP} XP`)) : openLink("chat", CHAT_URL)}>+{TASK_ONCE_XP} XP</button>
              )}
            </div>
            <div className="earn-row gb-quest">
              <div className="text-sm font-black" style={{ color: "var(--earn-ink)" }}>{t("quest.friend")}</div>
              {pet.claimedInviteTask ? (
                <span className="gb-quest-xp">{t("quest.done")}</span>
              ) : (
                <button
                  type="button"
                  className="gb-quest-xp"
                  onClick={() => referralCount > 0 ? (claimOnceTask("invite", referralCount) > 0 && onReward(`+${TASK_INVITE_ONCE_XP} XP`)) : openTelegramChat(t("quest.shareText"), `https://t.me/TESTZOOMDEV_bot?startapp=${referralCode}`)}
                >
                  +{TASK_INVITE_ONCE_XP} XP
                </button>
              )}
            </div>
          </>
        )}
      </div>
      {shareHint ? (
        <div className="mt-2 text-[11px] font-bold" style={{ color: "#0f380f" }}>{shareHint}</div>
      ) : null}
    </section>
  );
}
