// t() and the bn/en catalogs (DSN-AP-003; contract in 02 `03-backend-tasks.md` §2). Plain module;
// components use useT() / useLocale() from ./locale-provider.

import bn from "./bn.json";
import en from "./en.json";

export const LOCALES = ["bn", "en"] as const;
export type Locale = (typeof LOCALES)[number];
/** Bengali first (DSN-BR-003); a user's saved choice arrives with 03-identity-access. */
export const DEFAULT_LOCALE: Locale = "bn";

export type CatalogKey = keyof typeof bn;
export type Params = Readonly<Record<string, string | number>>;
export type TFunction = (key: CatalogKey, params?: Params) => string;

const catalogs: Readonly<Record<Locale, Readonly<Record<string, string>>>> = { bn, en };

/** BCP 47 tags for Intl — `bn-BD` formats numbers with Bengali digits (০–৯). */
export const intlLocale: Readonly<Record<Locale, string>> = { bn: "bn-BD", en: "en-US" };

function warn(message: string): void {
  if (__DEV__) console.warn(`[i18n] ${message}`);
}

export function isLocale(value: unknown): value is Locale {
  return value === "bn" || value === "en";
}

/** Anything other than bn/en resolves to bn, with a dev warning (02 `01` §6). */
export function resolveLocale(value: unknown): Locale {
  if (isLocale(value)) return value;
  if (value != null) warn(`unsupported locale ${JSON.stringify(value)} — using bn`);
  return DEFAULT_LOCALE;
}

export function formatNumber(locale: Locale, value: number): string {
  return new Intl.NumberFormat(intlLocale[resolveLocale(locale)]).format(value);
}

/**
 * Looks up `key` in `locale`, falling back to bn, then to the key itself (dev warning). Never
 * throws and never returns an empty string (DSN-UT-002). `{name}` placeholders take `params`;
 * numbers are formatted for the locale.
 */
export function translate(locale: Locale, key: string, params?: Params): string {
  const lang = resolveLocale(locale);
  const own = catalogs[lang][key];
  const raw = own || catalogs[DEFAULT_LOCALE][key];
  if (!raw) {
    warn(`missing key "${key}"`);
    return key;
  }
  if (!own) warn(`"${key}" missing in ${lang} — using bn`);
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params[name];
    if (value === undefined) return placeholder;
    return typeof value === "number" ? formatNumber(lang, value) : value;
  });
}

export function createT(locale: Locale): TFunction {
  return (key, params) => translate(locale, key, params);
}

/** Problem `code` (open set — 01 §10) → `errors.*` key; unknown codes → `errors.generic`. */
export function errorKey(code: string | undefined): CatalogKey {
  const key = `errors.${(code ?? "").toLowerCase()}`;
  return key in catalogs.bn ? (key as CatalogKey) : "errors.generic";
}
