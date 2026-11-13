import { useEffect, useState } from "react";
import House from "lucide-react/dist/esm/icons/house.js";
import LayoutGrid from "lucide-react/dist/esm/icons/layout-grid.js";
import Play from "lucide-react/dist/esm/icons/play.js";
import Gem from "lucide-react/dist/esm/icons/gem.js";
import Medal from "lucide-react/dist/esm/icons/medal.js";
import UserRound from "lucide-react/dist/esm/icons/user-round.js";
import { GamePage } from "./pages/GamePage";
import { settleCookieWeek } from "./pet/cookieBoard";
import { usePetSession } from "./hooks/usePetSession";
import { useGlobalInit } from "./store/globalStore";
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
import { playClick, playNo } from "./audio/sfx";
import { settlePetPayments } from "./pet/payPet";
import { resumeChiptune, setChiptuneMuted } from "./audio/chiptune";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { careView, subscribeCare } from "./pet/care";
import { eggLeft } from "./pet/life";
import { getPet } from "./pet/petProgress";
import { noteHumanGesture } from "./pet/human";
import { subscribeCrumbs } from "./pet/crumbs";
import { SettingsMenu } from "./components/SettingsMenu";

type MaintSnapshot = { enabled: boolean; message: string; updatedAt?: number };
type Tab = "lab" | "farm" | "play" | "earn" | "rank" | "shop" | "wallet";

const NAV: { id: Tab; key: string; icon: typeof House }[] = [
  { id: "lab", key: "pet.nav.home", icon: House },
  { id: "farm", key: "pet.nav.collection", icon: LayoutGrid },
  { id: "play", key: "pet.nav.play", icon: Play },
  { id: "earn", key: "pet.nav.earn", icon: Gem },
  { id: "rank", key: "pet.nav.top", icon: Medal },
  { id: "wallet", key: "pet.nav.profile", icon: UserRound },
];

const ALL_TABS: Tab[] = ["lab", "farm", "play", "earn", "rank", "shop", "wallet"];

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

type EntryLock =
  | { kind: "maintenance"; message: string }
  | { kind: "suspended"; until: number; message: string };

function cookieTapped(): boolean {
  try {
    const w = window as unknown as { __zoomCookieTapped?: boolean; __zoomSplashFinished?: boolean };
    if (w.__zoomCookieTapped || w.__zoomSplashFinished) return true;
  } catch { /**/ }
  return !document.getElementById("splash-screen");
}

function readEntryLock(): EntryLock | null {
  if (isAppAdmin()) return null;
  const maint = readMaintCache();
  if (maint?.enabled) return { kind: "maintenance", message: maint.message };
  try {
    const raw = localStorage.getItem("zoom-gate-cached");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { until?: number; message?: string };
    const until = Number(parsed.until) || 0;
    if (until > Date.now()) return { kind: "suspended", until, message: parsed.message || "" };
  } catch { /**/ }
  return null;
}

function rememberEntry(status: { enabled: boolean; message: string; updatedAt?: number } | null, lock: EntryLock | null) {
  try {
    if (status) {
      localStorage.setItem("zoom-maint-cached", JSON.stringify({
        enabled: status.enabled,
        message: status.message || "",
        updatedAt: status.updatedAt,
      }));
    }
    if (lock?.kind === "suspended") localStorage.setItem("zoom-gate-cached", JSON.stringify(lock));
    else localStorage.removeItem("zoom-gate-cached");
  } catch { /**/ }
}

/** The cookie stays up until we know. A locked player never gets a frame of the game. */
function BootSplashGate() {
  const [tapped, setTapped] = useState(cookieTapped);
  const [checked, setChecked] = useState(false);
  const [lock, setLock] = useState<EntryLock | null>(readEntryLock);

  useEffect(() => {
    if (tapped) return;
    const id = window.setInterval(() => {
      if (cookieTapped()) setTapped(true);
    }, 40);
    return () => window.clearInterval(id);
  }, [tapped]);

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      const admin = isAppAdmin();
      const mine = getVerifiedTelegramUserId();
      const [status, gate] = await Promise.all([
        fetchMaintenanceStatus(),
        !admin && mine ? fetchGateStatus(mine) : Promise.resolve(null),
      ]);
      if (!alive) return;
      let next: EntryLock | null = null;
      if (status?.enabled && !admin) next = { kind: "maintenance", message: status.message || "" };
      else if (gate?.suspended) next = { kind: "suspended", until: gate.until, message: gate.message || "" };
      setLock(next);
      setChecked(true);
      rememberEntry(status, next);
    };
    void pull();
    const id = window.setInterval(() => { if (!document.hidden) void pull(); }, 15000);
    return () => { alive = false; window.clearInterval(id); };
  }, []);

  if (!tapped) return null;
  if (!checked && !lock) return null;
  if (lock?.kind === "maintenance") return <MaintenanceScreen message={lock.message} />;
  if (lock?.kind === "suspended") return <SuspendedScreen until={lock.until} message={lock.message} />;
  if (!checked) return null;
  return <EnterGame />;
}

