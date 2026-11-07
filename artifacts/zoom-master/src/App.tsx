import { useEffect, useState } from "react";
import House from "lucide-react/dist/esm/icons/house.js";
import LayoutGrid from "lucide-react/dist/esm/icons/layout-grid.js";
import Gem from "lucide-react/dist/esm/icons/gem.js";
import Medal from "lucide-react/dist/esm/icons/medal.js";
import UserRound from "lucide-react/dist/esm/icons/user-round.js";
import { usePetSession } from "./hooks/usePetSession";
import { useGlobalInit } from "./store/globalStore";
import { LabSpaceBackground } from "./components/LabSpaceBackground";
import { MaintenanceScreen } from "./components/MaintenanceScreen";
import { LabPage } from "./pages/LabPage";
import { CollectionPage } from "./pages/CollectionPage";
import { EarnPage } from "./pages/EarnPage";
import { RankPage } from "./pages/RankPage";
import { ShopPage } from "./pages/ShopPage";
import { WalletPage } from "./pages/WalletPage";
import { LanguageProvider } from "./i18n/LanguageContext";
import { TelegramIdentity } from "./components/TelegramIdentity";
import { ChristmasSnow } from "./components/ChristmasSnow";
import { hideHtmlSplash } from "./components/SplashScreen";
import { fetchMaintenanceStatus } from "./utils/api";
import { initVersionCheck } from "./utils/appVersion";
import { noteVisit } from "./pet/quests";

type MaintSnapshot = { enabled: boolean; message: string; updatedAt?: number };
type Tab = "lab" | "farm" | "earn" | "rank" | "shop" | "wallet";

const NAV: { id: Tab; label: string; icon: typeof House }[] = [
  { id: "lab", label: "Home", icon: House },
  { id: "farm", label: "Collection", icon: LayoutGrid },
  { id: "earn", label: "Earn", icon: Gem },
  { id: "rank", label: "TOP 10", icon: Medal },
  { id: "wallet", label: "Profile", icon: UserRound },
];

const ALL_TABS: Tab[] = ["lab", "farm", "earn", "rank", "shop", "wallet"];
const LAB_SPACE_TABS: Tab[] = ["farm", "earn", "rank", "wallet", "shop"];

function readMaintCache(): MaintSnapshot | null {
  try {
    const raw = localStorage.getItem("zoom-maint-cached");
    if (!raw) return null;
    const cached = JSON.parse(raw) as MaintSnapshot;
    return { enabled: !!cached.enabled, message: cached.message || "", updatedAt: cached.updatedAt };
  } catch {
    return null;
  }
}

function splashElapsedDone(): boolean {
  try {
    if ((window as unknown as { __zoomSplashFinished?: boolean }).__zoomSplashFinished) return true;
  } catch { /**/ }
  return !document.getElementById("splash-screen");
}

function BootSplashGate() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      setReady(true);
      requestAnimationFrame(() => hideHtmlSplash());
    };
    if (splashElapsedDone()) {
      release();
      return;
    }
    const pollId = window.setInterval(() => {
      if (splashElapsedDone()) release();
    }, 50);
    return () => window.clearInterval(pollId);
  }, []);

  if (!ready) return null;
  return <AppShell />;
}

export default function App() {
  return (
    <LanguageProvider>
      <BootSplashGate />
    </LanguageProvider>
  );
}

