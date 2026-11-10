/** Share stays inside Telegram: a story, or a chat. The phone sheet is not used. */

type StoryParams = {
  text?: string;
  widget_link?: { url: string; name?: string };
};

type TelegramWebApp = {
  openTelegramLink?: (link: string) => void;
  shareToStory?: (mediaUrl: string, params?: StoryParams) => void;
};

function webApp(): TelegramWebApp | null {
  try {
    return (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp ?? null;
  } catch {
    return null;
  }
}

/** Telegram's own chat picker. It does not offer WhatsApp or the other phone apps. */
export function telegramChatLink(text: string, url: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export function openTelegramChat(text: string, url: string) {
  const link = telegramChatLink(text, url);
  const tg = webApp();
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(link);
    return;
  }
  window.location.assign(link);
}

/**
 * The story editor inside Telegram. mediaUrl has to be a public https image;
 * until the card is hosted, the story opens on the invite link only from Telegram.
 */
export function openTelegramStory(text: string, pageUrl: string, mediaUrl?: string) {
  const tg = webApp();
  const media = mediaUrl && mediaUrl.startsWith("https://") ? mediaUrl : "";
  if (tg?.shareToStory && media) {
    tg.shareToStory(media, {
      text: text.slice(0, 200),
      widget_link: { url: pageUrl, name: "Zoom" },
    });
    return;
  }
  openTelegramChat(text, pageUrl);
}
