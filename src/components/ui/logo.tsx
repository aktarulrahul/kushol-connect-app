import { Image, View } from "react-native";

import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

// The only way to show the logo in the app (DSN-BR-006, design-reference §5): never recoloured,
// stretched or split; ≥ 20pt tall; clear space ≥ ¼ of the swirl's height; accessible name
// "Kushol Connect — Home". PNG until vectors arrive (02 Q1).

// eslint-disable-next-line @typescript-eslint/no-require-imports
const lockup = require("../../../assets/brand/kushol-connect-lockup.png") as number;
const RATIO = 1280 / 407;
const HEIGHTS = { sm: 20, md: 28, lg: 32, xl: 48, hero: 72 } as const;

function Logo({
  size = "md",
  decorative = false,
  className,
}: {
  size?: keyof typeof HEIGHTS;
  /** Hide from screen readers when nearby text already names the product. */
  decorative?: boolean;
  className?: string;
}) {
  const t = useT();
  const height = HEIGHTS[size];
  return (
    <View className={cn("self-center", className)} style={{ padding: height / 4 }}>
      <Image
        source={lockup}
        style={{ height, width: Math.round(height * RATIO) }}
        resizeMode="contain"
        accessible={!decorative}
        accessibilityRole={decorative ? "none" : "image"}
        accessibilityLabel={decorative ? undefined : t("common.logo_label")}
      />
    </View>
  );
}

export { Logo };
