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
import { runTap } from "../utils/tap";

const COMMUNITY_URL = "https://t.me/bitbitecookie";
const CHAT_URL = "https://t.me/bitbitechats";

function Mark({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <svg width="14" height="14" viewBox="0 0 12 12" aria-hidden>
      <path d="M2.2 6.2 4.7 8.7 9.8 3.3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TaskCheck({
  state,
  label,
  onPress,
  testId,
}: {
  state: "wait" | "ready" | "done";
  label: string;
  onPress?: () => void;
  testId?: string;
}) {
  const className = `gb-check is-${state}`;
  const icon = <Mark on={state !== "wait"} />;
  if (!onPress || state === "done") {
    return <span className={className} aria-label={label} data-testid={testId}>{icon}</span>;
  }
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      data-testid={testId}
      onPointerDown={(event) => runTap(event, onPress)}
      onTouchStart={(event) => runTap(event, onPress)}
    >
      {icon}
      {state === "ready" ? <em>{label}</em> : null}
    </button>
  );
}

function leftOf(row: QuestRow): string {
  if (row.id === "home15") return `${Math.min(15, Math.floor(row.progress / 60000))}/15`;
  if (row.goal > 1) return `${Math.min(row.progress, row.goal)}/${row.goal}`;
  return "";
}

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

  const visible = [...rows].sort((a, b) => Number(b.ready && !b.claimed) - Number(a.ready && !a.claimed));

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
        {visible.map((row) => {
          const state = row.claimed ? "done" : row.ready ? "ready" : "wait";
          const missing = leftOf(row);
          const claim = () => {
            const gained = claimQuest(row.id, referralCount, crumbsEarned());
            if (gained > 0) onReward(`+${gained} XP`);
          };
          return (
            <div key={row.id} className={`earn-row gb-quest${state === "ready" ? " is-ready" : ""}`}>
              <div className="min-w-0">
                <div className="text-sm font-black" style={{ color: "var(--earn-ink)" }}>{t(`quest.${row.id}`)}</div>
                <div className="gb-quest-meta">+{row.xp} XP{missing && !row.claimed ? ` · ${missing}` : ""}</div>
              </div>
              <TaskCheck
                state={state}
                label={row.claimed ? t("quest.done") : row.ready ? t("quest.claim") : missing || t(`quest.${row.id}`)}
                testId={row.id === "share" ? "share-pet" : undefined}
                onPress={row.id === "share" && state === "wait" ? sendShare : state === "ready" ? claim : undefined}
              />
            </div>
          );
        })}
        {(
          <>
            <div className="earn-row gb-quest">
              <div className="min-w-0">
                <div className="text-sm font-black" style={{ color: "var(--earn-ink)" }}>{t("quest.community")}</div>
                <div className="gb-quest-meta">+{TASK_ONCE_XP} XP</div>
              </div>
              <TaskCheck
                state={pet.claimedCommunity ? "done" : pet.openedCommunity ? "ready" : "wait"}
                label={pet.openedCommunity && !pet.claimedCommunity ? t("quest.claim") : t("quest.community")}
                onPress={pet.claimedCommunity ? undefined : () => (pet.openedCommunity ? (claimOnceTask("community") > 0 && onReward(`+${TASK_ONCE_XP} XP`)) : openLink("community", COMMUNITY_URL))}
              />
            </div>
            <div className="earn-row gb-quest">
              <div className="min-w-0">
                <div className="text-sm font-black" style={{ color: "var(--earn-ink)" }}>{t("quest.chat")}</div>
                <div className="gb-quest-meta">+{TASK_ONCE_XP} XP</div>
              </div>
              <TaskCheck
                state={pet.claimedChat ? "done" : pet.openedChat ? "ready" : "wait"}
                label={pet.openedChat && !pet.claimedChat ? t("quest.claim") : t("quest.chat")}
                onPress={pet.claimedChat ? undefined : () => (pet.openedChat ? (claimOnceTask("chat") > 0 && onReward(`+${TASK_ONCE_XP} XP`)) : openLink("chat", CHAT_URL))}
              />
            </div>
            <div className="earn-row gb-quest">
              <div className="min-w-0">
                <div className="text-sm font-black" style={{ color: "var(--earn-ink)" }}>{t("quest.friend")}</div>
                <div className="gb-quest-meta">+{TASK_INVITE_ONCE_XP} XP</div>
              </div>
              <TaskCheck
                state={pet.claimedInviteTask ? "done" : referralCount > 0 ? "ready" : "wait"}
                label={!pet.claimedInviteTask && referralCount > 0 ? t("quest.claim") : t("quest.friend")}
                onPress={pet.claimedInviteTask ? undefined : () => (referralCount > 0 ? (claimOnceTask("invite", referralCount) > 0 && onReward(`+${TASK_INVITE_ONCE_XP} XP`)) : openTelegramChat(t("quest.shareText"), `https://t.me/TESTZOOMDEV_bot?startapp=${referralCode}`))}
              />
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
