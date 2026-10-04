// ─── THE STAGE-2 COMMERCE SEAM (app buyer) ────────────────────────────────────────────────────
// Every marketplace commerce call imports from this file ONLY (one-file swap onto the generated
// client in Stage 5 — same story as tuition). Types from the generated spec; behaviour clearly
// fake; data fictional ("ডেমো স্টোর", prompt.txt §12).
import type { components } from "@/api/schema.gen";

type Schemas = components["schemas"];
type StoreSummary = Schemas["CommerceStoreSummary"];
type ProductCard = Schemas["CommerceProductCard"];
type ProductDetail = Schemas["CommerceProductDetail"];
type Order = Schemas["CommerceOrder"];
type OrderInput = Schemas["CommerceOrderInput"];

export type {
  StoreSummary,
  ProductCard,
  ProductDetail,
  Order,
  OrderInput,
};

/** Same code vocabulary as the other seams + the module's `OUT_OF_STOCK` (api problem code). */
export class CommerceFixtureError extends Error {
  constructor(
    readonly code: "OFFLINE" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_FAILED" | "CONFLICT" | "NOT_VERIFIED" | "OUT_OF_STOCK",
    readonly detail?: string,
  ) {
    super(`fixture:commerce:${code}${detail ? `: ${detail}` : ""}`);
    this.name = "CommerceFixtureError";
  }
}

// ─── Flag switcher ────────────────────────────────────────────────────────────────────────────

export const COMMERCE_FIXTURE_MODES = ["success", "offline", "not_verified", "conflict", "out_of_stock"] as const;
export type CommerceFixtureMode = (typeof COMMERCE_FIXTURE_MODES)[number];

const listeners = new Set<(mode: CommerceFixtureMode) => void>();
let mode: CommerceFixtureMode = "success";

function setMode(next: CommerceFixtureMode): void {
  mode = next;
  for (const listener of listeners) listener(next);
}

export const commerceFixtureFlags = {
  get mode(): CommerceFixtureMode {
    return mode;
  },
  set mode(next: CommerceFixtureMode) {
    setMode(next);
  },
  set(next: CommerceFixtureMode): void {
    setMode(next);
  },
  reset(): void {
    setMode("success");
    orders = seedOrders();
  },
  subscribe(listener: (mode: CommerceFixtureMode) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

const latency = async (base = 220): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, base + Math.random() * base));
};

function requireOnline(): void {
  if (mode === "offline") throw new CommerceFixtureError("OFFLINE");
}

function requireVerified(): void {
  if (mode === "not_verified") throw new CommerceFixtureError("NOT_VERIFIED");
}

// ─── In-memory state (fictional Demo Store serving Demo High School) ──────────────────────────

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

const STORES: StoreSummary[] = [
  {
    id: "stf_demo_1",
    nameBn: "ডেমো স্টোর",
    nameEn: "Demo Store",
    description: "বই, ইউনিফর্ম ও স্টেশনারি — ডেমো হাই স্কুলের শিক্ষার্থীদের জন্য।",
    deliveryNote: "ঢাকা সিটিতে কুরিয়ার (ডেমো); চার্জ ক্যাশে পরিশোধ",
    pickupAddress: "ডেমো প্লাজা, ২য় তলা, মিরপুর ১০, ঢাকা (ডেমো)",
  },
];

const PRODUCT_CARDS: ProductCard[] = [
  { id: "prd_demo_1", nameBn: "বইয়ের বান্ডেল (ক্লাস ৬–৮)", nameEn: "Book bundle (class 6–8)", priceBdt: 450, stockState: "in_stock", category: "books" },
  { id: "prd_demo_2", nameBn: "স্কুল ইউনিফর্ম সেট (ছেলে)", nameEn: "School uniform set (boys)", priceBdt: 1200, stockState: "low", category: "uniforms" },
  { id: "prd_demo_3", nameBn: "স্টেশনারি কিট", nameEn: "Stationery kit", priceBdt: 300, stockState: "out_of_stock", category: "stationery" },
];