function EnterGame() {
  useEffect(() => { hideHtmlSplash(); }, []);
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
  const [gear, setGear] = useState(0);
  const [held, setHeld] = useState<string | null>(null);
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
      noteHumanGesture(e.isTrusted);
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

  const press = (id: string, fn: () => void) => {
    setHeld(id);
    window.setTimeout(() => setHeld((cur) => (cur === id ? null : cur)), 160);
    fn();
  };
  const stepTab = (dir: number) => {
    const ids = NAV.map((item) => item.id);
    const at = ids.indexOf(tab as typeof ids[number]);
    const from = at < 0 ? 0 : at;
    setTab(ids[(from + dir + ids.length) % ids.length]);
    playClick();
  };

  if (maintenance.enabled && !admin) return <MaintenanceScreen message={maintenance.message} />;
  if (suspended) return <SuspendedScreen until={suspended.until} message={suspended.message} />;

  return (
    <div
      className={`gb-app tab-${tab} flex flex-col overflow-hidden relative${tab === "wallet" ? " is-profile" : ""}`}
      style={{
        height: "var(--tg-viewport-stable-height, 100dvh)",
        paddingTop: "calc(max(var(--tg-safe-area-inset-top, 0px), env(safe-area-inset-top, 0px)) + var(--tg-content-safe-area-inset-top, 0px))",
        paddingBottom: "calc(max(var(--tg-safe-area-inset-bottom, 0px), env(safe-area-inset-bottom, 0px)) + var(--tg-content-safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="gb-bezel">
        <TelegramIdentity />
        <SettingsMenu muted={muted} setMuted={setMuted} headerButton openToken={gear} />
      </div>

      <main className="gb-lcd flex flex-col flex-1 overflow-hidden relative z-10" style={{ minHeight: 0 }}>
        <div className="relative flex-1 min-h-0">
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
        </div>
        <nav className="gb-nav is-in-screen flex-shrink-0 relative z-20">
          <div className="flex h-full">
            {NAV.map((item) => {
              const active = tab === item.id;
              const Icon = item.icon;
              const calling = item.id === "lab" && care.call && eggLeft(getPet().active) <= 0;
              return (
                <button
                  key={item.id}
                  className={`gb-nav-btn flex-1 flex flex-col items-center justify-center gap-1${active ? " is-on" : ""}${calling ? " nav-call" : ""}`}
                  onClick={() => setTab(item.id)}
                >
                  <span className="gb-nav-ico">
                    <Icon size={18} strokeWidth={2.4} />
                    {calling ? <span className="nav-call-dot" /> : null}
                  </span>
                  <div style={{
                    fontSize: calling && tab !== "lab" && care.bubble ? 8 : 9,
                    fontWeight: 800,
                    letterSpacing: "0.02em",
                    whiteSpace: "nowrap",
                    color: calling && tab !== "lab" && care.bubble ? "#1c3a0c" : undefined,
                  }}>
                    {calling && tab !== "lab" && care.bubble ? t(care.bubble) : t(item.key)}
                  </div>
                </button>
              );
            })}
          </div>
        </nav>
      </main>

      <div className="gb-console flex-shrink-0">
        <div className={`gb-dpad${held === "up" ? " is-up" : ""}${held === "down" ? " is-down" : ""}${held === "left" ? " is-left" : ""}${held === "right" ? " is-right" : ""}`}>
          <i /><i /><b />
          <button type="button" className="gb-dir is-up" aria-label="Up" onClick={() => press("up", () => stepTab(-1))} />
          <button type="button" className="gb-dir is-down" aria-label="Down" onClick={() => press("down", () => stepTab(1))} />
          <button type="button" className="gb-dir is-left" aria-label="Left" onClick={() => press("left", () => stepTab(-1))} />
          <button type="button" className="gb-dir is-right" aria-label="Right" onClick={() => press("right", () => stepTab(1))} />
        </div>
        <div className="gb-pills">
          <button type="button" className={held === "select" ? "is-down" : ""} aria-label="Select" onClick={() => press("select", () => setGear((n) => n + 1))} />
          <button type="button" className={held === "start" ? "is-down" : ""} aria-label="Start" onClick={() => press("start", () => setTab("shop"))} />
        </div>
        <div className="gb-face">
          <button type="button" className={`gb-console-b${held === "b" ? " is-down" : ""}`} aria-label="B" onClick={() => press("b", () => playNo(0))} />
          <button type="button" className={`gb-console-a${held === "a" ? " is-down" : ""}`} aria-label="A" onPointerDown={(event) => { if (event.button !== 0) return; press("a", () => { if (tab !== "lab") return; noteHumanGesture(true); window.dispatchEvent(new Event("zoom-home-claim")); }); }} />
        </div>
        <div className="gb-speaker"><i /><i /><i /></div>
      </div>
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
