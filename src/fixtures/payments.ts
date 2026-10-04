// ─── THE STAGE-2 PAYMENTS SEAM (app payer) ────────────────────────────────────────────────────
// Every payments call imports from this file ONLY (one-file swap onto the generated client via
// `live.ts`/`backend.ts` in Stage 5 — the tuition/commerce pattern). Types from the generated
// spec; data fictional; money actions are NEVER queued offline (§8).
import type { components } from "@/api/schema.gen";

type Schemas = components["schemas"];
export type Invoice = Schemas["PaymentsInvoice"];
export type Transaction = Schemas["PaymentsTransaction"];
export type Gateway = Schemas["PaymentsGateway"];
export type RedirectPayload = Schemas["PaymentsRedirectPayload"];

import { CommerceFixtureError } from "@/fixtures/commerce";

// ─── Flag switcher ────────────────────────────────────────────────────────────────────────────

export const PAYMENTS_FIXTURE_MODES = ["success", "offline", "forbidden", "conflict", "gateway_down"] as const;
export type PaymentsFixtureMode = (typeof PAYMENTS_FIXTURE_MODES)[number];

const listeners = new Set<(mode: PaymentsFixtureMode) => void>();
let mode: PaymentsFixtureMode = "success";

function setMode(next: PaymentsFixtureMode): void {
  mode = next;
  for (const listener of listeners) listener(next);
}

export const paymentsFixtureFlags = {
  get mode(): PaymentsFixtureMode {
    return mode;
  },
  set mode(next: PaymentsFixtureMode) {
    setMode(next);
  },
  set(next: PaymentsFixtureMode): void {
    setMode(next);
  },
  reset(): void {
    setMode("success");
    invoices = seedInvoices();
  },
  subscribe(listener: (mode: PaymentsFixtureMode) => void): () => void {
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

// ─── In-memory state (fictional Demo High School invoices) ────────────────────────────────────

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();
const daysAhead = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);

function seedInvoices(): Invoice[] {
  return [
    { id: "inv_demo_1", studentId: "usr_demo_student", title: "টিউশন ফি — অক্টোবর", kind: "tuition", amountBdt: 1250, dueDate: daysAhead(9), status: "issued", createdAt: iso(3) },
    { id: "inv_demo_2", studentId: "usr_demo_student", title: "পরীক্ষার ফি", kind: "exam", amountBdt: 450, dueDate: daysAhead(2), status: "issued", createdAt: iso(6) },
    { id: "inv_demo_3", studentId: "usr_demo_student", title: "পরিবহন ফি — সেপ্টেম্বর", kind: "transport", amountBdt: 450, dueDate: daysAhead(-4), status: "paid", createdAt: iso(34) },
  ];
}

let invoices: Invoice[] = seedInvoices();

// ─── Seam functions (typed from the spec) ─────────────────────────────────────────────────────

/** GET /school/invoices (payer view is the student-scoped slice; fixture returns the demo set). */
export async function listMyInvoices(): Promise<Invoice[]> {
  await latency(200);
  requireOnline();
  return invoices.map((i) => ({ ...i }));
}

export async function getInvoice(id: string): Promise<Invoice> {
  await latency(180);
  requireOnline();
  const row = invoices.find((i) => i.id === id);
  if (!row) throw new CommerceFixtureError("NOT_FOUND");
  return { ...row };
}

/**
 * POST /payments/initiate — money: never optimistic, never queued offline (§8). Gateway-down
 * surfaces PAYMENT_FAILED so the chooser hides that gateway; CONFLICT → already paid (receipt).
 */
export async function initiatePayment(
  invoiceId: string,
  gateway: Gateway,
): Promise<RedirectPayload> {
  await latency(340);
  requireOnline();
  const row = invoices.find((i) => i.id === invoiceId);
  if (!row) throw new CommerceFixtureError("NOT_FOUND");
  if (mode === "conflict" || row.status === "paid") throw new CommerceFixtureError("CONFLICT");
  if (row.status === "void") throw new CommerceFixtureError("FORBIDDEN");
  if (mode === "gateway_down") throw new CommerceFixtureError("VALIDATION_FAILED", "PAYMENT_FAILED:" + gateway);
  return {
    txnId: "txn_demo_" + row.id,
    gateway,
    redirectUrl: "https://sandbox.payments.kushol.test/" + gateway + "/" + row.id,
    redirectMethod: "GET",
    params: {},
  };
}

/** GET /payments/invoices/{id}/status — the status-screen poll (invoice + paid txn). */
export async function getInvoiceStatus(invoiceId: string): Promise<{ status: string; paidTxnId?: string }> {
  await latency(160);
  requireOnline();
  const row = invoices.find((i) => i.id === invoiceId);
  if (!row) throw new CommerceFixtureError("NOT_FOUND");
  if (row.status === "issued" && mode === "success") {
    // Sandbox behaviour: after the mock gateway session, the payment settles.
    row.status = "paid";
  }
  return { status: row.status, ...(row.status === "paid" ? { paidTxnId: "txn_demo_" + row.id } : {}) };
}

/** GET /payments/receipts/{txnId} — immutable R2 URL; NOT_FOUND while generating. */
export async function getReceipt(txnId: string): Promise<{ receiptUrl: string; serialNo: string; issuedAt: string }> {
  await latency(180);
  requireOnline();
  return {
    receiptUrl: "/media/receipts/" + txnId + ".pdf",
    serialNo: "DEMO-26-000042",
    issuedAt: iso(0),
  };
}

/** Clears mutable seam state (tests). */
export function resetPaymentsFixtures(): void {
  setMode("success");
  invoices = seedInvoices();
}
