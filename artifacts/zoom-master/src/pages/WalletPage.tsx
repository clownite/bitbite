import { useEffect, useRef, useState } from "react";
import { useTonAddress, useTonConnectUI } from "@tonconnect/ui-react";
import { KinPortrait } from "../components/KinPortrait";
import { fetchMyWithdrawals, requestCrumbsWithdrawal } from "../utils/api";
import { useT } from "../i18n/LanguageContext";
import { petDef } from "../pet/catalog";
import { kinName, type FamilyId } from "../pet/kin";
import {
  favoriteIds,
  lifeArchive,
  livingSnapshot,
  subscribeLife,
  toggleFavorite,
  type LifeArchiveEntry,
  type LifeForm,
  type LifeMark,
  type LifeSex,
  type LivingCard,
} from "../pet/life";
import { personalPetNumber, petOwnerId } from "../pet/number";
import { getPet, subscribePet, type PetState } from "../pet/petProgress";
import { getTelegramViewer } from "../utils/telegram";
import {
  CRUMB_GRAM,
  formatCrumbs,
  getCrumbs,
  markRequest,
  addCrumbs,
  rememberRequest,
  subscribeCrumbs,
  takeCrumbs,
  WITHDRAW_MIN,
  type CrumbRequest,
} from "../pet/crumbs";

interface WalletPageProps {
  telegramId: string | null;
  visible?: boolean;
}

const ADDRESS_RE = /^(EQ|UQ|kQ|0Q|Ef|Uf|kf|0f)[A-Za-z0-9_-]{46}$/;

function shortAddress(address: string): string {
  return address.length > 10 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;
}

/** Top-right of the card. Telegram Wallet stays linked after the first connect. */
function WalletConnect() {
  const { t } = useT();
  const [ui] = useTonConnectUI();
  const address = useTonAddress();
  const linked = address.length > 0;
  return (
    <button type="button" className="gb-b" data-testid="wallet-connect" onClick={() => void ui.openModal()}>
      <b>B</b>
      <span>
        {linked ? t("wallet.connected") : t("wallet.connect")}
        {linked ? <em>{shortAddress(address)}</em> : null}
      </span>
    </button>
  );
}

