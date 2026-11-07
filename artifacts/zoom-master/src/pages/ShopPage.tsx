import { useEffect, useState } from "react";
import { formatRate, PETS, timeForOneCrumb } from "../pet/catalog";
import { buyPet, getPet, PET_SLOTS, subscribePet, type PetState } from "../pet/petProgress";
import { recordGramInvested } from "../pet/invested";

interface ShopPageProps {
  balance: number;
  stardustBalance?: number;
  depositBalance: number;
  tonBalance?: number;
  hasSun: boolean;
  telegramId?: string | null;
  sunCount: number;
  whiteCollectionUnlocked: boolean;
  whiteCollectionBundles: number;
  earthCollectionUnlocked: boolean;
  earthCollectionBundles: number;
  blackCollectionUnlocked: boolean;
  blackCollectionBundles: number;
  supernovaCollectionUnlocked: boolean;
  supernovaCollectionBundles: number;
  stellaRossaCollectionUnlocked?: boolean;
  stellaRossaCollectionBundles?: number;
  stellaLastClaimAt?: number;
  onStellaClaimDaily?: (newRedStarBalance: number) => void;
  gram: number;
  onPay: (cost: number) => boolean;
}

/** The shop sells pets. Nothing else. */
export function ShopPage({ gram, onPay }: ShopPageProps) {
  const [pet, setPet] = useState<PetState>(getPet());
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => subscribePet(() => setPet(getPet())), []);

  return (
    <div className="h-full overflow-y-auto" style={{ background: "linear-gradient(180deg, #071018 0%, #000 70%)", padding: "18px 16px 28px" }}>
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.18em", color: "#7ad7ff" }}>SHOP</div>
      <div style={{ marginTop: 4, fontSize: 13, color: "rgba(186,220,236,0.7)" }}>
        Pets only. You have {gram.toFixed(2)} GRAM.
      </div>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {PETS.map((item) => {
          const owned = pet.owned.includes(item.id);
          const slotsFull = pet.owned.length >= PET_SLOTS;
          const canBuy = !owned && !slotsFull && item.price > 0 && gram + 1e-9 >= item.price;
          return (
            <article
              key={item.id}
              style={{
                borderRadius: 16,
                padding: "16px 16px 14px",
                background: "#05080c",
                border: "1px solid rgba(122,215,255,0.28)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#e8f7ff" }}>{item.name}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#7ad7ff" }}>
                  {item.price === 0 ? "Free" : `${item.price} GRAM`}
                </div>
              </div>
              <div style={{ marginTop: 8, height: 1, background: "rgba(122,215,255,0.16)" }} />
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {([1, 5, 10] as const).map((level) => (
                  <div key={level} style={{ borderRadius: 12, padding: "8px 8px 7px", background: "rgba(122,215,255,0.06)" }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "rgba(186,220,236,0.55)" }}>LV {level}</div>
                    <div style={{ marginTop: 2, fontSize: 14, fontWeight: 800, color: "#e8f7ff" }}>{formatRate(item.rates[level])}</div>
                    <div style={{ fontSize: 10, color: "rgba(186,220,236,0.5)" }}>{timeForOneCrumb(item.rates[level])}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "rgba(186,220,236,0.6)", lineHeight: 1.4 }}>{item.note}</div>
              <div style={{ marginTop: 12 }}>
                {owned ? (
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#7ad7ff" }}>Owned</div>
                ) : slotsFull ? (
                  <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(186,220,236,0.45)" }}>5 slots full</div>
                ) : (
                  <button
                    type="button"
                    disabled={!canBuy}
                    onClick={() => {
                      if (!canBuy) {
                        setNote(`You need ${item.price} GRAM for ${item.name}.`);
                        return;
                      }
                      if (!onPay(item.price)) {
                        setNote("Not enough GRAM.");
                        return;
                      }
                      buyPet(item.id);
                      recordGramInvested(item.price);
                      setNote(`${item.name} is in your collection.`);
                    }}
                    style={{
                      width: "100%",
                      border: "none",
                      borderRadius: 12,
                      padding: "11px 14px",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      background: canBuy ? "#7ad7ff" : "rgba(255,255,255,0.06)",
                      color: canBuy ? "#041018" : "rgba(186,220,236,0.35)",
                    }}
                  >
                    Buy · {item.price} GRAM
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {note && (
        <div style={{ marginTop: 12, fontSize: 12, color: "#7ad7ff" }}>{note}</div>
      )}
    </div>
  );
}
