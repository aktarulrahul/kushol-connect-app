// Payments query hooks (PAY-AP-*): TanStack Query over the payments seam — live sessions hit the
// generated client (backend.ts), fixture sessions keep the Stage-2 seam. Money is never
// optimistic; offline payments are refused up front (§8) — nothing queued.
import { useMutation, useQuery } from "@tanstack/react-query";

import type { Gateway } from "@/fixtures/payments";
import {
  getInvoice,
  getInvoiceStatus,
  getReceipt,
  initiatePayment,
  listMyInvoices,
} from "@/lib/payments/backend";

export const paymentsKeys = {
  invoices: ["payments", "invoices"] as const,
  invoice: (id: string) => ["payments", "invoice", id] as const,
  receipt: (txnId: string) => ["payments", "receipt", txnId] as const,
};

export function useMyInvoices() {
  return useQuery({ queryKey: paymentsKeys.invoices, queryFn: listMyInvoices });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: paymentsKeys.invoice(id ?? ""),
    queryFn: () => getInvoice(id as string),
    enabled: Boolean(id),
  });
}

export function useInitiate() {
  return useMutation({
    mutationFn: (input: { invoiceId: string; gateway: Gateway }) =>
      initiatePayment(input.invoiceId, input.gateway),
  });
}

export function useInvoiceStatus(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ["payments", "invoice", invoiceId, "status"],
    queryFn: () => getInvoiceStatus(invoiceId as string),
    enabled: Boolean(invoiceId),
    refetchInterval: 3000,
  });
}

export function useReceipt(txnId: string | undefined) {
  return useQuery({
    queryKey: paymentsKeys.receipt(txnId ?? ""),
    queryFn: () => getReceipt(txnId as string),
    enabled: Boolean(txnId),
  });
}
