// Commerce query hooks (CMP-AP-*): TanStack Query over the tuition-style seam. Placement is
// NEVER optimistic (stock is server truth); cancel needs connectivity; the initial placement
// queues exactly once offline with replay verdicts (05 §8). Stage 5 re-points to the live client.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { OrderInput } from "@/fixtures/commerce";
import {
  cancelMyOrder,
  getMyOrder,
  getProduct,
  listMyOrders,
  listStoreProducts,
  listStores,
  placeOrder,
} from "@/lib/commerce/backend";

export const commerceKeys = {
  stores: ["commerce", "stores"] as const,
  storeProducts: (id: string) => ["commerce", "store", id, "products"] as const,
  product: (id: string) => ["commerce", "product", id] as const,
  myOrders: ["commerce", "orders"] as const,
  order: (id: string) => ["commerce", "orders", id] as const,
};

export function useStores() {
  return useQuery({ queryKey: commerceKeys.stores, queryFn: listStores });
}

export function useStoreProducts(storeId: string | undefined) {
  return useQuery({
    queryKey: commerceKeys.storeProducts(storeId ?? ""),
    queryFn: () => listStoreProducts(storeId as string),
    enabled: Boolean(storeId),
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: commerceKeys.product(id ?? ""),
    queryFn: () => getProduct(id as string),
    enabled: Boolean(id),
  });
}

export function useMyOrders() {
  return useQuery({ queryKey: commerceKeys.myOrders, queryFn: listMyOrders });
}

export function useMyOrder(id: string | undefined) {
  return useQuery({
    queryKey: commerceKeys.order(id ?? ""),
    queryFn: () => getMyOrder(id as string),
    enabled: Boolean(id),
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: OrderInput) => placeOrder(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commerceKeys.myOrders });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => cancelMyOrder(id, reason),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: commerceKeys.myOrders });
    },
  });
}

// ─── Offline placement queue (CMP-AP-010, 05 §8) — exactly-once, replay verdicts surface. ─────

export type QueuedOrder = { id: string; input: OrderInput; queuedAt: string };

const listeners = new Set<() => void>();
let queue: QueuedOrder[] = [];

function emit(): void {
  for (const listener of listeners) listener();
}

export function usePendingOrders(): QueuedOrder[] {
  const [rows, setRows] = useState<QueuedOrder[]>(queue);
  useEffect(() => {
    const listener = () => { setRows([...queue]); };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return rows;
}

export function queueOrder(input: OrderInput): QueuedOrder {
  const row: QueuedOrder = { id: `q_${String(Date.now())}`, input, queuedAt: new Date().toISOString() };
  queue = [...queue, row];
  emit();
  return row;
}

export function removeQueuedOrder(id: string): void {
  queue = queue.filter((row) => row.id !== id);
  emit();
}

/** Replays the oldest queued order once (verdicts surface — never silently lost, §8). */
export async function replayPendingOrders(
  isOnline: boolean,
  replay: (input: OrderInput) => Promise<unknown>,
): Promise<QueuedOrder[]> {
  const next = queue[0];
  if (!isOnline || !next) return [...queue];
  try {
    await replay(next.input);
    removeQueuedOrder(next.id);
  } catch {
    // stays queued — the result screen shows the server verdict (OUT_OF_STOCK etc.)
  }
  return [...queue];
}
