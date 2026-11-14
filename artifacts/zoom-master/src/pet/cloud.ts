import { API_BASE, apiHeaders } from "../utils/api";

/** The pet's life on our server: XP, crumbs, care and evolutions. */
const KEYS = [
  "biscotto-pet-v4",
  "biscotto-crumbs-v2",
  "biscotto-life-v2",
  "biscotto-life-archive-v1",
  "biscotto-care-v1",
  "biscotto-quests-v1",
] as const;

const STAMP = "biscotto-cloud-at";

function localBags(): Record<string, string> {
  const bags: Record<string, string> = {};
  for (const key of KEYS) {
    const value = localStorage.getItem(key);
    if (value) bags[key] = value;
  }
  return bags;
}

function applyBags(bags: Record<string, unknown>) {
  for (const key of KEYS) {
    const value = bags[key];
    if (typeof value === "string") localStorage.setItem(key, value);
  }
}

async function push(telegramId: string) {
  const save = { ...localBags(), updatedAt: Date.now() };
  const res = await fetch(`${API_BASE}/pet/save`, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify({ telegramId, save }),
    keepalive: true,
  });
  if (!res.ok) return;
  const data = await res.json() as { updatedAt?: number };
  if (data.updatedAt) localStorage.setItem(STAMP, String(data.updatedAt));
}

/** Pull a newer save, then keep sending this phone's copy. */
export async function syncPetCloud(telegramId: string) {
  if (!telegramId) return;
  let remoteAt = 0;
  let bags: Record<string, unknown> | null = null;
  try {
    const res = await fetch(`${API_BASE}/pet/save?telegramId=${encodeURIComponent(telegramId)}`, { headers: apiHeaders() });
    if (res.ok) {
      const data = await res.json() as { updatedAt?: number; bags?: Record<string, unknown> | null };
      remoteAt = Number(data.updatedAt) || 0;
      bags = data.bags ?? null;
    }
  } catch { /**/ }
  const localAt = Number(localStorage.getItem(STAMP) || 0);
  if (remoteAt > localAt && bags) {
    applyBags(bags);
    localStorage.setItem(STAMP, String(remoteAt));
    const mark = `pulled:${remoteAt}`;
    if (sessionStorage.getItem("biscotto-cloud-pulled") !== mark) {
      sessionStorage.setItem("biscotto-cloud-pulled", mark);
      window.location.reload();
      return;
    }
  }
  const send = () => { void push(telegramId).catch(() => { /**/ }); };
  send();
  const id = window.setInterval(send, 12000);
  window.addEventListener("pagehide", send);
  return () => {
    window.clearInterval(id);
    window.removeEventListener("pagehide", send);
  };
}