function AppShell() {
  const [tab, setTab] = useState<Tab>("lab");
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem("zoom-bgm-muted") === "1"; } catch { return false; }
  });
  const session = usePetSession();
  useGlobalInit(session.telegramId);

  const initialMaint = readMaintCache();
  const [maintenance, setMaintenance] = useState<MaintSnapshot>(() => (
    initialMaint?.enabled ? { enabled: true, message: initialMaint.message } : { enabled: false, message: "" }
  ));

  useEffect(() => {
    initVersionCheck();
    noteVisit();
    const onShow = () => {
      if (!document.hidden) noteVisit();
    };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    return () => {
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
    };
  }, []);

  useEffect(() => {
    const audio = new Audio(`${import.meta.env.BASE_PATH || "/"}bgm.mp3?v=22`);
    audio.loop = true;
    audio.preload = "none";
    audio.volume = muted ? 0 : 0.18;
    audio.muted = muted;
    const start = () => { void audio.play().catch(() => { /**/ }); };
    window.addEventListener("pointerdown", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      audio.pause();
    };
  }, [muted]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const status = await fetchMaintenanceStatus();
      if (!alive || !status) return;
      const next = { enabled: !!status.enabled, message: status.message || "", updatedAt: status.updatedAt };
      setMaintenance(next);
      try { localStorage.setItem("zoom-maint-cached", JSON.stringify(next)); } catch { /**/ }
    };
    void load();
    const id = window.setInterval(() => { if (!document.hidden) void load(); }, 15000);
    return () => { alive = false; window.clearInterval(id); };
  }, []);

  if (maintenance.enabled) return <MaintenanceScreen message={maintenance.message} />;

  return (
    <div
      className="flex flex-col overflow-hidden relative"
      style={{
        height: "100dvh",
        background: "#000000",
        paddingTop: tab === "lab" ? 0 : "env(safe-area-inset-top, 0px)",
        paddingBottom: tab === "lab" ? 0 : "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {LAB_SPACE_TABS.includes(tab) && <LabSpaceBackground />}
      <div style={{ position: "absolute", zIndex: 40, left: 14, top: "calc(env(safe-area-inset-top, 0px) + 10px)" }}>
        <TelegramIdentity />
      </div>
      {tab !== "lab" && <div style={{ height: 46, flexShrink: 0 }} />}

      <main className="flex-1 overflow-hidden relative z-10" style={{ minHeight: 0 }}>
        {ALL_TABS.map((id) => {
          const active = tab === id;
          if (!active && id !== "lab") return null;
          return (
            <div
              key={id}
              style={{
                position: "absolute",
                inset: 0,
                display: active ? "flex" : "none",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {id === "lab" && (
                <LabPage active={active} onOpenShop={() => setTab("shop")} muted={muted} setMuted={setMuted} />
              )}
              {id === "farm" && <CollectionPage gram={session.gram} onPay={session.pay} />}
              {id === "earn" && (
                <EarnPage
                  visible={active}
                  referralCode={session.referralCode}
                  referralCount={session.referralCount}
                  lastDailyClaimAt={0}
                  referralSpeedBonus={0}
                  referredBy={null}
                  claimedMilestones={session.claimedMilestones}
                  onClaimDaily={() => { /**/ }}
                  telegramId={session.telegramId}
                />
              )}
              {id === "rank" && (
                <RankPage balance={0} telegramId={session.telegramId} visible={active} />
              )}
              {id === "shop" && <ShopPage gram={session.gram} onPay={session.pay} />}
              {id === "wallet" && (
                <WalletPage telegramId={session.telegramId} visible={active} />
              )}
            </div>
          );
        })}
      </main>

      <nav
        className="flex-shrink-0 relative z-20"
        style={tab === "lab" ? {
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 30,
          height: "calc(84px + env(safe-area-inset-bottom, 0px))",
          padding: "8px 12px",
          paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))",
          background: "transparent",
          pointerEvents: "none",
        } : {
          height: 84,
          padding: "8px 12px 10px",
          background: "transparent",
        }}
      >
        <div className="flex h-full" style={{ pointerEvents: "auto" }}>
          {NAV.map((item) => {
            const active = tab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className="flex-1 flex flex-col items-center justify-center gap-1"
                onClick={() => setTab(item.id)}
                style={{ color: active ? "#7ad7ff" : "rgba(186, 220, 236, 0.55)", background: "transparent", border: "none" }}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 1.7} />
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.04em" }}>{item.label}</div>
              </button>
            );
          })}
        </div>
      </nav>
      <ChristmasSnow />
    </div>
  );
}
