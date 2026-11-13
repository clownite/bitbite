/* eslint-disable @typescript-eslint/no-explicit-any */

let lastHapticAt = 0;
let pairUntil = 0;
const HAPTIC_GAP_MS = 40;
/** Two pulses, then a breath, so a new tap does not pile onto the pair. */
const PAIR_MS = 78;
/** The second pulse sits right against the first. */
const PAIR_GAP_MS = 32;

function tooSoon() {
  const now = performance.now();
  if (now - lastHapticAt < HAPTIC_GAP_MS) return true;
  lastHapticAt = now;
  return false;
}

function tgHaptic() {
  return (window as any)?.Telegram?.WebApp?.HapticFeedback ?? null;
}

function vibrateMs(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch { /**/ }
}

function impact(style: "light" | "medium" | "heavy") {
  if (tooSoon()) return;
  const hf = tgHaptic();
  if (hf) {
    try { hf.selectionChanged?.(); } catch { /**/ }
    try { hf.impactOccurred(style); } catch { /**/ }
  }
  vibrateMs(style === "light" ? 8 : style === "medium" ? 16 : 26);
}

function softOnce() {
  const hf = tgHaptic();
  if (!hf) return false;
  try {
    hf.impactOccurred("soft");
    return true;
  } catch { /**/ }
  try {
    hf.impactOccurred("light");
    return true;
  } catch { /**/ }
  return false;
}

/** One soft pulse. The Game Boy keys use this instead of a click. */
export function hapticCalm() {
  const now = performance.now();
  if (now < pairUntil) return;
  pairUntil = now + 240;
  lastHapticAt = now;
  const hf = tgHaptic();
  if (hf) {
    try {
      hf.impactOccurred("soft");
      return;
    } catch { /**/ }
    try {
      hf.impactOccurred("light");
      return;
    } catch { /**/ }
  }
  try {
    navigator.vibrate?.(22);
  } catch { /**/ }
}

/** Two soft pulses, close together, like a light double tap on the fingertip. */
export function hapticSoft() {
  const now = performance.now();
  if (now < pairUntil) return;
  pairUntil = now + PAIR_MS;
  lastHapticAt = now;
  if (softOnce()) {
    window.setTimeout(softOnce, PAIR_GAP_MS);
    return;
  }
  try {
    navigator.vibrate?.([8, 18, 8]);
  } catch { /**/ }
}

export function hapticLight() {
  try { impact("light"); } catch { /**/ }
}

export function haptic(input: number | "light" | "medium" | "heavy" = "medium") {
  try {
    let style: "light" | "medium" | "heavy";
    if (typeof input === "number") {
      style = input <= 5 ? "light" : input <= 10 ? "medium" : "heavy";
    } else {
      style = input;
    }
    impact(style);
  } catch { /**/ }
}
