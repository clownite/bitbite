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
export type TelegramViewer = {
  id: string | null;
  name: string;
  username: string;
  photoUrl: string | null;
};

/** Name and @username from the open Mini App, when Telegram provides them. */
export function getTelegramViewer(): TelegramViewer {
  try {
    const user = (window as unknown as {
      Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id?: number; first_name?: string; username?: string; photo_url?: string } } } };
    }).Telegram?.WebApp?.initDataUnsafe?.user;
    const name = typeof user?.first_name === "string" ? user.first_name.trim() : "";
    const username = typeof user?.username === "string" ? user.username.trim() : "";
    return {
      id: user?.id != null ? String(user.id) : null,
      name: name || "You",
      username: username ? `@${username}` : "",
      photoUrl: typeof user?.photo_url === "string" ? user.photo_url : null,
    };
  } catch {
    return { id: null, name: "You", username: "", photoUrl: null };
  }
}

export function getBrowserDevTelegramId(): string | null {
  if (getVerifiedTelegramUserId() !== null) return null;
  if (!import.meta.env.DEV) return null;
  const fromEnv = import.meta.env.VITE_DEV_TELEGRAM_ID as string | undefined;
  if (fromEnv && /^\d{5,12}$/.test(fromEnv.trim())) return fromEnv.trim();
  return null;
}
