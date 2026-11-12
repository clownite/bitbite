import { useEffect, useState, type CSSProperties } from "react";
import { fetchAdminSession, releasePlayer, setMaintenance, suspendPlayer } from "../utils/api";
import { getVerifiedTelegramUserId } from "../utils/telegram";

export const ADMIN_TELEGRAM_ID = "8144744644";

export function isAppAdmin(): boolean {
  return getVerifiedTelegramUserId() === ADMIN_TELEGRAM_ID;
}

type ConfirmLog = { id: string; days: number; note: string; at: number };
const LOG_KEY = "zoom-admin-confirms";

function readConfirms(): ConfirmLog[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const list = raw ? JSON.parse(raw) as ConfirmLog[] : [];
    if (!Array.isArray(list)) return [];
    return list.filter((row) => row && /^\d{5,16}$/.test(String(row.id)) && Number(row.at) > 0).slice(0, 24);
  } catch {
    return [];
  }
}

function rememberConfirm(entry: ConfirmLog): ConfirmLog[] {
  const next = [entry, ...readConfirms()].slice(0, 24);
  try { localStorage.setItem(LOG_KEY, JSON.stringify(next)); } catch { /**/ }
  return next;
}

const KEY = [
  "00111000",
  "01000100",
  "01000100",
  "00111000",
  "00010000",
  "00011100",
  "00010000",
  "00011100",
];

function PixelKey() {
  return (
    <svg width="22" height="22" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden>
      {KEY.flatMap((row, y) =>
        row.split("").map((cell, x) => cell === "1"
          ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={y < 4 ? "#ffd36a" : "#f0b429"} />
          : null),
      )}
    </svg>
  );
}

export function AdminPixel({
  maintenanceOn,
  maintenanceMessage,
  onMaintenance,
}: {
  maintenanceOn: boolean;
  maintenanceMessage: string;
  onMaintenance: (enabled: boolean, message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const [days, setDays] = useState("3");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState(maintenanceMessage);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");
  const [history, setHistory] = useState<ConfirmLog[]>(readConfirms);

  useEffect(() => {
    if (!isAppAdmin()) return;
    let alive = true;
    void fetchAdminSession().then((ok) => { if (alive) setAllowed(ok); });
    return () => { alive = false; };
  }, []);

  if (!isAppAdmin() || !allowed) return null;

  const idOk = /^\d{5,16}$/.test(playerId) && playerId !== ADMIN_TELEGRAM_ID;
  const dayCount = Math.max(1, Math.min(365, Math.floor(Number(days) || 0)));

  const runSuspend = async () => {
    setBusy(true);
    const result = await suspendPlayer(playerId, dayCount, note);
    setBusy(false);
    setConfirm(false);
    if (result.ok) setHistory(rememberConfirm({ id: playerId, days: dayCount, note: note.trim(), at: Date.now() }));
    setHint(result.ok ? `Sospeso ${dayCount} giorni.` : (result.error || "Non riuscito"));
  };

  const copyId = async (id: string, days: number) => {
    setPlayerId(id);
    setDays(String(days));
    setConfirm(false);
    try { await navigator.clipboard.writeText(id); setHint("Copiato"); }
    catch { setHint(id); }
  };

  const runRelease = async () => {
    if (!idOk) return;
    setBusy(true);
    const result = await releasePlayer(playerId);
    setBusy(false);
    setHint(result.ok ? "Sospensione tolta." : (result.error || "Non riuscito"));
  };

  const runMaint = async (enabled: boolean) => {
    setBusy(true);
    const result = await setMaintenance(enabled, message);
    setBusy(false);
    if (result.ok) onMaintenance(enabled, message);
    setHint(result.ok ? (enabled ? "Manutenzione attiva." : "Manutenzione chiusa.") : (result.error || "Non riuscito"));
  };

  return (
    <div style={{ position: "fixed", top: "calc(env(safe-area-inset-top, 0px) + 10px)", right: 12, zIndex: 80 }}>
      <button
        type="button"
        aria-label="Admin"
        onClick={() => { setOpen((v) => !v); setConfirm(false); setMessage(maintenanceMessage); }}
        style={{
          width: 34,
          height: 34,
          display: "grid",
          placeItems: "center",
          background: "#120c08",
          border: "2px solid #1a120c",
          boxShadow: "0 0 0 1px #ffd36a",
          padding: 0,
        }}
      >
        <PixelKey />
      </button>
      {open && (
        <div style={{
          position: "absolute",
          top: 40,
          right: 0,
          width: 250,
          maxHeight: "min(72dvh, 540px)",
          overflow: "auto",
          padding: 12,
          background: "#071018",
          border: "2px solid #1a120c",
          boxShadow: "0 8px 0 rgba(0,0,0,0.35)",
          color: "#e8f7ff",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#ffd36a" }}>ADMIN</div>
          <input
            value={playerId}
            onChange={(e) => { setPlayerId(e.target.value.replace(/\D/g, "").slice(0, 16)); setConfirm(false); }}
            inputMode="numeric"
            placeholder="ID Telegram"
            style={field}
          />
          <input
            value={days}
            onChange={(e) => setDays(e.target.value.replace(/\D/g, "").slice(0, 3))}
            inputMode="numeric"
            placeholder="Giorni"
            style={field}
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 300))}
            placeholder="Messaggio al giocatore"
            style={field}
          />
          {confirm ? (
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" disabled={busy} onClick={() => void runSuspend()} style={danger}>Conferma {dayCount}g</button>
              <button type="button" disabled={busy} onClick={() => setConfirm(false)} style={ghost}>No</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" disabled={!idOk || busy} onClick={() => setConfirm(true)} style={danger}>Sospendi</button>
              <button type="button" disabled={!idOk || busy} onClick={() => void runRelease()} style={ghost}>Togli</button>
            </div>
          )}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="Messaggio di manutenzione"
            style={{ ...field, resize: "none" }}
          />
          <button type="button" disabled={busy} onClick={() => void runMaint(!maintenanceOn)} style={{ ...(maintenanceOn ? ghost : danger), width: "100%" }}>
            {maintenanceOn ? "Chiudi manutenzione" : "Manutenzione"}
          </button>
          {history.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "#ffd36a" }}>CONFERME</div>
              <div style={{ maxHeight: 120, overflow: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                {history.map((row) => (
                  <button
                    key={`${row.at}-${row.id}`}
                    type="button"
                    onClick={() => void copyId(row.id, row.days)}
                    style={{ textAlign: "left", background: "#03070c", color: "#e8f7ff", border: "1px solid #24506a", padding: "5px 6px", fontSize: 11 }}
                  >
                    <span style={{ fontWeight: 800 }}>{row.id}</span>
                    <span style={{ color: "#9ec5e8" }}> · {row.days}g · {new Date(row.at).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {hint ? <div style={{ fontSize: 11, color: "#9ec5e8" }}>{hint}</div> : null}
        </div>
      )}
    </div>
  );
}

const field: CSSProperties = {
  width: "100%",
  background: "#03070c",
  color: "#e8f7ff",
  border: "1px solid #24506a",
  padding: "7px 8px",
  fontSize: 13,
  outline: "none",
};

const danger: CSSProperties = {
  flex: 1,
  background: "#3a1420",
  color: "#ffd0dc",
  border: "1px solid #ff3355",
  padding: "7px 8px",
  fontSize: 12,
  fontWeight: 800,
};

const ghost: CSSProperties = {
  flex: 1,
  background: "transparent",
  color: "#9ec5e8",
  border: "1px solid #24506a",
  padding: "7px 8px",
  fontSize: 12,
  fontWeight: 800,
};
