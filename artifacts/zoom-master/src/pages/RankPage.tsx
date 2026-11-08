import { useEffect, useState } from "react";
import { UPCOMING_PRIZES, nextReset, weeklyInvestors, type InvestorRow } from "../pet/invested";
import { getTelegramViewer } from "../utils/telegram";
import { useT } from "../i18n/LanguageContext";

interface RankPageProps {
  balance: number;
  telegramId: string | null;
  visible?: boolean;
}

function formatGram(amount: number): string {
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Top 10 by GRAM put into the app this week. Prizes are listed for the next reset. */
export function RankPage({ telegramId, visible }: RankPageProps) {
  void visible;
  const [rows, setRows] = useState<InvestorRow[]>(() => weeklyInvestors());
  useEffect(() => {
    const pull = () => setRows(weeklyInvestors());
    pull();
    window.addEventListener("focus", pull);
    document.addEventListener("visibilitychange", pull);
    return () => {
      window.removeEventListener("focus", pull);
      document.removeEventListener("visibilitychange", pull);
    };
  }, []);

  const { t } = useT();
  const you = getTelegramViewer();
  const youId = telegramId || you.id;

  const podium = [rows[1], rows[0], rows[2]].filter(Boolean);
  const order = [2, 1, 3];

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "transparent" }}>
      <div className="px-5 pt-4 pb-2 flex-shrink-0">
        <div className="text-[11px] font-black tracking-[0.2em]" style={{ color: "#7ad7ff" }}>{t("rank.week")}</div>
        <h2 className="font-black text-2xl tracking-tight" style={{ color: "#e8f7ff" }}>{t("rank.title")}</h2>
        <p className="text-[12px] mt-1" style={{ color: "rgba(186,220,236,0.62)" }}>
          {t("rank.blurb", { day: nextReset() })}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6" style={{ minHeight: 0, WebkitOverflowScrolling: "touch" }}>
        <div className="grid grid-cols-3 gap-2 items-end mb-3">
          {podium.map((entry, index) => {
            const place = order[index];
            const tall = place === 1;
            return (
              <div
                key={entry.telegramId}
                className="rounded-2xl px-2 py-3 text-center"
                style={{
                  minHeight: tall ? 132 : 108,
                  background: tall
                    ? "linear-gradient(180deg, rgba(122,215,255,0.28), rgba(122,215,255,0.08))"
                    : "rgba(122,215,255,0.08)",
                  border: "1px solid rgba(122,215,255,0.45)",
                  boxShadow: tall ? "0 0 24px rgba(122,215,255,0.28)" : "none",
                }}
              >
                <div className="font-black" style={{ color: "#7ad7ff", fontSize: tall ? 22 : 16 }}>#{place}</div>
                <div className="font-black text-[12px] mt-1 truncate" style={{ color: "#e8f7ff" }}>{entry.name.split(" ")[0]}</div>
                <div className="font-black tabular-nums mt-1" style={{ color: "#e8f7ff" }}>{formatGram(entry.amount)}</div>
                <div className="text-[10px] font-bold tracking-wide" style={{ color: "rgba(122,215,255,0.7)" }}>GRAM</div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-1.5">
          {rows.map((entry, index) => {
            const rank = index + 1;
            const isUser = !!youId && entry.telegramId === youId;
            return (
              <div
                key={entry.telegramId}
                className="rounded-xl flex items-center gap-3 px-3 py-2.5"
                style={{
                  background: isUser ? "rgba(122,215,255,0.16)" : "rgba(7,22,34,0.55)",
                  border: isUser ? "1px solid rgba(122,215,255,0.7)" : "1px solid rgba(122,215,255,0.14)",
                }}
              >
                <div className="font-black text-sm w-7 text-center flex-shrink-0" style={{ color: "#7ad7ff" }}>
                  {rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm truncate" style={{ color: "#e8f7ff" }}>
                    {entry.name}
                    {isUser && <span className="text-xs font-bold ml-1" style={{ color: "#7ad7ff" }}>{t("rank.you")}</span>}
                  </div>
                </div>
                <div className="text-sm font-black tabular-nums" style={{ color: "#7ad7ff" }}>{formatGram(entry.amount)} GRAM</div>
              </div>
            );
          })}
        </div>

        <section className="rounded-2xl p-3 mt-3" style={{ background: "rgba(122,215,255,0.08)", border: "1px solid rgba(122,215,255,0.2)" }}>
          <div className="text-[11px] font-black tracking-[0.16em]" style={{ color: "#7ad7ff" }}>{t("rank.prizes")}</div>
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            {UPCOMING_PRIZES.map((prize) => (
              <div key={prize.place} className="rounded-xl px-2 py-2 text-center" style={{ background: "rgba(4,16,24,0.45)" }}>
                <div className="text-[10px] font-black" style={{ color: "rgba(186,220,236,0.55)" }}>#{prize.place}</div>
                <div className="text-[11px] font-black mt-0.5" style={{ color: "#e8f7ff" }}>{prize.prize}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
