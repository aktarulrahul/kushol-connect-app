import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import {
  createT,
  DEFAULT_LOCALE,
  resolveLocale,
  type CatalogKey,
  type Locale,
  type Params,
  type TFunction,
} from "./index";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFunction;
};

const fallback: LocaleContextValue = {
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
  t: createT(DEFAULT_LOCALE),
};

const LocaleContext = createContext<LocaleContextValue>(fallback);

/**
 * UI language for the app (DSN-AP-003): bn by default, en on toggle. Text picks its font and
 * `accessibilityLanguage` from this; saving the choice per user belongs to 03-identity-access.
 */
export function LocaleProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: Locale;
  children: ReactNode;
}) {
  const [locale, setLocale] = useState<Locale>(() => resolveLocale(initialLocale));
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: (next) => {
        setLocale(resolveLocale(next));
      },
      t: createT(locale),
    }),
    [locale],
  );
  return <LocaleContext value={value}>{children}</LocaleContext>;
}

/** Current language + setter. Outside a provider it reads bn and never throws. */
export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

export function useT(): TFunction {
  return useContext(LocaleContext).t;
}

/** Translated text as a component. */
export function T({ k, params }: { k: CatalogKey; params?: Params }) {
  const t = useT();
  return params ? t(k, params) : t(k);
}
