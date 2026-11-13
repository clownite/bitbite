let last = 0;

type TapEvent = {
  button?: number;
  preventDefault?: () => void;
};

/** One finger press. Touch and pointer both call this, so the second one is ignored. */
export function runTap(event: TapEvent, fn: () => void) {
  if (typeof event.button === "number" && event.button > 0) return;
  const now = performance.now();
  if (now - last < 90) return;
  last = now;
  try { event.preventDefault?.(); } catch { /**/ }
  fn();
}
