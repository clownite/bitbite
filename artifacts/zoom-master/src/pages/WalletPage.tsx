import type { TonWalletProps } from "../components/TonWalletWidget";
import { ZoomCubeIcon } from "../components/ZoomCubeIcon";

interface WalletPageProps extends Omit<TonWalletProps, "onOpenWalletTab" | "labVariant"> {
  balance: number;
  stardustBalance: number;
  redStarBalance: number;
  nftStarBalance: number;
  onOpenHistory?: () => void;
  onBankedStardust?: (balance: number) => void;
  visible?: boolean;
}

function formatCrumbs(n: number): string {
  const v = Math.floor(Number.isFinite(n) ? n : 0);
  if (v < 0) return "0";
  return v.toLocaleString();
}

/** One calm card. Crumbs is the only balance. The chart stays empty until a new link is set. */
export function WalletPage({ balance }: WalletPageProps) {
  return (
    <div
      className="flex flex-col overflow-y-auto"
      style={{ height: "100%", padding: "22px 18px 32px", gap: 18 }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.16em", color: "#f0b15a" }}>
          WALLET
        </div>
        <div style={{ marginTop: 4, fontSize: 13, color: "rgba(255,244,228,0.62)" }}>
          Crumbs, nothing else.
        </div>
      </div>

      <section
        style={{
          borderRadius: 28,
          padding: "22px 20px 20px",
          background: "rgba(58, 32, 20, 0.92)",
          border: "1px solid rgba(240, 177, 90, 0.28)",
          boxShadow: "0 16px 40px rgba(20, 8, 2, 0.28)",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", color: "rgba(255,231,194,0.55)" }}>
          CRUMBS
        </div>
        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 40,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: "#fff4e4",
            lineHeight: 1,
          }}
        >
          <ZoomCubeIcon size={36} />
          <span>{formatCrumbs(balance)}</span>
        </div>
      </section>

      <section
        aria-label="Crumbs chart"
        style={{
          borderRadius: 28,
          minHeight: 220,
          padding: "18px 18px 20px",
          background: "rgba(42, 24, 16, 0.55)",
          border: "1px dashed rgba(240, 177, 90, 0.35)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", color: "rgba(255,231,194,0.45)" }}>
          CHART
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "rgba(255,244,228,0.72)", lineHeight: 1.45 }}>
          The Crumbs chart will sit here.
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,244,228,0.4)" }}>
          Waiting for the new link.
        </div>
      </section>
    </div>
  );
}
