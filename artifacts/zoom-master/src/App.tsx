import { useEffect, useState } from "react";
import House from "lucide-react/dist/esm/icons/house.js";
import LayoutGrid from "lucide-react/dist/esm/icons/layout-grid.js";
import Gem from "lucide-react/dist/esm/icons/gem.js";
import Medal from "lucide-react/dist/esm/icons/medal.js";
import UserRound from "lucide-react/dist/esm/icons/user-round.js";
import { GamePage } from "./pages/GamePage";
import { settleCookieWeek } from "./pet/cookieBoard";
import { usePetSession } from "./hooks/usePetSession";
import { useGlobalInit } from "./store/globalStore";
import { LabSpaceBackground } from "./components/LabSpaceBackground";
import { MaintenanceScreen } from "./components/MaintenanceScreen";
import { SuspendedScreen } from "./components/SuspendedScreen";
import { AdminPixel, isAppAdmin } from "./components/AdminPixel";
import { LabPage } from "./pages/LabPage";
import { CollectionPage } from "./pages/CollectionPage";
import { EarnPage } from "./pages/EarnPage";
import { RankPage } from "./pages/RankPage";
import { ShopPage } from "./pages/ShopPage";
import { WalletPage } from "./pages/WalletPage";
import { LanguageProvider, useT } from "./i18n/LanguageContext";
import { TelegramIdentity } from "./components/TelegramIdentity";
import { ChristmasSnow } from "./components/ChristmasSnow";
import { hideHtmlSplash } from "./components/SplashScreen";
import { fetchGateStatus, fetchMaintenanceStatus } from "./utils/api";
import { getVerifiedTelegramUserId } from "./utils/telegram";
import { initVersionCheck } from "./utils/appVersion";
import { noteVisit } from "./pet/quests";
import { FirstGuide, type GuideTab } from "./components/FirstGuide";
import { hapticSoft } from "./utils/haptic";
import { playClick } from "./audio/sfx";
import { settlePetPayments } from "./pet/payPet";
import { resumeChiptune, setChiptuneMuted } from "./audio/chiptune";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { careView, subscribeCare } from "./pet/care";
import { eggLeft } from "./pet/life";
import { getPet } from "./pet/petProgress";
import { subscribeCrumbs } from "./pet/crumbs";
import { PixelCookie } from "./components/PixelCookie";

type MaintSnapshot = { enabled: boolean; message: string; updatedAt?: number };
type Tab = "lab" | "farm" | "play" | "earn" | "rank" | "shop" | "wallet";

function CookieNavIcon({ size = 22 }: { size?: number; strokeWidth?: number }) {
  return <PixelCookie size={size} />;
}

const NAV: { id: Tab; key: string; icon: typeof House }[] = [
  { id: "lab", key: "pet.nav.home", icon: House },
  { id: "farm", key: "pet.nav.collection", icon: LayoutGrid },
  { id: "play", key: "pet.nav.play", icon: CookieNavIcon },
  { id: "earn", key: "pet.nav.earn", icon: Gem },
  { id: "rank", key: "pet.nav.top", icon: Medal },
  { id: "wallet", key: "pet.nav.profile", icon: UserRound },
];

const ALL_TABS: Tab[] = ["lab", "farm", "play", "earn", "rank", "shop", "wallet"];
const LAB_SPACE_TABS: Tab[] = ["farm", "play", "earn", "rank", "wallet", "shop"];

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

const TELEGRAM_WALLET = {
  appName: "telegram-wallet",
  name: "Wallet",
  imageUrl: "https://wallet.tg/images/logo-288.png",
  aboutUrl: "https://wallet.tg/",
  universalLink: "https://t.me/wallet/start",
  bridgeUrl: "https://bridge.tonapi.io/bridge",
  platforms: ["ios", "android", "macos", "windows", "linux"],
};

export default function App() {
  const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;
  return (
    <TonConnectUIProvider
      manifestUrl={manifestUrl}
      restoreConnection
      walletsListConfiguration={{ includeWallets: [TELEGRAM_WALLET] }}
    >
      <LanguageProvider>
        <BootSplashGate />
      </LanguageProvider>
    </TonConnectUIProvider>
  );
}

