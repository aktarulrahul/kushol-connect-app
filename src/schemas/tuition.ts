// Tuition form schemas (TUT §3): zod mirrors of the OpenAPI contract — the api re-validates
// server-side; these drive the wizard, tutor setup and evidence forms with the shared
// `validation.tuition.*` message keys. Contact info is regex-rejected in free text (TUT-BR-007).
import { z } from "zod";

export const TUITION_SUBJECTS = [
  "math",
  "physics",
  "chemistry",
  "biology",
  "english",
  "bangla",
  "higher_math",
  "ict",
] as const;
export const TUITION_CLASS_LEVELS = [
  "class_6",
  "class_7",
  "class_8",
  "class_9",
  "class_10",
  "ssc",
  "hsc",
] as const;
export const TUITION_GENDER_PREFS = ["any", "male", "female"] as const;

export type TuitionSubject = (typeof TUITION_SUBJECTS)[number];
export type TuitionClassLevel = (typeof TUITION_CLASS_LEVELS)[number];

export const subjectKey = z.enum(TUITION_SUBJECTS);
export const classLevelKey = z.enum(TUITION_CLASS_LEVELS);

/** Bangladesh bounds (validation.tuition.geo_bounds). */
export const bdLatitude = z
  .number({ message: "validation.tuition.geo_bounds" })
  .min(20.5, { message: "validation.tuition.geo_bounds" })
  .max(26.7, { message: "validation.tuition.geo_bounds" });
export const bdLongitude = z
  .number({ message: "validation.tuition.geo_bounds" })
  .min(88.0, { message: "validation.tuition.geo_bounds" })
  .max(92.7, { message: "validation.tuition.geo_bounds" });

/** No phone numbers, emails or URLs in bios/availability (TUT-BR-007). */
const contactInfoPattern =
  /(\+?8801\d{9}|\b01\d{9}\b|[\w.+-]+@[\w-]+\.[\w.]+|https?:\/\/|www\.)/i;

export const freeTextSafe = z
  .string()
  .refine((value) => !contactInfoPattern.test(value), {
    message: "validation.tuition.bio_contact_blocked",
  });

export const requirementStep1 = z.object({
  subjects: z
    .array(subjectKey, { message: "validation.tuition.subjects_required" })
    .min(1, { message: "validation.tuition.subjects_required" })
    .max(5),
  classLevel: classLevelKey,
});

export const requirementStep2 = z
  .object({
    budgetMin: z.number({ message: "validation.tuition.budget_range" }).int().min(0).max(1_000_000),
    budgetMax: z.number({ message: "validation.tuition.budget_range" }).int().min(0).max(1_000_000),
    genderPref: z.enum(TUITION_GENDER_PREFS),
  })
  .refine((v) => v.budgetMin <= v.budgetMax, {
    message: "validation.tuition.budget_range",
    path: ["budgetMax"],
  });

export const requirementStep3 = z.object({
  locationArea: z
    .string()
    .trim()
    .min(2, { message: "validation.tuition.area_length" })
    .max(80, { message: "validation.tuition.area_length" }),
  lat: bdLatitude,
  lng: bdLongitude,
  scheduleNote: z.string().max(500, { message: "validation.tuition.schedule_length" }).optional(),
});

/** The whole wizard = steps 1–3 (step 4 is the summary review). */
export const requirementForm = requirementStep1
  .and(requirementStep2)
  .and(requirementStep3);

export type RequirementFormValues = z.infer<typeof requirementForm>;

export const tutorProfileForm = z
  .object({
    university: z
      .string()
      .trim()
      .min(2, { message: "validation.tuition.university_length" })
      .max(120, { message: "validation.tuition.university_length" }),
    subjects: z.array(subjectKey).min(1, { message: "validation.tuition.subjects_required" }).max(5),
    classesTaught: z
      .array(classLevelKey, { message: "validation.tuition.classes_taught_required" })
      .min(1, { message: "validation.tuition.classes_taught_required" }),
    bioBn: freeTextSafe.max(1000, { message: "validation.tuition.bio_length" }).optional(),
    bioEn: freeTextSafe.max(1000, { message: "validation.tuition.bio_length" }).optional(),
    hourlyRateHint: z
      .number({ message: "validation.tuition.rate_hint_range" })
      .int()
      .min(0)
      .max(5000)
      .optional(),
    availability: freeTextSafe.max(500).optional(),
    locationArea: z
      .string()
      .trim()
      .min(2, { message: "validation.tuition.area_length" })
      .max(80, { message: "validation.tuition.area_length" }),
    lat: bdLatitude,
    lng: bdLongitude,
  })
  .refine((v) => (v.bioBn?.trim() ? true : v.bioEn?.trim() ? true : false), {
    message: "validation.tuition.bio_length",
    path: ["bioBn"],
  });

export type TutorProfileFormValues = z.infer<typeof tutorProfileForm>;

export const submitForReviewForm = z.object({
  nationalIdMediaId: z.string().min(1, { message: "validation.tuition.evidence_required" }),
  evidenceMediaIds: z
    .array(z.string().min(1), { message: "validation.tuition.evidence_required" })
    .min(1, { message: "validation.tuition.evidence_required" }),
});

export type SubmitForReviewValues = z.infer<typeof submitForReviewForm>;

/** Wizard step gating — each step must parse before "next" (05 §2.2). */
export const WIZARD_STEPS = ["subjects", "budget", "location", "review"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export function stepSchema(step: WizardStep) {
  switch (step) {
    case "subjects":
      return requirementStep1;
    case "budget":
      return requirementStep2;
    case "location":
      return requirementStep3;
    case "review":
      return requirementForm;
  }
}
