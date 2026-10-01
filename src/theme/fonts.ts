import { Children, isValidElement, type ReactNode } from "react";

import type { Locale } from "@/i18n";

import { fontFaces, type FontWeightName } from "./tokens";

// Font selection for <Text> and inputs (DSN-AP-002, DSN-BR-004). React Native has no per-glyph
// fallback between custom fonts, so the script decides the family: any Bengali → Hind Siliguri,
// otherwise Inter for Latin; text with no letters follows the UI language.

const BENGALI = /[ঀ-৿]/;
const LATIN = /[A-Za-z]/;

const WEIGHT_CLASS: Record<string, FontWeightName> = {
  "font-thin": "normal",
  "font-extralight": "normal",
  "font-light": "normal",
  "font-normal": "normal",
  "font-medium": "medium",
  "font-semibold": "semibold",
  "font-bold": "bold",
  "font-extrabold": "bold",
  "font-black": "bold",
};

/** The last `font-<weight>` class wins, as in CSS. */
export function weightFromClassName(className: string | undefined): FontWeightName {
  let weight: FontWeightName = "normal";
  for (const token of (className ?? "").split(/\s+/)) {
    const base = token.slice(token.lastIndexOf(":") + 1); // ignore variant prefixes
    const w = WEIGHT_CLASS[base];
    if (w) weight = w;
  }
  return weight;
}

/** Plain text of string/number children (one level deep, through fragments). */
export function textOf(children: ReactNode): string {
  let out = "";
  Children.forEach(children, (child) => {
    if (typeof child === "string" || typeof child === "number") out += String(child);
    else if (isValidElement<{ children?: ReactNode }>(child)) out += textOf(child.props.children);
  });
  return out;
}

export function scriptOf(text: string, locale: Locale): Locale {
  if (BENGALI.test(text)) return "bn";
  if (LATIN.test(text)) return "en";
  return locale;
}

export function fontFamily(script: Locale, weight: FontWeightName): string {
  return fontFaces[script][weight];
}

/** BCP 47 tag for screen readers (iOS accessibilityLanguage). */
export const speechLanguage: Record<Locale, string> = { bn: "bn-BD", en: "en-US" };
