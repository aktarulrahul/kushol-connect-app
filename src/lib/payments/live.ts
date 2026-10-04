// Live payments client (Stage 5): payer reads + initiate through the generated openapi-fetch
// client (`liveAuth()`); problem codes map to the seam vocabulary; transport → OFFLINE.
import { isProblem, type ApiClient, type Schemas } from "@/api/client";

type Invoice = Schemas["PaymentsInvoice"];
type Gateway = Schemas["PaymentsGateway"];
type RedirectPayload = Schemas["PaymentsRedirectPayload"];

export class PaymentsApiError extends Error {
  constructor(readonly code: string, readonly detail?: string) {
    super(`payments api: ${code}`);
    this.name = "PaymentsApiError";
  }
}

type Client = Pick<ApiClient, "GET" | "POST" | "PATCH">;

type Result<T> = { data?: T; error?: unknown; response: Response };

async function call<T>(run: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await run();
  } catch {
    throw new PaymentsApiError("OFFLINE");
  }
}

function problemCode(error: unknown, response: Response): string {
  if (isProblem(error)) return error.code;
  return `HTTP_${String(response.status)}`;
}

/** GET /school/invoices — payer slice (the student's own invoices). */
export async function listMyInvoicesLive(client: Client): Promise<Invoice[]> {
  const { data, error, response } = await call(() => client.GET("/api/v1/school/invoices"));
  if (data) return data.data;
  throw new PaymentsApiError(problemCode(error, response));
}

export async function getInvoiceLive(_id: string, _client: Client): Promise<Invoice> {
  // The contract exposes invoice reads through the ledger list (School Admin) and the status
  // route (payer); the payer detail is the status payload + the list row. Kept on the list.
  const rows = await listMyInvoicesLive(_client);
  const row = rows.find((i) => i.id === _id);
  if (!row) throw new PaymentsApiError("NOT_FOUND");
  return row;
}

/** POST /payments/initiate — verified + entitled payer; RedirectPayload back. */
export async function initiatePaymentLive(
  invoiceId: string,
  gateway: Gateway,
  client: Client,
): Promise<RedirectPayload> {
  const { data, error, response } = await call(() =>
    client.POST("/api/v1/payments/initiate", {
      body: { invoiceId, gateway },
    }),
  );
  if (data) return data.data;
  throw new PaymentsApiError(problemCode(error, response), (error as { detail?: string } | undefined)?.detail);
}

/** GET /payments/invoices/{id}/status — the status-screen poll. */
export async function getInvoiceStatusLive(invoiceId: string, client: Client) {
  const { data, error, response } = await call(() =>
    client.GET("/api/v1/payments/invoices/{invoiceId}/status", {
      params: { path: { invoiceId } },
    }),
  );
  if (data) return data.data;
  throw new PaymentsApiError(problemCode(error, response));
}

/** GET /payments/receipts/{txnId} — immutable R2 URL + serial. */
export async function getReceiptLive(txnId: string, client: Client) {
  const { data, error, response } = await call(() =>
    client.GET("/api/v1/payments/receipts/{txnId}", { params: { path: { txnId } } }),
  );
  if (data) return data.data;
  throw new PaymentsApiError(problemCode(error, response));
}