/** Crumbs farmed from the pet. 1 Crumb = 1 GRAM, paid only after you accept the request. */
export function WalletPage({ telegramId, visible = true }: WalletPageProps) {
  const { t, lang } = useT();
  const [balance, setBalance] = useState(getCrumbs().balance);
  const [requests, setRequests] = useState<CrumbRequest[]>(getCrumbs().requests);
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [pet, setPet] = useState<PetState>(getPet);
  const [archive, setArchive] = useState<LifeArchiveEntry[]>([]);
  const [living, setLiving] = useState<LivingCard[]>([]);
  const [favs, setFavs] = useState<string[]>([]);
  const [screenTap, setScreenTap] = useState(false);
  const [blips, setBlips] = useState<{ id: number; x: number; y: number }[]>([]);
  const blipId = useRef(0);
  const linkedAddress = useTonAddress();
  const viewer = getTelegramViewer();
  const def = petDef(pet.active);
  const number = personalPetNumber(petOwnerId(telegramId), pet.active);

  useEffect(() => {
    if (!linkedAddress) return;
    setWallet((current) => current || linkedAddress);
  }, [linkedAddress]);

  useEffect(() => subscribeCrumbs(() => {
    setBalance(getCrumbs().balance);
    setRequests(getCrumbs().requests);
  }), []);

  useEffect(() => subscribePet(() => setPet(getPet())), []);

  useEffect(() => subscribeLife(() => {
    setLiving([livingSnapshot(getPet().active)]);
    setArchive(lifeArchive());
  }), []);

  useEffect(() => {
    if (!visible) return;
    setLiving([livingSnapshot(getPet().active)]);
    setArchive(lifeArchive());
    setFavs(favoriteIds());
  }, [visible, pet.active]);

  useEffect(() => {
    if (!visible || !telegramId) return;
    let cancel = false;
    const pull = async () => {
      const rows = await fetchMyWithdrawals(telegramId);
      if (cancel) return;
      const mine = new Set(getCrumbs().requests.map((r) => r.serverId));
      for (const row of rows) {
        if (!mine.has(row.id)) continue;
        if (row.status === "paid" || row.status === "rejected") markRequest(row.id, row.status);
      }
    };
    void pull();
    const id = window.setInterval(() => void pull(), 20000);
    return () => {
      cancel = true;
      window.clearInterval(id);
    };
  }, [visible, telegramId]);

  const submit = async () => {
    const n = Math.floor(Number(amount));
    const addr = wallet.trim();
    if (!telegramId) {
      setNote(t("wallet.note.telegram"));
      return;
    }
    if (!Number.isFinite(n) || n < WITHDRAW_MIN) {
      setNote(t("wallet.note.min", { n: WITHDRAW_MIN }));
      return;
    }
    if (n > getCrumbs().balance) {
      setNote(t("wallet.note.funds"));
      return;
    }
    if (!ADDRESS_RE.test(addr) && !/^-?\d+:[0-9a-fA-F]{64}$/.test(addr)) {
      setNote(t("wallet.note.address"));
      return;
    }
    if (getCrumbs().requests.some((r) => r.status === "pending")) {
      setNote(t("wallet.note.one"));
      return;
    }
    setBusy(true);
    const localId = `${Date.now()}`;
    if (!takeCrumbs(n)) {
      setBusy(false);
      setNote(t("wallet.note.funds"));
      return;
    }
    const res = await requestCrumbsWithdrawal({ telegramId, amount: n, walletAddress: addr });
    if (!res.ok || !res.id) {
      addCrumbs(n);
      setBusy(false);
      setNote(res.error || t("wallet.note.back"));
      return;
    }
    rememberRequest({ localId, serverId: res.id, amount: n, wallet: addr, status: "pending", createdAt: Date.now() });
    setAmount("");
    setBusy(false);
    setNote(t("wallet.note.sent"));
  };

  const pinned = new Set(favs);
  const board = [...archive].sort((a, b) => {
    const ap = pinned.has(a.id) ? 1 : 0;
    const bp = pinned.has(b.id) ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return b.passedAt - a.passedAt;
  });
  const you = viewer.name === "You" ? t("wallet.you") : viewer.name;

  return (
    <div className="profile-page">
      <header className="profile-head">
        <div>
          <div className="profile-kicker">{t("wallet.booklet")}</div>
          <h2>{you}</h2>
        </div>
        <span className="profile-tag">{number}</span>
      </header>

      <section className="gb" data-testid="crumb-bank">
        <div className="gb-shell">
          <div className="gb-top">
            <span>BITBITE</span>
            <span className="gb-dots" aria-hidden="true"><i /><i /><i /></span>
          </div>
          <button
            type="button"
            className={screenTap ? "gb-screen is-tap" : "gb-screen"}
            data-testid="gb-screen"
            aria-label={t("wallet.screen")}
            onPointerDown={(event) => {
              const box = event.currentTarget.getBoundingClientRect();
              const id = blipId.current + 1;
              blipId.current = id;
              setBlips((list) => [...list, { id, x: event.clientX - box.left, y: event.clientY - box.top }].slice(-6));
              setScreenTap(true);
              window.setTimeout(() => setScreenTap(false), 90);
              window.setTimeout(() => setBlips((list) => list.filter((blip) => blip.id !== id)), 460);
            }}
          >
            <p className="gb-label">{t("wallet.crumbs")}</p>
            <p className="gb-amount">{formatCrumbs(balance)}</p>
            <p className="gb-sub">{formatCrumbs(balance * CRUMB_GRAM)} GRAM</p>
            <p className="gb-line">{t("wallet.keeps", { name: def.name, crumbs: formatCrumbs(balance) })}</p>
            <p className="gb-who">{def.element.glyph} {def.name} · {t("pet.stageShort", { s: pet.stage, l: pet.level })}</p>
            {blips.map((blip) => (
              <i key={blip.id} className="gb-blip" style={{ left: blip.x, top: blip.y }} aria-hidden />
            ))}
          </button>
          <div className="gb-pad">
            <button type="button" className="gb-a" data-testid="open-pocket" onClick={() => setOpen(true)}>
              <b>A</b>
              <span>{t("wallet.seal")}</span>
            </button>
            <WalletConnect />
          </div>
          {requests.length > 0 && (
            <ul className="gb-log">
              {requests.map((r) => (
                <li key={r.localId} className={`is-${r.status}`}>
                  <strong>{r.amount}</strong>
                  <span>{t(`wallet.${r.status}`)}</span>
                  <em>{r.wallet}</em>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="hall" data-testid="pet-hall">
        <header className="hall-head">
          <p>{t("hall.kicker")}</p>
          <h3>{t("hall.title")}</h3>
        </header>

        <div className="hall-grid">
          {living.map((card) => {
            const grown = card.form === "adult" || card.form === "elder" || card.form === "ascend";
            const on = pinned.has(card.id);
            return (
              <HallCard
                key={card.id}
                order={on ? 0 : 1}
                pinned={on}
                onPin={() => setFavs(toggleFavorite(card.id))}
                live
                family={card.family}
                form={grown ? "adult" : card.form}
                kin={card.kin}
                mark={card.mark}
                title={grown ? kinName(card.family, card.kin, lang) : petDef(card.petId).name}
                line={t("hall.now")}
                note={`${t("hall.age", { n: card.years })} · ${t("hall.gen", { n: card.generation })}`}
                givenName={card.givenName}
                sex={card.sex}
                bornAt={card.bornAt}
                passedAt={0}
                years={card.years}
                owner={you}
              />
            );
          })}
          {board.map((card, index) => {
            const on = pinned.has(card.id);
            return (
              <HallCard
                key={card.id}
                order={on ? 0 : index + 2}
                pinned={on}
                onPin={() => setFavs(toggleFavorite(card.id))}
                family={card.family}
                form="adult"
                kin={card.kin}
                mark={card.mark}
                title={kinName(card.family, card.kin, lang)}
                line={card.happy ? t("hall.happy") : t("hall.wild")}
                lineClass={card.happy ? "is-happy" : "is-wild"}
                note={`${t("hall.age", { n: card.years })} · ${t("hall.gen", { n: card.generation })}`}
                givenName={card.givenName}
                sex={card.sex}
                bornAt={card.bornAt}
                passedAt={card.passedAt}
                years={card.years}
                owner={you}
              />
            );
          })}
        </div>
        {board.length === 0 ? <p className="hall-empty">{t("hall.empty")}</p> : null}
      </section>

      {open ? (
        <div className="pocket" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="pocket-card"
            role="dialog"
            aria-modal="true"
            aria-label={t("wallet.pocket")}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pocket-top">
              <strong>{t("wallet.pocket")}</strong>
              <button type="button" onClick={() => setOpen(false)}>{t("wallet.close")}</button>
            </div>
            <p>{t("wallet.min", { n: WITHDRAW_MIN })} · {formatCrumbs(balance)} Crumbs</p>
            <input
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              placeholder={t("wallet.amountPh", { n: WITHDRAW_MIN })}
            />
            <input
              value={wallet}
              onChange={(e) => setWallet(e.target.value.trim())}
              placeholder={t("wallet.addressPh")}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <button type="button" className="pocket-go" disabled={busy} onClick={() => void submit()}>
              {busy ? "…" : t("wallet.request")}
            </button>
            {note ? <div className="pocket-note">{note}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PixelHeart() {
  return (
    <svg viewBox="0 0 7 6" aria-hidden="true">
      <rect x="1" y="0" width="2" height="1" />
      <rect x="4" y="0" width="2" height="1" />
      <rect x="0" y="1" width="7" height="2" />
      <rect x="1" y="3" width="5" height="1" />
      <rect x="2" y="4" width="3" height="1" />
      <rect x="3" y="5" width="1" height="1" />
    </svg>
  );
}

function dayStamp(ms: number, lang: string): string {
  if (!ms) return "—";
  const locale = lang === "fil" ? "en" : lang;
  try {
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(ms));
  } catch {
    return "—";
  }
}

function HallCard({
  order,
  pinned,
  onPin,
  live = false,
  family,
  form,
  kin,
  mark,
  title,
  line,
  lineClass,
  note,
  givenName,
  sex,
  bornAt,
  passedAt,
  years,
  owner,
}: {
  order: number;
  pinned: boolean;
  onPin: () => void;
  live?: boolean;
  family: FamilyId;
  form: LifeForm;
  kin: number;
  mark: LifeMark | null;
  title: string;
  line: string;
  lineClass?: string;
  note: string;
  givenName: string;
  sex: LifeSex | null;
  bornAt: number;
  passedAt: number;
  years: number;
  owner: string;
}) {
  const { t, lang } = useT();
  const [flip, setFlip] = useState(false);
  const girl = sex === "girl";
  const shown = givenName || title;
  return (
    <article
      className={`hall-card${live ? " is-live" : ""}${pinned ? " is-pin" : ""}${flip ? " is-flip" : ""}`}
      style={{ order }}
      data-testid="hall-card"
      data-flip={flip ? "back" : "front"}
    >
      <button
        type="button"
        className={`hall-heart${pinned ? " is-on" : ""}`}
        aria-pressed={pinned}
        aria-label={pinned ? t("hall.unpin") : t("hall.pin")}
        onClick={onPin}
      >
        <PixelHeart />
      </button>
      <button
        type="button"
        className="hall-flip"
        aria-pressed={flip}
        aria-label={t("id.flip")}
        onClick={() => setFlip((on) => !on)}
      >
        <div className="hall-flip-inner">
          <div className="hall-face" aria-hidden={flip}>
            <div className="hall-frame">
              <KinPortrait family={family} form={form} kin={kin} mark={mark} />
            </div>
            <div className="hall-copy">
              <strong>{shown}</strong>
              <span className={lineClass}>{givenName ? title : line}</span>
              <em>{note}</em>
            </div>
          </div>
          <div className="hall-face is-back" aria-hidden={!flip}>
            <strong className="id-name">{shown}</strong>
            <p className="id-line">{t("id.owner")} · {owner}</p>
            <p className="id-line">{sex === "girl" ? "F" : sex === "boy" ? "M" : "—"}</p>
            <p className="id-line">{t(girl ? "id.bornF" : "id.born")} · {dayStamp(bornAt, lang)}</p>
            <p className="id-line">
              {live ? t("id.alive") : `${t(girl ? "id.diedF" : "id.died")} · ${dayStamp(passedAt, lang)}`}
            </p>
            <p className="id-line">{t("hall.age", { n: years })}</p>
            <p className="id-line">{t(girl ? "id.bornInF" : "id.bornIn")}</p>
            <p className="id-line">{t(girl ? "id.grewF" : "id.grew")}</p>
          </div>
        </div>
      </button>
    </article>
  );
}
