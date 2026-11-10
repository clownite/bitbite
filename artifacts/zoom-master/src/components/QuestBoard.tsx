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
import { openTelegramChat, openTelegramStory } from "../pet/shareCard";
import { petDef } from "../pet/catalog";
import { personalPetNumber, petOwnerId } from "../pet/number";

const COMMUNITY_URL = "https://t.me/bitbitecookie";
const CHAT_URL = "https://t.me/bitbitechats";

const GROUPS: { id: QuestGroup }[] = [
  { id: "daily" },
  { id: "weekly" },
  { id: "achievement" },
];

function questLine(row: QuestRow, t: (key: string, vars?: Record<string, string | number>) => string): string {
  if (row.id === "home15") return t("quest.min", { n: Math.min(15, Math.floor(row.progress / 60000)) });
  if (row.goal === 1) return row.progress >= 1 ? t("quest.ready") : t("quest.notYet");
  return `${Math.min(row.progress, row.goal)}/${row.goal}`;
}

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
  const [shareOpen, setShareOpen] = useState(false);
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

  const sharePayload = () => {
    const active = getPet();
    const who = petDef(active.active);
    const pageUrl = `https://t.me/TESTZOOMDEV_bot?startapp=${referralCode}`;
    const text = `${personalPetNumber(petOwnerId(), active.active)} ${who.name}\n${t("quest.shareText")}`;
    return { text, pageUrl };
  };
  const sendChat = () => {
    const { text, pageUrl } = sharePayload();
    setShareOpen(false);
    noteShare();
    openTelegramChat(text, pageUrl);
  };
  const sendStory = () => {
    const { text, pageUrl } = sharePayload();
    setShareOpen(false);
    noteShare();
    openTelegramStory(text, pageUrl);
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
              {t(`quest.${item.id}`)}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {visible.map((row) => (
          <div key={row.id} className="earn-row">
            <div className="min-w-0">
              <div className="text-sm font-black" style={{ color: "var(--earn-ink)" }}>{t(`quest.${row.id}`)}</div>
              <div className="text-[11px]" style={{ color: "rgba(186,220,236,0.55)" }}>
                {t(`quest.${row.id}d`)} · {questLine(row, t)} · +{row.xp} XP
              </div>
            </div>
            {row.id === "share" && !row.claimed && !row.ready ? (
              <button type="button" className="earn-cta earn-cta--ghost !w-auto px-3" data-testid="share-pet" onClick={() => setShareOpen(true)}>{t("quest.shareBtn")}</button>
            ) : row.claimed ? (
              <span className="text-xs font-black" style={{ color: "#7ad7ff" }}>{t("quest.done")}</span>
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
                {row.ready ? t("quest.claim") : questLine(row, t)}
              </button>
            )}
          </div>
        ))}
        {group === "achievement" && (
          <>
            <div className="earn-row">
              <div className="min-w-0">
                <div className="text-sm font-black" style={{ color: "var(--earn-ink)" }}>{t("quest.community")}</div>
                <div className="text-[11px]" style={{ color: "rgba(186,220,236,0.55)" }}>{t("quest.communityd", { n: TASK_ONCE_XP })}</div>
              </div>
              {pet.claimedCommunity ? (
                <span className="text-xs font-black" style={{ color: "#7ad7ff" }}>{t("quest.done")}</span>
              ) : pet.openedCommunity ? (
                <button type="button" className="earn-cta earn-cta--primary !w-auto px-3" onClick={() => { const n = claimOnceTask("community"); if (n > 0) onReward(`+${n} XP`); }}>{t("quest.claim")}</button>
              ) : (
                <button type="button" className="earn-cta earn-cta--ghost !w-auto px-3" onClick={() => openLink("community", COMMUNITY_URL)}>{t("quest.open")}</button>
              )}
            </div>
            <div className="earn-row">
              <div className="min-w-0">
                <div className="text-sm font-black" style={{ color: "var(--earn-ink)" }}>{t("quest.chat")}</div>
                <div className="text-[11px]" style={{ color: "rgba(186,220,236,0.55)" }}>{t("quest.chatd", { n: TASK_ONCE_XP })}</div>
              </div>
              {pet.claimedChat ? (
                <span className="text-xs font-black" style={{ color: "#7ad7ff" }}>{t("quest.done")}</span>
              ) : pet.openedChat ? (
                <button type="button" className="earn-cta earn-cta--primary !w-auto px-3" onClick={() => { const n = claimOnceTask("chat"); if (n > 0) onReward(`+${n} XP`); }}>{t("quest.claim")}</button>
              ) : (
                <button type="button" className="earn-cta earn-cta--ghost !w-auto px-3" onClick={() => openLink("chat", CHAT_URL)}>{t("quest.open")}</button>
              )}
            </div>
            <div className="earn-row">
              <div className="min-w-0">
                <div className="text-sm font-black" style={{ color: "var(--earn-ink)" }}>{t("quest.friend")}</div>
                <div className="text-[11px]" style={{ color: "rgba(186,220,236,0.55)" }}>{t("quest.friendd", { n: TASK_INVITE_ONCE_XP })}</div>
              </div>
              {pet.claimedInviteTask ? (
                <span className="text-xs font-black" style={{ color: "#7ad7ff" }}>{t("quest.done")}</span>
              ) : referralCount > 0 ? (
                <button type="button" className="earn-cta earn-cta--primary !w-auto px-3" onClick={() => { const n = claimOnceTask("invite", referralCount); if (n > 0) onReward(`+${n} XP`); }}>{t("quest.claim")}</button>
              ) : (
                <button
                  type="button"
                  className="earn-cta earn-cta--ghost !w-auto px-3"
                  onClick={() => openTelegramChat(t("quest.shareText"), `https://t.me/TESTZOOMDEV_bot?startapp=${referralCode}`)}
                >
                  {t("quest.invite")}
                </button>
              )}
            </div>
          </>
        )}
      </div>
      {shareOpen ? (
        <div className="tg-share" data-testid="share-sheet" onClick={() => setShareOpen(false)} role="presentation">
          <div className="tg-share-card" onClick={(event) => event.stopPropagation()}>
            <strong>{t("quest.share")}</strong>
            <button type="button" className="cookie-go" data-testid="share-story" onClick={sendStory}>{t("quest.shareStory")}</button>
            <button type="button" className="cookie-go" data-testid="share-chat" onClick={sendChat}>{t("quest.shareChat")}</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
