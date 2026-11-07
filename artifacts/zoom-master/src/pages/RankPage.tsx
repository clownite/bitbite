import { useEffect, useState } from "react";
import { UPCOMING_PRIZES, nextReset, weeklyInvestors, type InvestorRow } from "../pet/invested";
import { getTelegramViewer } from "../utils/telegram";

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

  const you = getTelegramViewer();
  const youId = telegramId || you.id;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "linear-gradient(180deg, #071018 0%, #000 100%)" }}>
      <div className="px-5 pt-4 pb-2 flex-shrink-0">
        <h2 className="font-black text-lg tracking-tight" style={{ color: "#e8f7ff" }}>Top 10</h2>
        <p className="text-[12px] mt-1" style={{ color: "rgba(186,220,236,0.62)" }}>
          Who put the most GRAM into the app. Resets Monday {nextReset()}.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6" style={{ minHeight: 0, WebkitOverflowScrolling: "touch" }}>
        <section
          className="rounded-2xl border p-3 mb-3"
          style={{ borderColor: "rgba(240,177,90,0.35)", background: "rgba(240,177,90,0.06)" }}
        >
          <div className="text-[11px] font-black tracking-[0.16em]" style={{ color: "#f0b15a" }}>XP PRIZES NEXT RESET</div>
          <p className="text-[11px] mt-1 mb-2" style={{ color: "rgba(255,244,228,0.62)" }}>
            XP only. Nobody receives GRAM. Paid from the following Monday.
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {UPCOMING_PRIZES.map((prize) => (
              <div key={prize.place} className="rounded-xl px-2 py-2 text-center" style={{ background: "rgba(0,0,0,0.35)" }}>
                <div className="text-[10px] font-black" style={{ color: "rgba(255,244,228,0.5)" }}>#{prize.place}</div>
                <div className="text-[11px] font-black mt-0.5" style={{ color: "#ffe0a8" }}>{prize.prize}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-1.5">
          {rows.length === 0 && (
            <div className="text-xs text-center py-6" style={{ color: "rgba(255,255,255,0.35)" }}>
              No GRAM invested this week yet. Buying a pet or a level puts you on the board.
            </div>
          )}
          {rows.map((entry, index) => {
            const rank = index + 1;
            const isUser = !!youId && entry.telegramId === youId;
            const top3 = rank <= 3;
            return (
              <div
                key={entry.telegramId}
                className="rounded-xl border flex items-center gap-3 px-3 py-2.5"
                style={{
                  borderColor: top3 ? "rgba(240,177,90,0.55)" : isUser ? "rgba(122,215,255,0.35)" : "rgba(122,215,255,0.1)",
                  background: top3 ? "rgba(240,177,90,0.08)" : "rgba(0,0,0,0.35)",
                }}
              >
                <div className="font-black text-sm w-7 text-center flex-shrink-0" style={{ color: top3 ? "#f0b15a" : "rgba(255,255,255,0.4)" }}>
                  #{rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm truncate" style={{ color: "#e8f7ff" }}>
                    {entry.name}
                    {isUser && <span className="text-xs font-bold ml-1" style={{ color: "rgba(186,220,236,0.45)" }}>you</span>}
                  </div>
                  <div className="text-[11px] truncate" style={{ color: "rgba(186,220,236,0.55)" }}>
                    {entry.username || "No username"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black tabular-nums" style={{ color: "#ffe0a8" }}>{formatGram(entry.amount)}</div>
                  <div className="text-[10px] font-bold tracking-wide" style={{ color: "rgba(255,224,168,0.55)" }}>GRAM</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
