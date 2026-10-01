// School-request (missing institution) zod schemas — owner requirement 2026-10-01: submitted from
// the signup hierarchy step when the school dropdown has no match; the application admin then
// connects the POC to onboard the institution. Same conventions as register.ts: message values
// are i18n keys (validation.*), resolved by t() in the screen; nothing user-facing lives here.
import { z } from "zod";

import type { CatalogKey } from "@/i18n";

import { BD_PHONE_PATTERN } from "./register";

export const SCHOOL_REQUEST_TYPES = ["school", "college"] as const;
export type SchoolRequestType = (typeof SCHOOL_REQUEST_TYPES)[number];

/** Institution name 2–120; the app-side POC name mirrors the contact step's 2–80. */
export const institutionNameSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(2, "validation.school_name.length").max(120, "validation.school_name.length"));

export const institutionAddressSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().max(240, "validation.school_address.length"));

export const pocNameSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(2, "validation.name.length").max(80, "validation.name.length"));

export const pocPhoneSchema = z.string().regex(BD_PHONE_PATTERN, "validation.phone.invalid");

const pocEmailSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().email("validation.email.invalid"));

/** What the form edits (cityId is prefilled from the chosen city, never typed). */
export type SchoolRequestForm = {
  name: string;
  type: SchoolRequestType;
  cityId: string;
  address: string;
  pocName: string;
  pocPhone: string;
  pocEmail: string;
};

export function emptySchoolRequestForm(cityId: string): SchoolRequestForm {
  return {
    name: "",
    type: "school",
    cityId,
    address: "",
    pocName: "",
    pocPhone: "",
    pocEmail: "",
  };
}

export type SchoolRequestField =
  | "name"
  | "city_id"
  | "address"
  | "poc_name"
  | "poc_phone"
  | "poc_email";

/** Field → i18n key map; an empty object means the form is submittable. */
export type SchoolRequestErrors = Partial<Record<SchoolRequestField, CatalogKey>>;

/** Validates the request form; the optional POC email is only checked when non-empty. */
export function validateSchoolRequest(form: SchoolRequestForm): SchoolRequestErrors {
  const errors: SchoolRequestErrors = {};
  if (!institutionNameSchema.safeParse(form.name).success) {
    errors.name = "validation.school_name.length";
  }
  if (form.cityId.trim() === "") errors.city_id = "validation.choose_one";
  if (!institutionAddressSchema.safeParse(form.address).success) {
    errors.address = "validation.school_address.length";
  }
  if (!pocNameSchema.safeParse(form.pocName).success) errors.poc_name = "validation.name.length";
  if (!pocPhoneSchema.safeParse(form.pocPhone.trim()).success) {
    errors.poc_phone = "validation.phone.invalid";
  }
  if (form.pocEmail.trim() !== "" && !pocEmailSchema.safeParse(form.pocEmail).success) {
    errors.poc_email = "validation.email.invalid";
  }
  return errors;
}
