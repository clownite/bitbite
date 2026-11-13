import { useEffect, useState } from "react";
import { nextReset } from "../pet/invested";
import { xpLeaders, type XpRow } from "../pet/gameXp";
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

/** One board: whoever earned the most XP from Cookies and Numbers this week. */
export function RankPage({ telegramId, visible }: RankPageProps) {
  void visible;
  const [rows, setRows] = useState<XpRow[]>(() => xpLeaders());
  useEffect(() => {
    const pull = () => setRows(xpLeaders());
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
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "transparent", color: "#0f380f" }}>
      <div className="px-5 pt-4 pb-2 flex-shrink-0" style={{ textAlign: "center" }}>
        <div className="text-[11px] font-black tracking-[0.2em]" style={{ color: "#306230" }}>{t("rank.week")}</div>
        <h2 className="font-black text-2xl tracking-tight" style={{ color: "#0f380f" }}>{t("rank.title")}</h2>
        <p className="text-[12px] mt-1" style={{ color: "#306230" }}>
          {t("rank.xpLine", { day: nextReset() })}
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
                className="px-2 text-center"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", minHeight: 150 }}
              >
                <div className="font-black text-[13px] truncate" style={{ color: "#0f380f" }}>{entry.name.split(" ")[0]}</div>
                <div className="font-black tabular-nums" style={{ color: "#0f380f", fontSize: tall ? 22 : 16 }}>{formatGram(entry.amount)}</div>
                <div className="text-[10px] font-bold tracking-wide" style={{ color: "#306230" }}>XP</div>
                <div style={{ width: "78%", height: tall ? 78 : 52, marginTop: 6, background: "#0f380f" }} />
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-1.5">
          {rows.slice(3).map((entry, index) => {
            const rank = index + 4;
            const isUser = !!youId && entry.telegramId === youId;
            return (
              <div
                key={entry.telegramId}
                className="rounded-xl flex items-center gap-3 px-3 py-2.5"
                style={{
                  background: isUser ? "#c4d65a" : "transparent",
                  borderBottom: "2px solid #0f380f",
                  borderRadius: 0,
                }}
              >
                <div className="font-black text-sm w-7 text-center flex-shrink-0" style={{ color: "#0f380f" }}>
                  {rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm truncate" style={{ color: "#0f380f" }}>
                    {entry.name}
                    {isUser && <span className="text-xs font-bold ml-1" style={{ color: "#306230" }}>{t("rank.you")}</span>}
                  </div>
                </div>
                <div className="text-sm font-black tabular-nums" style={{ color: "#0f380f" }}>{formatGram(entry.amount)} XP</div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
