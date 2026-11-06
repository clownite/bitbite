import { useEffect, useState } from "react";
import type { TonWalletProps } from "../components/TonWalletWidget";
import { ZoomCubeIcon } from "../components/ZoomCubeIcon";
import { fetchMyWithdrawals, requestCrumbsWithdrawal } from "../utils/api";
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

interface WalletPageProps extends Omit<TonWalletProps, "onOpenWalletTab" | "labVariant"> {
  balance: number;
  stardustBalance: number;
  redStarBalance: number;
  nftStarBalance: number;
  onOpenHistory?: () => void;
  onBankedStardust?: (balance: number) => void;
  visible?: boolean;
}

const ADDRESS_RE = /^(EQ|UQ|kQ|0Q|Ef|Uf|kf|0f)[A-Za-z0-9_-]{46}$/;

/** Crumbs farmed from the pet. 1 Crumb = 1 GRAM, paid only after you accept the request. */
export function WalletPage({ telegramId, visible = true }: WalletPageProps) {
  const [balance, setBalance] = useState(getCrumbs().balance);
  const [requests, setRequests] = useState<CrumbRequest[]>(getCrumbs().requests);
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      setNote("Open the app from Telegram so the request can reach your bot.");
      return;
    }
    if (!Number.isFinite(n) || n < WITHDRAW_MIN) {
      setNote("Enter at least 1 Crumb.");
      return;
    }
    if (n > getCrumbs().balance) {
      setNote("Not enough Crumbs.");
      return;
    }
    if (!ADDRESS_RE.test(addr) && !/^-?\d+:[0-9a-fA-F]{64}$/.test(addr)) {
      setNote("Enter a GRAM wallet address.");
      return;
    }
    if (getCrumbs().requests.some((r) => r.status === "pending")) {
      setNote("One request at a time. Wait until this one is accepted or declined.");
      return;
    }
    setBusy(true);
    const localId = `${Date.now()}`;
    if (!takeCrumbs(n)) {
      setBusy(false);
      setNote("Not enough Crumbs.");
      return;
    }
    const res = await requestCrumbsWithdrawal({ telegramId, amount: n, walletAddress: addr });
    if (!res.ok || !res.id) {
      addCrumbs(n);
      setBusy(false);
      setNote(res.error || "The bot did not receive it. Crumbs were returned.");
      return;
    }
    rememberRequest({ localId, serverId: res.id, amount: n, wallet: addr, status: "pending", createdAt: Date.now() });
    setAmount("");
    setBusy(false);
    setNote("Request sent. You will accept or decline it from your bot.");
  };

  return (
    <div className="flex flex-col overflow-y-auto" style={{ height: "100%", padding: "22px 18px 32px", gap: 16 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.16em", color: "#f0b15a" }}>WALLET</div>
        <div style={{ marginTop: 4, fontSize: 13, color: "rgba(255,244,228,0.62)" }}>
          1 Crumb = {CRUMB_GRAM} GRAM. Farmed from your pet.
        </div>
      </div>

      <section style={{ borderRadius: 28, padding: "22px 20px 20px", background: "rgba(58, 32, 20, 0.92)", border: "1px solid rgba(240, 177, 90, 0.28)" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", color: "rgba(255,231,194,0.55)" }}>CRUMBS</div>
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12, fontSize: 40, fontWeight: 900, color: "#fff4e4", lineHeight: 1 }}>
          <ZoomCubeIcon size={36} />
          <span>{formatCrumbs(balance)}</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,244,228,0.5)" }}>
          {formatCrumbs(balance * CRUMB_GRAM)} GRAM if accepted
        </div>
      </section>

      <section style={{ borderRadius: 28, padding: "18px 18px 16px", background: "rgba(58, 32, 20, 0.92)", border: "1px solid rgba(240, 177, 90, 0.22)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", color: "#f0b15a" }}>WITHDRAW</div>
        <div style={{ fontSize: 13, color: "rgba(255,244,228,0.7)", lineHeight: 1.45 }}>
          Enter the amount and your GRAM wallet. The request arrives on your bot. You accept or decline it there. Nothing is sent until you accept.
        </div>
        <input
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="Crumbs"
          style={{ borderRadius: 14, border: "1px solid rgba(240,177,90,0.28)", background: "rgba(0,0,0,0.25)", color: "#fff4e4", padding: "12px 14px", fontWeight: 800 }}
        />
        <input
          value={wallet}
          onChange={(e) => setWallet(e.target.value.trim())}
          placeholder="GRAM wallet (UQ… or EQ…)"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          style={{ borderRadius: 14, border: "1px solid rgba(240,177,90,0.28)", background: "rgba(0,0,0,0.25)", color: "#fff4e4", padding: "12px 14px", fontWeight: 700 }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          style={{ border: "none", borderRadius: 16, padding: "12px 14px", fontWeight: 900, background: "#f0b15a", color: "#2a1810" }}
        >
          {busy ? "Sending…" : "Request withdrawal"}
        </button>
        {note && <div style={{ fontSize: 12, color: "rgba(255,244,228,0.75)" }}>{note}</div>}
      </section>

      {requests.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {requests.map((r) => (
            <div key={r.localId} style={{ borderRadius: 18, padding: "12px 14px", background: "rgba(42, 24, 16, 0.55)", border: "1px solid rgba(240,177,90,0.18)", color: "#fff4e4" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                <span>{r.amount} Crumbs</span>
                <span style={{ color: r.status === "paid" ? "#8dcea0" : r.status === "rejected" ? "#e0a090" : "#f0b15a" }}>{r.status}</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: "rgba(255,244,228,0.45)", wordBreak: "break-all" }}>{r.wallet}</div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
