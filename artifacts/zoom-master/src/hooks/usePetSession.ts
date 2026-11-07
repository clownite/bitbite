import { useCallback, useEffect, useState } from "react";
import { fetchGrants, fetchReferralData, registerUser } from "../utils/api";
import { getBrowserDevTelegramId, getVerifiedTelegramUserId } from "../utils/telegram";

/** Identity, GRAM for the pet shop, and invite count. The planet forge is gone. */
export function usePetSession() {
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [gram, setGram] = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const [claimedMilestones, setClaimedMilestones] = useState<number[]>([]);

  useEffect(() => {
    const id = getVerifiedTelegramUserId() ?? getBrowserDevTelegramId();
    setTelegramId(id);
    if (!id) return;
    void registerUser(id);
    void fetchReferralData(id).then((data) => {
      setReferralCount(data.referralCount);
      setClaimedMilestones(data.claimedMilestones);
    });
    void fetchGrants(id).then((grants) => {
      if (!grants) return;
      setGram(Math.max(0, (grants.tonBalance || 0) + (grants.depositBalance || 0)));
    });
  }, []);

  const pay = useCallback((cost: number) => {
    let ok = false;
    setGram((current) => {
      if (current + 1e-9 < cost) return current;
      ok = true;
      return +(current - cost).toFixed(6);
    });
    return ok;
  }, []);

  return {
    telegramId,
    gram,
    pay,
    referralCount,
    claimedMilestones,
    referralCode: telegramId ?? "",
  };
}