const PRODUCT_DETAIL: ProductDetail = {
  id: "prd_demo_2",
  nameBn: "স্কুল ইউনিফর্ম সেট (ছেলে)",
  nameEn: "School uniform set (boys)",
  description: "আরামদায়ক সুতি ইউনিফর্ম — শার্ট ও প্যান্ট (ডেমো)।",
  priceBdt: 1200,
  category: "uniforms",
  stockState: "low",
  images: [],
  variants: [
    { id: "var_demo_38", name: "সাইজ ৩৮", priceDelta: 0, stockState: "in_stock" },
    { id: "var_demo_40", name: "সাইজ ৪০", priceDelta: 0, stockState: "low" },
    { id: "var_demo_42", name: "সাইজ ৪২", priceDelta: 50, stockState: "out_of_stock" },
  ],
  storefrontId: "stf_demo_1",
  storefrontNameBn: "ডেমো স্টোর",
  vendorApproved: true,
  servedSchools: ["ডেমো উচ্চ বিদ্যালয়"],
  pickupAddress: STORES[0]?.pickupAddress ?? "",
  deliveryNote: STORES[0]?.deliveryNote ?? "",
};

const COD_LIMIT_BDT = 5000;

let orderSeq = 0;

function seedOrders(): Order[] {
  return [
    {
      id: "ord_demo_1", orderCode: "KSL-8F3K2", storefrontId: "stf_demo_1", storefrontNameBn: "ডেমো স্টোর",
      status: "ready_for_pickup", fulfilment: "pickup", paymentMethod: "cod",
      totalBdt: 1200, commissionRate: 0.05, commissionBdt: 60,
      placedAt: iso(1), confirmedAt: iso(1), readyAt: iso(0),
      items: [{ productId: "prd_demo_2", variantId: "var_demo_40", qty: 1, unitPriceBdt: 1200,
        snapshot: { nameBn: "স্কুল ইউনিফর্ম সেট (ছেলে)", variantName: "সাইজ ৪০", category: "uniforms", imageMediaIds: [], storefrontNameBn: "ডেমো স্টোর" } }],
    },
    {
      id: "ord_demo_2", orderCode: "KSL-5RC8D", storefrontId: "stf_demo_1", storefrontNameBn: "ডেমো স্টোর",
      status: "shipped", fulfilment: "courier", paymentMethod: "cod",
      totalBdt: 450, commissionRate: 0.05, commissionBdt: 22.5,
      courierName: "সুন্দরবন কুরিয়ার (ডেমো)", trackingNumber: "SB123456789",
      placedAt: iso(4), confirmedAt: iso(4), shippedAt: iso(3),
      items: [{ productId: "prd_demo_1", qty: 1, unitPriceBdt: 450,
        snapshot: { nameBn: "বইয়ের বান্ডেল (ক্লাস ৬–৮)", category: "books", imageMediaIds: [], storefrontNameBn: "ডেমো স্টোর" } }],
    },
  ];
}

let orders: Order[] = seedOrders();

// ─── Seam functions (typed from the spec) ─────────────────────────────────────────────────────

/** GET /commerce/stores — active stores serving my school (INV-1). */
export async function listStores(): Promise<StoreSummary[]> {
  await latency(200);
  requireOnline();
  return STORES.map((s) => ({ ...s }));
}

/** GET /commerce/stores/{id}/products — school check server-side; out-of-stock stays visible. */
export async function listStoreProducts(storeId: string): Promise<ProductCard[]> {
  await latency(220);
  requireOnline();
  if (storeId !== STORES[0]?.id) throw new CommerceFixtureError("NOT_FOUND");
  return PRODUCT_CARDS.map((p) => ({ ...p }));
}

/** GET /commerce/products/{id} — detail with variant availability + trust signals. */
export async function getProduct(id: string): Promise<ProductDetail> {
  await latency(200);
  requireOnline();
  const card = PRODUCT_CARDS.find((p) => p.id === id);
  if (!card) throw new CommerceFixtureError("NOT_FOUND");
  return { ...PRODUCT_DETAIL, id: card.id, nameBn: card.nameBn, nameEn: card.nameEn, priceBdt: card.priceBdt, stockState: card.stockState };
}

/**
 * POST /commerce/orders — placement tx (reserve, snapshot, commission freeze). Never optimistic;
 * races surface `OUT_OF_STOCK` naming the item; COD limit ৳5,000 (OQ-2); verified-only (BR-003).
 */
