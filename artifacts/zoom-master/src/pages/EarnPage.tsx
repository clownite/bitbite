import { useCallback, useEffect, useRef, useState } from "react";
import { claimDailyReward, fetchTasksState, peekTasksState, bumpTasksPlanetsBuilt, claimTask, type TasksState, redeemServerCode } from "../utils/api";
import { useGlobalStore, refreshDailyStatus, applyDailyClaimResult } from "../store/globalStore";
import { addPetXp, basePetStageDays, claimDailyPetXp, claimInteractTask, claimOnceTask, CYCLE_XP, DAILY_XP, DAILY_XP_WEEK, dailyXpStatus, getPet, interactTaskStatus, INVITE_XP, LEVEL10_GRAM, LEVEL5_GRAM, markTaskOpened, subscribePet, syncReferralXp, TASK_INTERACT_XP, TASK_INVITE_ONCE_XP, TASK_ONCE_XP, xpFromCrumbs, type PetState } from "../pet/petProgress";
import { useT } from "../i18n/LanguageContext";
import { SpaceTicketIcon, SpeedBoltIcon } from "../components/icons/GameIcons";


interface EarnPageProps {
  referralCode: string;
  referralCount: number;
  lastDailyClaimAt: number;
  referralSpeedBonus: number;
  referredBy: string | null;
  claimedMilestones: number[];
  telegramId: string | null;
  /** Local Lab forge counter — floors Earn "FORGED" while /tasks/state catches up. */
  craftsCompleted?: number;
  /** When false the tab is hidden but kept mounted so craft refresh still lands. */
  visible?: boolean;
  onClaimDaily: () => void;
  /** Weekly REDSTAR bonus day (1–7). */
  weeklyRedStarDay?: number;
  weeklyRedStarClaimedToday?: boolean;
  /** Called after a successful claim so the parent can update redStarBalance. */
  onRedStarUpdate?: (newBalance: number) => void;
}

// Must match artifacts/api-server/src/routes/referral.ts
const MILESTONES = [
  { count: 5, reward: 40 },
  { count: 10, reward: 70 },
  { count: 20, reward: 100 },
  { count: 50, reward: 180 },
  { count: 100, reward: 300 },
  { count: 200, reward: 500 },
];

const REFERRAL_STARDUST_PER_INVITE = 2;

// Client-side cooldown after the user opens the sponsor channel before
// the Claim button enables. The honor-system 10s gate exists so a user
// can't tap "Open" and "Claim" back-to-back without ever leaving the
// app — the server has no way to verify channel membership without an
// admin bot in the partner channel.
const SPONSOR_GATE_MS = 10_000;
// Per-user + per-task storage key so a shared device (e.g. family iPad
// with two Telegram accounts) can't have one account's "I opened the
// channel" timestamp unlock the Claim button on a second account, AND
// so opening one sponsor task doesn't unlock the Claim button on every
// other sponsor task in the list.
const CYAN_WHITE = "#9EC5E8";
const sponsorGateKey = (telegramId: string | null, taskId: string) =>
  `zoom:sponsor-gate-opened-at:${telegramId ?? "_anon"}:${taskId}`;

// Derive a localized human title from the sponsor URL. Used for sponsor
// tasks that don't carry an explicit label from the server. Kept
// client-side because it's purely cosmetic.
function sponsorTitle(t: (k: string, p?: Record<string, string | number>) => string, url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube")) return t("earn.sponsorOpenYouTube");
    if (u.hostname.includes("t.me")) {
      const path = u.pathname.replace(/^\//, "");
      if (path.startsWith("+")) return t("earn.sponsorJoinPrivate");
      // bot deep link with ?startapp=... → "Open @botname"
      const handle = path.split("/")[0] ?? path;
      if (handle) return t("earn.sponsorOpenHandle", { h: handle });
    }
    return t("earn.sponsorOpenLink", { h: u.hostname });
  } catch {
    return t("earn.sponsorOpenLink", { h: "" });
  }
}

