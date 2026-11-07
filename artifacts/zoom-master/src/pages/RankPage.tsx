import { useMemo } from "react";
import { useGlobalStore } from "../store/globalStore";
import { useT } from "../i18n/LanguageContext";
import { ZoomCubeIcon } from "../components/ZoomCubeIcon";
import { TelegramAvatar } from "../components/TelegramAvatar";
interface RankPageProps {
  balance: number;
  telegramId: string | null;
  visible?: boolean;
}

function formatZoom(amount: number): string {
  return Math.floor(amount).toLocaleString();
}

const WEEK_KEY = "biscotto-week-lb";

function weekStart(now = Date.now()): string {
  const d = new Date(now);
  const day = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)).toISOString().slice(0, 10);
}

function weeklyTop<T extends { telegramId: string; zoomBalance: number; rank: number }>(rows: T[]) {
  const week = weekStart();
  let base: Record<string, number> = {};
  try {
    const saved = JSON.parse(localStorage.getItem(WEEK_KEY) || "") as { week?: string; base?: Record<string, number> };
    if (saved.week === week && saved.base) base = saved.base;
  } catch { /**/ }
  let dirty = false;
  for (const row of rows) {
    if (base[row.telegramId] == null) {
      base[row.telegramId] = row.zoomBalance;
      dirty = true;
    }
  }
  if (dirty) {
    try { localStorage.setItem(WEEK_KEY, JSON.stringify({ week, base })); } catch { /**/ }
  }
  return rows
    .map((row) => ({ ...row, weekScore: Math.max(0, row.zoomBalance - (base[row.telegramId] ?? row.zoomBalance)) }))
    .sort((a, b) => b.weekScore - a.weekScore || a.rank - b.rank)
    .slice(0, 10)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

/** Empty, generic, or the old browser-dev fallback — not a real Telegram name. */
function isPlaceholderRankName(name: string | null | undefined): boolean {
  const n = (name ?? "").trim();
  return !n || /^player$/i.test(n) || /^dev$/i.test(n);
}

function getTelegramFirstName(): string | null {
  try {
    const user = (window as unknown as {
      Telegram?: { WebApp?: { initDataUnsafe?: { user?: { first_name?: string } } } };
    }).Telegram?.WebApp?.initDataUnsafe?.user;
    const name = typeof user?.first_name === "string" ? user.first_name.trim() : "";
    return name || null;
  } catch {
    return null;
  }
}

export function RankPage({ balance, telegramId, visible }: RankPageProps) {
  void visible;
  const { t } = useT();

  // All shared data is pre-loaded centrally — no per-mount fetch, no pop-in
  const leaderboard = useGlobalStore((s) => s.leaderboard);
  const initialized = useGlobalStore((s) => s.initialized);
  const loadingLb = !initialized && leaderboard.length === 0;
  const visibleLeaderboard = useMemo(() => {
    const tgName = getTelegramFirstName();
    const rows = leaderboard
      .filter((entry) => {
        if (telegramId && entry.telegramId === telegramId) return true;
        return !isPlaceholderRankName(entry.firstName);
      })
      .map((entry) => {
        if (
          telegramId &&
          entry.telegramId === telegramId &&
          isPlaceholderRankName(entry.firstName) &&
          tgName
        ) {
          return { ...entry, firstName: tgName };
        }
        return entry;
      });
    if (telegramId && (balance ?? 0) > 0 && !rows.some((e) => e.telegramId === telegramId)) {
      rows.push({
        telegramId,
        firstName: tgName || "You",
        photoUrl: null,
        zoomBalance: balance,
        rank: 0,
      });
    }
    return rows
      .sort((a, b) => b.zoomBalance - a.zoomBalance)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [leaderboard, telegramId, balance]);

  const board = useMemo(() => weeklyTop(visibleLeaderboard), [visibleLeaderboard]);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "linear-gradient(180deg, #071018 0%, #000 100%)" }}>
      <div className="px-5 pt-4 pb-2 flex-shrink-0">
        <h2 className="font-black text-lg tracking-tight" style={{ color: "#e8f7ff" }}>Leaderboard</h2>
        <p className="text-[12px] mt-1" style={{ color: "rgba(186,220,236,0.62)" }}>Top 10. Restarts every Monday.</p>
      </div>

      <div
        className="flex-1 overflow-y-auto"
        style={{
          minHeight: 0,
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
          overscrollBehavior: "contain",
          transform: "translateZ(0)",
          willChange: "scroll-position",
          contain: "layout paint",
        }}
      >
        <div className="px-4 mb-3">
          <div
            className="rounded-2xl border p-3"
            style={{ borderColor: "rgba(158,197,232,0.16)", background: "rgba(158,197,232,0.035)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: "#9EC5E8", boxShadow: "0 0 6px rgba(158,197,232,0.75)" }} />
                <span className="font-black text-sm tracking-wide" style={{ color: "#e8f7ff" }}>Top 10</span>
              </div>
              <span />
            </div>
            <div className="flex flex-col gap-1.5">
              {loadingLb && board.length === 0 && (
                <div className="text-xs text-center py-3" style={{ color: "rgba(255,255,255,0.2)" }}>{t("common.loading")}</div>
              )}
              {!loadingLb && board.length === 0 && (
                <div className="text-xs text-center py-3" style={{ color: "rgba(255,255,255,0.2)" }}>{t("rank.noPlayers")}</div>
              )}
              {board.map((entry) => {
                const isUser = !!telegramId && entry.telegramId === telegramId;
                const top3 = entry.rank <= 3;
                const displayName = isPlaceholderRankName(entry.firstName)
                  ? (isUser ? (getTelegramFirstName() || t("rank.you2")) : "")
                  : entry.firstName;
                return (
                  <div
                    key={entry.telegramId}
                    className="rounded-xl border flex items-center gap-3 px-3 py-2 transition-all"
                    style={{
                      borderColor: top3 ? "rgba(122,215,255,0.55)" : isUser ? "rgba(122,215,255,0.28)" : "rgba(122,215,255,0.1)",
                      background: top3 ? "rgba(122,215,255,0.1)" : "rgba(0,0,0,0.35)",
                    }}
                  >
                    <div className="font-black text-sm w-7 text-center flex-shrink-0" style={{ color: isUser ? "#E8ECF4" : "rgba(255,255,255,0.28)" }}>
                      #{entry.rank}
                    </div>
                    {top3 && (
                      <span className="rank-zoom-badge" title="Top 3">
                        <ZoomCubeIcon size={18} />
                      </span>
                    )}
                    <TelegramAvatar
                      photoUrl={entry.photoUrl}
                      name={displayName || entry.firstName}
                      seed={entry.telegramId}
                      size={32}
                    />
                    <div className={isUser ? "flex-1 font-black text-sm" : "flex-1 font-bold text-sm"} style={{ color: isUser ? "#E8ECF4" : "rgba(255,255,255,0.58)" }}>
                      {displayName}
                      {entry.vipLevel === "PRO" && (
                        <span
                          className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider align-middle"
                          style={{ background: "rgba(255,215,64,0.18)", color: "#ffd740", border: "1px solid rgba(255,215,64,0.45)" }}
                          title="VIP Pro"
                        >
                          VIP
                        </span>
                      )}
                      {entry.vipLevel === "BASE" && (
                        <span
                          className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider align-middle"
                          style={{ background: "rgba(192,200,216,0.16)", color: "#c8d0dc", border: "1px solid rgba(192,200,216,0.4)" }}
                          title="VIP Base"
                        >
                          VIP
                        </span>
                      )}
                      {entry.studioBadge && (
                        <span
                          className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider align-middle"
                          style={{ background: "rgba(255,215,64,0.16)", color: "#ffe082", border: "1px solid rgba(255,215,64,0.45)" }}
                          title="Studio TOP 3"
                        >
                          STUDIO
                        </span>
                      )}
                      {isUser && !isPlaceholderRankName(entry.firstName) && (
                        <span className="text-xs opacity-40 ml-1">{t("rank.you")}</span>
                      )}
                    </div>
                    <div className="text-xs font-black tabular-nums" style={{ color: isUser ? "#9EC5E8" : "rgba(255,255,255,0.42)" }}>
                      {formatZoom(entry.weekScore)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] mt-2 leading-relaxed" style={{ color: "rgba(186,220,236,0.45)" }}>
              Scores count only what was gained this week. Monday clears the board.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
