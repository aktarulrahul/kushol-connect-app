// Contact + registration zod schemas (03 `05-app-tasks.md` §3). Message values are i18n keys
// (validation.* — 01-user-stories.md §6), resolved by t() in the screens; nothing user-facing
// lives here.
import { z } from "zod";

import type { CatalogKey } from "@/i18n";

/** BD mobile (01 §6): `^(?:\+?880|0)1[3-9]\d{8}$`, normalized to E.164 `+8801XXXXXXXXX`. */
export const BD_PHONE_PATTERN = /^(?:\+?880|0)1[3-9]\d{8}$/;

export function isBdPhone(raw: string): boolean {
  return BD_PHONE_PATTERN.test(raw.trim());
}

export function normalizePhone(raw: string): string {
  const trimmed = raw.trim().replace(/^\+/, "");
  if (!isBdPhone(trimmed)) return raw.trim();
  return trimmed.startsWith("880") ? `+${trimmed}` : `+880${trimmed.slice(1)}`;
}

export const fullNameSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(2, "validation.name.length").max(80, "validation.name.length"));

export const phoneSchema = z.string().regex(BD_PHONE_PATTERN, "validation.phone.invalid");

export const studentCodeSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(3, "validation.guardian.student_code")
      .max(20, "validation.guardian.student_code"),
  );

export const RELATIONS = ["father", "mother", "other"] as const;
export type GuardianRelation = (typeof RELATIONS)[number];

/** Field → i18n key map; an empty object means the draft is submittable. */
export type ContactErrors = Partial<
  Record<"full_name" | "phone" | "student_code" | "relation", CatalogKey>
>;

type ContactDraft = {
  role: "student" | "guardian" | "teacher" | "super_admin" | "school_admin" | "vendor";
  fullName: string;
  phone: string;
  studentCode: string;
  relation: GuardianRelation | null;
};

/** Validates the contact step; guardian-only fields are enforced only for role=guardian. */
export function validateContact(draft: ContactDraft): ContactErrors {
  const errors: ContactErrors = {};
  const name = fullNameSchema.safeParse(draft.fullName);
  if (!name.success) {
    errors.full_name = (name.error.issues[0]?.message ?? "validation.name.length") as CatalogKey;
  }
  if (draft.role === "student" || draft.role === "guardian") {
    const phone = phoneSchema.safeParse(draft.phone.trim());
    if (!phone.success) errors.phone = "validation.phone.invalid";
  }
  if (draft.role === "guardian") {
    const code = studentCodeSchema.safeParse(draft.studentCode);
    if (!code.success) {
      errors.student_code = "validation.guardian.student_code";
    }
    if (draft.relation === null) errors.relation = "validation.choose_one";
  }
  return errors;
}
