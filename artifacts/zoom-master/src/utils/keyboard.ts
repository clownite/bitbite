/** Keep a text field inside the visible screen when the phone keyboard opens. */

const TEXT_INPUT = new Set(["text", "search", "email", "url", "tel", "password", "number", ""]);

type SavedStyle = {
  position: string;
  top: string;
  left: string;
  right: string;
  bottom: string;
  zIndex: string;
  width: string;
  margin: string;
};

const saved = new WeakMap<HTMLElement, SavedStyle>();
let pinned: HTMLElement | null = null;
let field: HTMLElement | null = null;

function isTextField(target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement {
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLInputElement) return TEXT_INPUT.has(target.type);
  return false;
}

function keeperOf(el: HTMLElement): HTMLElement {
  return (el.closest("form") as HTMLElement | null)
    ?? (el.closest(".pocket-card") as HTMLElement | null)
    ?? el;
}

function remember(el: HTMLElement) {
  if (saved.has(el)) return;
  saved.set(el, {
    position: el.style.position,
    top: el.style.top,
    left: el.style.left,
    right: el.style.right,
    bottom: el.style.bottom,
    zIndex: el.style.zIndex,
    width: el.style.width,
    margin: el.style.margin,
  });
}

function restore(el: HTMLElement) {
  const prev = saved.get(el);
  if (!prev) return;
  el.style.position = prev.position;
  el.style.top = prev.top;
  el.style.left = prev.left;
  el.style.right = prev.right;
  el.style.bottom = prev.bottom;
  el.style.zIndex = prev.zIndex;
  el.style.width = prev.width;
  el.style.margin = prev.margin;
  saved.delete(el);
}

/** Layout `top` that keeps the whole text block inside the visible band above the keyboard. */
export function pinnedTop(metrics: {
  offsetTop: number;
  viewHeight: number;
  fieldBottom: number;
  keeperTop: number;
  keeperBottom: number;
  gap?: number;
}): number | null {
  const gap = metrics.gap ?? 12;
  const visibleBottom = metrics.viewHeight - gap;
  const below = Math.max(0, metrics.keeperBottom - visibleBottom, metrics.fieldBottom - visibleBottom);
  const above = metrics.keeperTop < gap ? gap - metrics.keeperTop : 0;
  if (below < 1 && above < 1 && metrics.offsetTop <= 20) return null;
  return metrics.keeperTop + metrics.offsetTop + above - below;
}

function place() {
  if (!pinned || !field || !pinned.isConnected) return;
  const vv = window.visualViewport;
  if (!vv) return;
  const fieldRect = field.getBoundingClientRect();
  const keeperRect = pinned.getBoundingClientRect();
  const top = pinnedTop({
    offsetTop: vv.offsetTop,
    viewHeight: vv.height,
    fieldBottom: fieldRect.bottom,
    keeperTop: keeperRect.top,
    keeperBottom: keeperRect.bottom,
  });
  if (top == null) return;
  remember(pinned);
  pinned.style.position = "fixed";
  pinned.style.left = "12px";
  pinned.style.right = "12px";
  pinned.style.width = "auto";
  pinned.style.margin = "0";
  pinned.style.bottom = "auto";
  pinned.style.zIndex = "80";
  const minTop = vv.offsetTop + 8;
  pinned.style.top = `${Math.max(minTop, top)}px`;
}

function release() {
  if (pinned) restore(pinned);
  pinned = null;
  field = null;
}

function hold(nextField: HTMLElement) {
  const next = keeperOf(nextField);
  if (pinned && pinned !== next) restore(pinned);
  pinned = next;
  field = nextField;
  window.scrollTo(0, 0);
  place();
}

/** Follow the keyboard so the open text field stays on screen. */
export function bindKeyboard() {
  const schedule = () => {
    place();
    window.requestAnimationFrame(place);
  };
  window.visualViewport?.addEventListener("resize", schedule);
  window.visualViewport?.addEventListener("scroll", schedule);
  try {
    const webApp = (window as unknown as {
      Telegram?: { WebApp?: { onEvent?: (event: string, cb: () => void) => void } };
    }).Telegram?.WebApp;
    webApp?.onEvent?.("viewportChanged", schedule);
  } catch { /**/ }

  document.addEventListener("focusin", (event) => {
    if (!isTextField(event.target)) return;
    hold(event.target);
    window.setTimeout(schedule, 60);
    window.setTimeout(schedule, 320);
    window.setTimeout(schedule, 640);
  });

  document.addEventListener("focusout", () => {
    window.setTimeout(() => {
      const active = document.activeElement;
      if (pinned && active instanceof HTMLElement && pinned.contains(active)) {
        if (isTextField(active)) field = active;
        return;
      }
      release();
    }, 80);
  });
}
