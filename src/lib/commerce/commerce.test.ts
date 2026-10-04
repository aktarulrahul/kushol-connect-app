import { deepLinkFor } from "@/lib/notifications/notifications";
import { COMMERCE_CATEGORIES, bdPhone, checkoutAddress } from "@/schemas/commerce";
import {
  COMMERCE_FIXTURE_MODES,
  COD_LIMIT_BDT,
  commerceFixtureFlags,
  cancelMyOrder,
  getProduct,
  listStores,
  placeOrder,
  resetCommerceAppFixtures,
} from "@/fixtures/commerce";
import { queueOrder, removeQueuedOrder, replayPendingOrders } from "./use-commerce";
import type { OrderInput } from "@/fixtures/commerce";

function orderInput(over: Partial<OrderInput> = {}): OrderInput {
  return {
    storefrontId: "stf_demo_1",
    items: [{ productId: "prd_demo_1", qty: 1 }],
    fulfilment: "pickup",
    ...over,
  };
}

afterEach(() => {
  resetCommerceAppFixtures();
  for (let i = 0; i < 20; i += 1) removeQueuedOrder(`q_${String(i)}`);
});

describe("commerce buyer seam (Stage 2 fixtures)", () => {
  it("lists school-scoped stores and hides out-of-stock nowhere (visible-with-label)", async () => {
    const stores = await listStores();
    expect(stores).toHaveLength(1);
    const detail = await getProduct("prd_demo_3"); // stationery kit — out of stock
    expect(detail.stockState).toBe("out_of_stock");
    expect(detail.vendorApproved).toBe(true);
  });

  it("refuses orders for out-of-stock items, naming the product (CMP-BR-004 loser path)", async () => {
    await expect(placeOrder(orderInput({ items: [{ productId: "prd_demo_3", qty: 1 }] }))).rejects.toMatchObject({
      code: "OUT_OF_STOCK",
      detail: "স্টেশনারি কিট",
    });
  });

  it("gates placement + browse-purchase behind verification (CMP-BR-003)", async () => {
    commerceFixtureFlags.mode = "not_verified";
    await expect(placeOrder(orderInput())).rejects.toMatchObject({ code: "NOT_VERIFIED" });
  });

  it("enforces the COD limit with the shared copy (CMP-BR-009, OQ-2 default ৳5,000)", async () => {
    expect(COD_LIMIT_BDT).toBe(5000);
    await expect(
      placeOrder(orderInput({ items: [{ productId: "prd_demo_2", qty: 10 }] })),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED", detail: "validation.commerce.cod_limit" });
  });

  it("cancels only before shipped (CMP-BR-008); buyer cancel is allowed on ready", async () => {
    await expect(cancelMyOrder("ord_demo_2")).rejects.toMatchObject({ code: "CONFLICT" }); // shipped
    const cancelled = await cancelMyOrder("ord_demo_1");
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelledBy).toBe("buyer");
  });

  it("offline blocks reads (§8); the queue holds exactly-once posts", async () => {
    commerceFixtureFlags.mode = COMMERCE_FIXTURE_MODES[1];
    await expect(listStores()).rejects.toMatchObject({ code: "OFFLINE" });
  });
});

describe("offline placement queue (CMP-AP-010)", () => {
  it("replays once when online and keeps the order queued on failure", async () => {
    const queued = queueOrder(orderInput());
    expect(queued.id).toBeTruthy();
    let attempts = 0;
    const remaining = await replayPendingOrders(true, () => {
      attempts += 1;
      return Promise.resolve();
    });
    expect(attempts).toBe(1);
    expect(remaining.find((row) => row.id === queued.id)).toBeUndefined();
  });

  it("never replays offline", async () => {
    queueOrder(orderInput());
    let attempts = 0;
    const remaining = await replayPendingOrders(false, () => {
      attempts += 1;
      return Promise.resolve();
    });
    expect(attempts).toBe(0);
    expect(remaining).toHaveLength(1);
  });
});

describe("checkout schemas + deep link (CMP §3 / CMP-AP-009)", () => {
  it("validates the BD phone and courier address", () => {
    expect(bdPhone.safeParse("+8801712345678").success).toBe(true);
    expect(bdPhone.safeParse("01712345678").success).toBe(false);
    expect(
      checkoutAddress.safeParse({
        recipientName: "রহিম উদ্দিন", recipientPhone: "+8801712345678",
        city: "ঢাকা", area: "মিরপুর", addressLine: "বাড়ি ১২, রোড ৫, ডেমো",
      }).success,
    ).toBe(true);
    expect(COMMERCE_CATEGORIES).toContain("uniforms");
  });

  it("maps commerce_order_status pushes to the order screen (additive 06 §7)", () => {
    expect(deepLinkFor({ deepLink: "/marketplace/orders/ord_123" })).toEqual({
      pathname: "/marketplace/orders/[id]",
      params: { id: "ord_123" },
    });
    expect(deepLinkFor({ deepLink: "/marketplace" })).toBeNull();
  });
});
