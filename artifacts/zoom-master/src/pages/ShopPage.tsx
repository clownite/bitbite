import { useEffect, useState } from "react";
import { formatRate, PETS, petCombat } from "../pet/catalog";
import { personalPetNumber, petOwnerId } from "../pet/number";
import { PetStage } from "../components/PetStage";
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
export function ShopPage({ gram, onPay, telegramId }: ShopPageProps) {
  const ownerId = petOwnerId(telegramId);
  const [pet, setPet] = useState<PetState>(getPet());
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => subscribePet(() => setPet(getPet())), []);

  const poster: PetState = { ...pet, level: 1, stage: 1, finished: false };

  return (
    <div className="h-full overflow-y-auto" style={{ padding: "12px 16px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.18em", color: "#7ad7ff" }}>SHOP</div>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#e8f7ff" }}>{gram.toFixed(2)} GRAM</div>
      </div>

      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
        {PETS.map((item) => {
          const owned = pet.owned.includes(item.id);
          const slotsFull = pet.owned.length >= PET_SLOTS;
          const canBuy = !owned && !slotsFull && item.price > 0 && gram + 1e-9 >= item.price;
          const stats = petCombat(item, 1);
          const statLine = [
            ["HP", stats.hp],
            ["Atk", stats.attack],
            ["Def", stats.defense],
            ["Sp.A", stats.specialAttack],
            ["Sp.D", stats.specialDefense],
            ["Spe", stats.speed],
          ] as const;
          return (
            <article
              key={item.id}
              style={{
                borderRadius: 22,
                overflow: "hidden",
                background: "linear-gradient(180deg, rgba(8,20,32,0.94), rgba(4,8,14,0.96))",
                border: "1px solid rgba(122,215,255,0.28)",
                boxShadow: `0 16px 36px rgba(0,0,0,0.35), 0 0 28px ${item.element.color}22`,
              }}
            >
              <div
                style={{
                  position: "relative",
                  height: 228,
                  background: `radial-gradient(ellipse 80% 70% at 50% 42%, ${item.element.color}88 0%, ${item.element.color}33 42%, transparent 72%), linear-gradient(180deg, ${item.element.color}44, transparent 70%)`,
                }}
              >
                <PetStage pet={poster} frame="shop" petId={item.id} />
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: 18,
                    width: 92,
                    height: 12,
                    transform: "translateX(-50%)",
                    borderRadius: "50%",
                    background: "rgba(0,0,0,0.35)",
                    filter: "blur(1px)",
                    pointerEvents: "none",
                  }}
                />
                <div style={{ position: "absolute", top: 12, right: 12, fontSize: 12, fontWeight: 800, color: "#041018", background: item.element.color, borderRadius: 999, padding: "4px 8px" }}>
                  {item.price === 0 ? "Free" : `${item.price} GRAM`}
                </div>
              </div>
              <div style={{ padding: "12px 14px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: item.element.color }}>{personalPetNumber(ownerId, item.id)}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#e8f7ff", lineHeight: 1.1 }}>{item.name}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: item.element.color }}>{item.element.label}</div>
                    <div style={{ marginTop: 2, fontSize: 12, fontWeight: 800, color: "#e8f7ff" }}>{formatRate(item.rates[1])} / day</div>
                  </div>
                </div>
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
                  {statLine.map(([label, value]) => (
                    <div key={label} style={{ textAlign: "center", borderRadius: 10, padding: "6px 0 5px", background: "rgba(122,215,255,0.06)" }}>
                      <div style={{ fontSize: 8, letterSpacing: "0.04em", color: "rgba(186,220,236,0.5)" }}>{label}</div>
                      <div style={{ marginTop: 2, fontSize: 13, fontWeight: 800, color: "#e8f7ff" }}>{value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12 }}>
                  {owned ? (
                    <div style={{ textAlign: "center", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", color: "#7ad7ff" }}>Owned</div>
                  ) : slotsFull ? (
                    <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "rgba(186,220,236,0.45)" }}>5 slots full</div>
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
                        borderRadius: 14,
                        padding: "12px 14px",
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        background: canBuy ? item.element.color : `${item.element.color}2e`,
                        color: canBuy ? "#041018" : item.element.color,
                      }}
                    >
                      Buy · {item.price} GRAM
                    </button>
                  )}
                </div>
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
