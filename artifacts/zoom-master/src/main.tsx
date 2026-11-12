import { createRoot } from "react-dom/client";
import { preloadPetModel } from "./pet/petModel";
import App from "./App";
import "./index.css";
import { primeChiptune } from "./audio/chiptune";
import { hapticSoft } from "./utils/haptic";
import { bindKeyboard } from "./utils/keyboard";
import { BootErrorBoundary } from "./components/BootErrorBoundary";

function configureTelegramViewport() {
  try {
    const webApp = (window as unknown as {
      Telegram?: {
        WebApp?: {
          ready?: () => void;
          expand?: () => void;
          exitFullscreen?: () => void;
          setHeaderColor?: (color: string) => void;
          setBackgroundColor?: (color: string) => void;
          setBottomBarColor?: (color: string) => void;
          enableVerticalSwipes?: () => void;
          version?: string;
          onEvent?: (event: string, cb: () => void) => void;
        };
      };
    }).Telegram?.WebApp;
    if (!webApp) return;

    webApp.setHeaderColor?.("#000000");
    webApp.setBackgroundColor?.("#000000");
    webApp.setBottomBarColor?.("#000000");
    // Stay in the normal Mini App sheet. Fullscreen and locked swipes
    // stop the user from dragging it down and leaving it running.
    webApp.exitFullscreen?.();
    webApp.enableVerticalSwipes?.();
    webApp.expand?.();
    webApp.ready?.();
  } catch { /**/ }
}

configureTelegramViewport();
bindKeyboard();
(window as unknown as { __primeZoomAudio?: () => void }).__primeZoomAudio = () => {
  primeChiptune();
};
if ((window as unknown as { __zoomWantMusic?: boolean }).__zoomWantMusic) primeChiptune();
preloadPetModel();

const SCROLL_TAGS = new Set(["HTML", "BODY"]);
const SCROLL_CLASSES = ["overflow-y-auto", "overflow-auto", "overflow-x-auto"];

function isScrollContainer(el: Element): boolean {
  if (SCROLL_TAGS.has(el.tagName)) return false;
  const cls = el.className ?? "";
  if (typeof cls === "string" && SCROLL_CLASSES.some((c) => cls.includes(c))) return true;
  const style = window.getComputedStyle(el);
  return style.overflowY === "auto" || style.overflowY === "scroll";
}

// Soft haptic on real taps (buttons, cards, canvas thumbs). Skip scrolls/swipes
// and typing. Canvas is included so Farm/Market/studio taps buzz; Lab START BUILD
// and Auto Tap opt out with data-no-global-haptic because they call their own haptic.
const NO_HAPTIC_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);
const TAP_MAX_MOVE = 22;
const TAP_MAX_MS = 700;
const INTERACTIVE_SEL =
  "button, a, [role='button'], [role='tab'], [role='menuitem'], summary, label, input[type='button'], input[type='submit'], input[type='checkbox'], input[type='radio']";

function shouldSkipGlobalHaptic(target: Element | null): boolean {
  if (!target) return false;
  const el = target as HTMLElement;
  if (NO_HAPTIC_TAGS.has(el.tagName)) return true;
  if (el.isContentEditable) return true;
  if (el.closest("[data-no-global-haptic]")) return true;
  return false;
}

function isInteractiveTap(target: Element | null): boolean {
  if (!target) return false;
  return !!(target as HTMLElement).closest(INTERACTIVE_SEL);
}

let pStartX = 0;
let pStartY = 0;
let pStartT = 0;
let pMoved = false;
let pDown = false;
let pBuzzed = false;

document.addEventListener(
  "pointerdown",
  (e: PointerEvent) => {
    if (!e.isPrimary) return;
    pStartX = e.clientX;
    pStartY = e.clientY;
    pStartT = Date.now();
    pMoved = false;
    pDown = true;
    pBuzzed = false;
    const target = e.target as Element | null;
    if (shouldSkipGlobalHaptic(target)) return;
    if (!isInteractiveTap(target)) return;
    pBuzzed = true;
    hapticSoft();
  },
  { passive: true },
);

document.addEventListener(
  "pointermove",
  (e: PointerEvent) => {
    if (!pDown || pMoved || !e.isPrimary) return;
    if (
      Math.abs(e.clientX - pStartX) > TAP_MAX_MOVE ||
      Math.abs(e.clientY - pStartY) > TAP_MAX_MOVE
    ) {
      pMoved = true;
    }
  },
  { passive: true },
);

document.addEventListener(
  "pointerup",
  (e: PointerEvent) => {
    if (!pDown || !e.isPrimary) return;
    pDown = false;
    if (pBuzzed || pMoved) return;
    if (Date.now() - pStartT > TAP_MAX_MS) return;
    const target = e.target as Element | null;
    if (shouldSkipGlobalHaptic(target)) return;
    hapticSoft();
  },
  { passive: true },
);

document.addEventListener(
  "pointercancel",
  (e: PointerEvent) => {
    if (!e.isPrimary) return;
    pDown = false;
  },
  { passive: true },
);

try {
  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("Missing #root element");
  createRoot(rootEl).render(
    <BootErrorBoundary>
      <App />
    </BootErrorBoundary>,
  );
  (window as unknown as { __zoomReactBooted?: boolean }).__zoomReactBooted = true;
} catch (err) {
  console.error("[boot] React mount failed:", err);
  try {
    (window as unknown as { __hideHtmlSplash?: () => void }).__hideHtmlSplash?.();
    const rootEl = document.getElementById("root");
    if (rootEl) {
      rootEl.innerHTML =
        '<div style="min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;background:#060810;color:#e0e6ff;font-family:system-ui,sans-serif;text-align:center">' +
        '<div style="font-size:17px;font-weight:800">Errore di avvio</div>' +
        '<div style="font-size:13px;color:rgba(255,255,255,0.55)">Chiudi e riapri da Telegram</div>' +
        '<button type="button" onclick="location.reload()" style="margin-top:8px;padding:12px 24px;border-radius:999px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.08);color:#fff;font-weight:700">Riprova</button>' +
        "</div>";
    }
  } catch { /**/ }
}

