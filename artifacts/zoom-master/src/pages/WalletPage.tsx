import { useEffect, useState } from "react";
import { useTonAddress, useTonConnectUI } from "@tonconnect/ui-react";
import { ZoomCubeIcon } from "../components/ZoomCubeIcon";
import { PixelBankCard } from "../components/PixelBankCard";
import { fetchMyWithdrawals, requestCrumbsWithdrawal } from "../utils/api";
import { useT } from "../i18n/LanguageContext";
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
  const linkedAddress = useTonAddress();

  useEffect(() => {
    if (!linkedAddress) return;
    setWallet((current) => current || linkedAddress);
  }, [linkedAddress]);

  useEffect(() => subscribeCrumbs(() => {
    setBalance(getCrumbs().balance);
    setRequests(getCrumbs().requests);
  }), []);

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

  const field = {
    borderRadius: 14,
    border: "1px solid rgba(122,215,255,0.28)",
    background: "rgba(0,0,0,0.35)",
    color: "#e8f7ff",
    padding: "13px 14px",
    fontWeight: 700,
  } as const;

  return (
    <div className="flex flex-col overflow-y-auto" style={{ height: "100%", padding: "8px 16px 28px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.18em", color: "#7ad7ff", paddingTop: 8 }}>{t("wallet.profile")}</div>
        <WalletConnect />
      </div>

      <PixelBankCard crumbs={formatCrumbs(balance)} />

      <section
        style={{
          marginTop: 4,
          borderRadius: 24,
          padding: "16px 16px 14px",
          background: "linear-gradient(180deg, rgba(10,28,42,0.92), rgba(5,12,18,0.94))",
          border: "1px solid rgba(122,215,255,0.32)",
          boxShadow: "0 16px 36px rgba(0,0,0,0.28)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.18em", fontWeight: 800, color: "rgba(186,220,236,0.55)" }}>{t("wallet.crumbs")}</div>
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 10, fontSize: 40, fontWeight: 900, color: "#e8f7ff", lineHeight: 0.95 }}>
              <ZoomCubeIcon size={32} />
              <span>{formatCrumbs(balance)}</span>
            </div>
          </div>
          <div style={{ textAlign: "right", paddingBottom: 4, fontSize: 13, fontWeight: 800, color: "#7ad7ff" }}>
            {formatCrumbs(balance * CRUMB_GRAM)} GRAM
          </div>
        </div>
      </section>

      <section
        style={{
          marginTop: 14,
          borderRadius: 24,
          padding: "16px 16px 14px",
          background: "rgba(7,16,24,0.88)",
          border: "1px solid rgba(122,215,255,0.22)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.14em", color: "#e8f7ff" }}>{t("wallet.withdraw")}</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#7ad7ff" }}>{t("wallet.min", { n: WITHDRAW_MIN })}</div>
        </div>
        <input
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
          placeholder={t("wallet.amountPh", { n: WITHDRAW_MIN })}
          style={field}
        />
        <input
          value={wallet}
          onChange={(e) => setWallet(e.target.value.trim())}
          placeholder={t("wallet.addressPh")}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          style={field}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          style={{ border: "none", borderRadius: 16, padding: "13px 14px", fontWeight: 900, letterSpacing: "0.04em", background: "#7ad7ff", color: "#041018" }}
        >
          {busy ? "…" : t("wallet.request")}
        </button>
        {note && <div style={{ fontSize: 12, color: "#9fd4ee" }}>{note}</div>}
      </section>

      {requests.length > 0 && (
        <section style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {requests.map((r) => (
            <div key={r.localId} style={{ borderRadius: 16, padding: "12px 14px", background: "rgba(7,16,24,0.88)", border: "1px solid rgba(122,215,255,0.2)", color: "#e8f7ff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                <span>{r.amount} Crumbs</span>
                <span style={{ color: r.status === "paid" ? "#8dcea0" : r.status === "rejected" ? "#e0a090" : "#7ad7ff" }}>{t(`wallet.${r.status}`)}</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: "rgba(186,220,236,0.45)", wordBreak: "break-all" }}>{r.wallet}</div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