// Translated requirement description per known sponsor task id. The
// server returns an Italian-only `requirementLabel` for logging /
// debugging; the client overrides it with the user's current language
// based on the task id so non-IT players see the right text.
const SPONSOR_REQ_KEY: Record<string, string> = {
  sponsor_giftkombat: "earn.reqGiftkombat",
  sponsor_izimoney: "earn.reqIzimoney",
  sponsor_yt_miketamago: "earn.reqMiketamago",
};

export function EarnPage({ referralCode, referralCount, referralSpeedBonus, referredBy, claimedMilestones, telegramId, craftsCompleted = 0, visible = true }: EarnPageProps) {
  const { t } = useT();
  const firstName = (() => {
    try { return (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.first_name ?? null; } catch { return null; }
  })();
  const [redeemInput, setRedeemInput] = useState("");
  const [redeemStatus, setRedeemStatus] = useState<{ type: "success" | "error" | "sun"; message: string } | null>(null);
  const daily = useGlobalStore((s) => s.daily);
  const [pet, setPet] = useState<PetState>(getPet());
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => subscribePet(() => setPet(getPet())), []);

  useEffect(() => {
    if (!visible) return;
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [visible]);

  void tick;
  void pet;
  const xpStatus = dailyXpStatus();
  const canClaim = xpStatus.canClaim;
  const remainingMs = Math.max(0, xpStatus.nextDailyAt - Date.now());
  const hLeft = Math.floor(remainingMs / 3600000);
  const mLeft = Math.floor((remainingMs % 3600000) / 60000);
  const sLeft = Math.floor((remainingMs % 60000) / 1000);

  const rewardsPreview = DAILY_XP;
  const displayDay = xpStatus.claimedThrough;
  const upcomingDay = xpStatus.upcomingDay;
  const upcomingReward = xpStatus.nextReward;

  useEffect(() => {
    if (!visible) return;
    if (getPet().invitesBaselined) {
      const gained = syncReferralXp(referralCount);
      if (gained > 0) setClaimMsg(`+${gained} XP`);
      return;
    }
    const id = window.setTimeout(() => syncReferralXp(referralCount), 1200);
    return () => window.clearTimeout(id);
  }, [visible, referralCount]);

  const handleClaimStreak = async () => {
    if (claiming || !canClaim) return;
    setClaiming(true);
    const gained = claimDailyPetXp();
    let msg = gained > 0 ? `+${gained} XP` : t("earn.claimFailed");
    if (gained > 0 && telegramId && daily?.canClaim) {
      const res = await claimDailyReward(telegramId, firstName ?? undefined);
      if (res.ok && res.reward) {
        applyDailyClaimResult(res as Parameters<typeof applyDailyClaimResult>[0]);
        msg = `+${gained} XP · +${res.reward.toLocaleString()} Crumbs`;
        if (typeof res.stardustBalance === "number" && typeof res.balanceEpoch === "number") {
          window.dispatchEvent(new CustomEvent("zoom-server-stardust-snap", {
            detail: { stardustBalance: res.stardustBalance, epoch: res.balanceEpoch },
          }));
        }
        window.dispatchEvent(new Event("stardust-refresh"));
        window.dispatchEvent(new Event("zoom-data-refresh"));
        await refreshDailyStatus();
      }
    }
    setClaiming(false);
    setClaimMsg(msg);
    setTimeout(() => setClaimMsg(null), 3500);
  };

  // IMPORTANT: this MUST be `?startapp=` (not `?start=`).
  //
  // `?start=<param>` only opens the bot's chat and sends `/start <param>`
  // as a message — Telegram does NOT pass that param into the Mini App's
  // initData, so the WebApp loads with WebApp.initDataUnsafe.start_param
  // = undefined and the referral code is lost. Production logs prior to
  // this fix showed every single user opening the app with
  // `startParam=null`, which is exactly why the inviter was never being
  // credited.
  //
  // `?startapp=<param>` is the Mini-App-specific deep link: it launches
  // the bot's main Mini App directly and exposes <param> through
  // WebApp.initDataUnsafe.start_param, where /referral/register picks it
  // up and credits the inviter (+20 ZOOM, +1 referralCount, milestones).
  const referralLink = `https://t.me/TESTZOOMDEV_bot?startapp=${referralCode}`;
  const communityUrl = "https://t.me/ZoomVerse";
  const chatUrl = "https://t.me/ZoomVerse_Chat";
  const stageDays = basePetStageDays();
  const interact = interactTaskStatus();

  const handleRedeem = async () => {
    const raw = redeemInput.trim();
    if (!raw) return;

    // Server-issued promo codes only. Rewards are granted by the API.
    if (telegramId) {
      const srv = await redeemServerCode(telegramId, raw);
      if (srv.ok) {
        let msg: string;
        if (srv.rewardType === "stardust") {
          msg = t("earn.stardustCredited", { n: (srv.rewardAmount ?? 0).toLocaleString() });
        } else if (srv.rewardType === "spins") {
          msg = t("earn.spinsCredited", { n: (srv.rewardAmount ?? 0).toLocaleString() });
        } else {
          msg = t("earn.zoomCredited", { n: (srv.rewardAmount ?? 0).toLocaleString() });
        }
        setRedeemStatus({ type: "success", message: msg });
        setRedeemInput("");
        // Trigger a full sync so stardust / spins / zoom balances refresh
        // immediately from the server (not just zoom via zoom-admin-refresh).
        window.dispatchEvent(new Event("zoom-data-refresh"));
        setTimeout(() => setRedeemStatus(null), 4000);
        return;
      }
      if (srv.error === "EXPIRED") {
        setRedeemStatus({ type: "error", message: t("earn.codeExpired") });
        setTimeout(() => setRedeemStatus(null), 4000);
        return;
      }
      if (srv.error === "ALREADY_USED") {
        setRedeemStatus({ type: "error", message: t("earn.codeAlreadyUsed") });
        setTimeout(() => setRedeemStatus(null), 4000);
        return;
      }
      if (srv.error && srv.error !== "NOT_FOUND") {
        setRedeemStatus({ type: "error", message: t("earn.codeServerError") });
        setTimeout(() => setRedeemStatus(null), 4000);
        return;
      }
    }

    setRedeemStatus({ type: "error", message: t("earn.invalidCode") });
    setTimeout(() => setRedeemStatus(null), 4000);
  };

  const nextMilestone = MILESTONES.find(m => m.count > referralCount);

  // ───────────────── Long-term tasks (planet milestones + sponsor) ─────────────────
  // Paint instantly from cache/catalog — never flash a loading screen on tab open.
  const [tasks, setTasks] = useState<TasksState>(() => peekTasksState(telegramId));
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [taskMsg, setTaskMsg] = useState<string | null>(null);
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);

  // Per-task "channel opened at" timestamps. Persisted per (user, taskId)
  // so the 10s countdown survives a reload AND opening one sponsor task
  // doesn't accidentally unlock the Claim button on every other sponsor
  // task. Hydrated from localStorage whenever the visible sponsor task
  // list (or the user) changes.
  const [sponsorOpenedAt, setSponsorOpenedAt] = useState<Record<string, number>>({});
  const sponsorTaskIds = (tasks?.sponsorTasks ?? []).map((t) => t.id).join(",");
  useEffect(() => {
    if (!sponsorTaskIds) return;
    const next: Record<string, number> = {};
    for (const id of sponsorTaskIds.split(",")) {
      if (!id) continue;
      try {
        const raw = localStorage.getItem(sponsorGateKey(telegramId, id));
        const n = raw ? Number(raw) : 0;
        next[id] = Number.isFinite(n) && n > 0 ? n : 0;
      } catch { next[id] = 0; }
    }
    setSponsorOpenedAt(next);
  }, [telegramId, sponsorTaskIds]);
  const tasksTickRef = useRef(0);
  void tasksTickRef;

  const reloadTasks = useCallback(async (force = false) => {
    if (!telegramId) return;
    setTasksError(null);
    // Keep current UI; refresh silently in the background.
    const s = await fetchTasksState(telegramId, { force });
    if (s) setTasks(s);
    else if (!peekTasksState(telegramId).planetTasks.length) {
      setTasksError(t("earn.couldNotLoadTasks"));
    }
  }, [telegramId, t]);

  useEffect(() => {
    setTasks(peekTasksState(telegramId));
    void reloadTasks(true);
  }, [telegramId, reloadTasks]);

  // Floor FORGED with local craftsCompleted so Lab → Earn never looks stuck.
  useEffect(() => {
    if (!telegramId || craftsCompleted <= 0) return;
    const bumped = bumpTasksPlanetsBuilt(telegramId, craftsCompleted);
    if (bumped) setTasks(bumped);
  }, [telegramId, craftsCompleted]);

  useEffect(() => {
    const handler = () => { void reloadTasks(true); };
    window.addEventListener("zoom-data-refresh", handler);
    return () => { window.removeEventListener("zoom-data-refresh", handler); };
  }, [reloadTasks]);

  // Always re-sync when the user opens Earn (even if mount was kept alive).
  useEffect(() => {
    const onTab = (ev: Event) => {
      const detail = (ev as CustomEvent<{ tab?: string }>).detail;
      if (detail?.tab !== "earn") return;
      void refreshDailyStatus();
      void reloadTasks(true);
    };
    window.addEventListener("zoom-tab-active", onTab);
    return () => window.removeEventListener("zoom-tab-active", onTab);
  }, [reloadTasks]);

  useEffect(() => {
    if (!visible) return;
    void refreshDailyStatus();
    void reloadTasks(true);
  }, [visible, reloadTasks]);

  const handleClaimTask = async (taskId: string) => {
    if (!telegramId || claimingTaskId) return;
    setClaimingTaskId(taskId);
    const res = await claimTask(telegramId, taskId);
    setClaimingTaskId(null);
    if (res.ok) {
      const parts: string[] = [];
      const crumbs = (res.rewardZoom ?? 0) + (res.rewardStardust ?? 0);
      const xp = xpFromCrumbs(crumbs);
      if (crumbs > 0) parts.push(`+${crumbs.toLocaleString()} Crumbs`);
      if (xp > 0) {
        const gained = addPetXp(xp);
        if (gained > 0) parts.push(`+${gained} XP`);
      }
      setTaskMsg(parts.join(" · ") || t("earn.claimedBtn"));
      // Optimistic UI: mark claimed immediately so Claim feels instant.
      setTasks((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          claimedTasks: prev.claimedTasks.includes(taskId) ? prev.claimedTasks : [...prev.claimedTasks, taskId],
          planetTasks: prev.planetTasks.map((pt) =>
            pt.id === taskId ? { ...pt, claimed: true, claimable: false } : pt,
          ),
          sponsorTasks: prev.sponsorTasks.map((st) =>
            st.id === taskId ? { ...st, claimed: true } : st,
          ),
        };
      });
      // Authoritative ZOOM snap from claim response (avoids race with sync).
      if (typeof res.zoomBalance === "number" && typeof res.balanceEpoch === "number") {
        window.dispatchEvent(new CustomEvent("zoom-server-balance-snap", {
          detail: { balance: res.zoomBalance, epoch: res.balanceEpoch },
        }));
      }
      window.dispatchEvent(new Event("zoom-data-refresh"));
      await reloadTasks(true);
    } else if (res.error === "ALREADY_CLAIMED") {
      setTaskMsg(t("earn.alreadyClaimed"));
      await reloadTasks(true);
    } else if (res.error === "THRESHOLD_NOT_MET") {
      setTaskMsg(t("earn.thresholdNotMet", { need: String(res.threshold ?? 0), t: String(res.threshold ?? 0), b: String(res.planetsBuilt ?? 0) }));
      await reloadTasks(true);
    } else if (res.error === "INELIGIBLE") {
      const reqKey = SPONSOR_REQ_KEY[taskId];
      setTaskMsg(reqKey ? t(reqKey) : (res.requirementLabel || t("earn.requirementFallback")));
      await reloadTasks(true);
    } else {
      setTaskMsg(t("earn.claimFailed"));
    }
    setTimeout(() => setTaskMsg(null), 4500);
  };

  const handleOpenSponsor = (taskId: string, url: string) => {
    const now = Date.now();
    setSponsorOpenedAt((prev) => ({ ...prev, [taskId]: now }));
    try { localStorage.setItem(sponsorGateKey(telegramId, taskId), String(now)); } catch {}
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.openTelegramLink && url.startsWith("https://t.me/")) {
        tg.openTelegramLink(url);
        return;
      }
      if (tg?.openLink) {
        tg.openLink(url);
        return;
      }
    } catch {}
    window.open(url, "_blank");
  };

  const forgedCount = Math.max(tasks.planetsBuilt, Math.max(0, craftsCompleted));

  return (
    <div className="flex flex-col h-full overflow-y-auto earn-page" style={{ display: visible ? undefined : "none" }} aria-hidden={!visible}>
      <div className="px-4 pt-3 pb-1 flex-shrink-0">
        <h2 className="font-black text-xl tracking-tight" style={{ color: "var(--earn-ink)" }}>{t("earn.title")}</h2>
      </div>

      <div className="px-4 pb-5 flex flex-col gap-2">
        {/* Daily */}
        <section className="earn-panel">
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="earn-section-kicker" style={{ color: "var(--earn-cyan)" }}>Daily</div>
              <div className="font-black text-[17px] tracking-wide mt-0.5" style={{ color: "var(--earn-ink)" }}>{t("earn.dailyStreak")}</div>
            </div>
            <div className="earn-reward-chip earn-reward-chip--gold" aria-label={`+${upcomingReward} XP`}>
              +{upcomingReward} XP
            </div>
          </div>

          {xpStatus.blocked === "gate" && (
            <div
              className="mb-3 rounded-xl px-3 py-2 text-[11px] font-bold text-center"
              style={{ color: "#7ad7ff", background: "rgba(122,215,255,0.08)", border: "1px solid rgba(122,215,255,0.28)" }}
            >
              {pet.level === 1
                ? `Stage 3 is full. Pay ${LEVEL5_GRAM} GRAM in Collection for level 5.`
                : `Stage 3 is full. Pay ${LEVEL10_GRAM} GRAM in Collection for level 10.`}
            </div>
          )}

          <div className="grid grid-cols-7 gap-1.5 mb-3">
            {rewardsPreview.map((amt, i) => {
              const dayNum = i + 1;
              const isClaimed = dayNum <= displayDay;
              const isNext = dayNum === upcomingDay && canClaim;
              return (
                <div
                  key={dayNum}
                  className={`earn-day p-1.5 flex flex-col items-center justify-center border ${isNext ? "earn-day--next" : ""}`}
                  style={{
                    aspectRatio: "1 / 1.12",
                    borderColor: isClaimed ? "rgba(122,215,255,0.55)" : isNext ? "rgba(232,247,255,0.7)" : "rgba(122,215,255,0.12)",
                    background: isClaimed ? "rgba(122,215,255,0.16)" : isNext ? "rgba(122,215,255,0.08)" : "rgba(0,0,0,0.35)",
                  }}
                  data-testid={`day-${dayNum}`}
                >
                    <div className="text-[8px] font-bold" style={{ color: isClaimed ? "#7ad7ff" : isNext ? "#e8f7ff" : "rgba(186,220,236,0.4)" }}>
                    D{dayNum}
                  </div>
                  <div
                    className="text-[11px] font-black mt-0.5 tabular-nums"
                    style={{
                      color: isClaimed ? "#e8f7ff" : isNext ? "#fff" : "rgba(186,220,236,0.55)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 3,
                    }}
                  >
                    {Math.round(amt)}
                  </div>
                  {isClaimed && <div className="text-[8px] leading-none" style={{ color: "#7ad7ff" }}>✓</div>}
                </div>
              );
            })}
          </div>

          <button
            className={`earn-cta ${canClaim && !claiming ? "earn-cta--primary" : ""}`}
            onClick={handleClaimStreak}
            disabled={!canClaim || claiming}
            data-testid="button-claim-daily"
          >
            {claiming
              ? t("earn.claiming")
              : canClaim
                ? `${t("earn.claimBtn")} · D${upcomingDay} · +${upcomingReward} XP`
                : xpStatus.blocked === "done"
                  ? "Level 10"
                  : xpStatus.blocked === "gate"
                    ? "Pay GRAM in Collection"
                    : t("earn.nextIn", { h: hLeft, m: mLeft, s: sLeft })}
          </button>
          {claimMsg && (
            <div className="mt-2 text-center text-xs font-bold py-2 rounded-lg" style={{ color: "#00e676", background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.2)" }}>
              {claimMsg}
            </div>
          )}
          <p className="mt-2.5 text-[10px] text-center leading-snug" style={{ color: "rgba(255,255,255,0.34)" }}>
            {t("earn.dailyPizzaHint")} {CYCLE_XP.toLocaleString()} XP reaches the next GRAM gate. A week of claims is {DAILY_XP_WEEK.toLocaleString()} XP.
          </p>
        </section>

        <section className="earn-panel">
          <div className="earn-section-kicker" style={{ color: "var(--earn-cyan)" }}>Tasks</div>
          <div className="font-black text-[17px] tracking-wide mt-0.5" style={{ color: "var(--earn-ink)" }}>Pet XP</div>
          <p className="mt-1 text-[11px] leading-snug" style={{ color: "rgba(186,220,236,0.55)" }}>
            The base pet reaches stage 3 in {stageDays.reachStage3} days if you take the daily, the 4 taps and this task every day. Filling stage 3 takes {stageDays.fillStage3} days.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <div className="earn-row">
              <div className="min-w-0">
                <div className="text-sm font-black" style={{ color: "var(--earn-ink)" }}>Interact with your pet</div>
                <div className="text-[11px]" style={{ color: "rgba(186,220,236,0.55)" }}>Tap the pet once today. +{TASK_INTERACT_XP} XP</div>
              </div>
              <button
                type="button"
                className={`earn-cta !w-auto px-3 ${interact.can ? "earn-cta--primary" : ""}`}
                disabled={!interact.can}
                onClick={() => {
                  const gained = claimInteractTask();
                  if (gained > 0) setClaimMsg(`+${gained} XP`);
                }}
              >
                {interact.claimed ? "Done" : interact.can ? "Claim" : "Tap pet"}
              </button>
            </div>
            <div className="earn-row">
              <div className="min-w-0">
                <div className="text-sm font-black" style={{ color: "var(--earn-ink)" }}>Join community</div>
                <div className="text-[11px]" style={{ color: "rgba(186,220,236,0.55)" }}>Once. +{TASK_ONCE_XP} XP</div>
              </div>
              {pet.claimedCommunity ? (
                <span className="text-xs font-black" style={{ color: "#7ad7ff" }}>Done</span>
              ) : pet.openedCommunity ? (
                <button type="button" className="earn-cta earn-cta--primary !w-auto px-3" onClick={() => { const n = claimOnceTask("community"); if (n > 0) setClaimMsg(`+${n} XP`); }}>Claim</button>
              ) : (
                <button type="button" className="earn-cta earn-cta--ghost !w-auto px-3" onClick={() => { markTaskOpened("community"); handleOpenSponsor("community", communityUrl); }}>Open</button>
              )}
            </div>
            <div className="earn-row">
              <div className="min-w-0">
                <div className="text-sm font-black" style={{ color: "var(--earn-ink)" }}>Join chat</div>
                <div className="text-[11px]" style={{ color: "rgba(186,220,236,0.55)" }}>Once. +{TASK_ONCE_XP} XP</div>
              </div>
              {pet.claimedChat ? (
                <span className="text-xs font-black" style={{ color: "#7ad7ff" }}>Done</span>
              ) : pet.openedChat ? (
                <button type="button" className="earn-cta earn-cta--primary !w-auto px-3" onClick={() => { const n = claimOnceTask("chat"); if (n > 0) setClaimMsg(`+${n} XP`); }}>Claim</button>
              ) : (
                <button type="button" className="earn-cta earn-cta--ghost !w-auto px-3" onClick={() => { markTaskOpened("chat"); handleOpenSponsor("chat", chatUrl); }}>Open</button>
              )}
            </div>
            <div className="earn-row">
              <div className="min-w-0">
                <div className="text-sm font-black" style={{ color: "var(--earn-ink)" }}>Invite a friend</div>
                <div className="text-[11px]" style={{ color: "rgba(186,220,236,0.55)" }}>Once, when a friend joins. +{TASK_INVITE_ONCE_XP} XP</div>
              </div>
              {pet.claimedInviteTask ? (
                <span className="text-xs font-black" style={{ color: "#7ad7ff" }}>Done</span>
              ) : referralCount > 0 ? (
                <button type="button" className="earn-cta earn-cta--primary !w-auto px-3" onClick={() => { const n = claimOnceTask("invite", referralCount); if (n > 0) setClaimMsg(`+${n} XP`); }}>Claim</button>
              ) : (
                <button
                  type="button"
                  className="earn-cta earn-cta--ghost !w-auto px-3"
                  onClick={() => {
                    const text = encodeURIComponent(t("earn.shareInviteText"));
                    const url = encodeURIComponent(referralLink);
                    window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank");
                  }}
                >
                  Invite
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Invite */}
        <section className="earn-panel">
          <div className="mb-3">
            <div className="earn-section-kicker" style={{ color: "var(--earn-cyan)" }}>Invite</div>
            <div className="font-black text-[17px] tracking-wide mt-0.5" style={{ color: "var(--earn-ink)" }}>{t("earn.referralProgram")}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="earn-reward-chip earn-reward-chip--gold">+{INVITE_XP} XP / invite</span>
            </div>
          </div>

          <button
            onClick={() => {
              const text = encodeURIComponent(t("earn.shareInviteText"));
              const url = encodeURIComponent(referralLink);
              window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank");
            }}
            className="earn-cta earn-cta--ghost mb-2"
          >
            {t("earn.inviteFriends")}
          </button>
          <div className="flex items-center gap-2 text-xs mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span>{t("earn.idLabel")}</span>
            <span className="font-bold font-mono" style={{ color: "var(--earn-cyan)" }}>{referralCode}</span>
            <span>·</span>
            <span className="font-bold" style={{ color: "#00e676" }}>{referralCount.toLocaleString()} invited</span>
          </div>

          {referralSpeedBonus > 0 && (
            <div className="mb-3 rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ border: "1px solid rgba(0,230,118,0.22)", background: "rgba(0,230,118,0.05)" }}>
              <SpeedBoltIcon size={20} />
              <div className="flex-1 min-w-0">
                <div className="font-black text-xs" style={{ color: "#00e676" }}>+{Math.round(referralSpeedBonus * 100)}% speed</div>
                <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{referredBy ? t("earn.speedActiveJoined") : t("earn.speedActiveSub")}</div>
              </div>
            </div>
          )}

          <p className="text-[11px] leading-snug" style={{ color: "rgba(186,220,236,0.55)" }}>
            Invites pay XP only. Crumbs come from farming the pet, and 1 Crumb withdraws as 1 GRAM.
          </p>
        </section>

        {/* Redeem */}
        <section className="earn-panel">
          <div className="flex items-center gap-2 mb-3">
            <SpaceTicketIcon size={22} />
            <div className="font-black text-[15px]" style={{ color: "var(--earn-ink)" }}>{t("earn.redeemCode")}</div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={redeemInput}
              onChange={(e) => setRedeemInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
              placeholder=""
              className="flex-1 px-3 py-2.5 rounded-xl text-sm font-mono font-bold uppercase outline-none"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(158,197,232,0.2)", color: "var(--earn-cyan)", letterSpacing: "0.06em" }}
              data-testid="input-redeem-code"
            />
            <button onClick={handleRedeem} className="earn-cta earn-cta--ghost !w-auto px-4" data-testid="button-redeem">
              {t("earn.go")}
            </button>
          </div>
          {redeemStatus && (
            <div
              className="mt-2 text-xs font-bold text-center py-2.5 rounded-xl"
              style={{
                color: redeemStatus.type === "error" ? "#ff5252" : redeemStatus.type === "sun" ? "#ffb347" : "#00e676",
                background: redeemStatus.type === "error" ? "rgba(255,82,82,0.08)" : redeemStatus.type === "sun" ? "rgba(255,179,71,0.1)" : "rgba(0,230,118,0.08)",
                border: `1px solid ${redeemStatus.type === "error" ? "rgba(255,82,82,0.2)" : redeemStatus.type === "sun" ? "rgba(255,179,71,0.25)" : "rgba(0,230,118,0.2)"}`,
              }}
            >
              {redeemStatus.message}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