function AppShell() {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>("lab");
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem("zoom-bgm-muted") === "1"; } catch { return false; }
  });
  const session = usePetSession();
  useGlobalInit(session.telegramId);
  const [care, setCare] = useState(() => careView());
  useEffect(() => {
    const pull = () => setCare(careView());
    const unsubCare = subscribeCare(pull);
    const unsubFarm = subscribeCrumbs(pull);
    return () => {
      unsubCare();
      unsubFarm();
    };
  }, []);

  const initialMaint = readMaintCache();
  const [maintenance, setMaintenance] = useState<MaintSnapshot>(() => (
    initialMaint?.enabled ? { enabled: true, message: initialMaint.message } : { enabled: false, message: "" }
  ));
  const [suspended, setSuspended] = useState<{ until: number; message: string } | null>(null);
  const admin = isAppAdmin();

  useEffect(() => {
    initVersionCheck();
    noteVisit();
    settleCookieWeek();
    const onShow = () => {
      if (!document.hidden) noteVisit();
    };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    void settlePetPayments();
    const onPay = () => { if (!document.hidden) void settlePetPayments(); };
    document.addEventListener("visibilitychange", onPay);
    window.addEventListener("focus", onPay);
    return () => {
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
      document.removeEventListener("visibilitychange", onPay);
      window.removeEventListener("focus", onPay);
    };
  }, []);

  useEffect(() => {
    try { localStorage.setItem("zoom-bgm-muted", muted ? "1" : "0"); } catch { /**/ }
    setChiptuneMuted(muted);
  }, [muted]);

  useEffect(() => {
    const down = (e: PointerEvent) => {
      resumeChiptune();
      const el = e.target as HTMLElement | null;
      const hit = el?.closest?.("button, a, canvas, [role='button']");
      if (!hit) return;
      hapticSoft();
      if (hit.closest(".claim-3d")) return;
      playClick();
    };
    window.addEventListener("pointerdown", down);
    return () => window.removeEventListener("pointerdown", down);
  }, []);

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

  useEffect(() => {
    const mine = getVerifiedTelegramUserId();
    if (!mine || admin) return;
    let alive = true;
    const load = async () => {
      const gate = await fetchGateStatus(mine);
      if (!alive || !gate) return;
      setSuspended(gate.suspended ? { until: gate.until, message: gate.message } : null);
    };
    void load();
    const id = window.setInterval(() => { if (!document.hidden) void load(); }, 20000);
    return () => { alive = false; window.clearInterval(id); };
  }, [admin]);

  if (maintenance.enabled && !admin) return <MaintenanceScreen message={maintenance.message} />;
  if (suspended) return <SuspendedScreen until={suspended.until} message={suspended.message} />;

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
                <LabPage active={active} telegramId={session.telegramId} onOpenShop={() => setTab("shop")} muted={muted} setMuted={setMuted} />
              )}
              {id === "farm" && <CollectionPage gram={session.gram} onPay={session.pay} telegramId={session.telegramId} onOpenShop={() => setTab("shop")} />}
              {id === "play" && <GamePage active={active} />}
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
              {id === "shop" && <ShopPage gram={session.gram} onPay={session.pay} telegramId={session.telegramId} />}
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
            const calling = item.id === "lab" && care.call && eggLeft(getPet().active) <= 0;
            return (
              <button
                key={item.id}
                className={`flex-1 flex flex-col items-center justify-center gap-1${calling ? " nav-call" : ""}`}
                onClick={() => setTab(item.id)}
                style={{ position: "relative", color: active ? "#7ad7ff" : "rgba(186, 220, 236, 0.55)", background: "transparent", border: "none" }}
              >
                <span style={{ position: "relative", display: "grid" }}>
                  <Icon size={22} strokeWidth={active ? 2.4 : 1.7} />
                  {calling ? <span className="nav-call-dot" /> : null}
                </span>
                <div style={{
                  fontSize: calling && tab !== "lab" && care.bubble ? 8 : 9,
                  fontWeight: 800,
                  letterSpacing: "0.02em",
                  whiteSpace: "nowrap",
                  color: calling && tab !== "lab" && care.bubble ? "#ffd0dc" : undefined,
                }}>
                  {calling && tab !== "lab" && care.bubble ? t(care.bubble) : t(item.key)}
                </div>
              </button>
            );
          })}
        </div>
      </nav>
      {admin && maintenance.enabled && (
        <div style={{ position: "fixed", left: 12, right: 12, bottom: 96, zIndex: 70, textAlign: "center", fontSize: 11, fontWeight: 800, color: "#ffd36a" }}>
          {t("maint.banner")}
        </div>
      )}
      <AdminPixel
        maintenanceOn={maintenance.enabled}
        maintenanceMessage={maintenance.message}
        onMaintenance={(enabled, message) => setMaintenance({ enabled, message, updatedAt: Date.now() })}
      />
      <ChristmasSnow />
      <FirstGuide onStep={(next: GuideTab) => setTab(next)} />
    </div>
  );
}
