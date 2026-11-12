import { preparePetCard } from "../utils/api";
import { translate, type Lang } from "../i18n/translations";
import { petDef } from "./catalog";
import { eggLeft, familyOf, formatLeft, readLife } from "./life";
import { kinName } from "./kin";
import { personalPetNumber, petOwnerId } from "./number";
import { getPet, xpLabel } from "./petProgress";
import { drawShareCard } from "./shareImage";
import { getTelegramViewer, getVerifiedTelegramUserId } from "../utils/telegram";

type TelegramWebApp = {
  openTelegramLink?: (link: string) => void;
  shareMessage?: (messageId: string, callback?: (sent: boolean) => void) => void;
};

function webApp(): TelegramWebApp | null {
  try {
    return (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp ?? null;
  } catch {
    return null;
  }
}

function lang(): Lang {
  try {
    const saved = localStorage.getItem("zoom-lang");
    if (saved === "it" || saved === "es" || saved === "fil" || saved === "ru" || saved === "uk" || saved === "en") return saved;
  } catch { /**/ }
  return "en";
}

export function cardFingerprint(): string {
  const pet = getPet();
  const life = readLife(pet.active);
  const who = getTelegramViewer();
  return [
    pet.active, pet.stage, pet.level, Math.floor(pet.xp),
    life.form, life.kin, life.mark ?? "", life.sex ?? "", life.road ?? "", life.generation,
    life.child?.form ?? "", life.child?.mark ?? "",
    who.name, lang(),
  ].join("|");
}

let cached: { fp: string; id: string } | null = null;
let pendingFp = "";
let ticket = 0;

/** Build the card photo and ask Telegram for a forward id, before the tap. */
export function warmPetShare() {
  const fp = cardFingerprint();
  if (cached?.fp === fp || pendingFp === fp) return;
  const telegramId = getVerifiedTelegramUserId();
  if (!telegramId) return;
  pendingFp = fp;
  const mine = ++ticket;
  void (async () => {
    const pet = getPet();
    const life = readLife(pet.active);
    const chosen = petDef(pet.active);
    const t = (key: string, vars?: Record<string, string | number>) => translate(lang(), key, vars);
    const who = (life.form === "adult" || life.form === "elder" || life.form === "ascend")
      ? kinName(familyOf(pet.active), life.kin, lang())
      : t(`life.${life.form}`);
    const title = `${personalPetNumber(petOwnerId(), pet.active)} ${chosen.name} · ${who} · ${t("life.generation", { n: life.generation })} · ${t("pet.stageLine", { s: pet.stage, l: pet.level })}`;
    const note = life.form === "egg" ? t("life.waitLeft", { time: formatLeft(eggLeft(pet.active)) }) : "";
    const shot = drawShareCard({
      playerName: getTelegramViewer().name,
      title: note ? `${title} · ${note}` : title,
      xp: xpLabel(pet),
      element: t(`pet.element.${chosen.element.id}`),
      color: chosen.element.color,
      family: familyOf(pet.active),
      form: life.form,
      kin: life.kin,
      mark: life.mark,
      sex: life.sex,
      road: life.road,
      child: life.child ? { form: life.child.form, mark: life.child.mark } : null,
    });
    if (mine !== ticket || !shot || cardFingerprint() !== fp) return;
    const messageId = await preparePetCard(telegramId, shot.image, shot.thumb);
    if (mine === ticket && messageId && cardFingerprint() === fp) cached = { fp, id: messageId };
  })().finally(() => {
    if (pendingFp === fp) pendingFp = "";
  });
}

/**
 * Open Telegram's own forward dialog with the card photo.
 * The callback is true only after the message is actually sent.
 */
export function openPetShare(onSent: (sent: boolean) => void): "ok" | "wait" | "missing" {
  const tg = webApp();
  if (!tg?.shareMessage || !getVerifiedTelegramUserId()) return "missing";
  const fp = cardFingerprint();
  const id = cached?.fp === fp ? cached.id : null;
  if (!id) {
    warmPetShare();
    return "wait";
  }
  try {
    tg.shareMessage(id, (sent) => {
      if (sent) {
        if (cached?.id === id) cached = null;
        onSent(true);
      }
    });
    return "ok";
  } catch {
    return "missing";
  }
}

/** Telegram's own chat picker. Used for the friend invite, which is still a link. */
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
