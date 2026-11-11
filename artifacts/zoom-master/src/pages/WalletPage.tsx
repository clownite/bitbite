import { useEffect, useState, type CSSProperties } from "react";
import { useTonAddress, useTonConnectUI } from "@tonconnect/ui-react";
import { PixelBankCard } from "../components/PixelBankCard";
import { fetchMyWithdrawals, requestCrumbsWithdrawal } from "../utils/api";
import { useT } from "../i18n/LanguageContext";
import { petDef } from "../pet/catalog";
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
    <button
      type="button"
      data-testid="wallet-connect"
      onClick={() => void ui.openModal()}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 2,
        padding: "8px 12px",
        borderRadius: 14,
        border: "1px solid rgba(122,215,255,0.55)",
        background: "rgba(8, 24, 36, 0.92)",
        color: "#e8f7ff",
        boxShadow: "0 0 16px rgba(122,215,255,0.28)",
        cursor: "pointer",
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.12em" }}>
        {linked ? t("wallet.connected") : t("wallet.connect")}
      </span>
      {linked ? <span style={{ fontSize: 10, fontWeight: 700, color: "#7ad7ff" }}>{shortAddress(address)}</span> : null}
    </button>
  );
}

/** Crumbs farmed from the pet. 1 Crumb = 1 GRAM, paid only after you accept the request. */
export function WalletPage({ telegramId, visible = true }: WalletPageProps) {
  const { t } = useT();
  const [balance, setBalance] = useState(getCrumbs().balance);
  const [requests, setRequests] = useState<CrumbRequest[]>(getCrumbs().requests);
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [pet, setPet] = useState<PetState>(getPet);
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

  return (
    <div className="profile-page">
      <header className="profile-head">
        <div>
          <div className="profile-kicker">{t("wallet.booklet")}</div>
          <h2>{number} {def.name}</h2>
        </div>
        <WalletConnect />
      </header>

      <PixelBankCard crumbs={formatCrumbs(balance)} />

      <article className="libretto" style={{ "--ink": def.element.color } as CSSProperties}>
        <div className="libretto-stitch" />
        <div className="libretto-page">
          <span>{t("wallet.you")}</span>
          <strong>{viewer.name === "You" ? t("wallet.you") : viewer.name}</strong>
          {viewer.username ? <em>{viewer.username}</em> : null}
        </div>
        <div className="libretto-page">
          <span>{t("wallet.yourPet")}</span>
          <strong>{def.element.glyph} {def.name}</strong>
          <em>{t(`pet.element.${def.element.id}`)} · {t("pet.stageShort", { s: pet.stage, l: pet.level })}</em>
        </div>
        <p className="libretto-line">{t("wallet.keeps", { name: def.name, crumbs: formatCrumbs(balance) })}</p>
        <p className="libretto-gram">{formatCrumbs(balance * CRUMB_GRAM)} GRAM</p>
        <button type="button" className="libretto-seal" data-testid="open-pocket" onClick={() => setOpen(true)}>
          {t("wallet.seal")}
        </button>
      </article>

      {requests.length > 0 && (
        <section className="libretto-tickets">
          {requests.map((r) => (
            <div key={r.localId} className={`libretto-ticket is-${r.status}`}>
              <div>
                <strong>{r.amount} Crumbs</strong>
                <span>{t(`wallet.${r.status}`)}</span>
              </div>
              <em>{r.wallet}</em>
            </div>
          ))}
        </section>
      )}

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
