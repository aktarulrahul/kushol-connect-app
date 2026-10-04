// Requirement wizard state machine (TUT-AP-002): four steps, each gated by its zod schema
// (schemas/tuition.ts). Pure reducer — unit-tested without React; screens drive it.
import type { z } from "zod";

import {
  requirementForm,
  requirementStep1,
  requirementStep2,
  requirementStep3,
  stepSchema,
  type RequirementFormValues,
  type WizardStep,
} from "@/schemas/tuition";

export type WizardValues = Partial<RequirementFormValues>;

export type WizardState = {
  step: WizardStep;
  values: WizardValues;
  /** The first field-level message key from the last blocked "next" (rendered bn-first). */
  errorKey: string | null;
};

export type WizardAction =
  | { type: "next" }
  | { type: "back" }
  | { type: "set"; patch: WizardValues }
  | { type: "reset" }
  | { type: "goto"; step: WizardStep };

export const WIZARD_ORDER: WizardStep[] = ["subjects", "budget", "location", "review"];

export function initialWizardState(values: WizardValues = {}): WizardState {
  return { step: "subjects", values, errorKey: null };
}

function missingMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  return issue?.message ?? "validation.tuition.subjects_required";
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "set":
      return { ...state, values: { ...state.values, ...action.patch }, errorKey: null };
    case "back": {
      const index = WIZARD_ORDER.indexOf(state.step);
      const previous = WIZARD_ORDER[Math.max(0, index - 1)] ?? "subjects";
      return { ...state, step: previous, errorKey: null };
    }
    case "goto":
      return { ...state, step: action.step, errorKey: null };
    case "reset":
      return initialWizardState();
    case "next": {
      const schema = stepSchema(state.step);
      const result = schema.safeParse(state.values);
      if (!result.success) {
        return { ...state, errorKey: missingMessage(result.error) };
      }
      const index = WIZARD_ORDER.indexOf(state.step);
      const last = index === WIZARD_ORDER.length - 1;
      if (last) {
        // Final gate: the merged form (min ≤ max across steps, geo bounds, etc.).
        const merged = requirementForm.safeParse(state.values);
        if (!merged.success) {
          return { ...state, errorKey: missingMessage(merged.error) };
        }
      }
      const nextStep = WIZARD_ORDER[Math.min(index + 1, WIZARD_ORDER.length - 1)] ?? "review";
      return { ...state, step: nextStep, errorKey: null };
    }
  }
}

/** Assembles the contract payload from wizard values (drop empty schedule note). */
export function requirementInputFrom(values: WizardValues): RequirementFormValues & {
  scheduleNote?: string;
} {
  const merged = requirementForm.parse(values);
  const scheduleNote = merged.scheduleNote?.trim() ? merged.scheduleNote.trim() : undefined;
  return { ...merged, scheduleNote };
}

/** Re-exported for the screens' step chips. */
export { requirementStep1, requirementStep2, requirementStep3 };
