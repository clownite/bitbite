/** True when Telegram WebApp initData includes a verified user id (real Mini App session). */
export function getVerifiedTelegramUserId(): string | null {
  try {
    const id = (window as unknown as {
      Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id?: number } } } };
    }).Telegram?.WebApp?.initDataUnsafe?.user?.id;
    return id != null ? String(id) : null;
  } catch {
    return null;
  }
}

export function isBrowserDevSession(): boolean {
  return getVerifiedTelegramUserId() === null;
}

export const DEV_TG_ID_STORAGE_KEY = "zoom-dev-tg-id";
/** Last verified Mini App user — reused only after Telegram itself provided the id. */
export const TELEGRAM_ID_STORAGE_KEY = "zoom-telegram-id";

export function persistTelegramId(id: string) {
  if (!/^\d{5,12}$/.test(id)) return;
  try {
    localStorage.setItem(TELEGRAM_ID_STORAGE_KEY, id);
  } catch { /**/ }
}

/**
 * Outside Telegram there is no identity. A page address or saved value
 * cannot choose who you are. Local dev may set VITE_DEV_TELEGRAM_ID.
 */
export function getBrowserDevTelegramId(): string | null {
  if (getVerifiedTelegramUserId() !== null) return null;
  if (!import.meta.env.DEV) return null;
  const fromEnv = import.meta.env.VITE_DEV_TELEGRAM_ID as string | undefined;
  if (fromEnv && /^\d{5,12}$/.test(fromEnv.trim())) return fromEnv.trim();
  return null;
}
