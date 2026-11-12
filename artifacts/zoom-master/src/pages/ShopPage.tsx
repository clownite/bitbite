import { useEffect, useState, type CSSProperties } from "react";
import { formatRate, PETS, petCombat } from "../pet/catalog";
import { familyOf } from "../pet/life";
import { personalPetNumber, petOwnerId } from "../pet/number";
import { LifeCreature } from "../components/LifeCreature";
import { PixelMark } from "../components/PixelMark";
import { StatGlyph } from "../components/StatGlyph";
import { buyPet, getPet, LEVEL5_GRAM, LEVEL10_GRAM, PET_SLOTS, subscribePet, type PetState } from "../pet/petProgress";
import { settlePetPayments, startPetPayment } from "../pet/payPet";
import { useT } from "../i18n/LanguageContext";

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
  const { t } = useT();
  void onPay;
  const ownerId = petOwnerId(telegramId);
  const [pet, setPet] = useState<PetState>(getPet());
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => subscribePet(() => setPet(getPet())), []);

  return (
    <div className="h-full overflow-y-auto" style={{ padding: "12px 16px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.18em", color: "#7ad7ff" }}>{t("pet.shop")}</div>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#e8f7ff" }}>{gram.toFixed(2)} GRAM</div>
      </div>

      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
        {PETS.map((item, index) => {
          const owned = pet.owned.includes(item.id);
          const slotsFull = pet.owned.length >= PET_SLOTS;
          const canBuy = !owned && !slotsFull;
          const stats = petCombat(item, 1);
          const statLine = [
            ["hp", "HP", stats.hp],
            ["atk", "Atk", stats.attack],
            ["def", "Def", stats.defense],
            ["spa", "Sp.A", stats.specialAttack],
            ["spd", "Sp.D", stats.specialDefense],
            ["spe", "Spe", stats.speed],
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
              <div className="shop-foil" style={{ "--ink": item.element.color } as CSSProperties}>
                <LifeCreature family={familyOf(item.id)} form="adult" kin={0} />
                <span className="shop-foil-shine" style={{ animationDelay: `${index * 0.45}s` }} aria-hidden />
                <div style={{ position: "absolute", top: 12, left: 12, zIndex: 7, pointerEvents: "none" }}>
                  <PixelMark glyph={item.element.glyph} label={t(`pet.element.${item.element.id}`)} />
                </div>
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
                <div style={{ position: "absolute", top: 12, right: 12, zIndex: 7, fontSize: 12, fontWeight: 800, color: "#041018", background: item.element.color, borderRadius: 999, padding: "4px 8px" }}>
                  {item.price === 0 ? t("pet.free") : `${item.price} GRAM`}
                </div>
              </div>
              <div style={{ padding: "12px 14px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: item.element.color }}>{personalPetNumber(ownerId, item.id)}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#e8f7ff", lineHeight: 1.1 }}>{item.name}</div>
                    <div style={{ marginTop: 4, fontSize: 12, fontWeight: 800, color: item.element.color }}>{t(`pet.ability.${item.id}.name`)}</div>
                    <div style={{ marginTop: 2, fontSize: 11, lineHeight: 1.35, color: "rgba(186,220,236,0.72)" }}>{t(`pet.ability.${item.id}.text`)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: item.element.color }}>{t(`pet.element.${item.element.id}`)}</div>
                    <div style={{ marginTop: 2, fontSize: 12, fontWeight: 800, color: "#e8f7ff" }}>{formatRate(item.rates[1])} {t("pet.perDay")}</div>
                  </div>
                </div>
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
                  {statLine.map(([id, label, value]) => (
                    <div key={id} style={{ textAlign: "center", borderRadius: 10, padding: "6px 0 5px", background: "rgba(122,215,255,0.06)" }}>
                      <StatGlyph id={id} />
                      <div style={{ fontSize: 8, letterSpacing: "0.04em", color: "rgba(186,220,236,0.5)" }}>{label}</div>
                      <div style={{ marginTop: 2, fontSize: 13, fontWeight: 800, color: "#e8f7ff" }}>{value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, borderRadius: 14, padding: "6px 10px", background: "rgba(4,16,24,0.72)", border: `1px solid ${item.element.color}55`, boxShadow: `0 0 16px ${item.element.color}22` }}>
                  {([
                    { lv: 1, rate: item.rates[1], gram: 0, spent: item.price },
                    { lv: 5, rate: item.rates[5], gram: LEVEL5_GRAM, spent: item.price + LEVEL5_GRAM },
                    { lv: 10, rate: item.rates[10], gram: LEVEL10_GRAM, spent: item.price + LEVEL5_GRAM + LEVEL10_GRAM },
                  ] as const).map((row) => (
                    <div key={row.lv} style={{ display: "grid", gridTemplateColumns: "46px 1fr auto", gap: 8, alignItems: "baseline", padding: "3px 0" }}>
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: item.element.color }}>{t("pet.lv", { n: row.lv })}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#e8f7ff" }}>{formatRate(row.rate)} {t("pet.perDay")}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(186,220,236,0.72)", textAlign: "right" }}>
                        {row.gram > 0 ? `${row.gram} GRAM · ` : ""}
                        {row.spent > 0 ? t("pet.roiDays", { n: Math.max(1, Math.round(row.spent / row.rate)) }) : t("pet.free")}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12 }}>
                  {owned ? (
                    <div style={{ textAlign: "center", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", color: "#7ad7ff" }}>{t("pet.owned")}</div>
                  ) : slotsFull ? (
                    <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "rgba(186,220,236,0.45)" }}>{t("pet.slots")}</div>
                  ) : (
                    <button
                      type="button"
                      disabled={slotsFull}
                      onClick={() => {
                        if (item.price <= 0) {
                          buyPet(item.id);
                          setNote(t("pet.got", { name: item.name }));
                          return;
                        }
                        startPetPayment(item.id, item.name, item.price);
                        setNote(t("pet.payOpen"));
                        window.setTimeout(() => {
                          void settlePetPayments().then((ids) => {
                            if (ids.includes(item.id)) setNote(t("pet.got", { name: item.name }));
                          });
                        }, 4000);
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
                      {t("pet.buy", { n: item.price })}
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
