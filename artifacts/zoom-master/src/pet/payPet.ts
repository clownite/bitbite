import type { PetId } from "./catalog";
import { buyPet, confirmGramUpgrade, getPet, gramCost } from "./petProgress";
import { recordGramInvested } from "./invested";

/** The wallet that receives GRAM when a player buys a pet. */
export const PET_TREASURY = "UQB7vku7fJS196hYJa86PjQW9rq0Q7hzyqH97Ki5hJHesIdr";

const KEY = "zoom-pet-orders-v1";

type Order = {
  id: string;
  kind?: "pet" | "stage";
  petId?: PetId;
  nextLevel?: 5 | 10;
  price: number;
  comment: string;
  status: "pending" | "paid";
};

function read(): Order[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]") as Order[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(orders: Order[]) {
  try { localStorage.setItem(KEY, JSON.stringify(orders)); } catch { /**/ }
}

function openPayLink(url: string) {
  const tg = (window as unknown as { Telegram?: { WebApp?: { openLink?: (link: string) => void } } }).Telegram?.WebApp;
  if (tg?.openLink) tg.openLink(url);
  else window.open(url, "_blank", "noopener");
}

/** Opens the wallet so the GRAM goes to the treasury. The pet waits for that payment. */
export function startPetPayment(petId: PetId, name: string, price: number) {
  const id = Math.random().toString(36).slice(2, 8);
  const comment = `BitBite ${name} ${id}`;
  const orders = read().filter((order) => order.status === "pending" && order.petId !== petId);
  orders.push({ id, kind: "pet", petId, price, comment, status: "pending" });
  write(orders);
  const nano = Math.round(price * 1e9);
  const url = `https://app.tonkeeper.com/transfer/${PET_TREASURY}?amount=${nano}&text=${encodeURIComponent(comment)}`;
  openPayLink(url);
}

function commentOf(tx: unknown): string {
  const msg = (tx as { in_msg?: Record<string, unknown> })?.in_msg;
  if (!msg) return "";
  const parts: string[] = [];
  const walk = (node: unknown, depth: number) => {
    if (depth > 5 || node == null) return;
    if (typeof node === "string") {
      if (node.length > 0 && node.length < 240) parts.push(node);
      return;
    }
    if (typeof node !== "object") return;
    for (const value of Object.values(node as Record<string, unknown>)) walk(value, depth + 1);
  };
  walk(msg, 0);
  return parts.join(" ");
}

function nanoOf(tx: unknown): number {
  const msg = (tx as { in_msg?: { value?: string | number } })?.in_msg;
  const value = Number(msg?.value ?? 0);
  return Number.isFinite(value) ? value : 0;
}

/** Opens the same wallet for the stage gate. 3 GRAM opens stage 2. 10 GRAM opens stage 3. */
export function startStagePayment(price: number, nextLevel: 5 | 10) {
  const id = Math.random().toString(36).slice(2, 8);
  const comment = `BitBite stage ${nextLevel} ${id}`;
  const orders = read().filter((order) => order.status === "pending" && order.kind !== "stage");
  orders.push({ id, kind: "stage", nextLevel, price, comment, status: "pending" });
  write(orders);
  const nano = Math.round(price * 1e9);
  const url = `https://app.tonkeeper.com/transfer/${PET_TREASURY}?amount=${nano}&text=${encodeURIComponent(comment)}`;
  openPayLink(url);
}

export function pendingPetOrders(): number {
  return read().filter((order) => order.status === "pending").length;
}

/** When the treasury has the GRAM, the pet enters the collection and the weekly board moves. */
export async function settlePetPayments(): Promise<PetId[]> {
  const pending = read().filter((order) => order.status === "pending");
  if (!pending.length) return [];
  let transactions: unknown[] = [];
  try {
    const res = await fetch(`https://tonapi.io/v2/blockchain/accounts/${PET_TREASURY}/transactions?limit=30`);
    if (res.ok) {
      const data = await res.json() as { transactions?: unknown[] };
      transactions = data.transactions || [];
    }
  } catch {
    return [];
  }
  const granted: PetId[] = [];
  const next = read();
  for (const order of pending) {
    const hit = transactions.some((tx) => {
      const text = commentOf(tx);
      return text.includes(order.comment) && nanoOf(tx) + 1e6 >= order.price * 1e9;
    });
    if (!hit) continue;
    const row = next.find((item) => item.id === order.id);
    if (!row || row.status === "paid") continue;
    if (order.kind === "stage") {
      if (gramCost(getPet()) !== order.price) continue;
      row.status = "paid";
      recordGramInvested(order.price);
      confirmGramUpgrade();
      continue;
    }
    if (!order.petId) continue;
    const had = getPet().owned.includes(order.petId);
    buyPet(order.petId);
    const owns = getPet().owned.includes(order.petId);
    if (!owns) continue;
    row.status = "paid";
    if (!had) {
      recordGramInvested(order.price);
      granted.push(order.petId);
    }
  }
  write(next);
  return granted;
}
