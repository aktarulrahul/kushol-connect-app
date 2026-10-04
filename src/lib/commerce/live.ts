// Live commerce client (Stage 5): buyer reads + placement through the generated openapi-fetch
// client (`liveAuth()`). Problem codes map to the seam vocabulary; transport failures surface as
// `OFFLINE`. `client` is injectable so unit tests never touch the network.
import { isProblem, type ApiClient, type Schemas } from "@/api/client";

type StoreSummary = Schemas["CommerceStoreSummary"];
type ProductCard = Schemas["CommerceProductCard"];
type ProductDetail = Schemas["CommerceProductDetail"];
type Order = Schemas["CommerceOrder"];
type OrderInput = Schemas["CommerceOrderInput"];

export class CommerceApiError extends Error {
  constructor(readonly code: string, readonly detail?: string) {
    super(`commerce api: ${code}`);
    this.name = "CommerceApiError";
  }
}

type Client = Pick<ApiClient, "GET" | "POST" | "PATCH">;

type Result<T> = { data?: T; error?: unknown; response: Response };

async function call<T>(run: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await run();
  } catch {
    throw new CommerceApiError("OFFLINE");
  }
}

function problemCode(error: unknown, response: Response): string {
  if (isProblem(error)) return error.code;
  return `HTTP_${String(response.status)}`;
}

/** GET /commerce/stores — school-scoped (server-side join, INV-1). */
export async function listStoresLive(client: Client): Promise<StoreSummary[]> {
  const { data, error, response } = await call(() => client.GET("/api/v1/commerce/stores"));
  if (data) return data.data;
  throw new CommerceApiError(problemCode(error, response));
}

/** GET /commerce/stores/{id}/products — availability tri-state included. */
export async function listStoreProductsLive(storeId: string, client: Client): Promise<ProductCard[]> {
  const { data, error, response } = await call(() =>
    client.GET("/api/v1/commerce/stores/{id}/products", { params: { path: { id: storeId } } }),
  );
  if (data) return data.data;
  throw new CommerceApiError(problemCode(error, response));
}

/** GET /commerce/products/{id} — detail + trust signals. */
export async function getProductLive(id: string, client: Client): Promise<ProductDetail> {
  const { data, error, response } = await call(() =>
    client.GET("/api/v1/commerce/products/{id}", { params: { path: { id } } }),
  );
  if (data) return data.data;
  throw new CommerceApiError(problemCode(error, response));
}

/** POST /commerce/orders — placement tx; OUT_OF_STOCK names the item via `detail`. */
export async function placeOrderLive(input: OrderInput, client: Client): Promise<Order> {
  const { data, error, response } = await call(() =>
    client.POST("/api/v1/commerce/orders", { body: input }),
  );
  if (data) return data.data;
  throw new CommerceApiError(problemCode(error, response), (error as { detail?: string } | undefined)?.detail);
}

/** GET /commerce/orders — row-level own. */
export async function listMyOrdersLive(client: Client): Promise<Order[]> {
  const { data, error, response } = await call(() => client.GET("/api/v1/commerce/orders"));
  if (data) return data.data;
  throw new CommerceApiError(problemCode(error, response));
}

/** GET /commerce/orders/{id} — own detail. */
export async function getMyOrderLive(id: string, client: Client): Promise<Order> {
  const { data, error, response } = await call(() =>
    client.GET("/api/v1/commerce/orders/{id}", { params: { path: { id } } }),
  );
  if (data) return data.data;
  throw new CommerceApiError(problemCode(error, response));
}

/** POST /commerce/orders/{id}/cancel — placed/confirmed/ready only. */
export async function cancelMyOrderLive(id: string, reason: string | undefined, client: Client): Promise<Order> {
  const { data, error, response } = await call(() =>
    client.POST("/api/v1/commerce/orders/{id}/cancel", {
      params: { path: { id } },
      body: reason ? { cancelReason: reason } : {},
    }),
  );
  if (data) return data.data;
  throw new CommerceApiError(problemCode(error, response));
}
