// The payments backend selector (Stage 5): live sessions (real JWT) route to the generated
// client (`live.ts`); fixture sessions keep the Stage-2 seam — tuition/commerce pattern.
import type { ApiClient } from "@/api/client";
import type { Gateway } from "@/fixtures/payments";
import { isFixtureAccessToken } from "@/lib/auth/session-restore";
import { liveAuth } from "@/lib/auth/live-session";
import { tokenStore } from "@/lib/auth/token-store";
import {
  getInvoiceLive,
  getInvoiceStatusLive,
  getReceiptLive,
  initiatePaymentLive,
  listMyInvoicesLive,
} from "@/lib/payments/live";
import {
  getInvoice as getInvoiceFixture,
  getInvoiceStatus as getInvoiceStatusFixture,
  getReceipt as getReceiptFixture,
  initiatePayment as initiatePaymentFixture,
  listMyInvoices as listMyInvoicesFixture,
} from "@/fixtures/payments";

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

export async function listMyInvoices() {
  if (await isLiveSession()) {
    return listMyInvoicesLive(liveClient());
  }
  return listMyInvoicesFixture();
}

export async function getInvoice(id: string) {
  if (await isLiveSession()) {
    return getInvoiceLive(id, liveClient());
  }
  return getInvoiceFixture(id);
}

export async function initiatePayment(invoiceId: string, gateway: Gateway) {
  if (await isLiveSession()) {
    return initiatePaymentLive(invoiceId, gateway, liveClient());
  }
  return initiatePaymentFixture(invoiceId, gateway);
}

export async function getInvoiceStatus(invoiceId: string) {
  if (await isLiveSession()) {
    return getInvoiceStatusLive(invoiceId, liveClient());
  }
  return getInvoiceStatusFixture(invoiceId);
}

export async function getReceipt(txnId: string) {
  if (await isLiveSession()) {
    return getReceiptLive(txnId, liveClient());
  }
  return getReceiptFixture(txnId);
}