export async function placeOrder(input: OrderInput): Promise<Order> {
  await latency(340);
  requireOnline();
  requireVerified();
  let total = 0;
  for (const item of input.items) {
    const card = PRODUCT_CARDS.find((p) => p.id === item.productId);
    if (!card) throw new CommerceFixtureError("NOT_FOUND");
    if (mode === "out_of_stock" || card.stockState === "out_of_stock") {
      throw new CommerceFixtureError("OUT_OF_STOCK", card.nameBn);
    }
    const detail = PRODUCT_DETAIL;
    const variant = input.items.length === 1 && item.variantId
      ? detail.variants.find((v) => v.id === item.variantId)
      : undefined;
    total += (card.priceBdt + (variant?.priceDelta ?? 0)) * item.qty;
  }
  if (total > COD_LIMIT_BDT) {
    throw new CommerceFixtureError("VALIDATION_FAILED", "validation.commerce.cod_limit");
  }
  if (input.fulfilment === "courier" && !input.fulfilmentAddress) {
    throw new CommerceFixtureError("VALIDATION_FAILED", "validation.commerce.address_required");
  }
  orderSeq += 1;
  const order: Order = {
    id: `ord_demo_new_${String(orderSeq)}`,
    orderCode: `KSL-${String(orderSeq)}NEW${String((orderSeq * 7) % 10)}`,
    storefrontId: input.storefrontId,
    storefrontNameBn: STORES[0]?.nameBn ?? "ডেমো স্টোর",
    status: "placed",
    fulfilment: input.fulfilment,
    fulfilmentAddress: input.fulfilmentAddress
      ? `${input.fulfilmentAddress.recipientName}, ${input.fulfilmentAddress.recipientPhone}, ${input.fulfilmentAddress.city}, ${input.fulfilmentAddress.area}, ${input.fulfilmentAddress.addressLine}`
      : undefined,
    totalBdt: total,
    commissionRate: 0.05,
    commissionBdt: Math.round(total * 0.05 * 100) / 100,
    paymentMethod: "cod",
    buyerNote: input.buyerNote,
    placedAt: new Date().toISOString(),
    items: input.items.map((item) => {
      const card = PRODUCT_CARDS.find((p) => p.id === item.productId);
      if (!card) throw new CommerceFixtureError("NOT_FOUND", item.productId);
      const variant = item.variantId ? PRODUCT_DETAIL.variants.find((v) => v.id === item.variantId) : undefined;
      return {
        productId: item.productId,
        variantId: item.variantId,
        qty: item.qty,
        unitPriceBdt: card.priceBdt + (variant?.priceDelta ?? 0),
        snapshot: {
          nameBn: card.nameBn,
          nameEn: card.nameEn,
          variantName: variant?.name,
          category: card.category,
          imageMediaIds: [],
          storefrontNameBn: STORES[0]?.nameBn ?? "ডেমো স্টোর",
        },
      };
    }),
  };
  orders = [order, ...orders];
  return order;
}

/** GET /commerce/orders — row-level own (INV-5 buyer side). */
export async function listMyOrders(): Promise<Order[]> {
  await latency(200);
  requireOnline();
  return orders.map((o) => ({ ...o, items: o.items.map((i) => ({ ...i })) }));
}

/** GET /commerce/orders/{id} — own detail. */
export async function getMyOrder(id: string): Promise<Order> {
  await latency(200);
  requireOnline();
  const row = orders.find((o) => o.id === id);
  if (!row) throw new CommerceFixtureError("NOT_FOUND");
  return { ...row, items: row.items.map((i) => ({ ...i })) };
}

/** POST /commerce/orders/{id}/cancel — placed/confirmed/ready only; placed-cancel releases stock. */
export async function cancelMyOrder(id: string, reason?: string): Promise<Order> {
  await latency(240);
  requireOnline();
  const row = orders.find((o) => o.id === id);
  if (!row) throw new CommerceFixtureError("NOT_FOUND");
  if (mode === "conflict" || !["placed", "confirmed", "ready_for_pickup"].includes(row.status)) {
    throw new CommerceFixtureError("CONFLICT");
  }
  row.status = "cancelled";
  row.cancelledAt = new Date().toISOString();
  row.cancelledBy = "buyer";
  if (reason) row.cancelReason = reason;
  return { ...row, items: row.items.map((i) => ({ ...i })) };
}

/** Clears mutable seam state (tests). */
export function resetCommerceAppFixtures(): void {
  setMode("success");
  orderSeq = 0;
  orders = seedOrders();
}

export { COD_LIMIT_BDT };
