// Checkout form schemas (CMP §3): zod mirrors of the OpenAPI contract — the api re-validates;
// these drive the checkout address form, qty and cancel with the shared validation.commerce.* keys.
import { z } from "zod";

export const COMMERCE_CATEGORIES = ["books", "uniforms", "stationery", "other"] as const;

/** Bangladesh E.164 phone (validation.commerce.address_phone). */
export const bdPhone = z
  .string()
  .regex(/^(\+8801[3-9]\d{8}|8801[3-9]\d{8})$/, { message: "validation.commerce.address_phone" });

export const checkoutAddress = z.object({
  recipientName: z
    .string()
    .trim()
    .min(3, { message: "validation.commerce.address_name" })
    .max(120, { message: "validation.commerce.address_name" }),
  recipientPhone: bdPhone,
  city: z.string().trim().min(2, { message: "validation.commerce.address_city" }).max(80),
  area: z.string().trim().min(2, { message: "validation.commerce.address_area" }).max(80),
  addressLine: z
    .string()
    .trim()
    .min(10, { message: "validation.commerce.address_line" })
    .max(200, { message: "validation.commerce.address_line" }),
});

export const checkoutForm = z
  .object({
    variantId: z.string().optional(),
    qty: z.number().int().min(1, { message: "validation.commerce.qty_range" }).max(10, { message: "validation.commerce.qty_range" }),
    fulfilment: z.enum(["pickup", "courier"], { message: "validation.commerce.fulfilment_invalid" }),
    buyerNote: z.string().max(300).optional(),
  })
  .and(
    z.object({
      fulfilment: z.literal("courier"),
      address: checkoutAddress,
    }),
  )
  .or(
    z.object({
      variantId: z.string().optional(),
      qty: z.number().int().min(1).max(10),
      fulfilment: z.literal("pickup"),
      buyerNote: z.string().max(300).optional(),
    }),
  );

export const buyerCancelForm = z.object({
  cancelReason: z.string().max(500).optional(),
});

export type CheckoutAddress = z.infer<typeof checkoutAddress>;
export type CheckoutValues = {
  variantId?: string;
  qty: number;
  fulfilment: "pickup" | "courier";
  buyerNote?: string;
  address?: CheckoutAddress;
};
