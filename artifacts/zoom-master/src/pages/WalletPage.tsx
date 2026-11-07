import { useEffect, useState } from "react";
import { ZoomCubeIcon } from "../components/ZoomCubeIcon";
import { fetchMyWithdrawals, requestCrumbsWithdrawal } from "../utils/api";
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
      setNote(`Enter at least ${WITHDRAW_MIN} Crumbs.`);
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

  const viewer = getTelegramViewer();
  const initial = viewer.name.slice(0, 1).toUpperCase();

  return (
    <div className="flex flex-col overflow-y-auto" style={{ height: "100%", padding: "8px 16px 28px", background: "#000" }}>
      <section
        style={{
          borderRadius: 28,
          padding: "22px 20px 18px",
          background:
            "radial-gradient(120% 80% at 100% 0%, rgba(240,177,90,0.16), transparent 42%), linear-gradient(180deg, #141414 0%, #050505 100%)",
          border: "1px solid rgba(240,177,90,0.28)",
          boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 20,
              overflow: "hidden",
              display: "grid",
              placeItems: "center",
              background: "#000",
              border: "1px solid rgba(240,177,90,0.45)",
              color: "#ffe0a8",
              fontWeight: 900,
              fontSize: 22,
            }}
          >
            {viewer.photoUrl ? (
              <img src={viewer.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              initial
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.22em", color: "#f0b15a" }}>PROFILE</div>
            <div style={{ marginTop: 2, fontSize: 26, fontWeight: 900, color: "#fff8ee", lineHeight: 1.05 }}>{viewer.name}</div>
            <div style={{ marginTop: 2, fontSize: 13, color: "rgba(255,244,228,0.55)" }}>{viewer.username || "Telegram"}</div>
          </div>
        </div>

        <div style={{ marginTop: 22, height: 1, background: "linear-gradient(90deg, transparent, rgba(240,177,90,0.45), transparent)" }} />

        <div style={{ marginTop: 16, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.18em", fontWeight: 800, color: "rgba(255,244,228,0.45)" }}>CRUMBS</div>
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 10, fontSize: 42, fontWeight: 900, color: "#fff8ee", lineHeight: 0.95 }}>
              <ZoomCubeIcon size={34} />
              <span>{formatCrumbs(balance)}</span>
            </div>
          </div>
          <div style={{ textAlign: "right", paddingBottom: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#ffe0a8" }}>{formatCrumbs(balance * CRUMB_GRAM)} GRAM</div>
            <div style={{ marginTop: 2, fontSize: 11, color: "rgba(255,244,228,0.45)" }}>if you accept</div>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 14, borderRadius: 24, padding: "16px 16px 14px", background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.14em", color: "#fff8ee" }}>WITHDRAW</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#f0b15a" }}>MIN {WITHDRAW_MIN}</div>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,244,228,0.62)", lineHeight: 1.45 }}>
          1 Crumb = {CRUMB_GRAM} GRAM. The request lands in your bot. Nothing moves until you accept it there.
        </div>
        <input
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
          placeholder={`${WITHDRAW_MIN} Crumbs minimum`}
          style={{ borderRadius: 14, border: "1px solid rgba(240,177,90,0.22)", background: "#000", color: "#fff8ee", padding: "13px 14px", fontWeight: 800 }}
        />
        <input
          value={wallet}
          onChange={(e) => setWallet(e.target.value.trim())}
          placeholder="GRAM wallet (UQ… or EQ…)"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", background: "#000", color: "#fff8ee", padding: "13px 14px", fontWeight: 700 }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          style={{ border: "none", borderRadius: 16, padding: "13px 14px", fontWeight: 900, letterSpacing: "0.04em", background: "#f0b15a", color: "#1a0e06" }}
        >
          {busy ? "Sending…" : "Request withdrawal"}
        </button>
        {note && <div style={{ fontSize: 12, color: "rgba(255,244,228,0.75)" }}>{note}</div>}
      </section>

      {requests.length > 0 && (
        <section style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {requests.map((r) => (
            <div key={r.localId} style={{ borderRadius: 16, padding: "12px 14px", background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", color: "#fff8ee" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                <span>{r.amount} Crumbs</span>
                <span style={{ color: r.status === "paid" ? "#8dcea0" : r.status === "rejected" ? "#e0a090" : "#f0b15a" }}>{r.status}</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: "rgba(255,244,228,0.4)", wordBreak: "break-all" }}>{r.wallet}</div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
