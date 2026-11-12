let lastGesture = 0;
let burst = 0;
let burstStart = 0;
let quietUntil = 0;

/** A real finger press. Synthetic clicks and click-scripts do not count. */
export function noteHumanGesture(trusted: boolean, now = Date.now()) {
  if (!trusted) return;
  if (now < quietUntil) return;
  if (now - burstStart > 3000) {
    burstStart = now;
    burst = 0;
  }
  burst += 1;
  if (burst > 24) {
    quietUntil = now + 10_000;
    lastGesture = 0;
    return;
  }
  lastGesture = now;
}

/** True only just after a real press. Blocks scripted calls to tap and claim. */
export function humanJustTouched(now = Date.now()): boolean {
  return now >= quietUntil && now - lastGesture < 2000;
}
