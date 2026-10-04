// The commerce backend selector (Stage 5): live sessions (real JWT) route to the generated
// client (`live.ts`); fixture sessions (`access_demo_*`, dev switcher, Maestro) keep the Stage-2
// seam — the same split as the tuition/notifications modules.
import type { ApiClient } from "@/api/client";
import type { Order, OrderInput } from "@/fixtures/commerce";
import { isFixtureAccessToken } from "@/lib/auth/session-restore";
import { liveAuth } from "@/lib/auth/live-session";
import { tokenStore } from "@/lib/auth/token-store";
import {
  cancelMyOrderLive,
  getMyOrderLive,
  getProductLive,
  listMyOrdersLive,
  listStoreProductsLive,
  listStoresLive,
  placeOrderLive,
} from "@/lib/commerce/live";
import {
  cancelMyOrder as cancelMyOrderFixture,
  getMyOrder as getMyOrderFixture,
  getProduct as getProductFixture,
  listMyOrders as listMyOrdersFixture,
  listStoreProducts as listStoreProductsFixture,
  listStores as listStoresFixture,
  placeOrder as placeOrderFixture,
} from "@/fixtures/commerce";

function liveClient(): ApiClient {
  return liveAuth();
}

/** True when the stored session is a real api session (not the fixture demo login). */
export async function isLiveSession(
  store: Pick<typeof tokenStore, "get"> = tokenStore,
): Promise<boolean> {
  const tokens = await store.get();
  if (!tokens) return false;
  return !isFixtureAccessToken(tokens.accessToken);
}

export async function listStores() {
  if (await isLiveSession()) {
    return listStoresLive(liveClient());
  }
  return listStoresFixture();
}

export async function listStoreProducts(storeId: string) {
  if (await isLiveSession()) {
    return listStoreProductsLive(storeId, liveClient());
  }
  return listStoreProductsFixture(storeId);
}

export async function getProduct(id: string) {
  if (await isLiveSession()) {
    return getProductLive(id, liveClient());
  }
  return getProductFixture(id);
}

export async function placeOrder(input: OrderInput): Promise<Order> {
  if (await isLiveSession()) {
    return placeOrderLive(input, liveClient());
  }
  return placeOrderFixture(input);
}

export async function listMyOrders() {
  if (await isLiveSession()) {
    return listMyOrdersLive(liveClient());
  }
  return listMyOrdersFixture();
}

export async function getMyOrder(id: string) {
  if (await isLiveSession()) {
    return getMyOrderLive(id, liveClient());
  }
  return getMyOrderFixture(id);
}

export async function cancelMyOrder(id: string, reason?: string): Promise<Order> {
  if (await isLiveSession()) {
    return cancelMyOrderLive(id, reason, liveClient());
  }
  return cancelMyOrderFixture(id, reason);
}
