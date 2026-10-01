import { useLocale } from "@/i18n/locale-provider";

import { fontFamily, scriptOf } from "./fonts";
import type { FontWeightName } from "./tokens";

/** Font style for text a primitive renders itself (e.g. Select labels) — same rules as <Text>. */
export function useFontStyle(text: string | undefined, weight: FontWeightName = "normal") {
  const { locale } = useLocale();
  return {
    fontFamily: fontFamily(scriptOf(text ?? "", locale), weight),
    fontWeight: "normal" as const,
  };
}
