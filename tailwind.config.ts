import type { Config } from "tailwindcss";

import { color, layout, neutral, radius, shadow, teal, text } from "./src/theme/tokens";

// NativeWind theme built only from src/theme/tokens.ts (DSN-AP-001). Tailwind's default palette,
// type scale, radii and shadows are replaced, so feature code can only reach token values; the
// default 4px spacing scale stays (p-4 = 16px with inlineRem 16 in metro.config.js).
const px = (n: number) => `${String(n)}px`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  // Light theme only (02 Q3): `dark:` classes in the vendored components stay inert even when
  // the OS is in dark mode (02 `01` §7 edge 7).
  darkMode: "class",
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  presets: [require("nativewind/preset") as Config],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      ...color,
      teal,
      neutral,
    },
    fontSize: Object.fromEntries(
      Object.entries(text).map(([name, [size, leading]]) => [name, [px(size), px(leading)]]),
    ),
    borderRadius: {
      none: "0px",
      ...Object.fromEntries(Object.entries(radius).map(([name, value]) => [name, px(value)])),
      full: "9999px",
    },
    boxShadow: { none: "none", ...shadow },
    extend: {
      maxWidth: { tablet: px(layout.tabletMax) },
      minHeight: { touch: px(layout.touchTarget) },
      minWidth: { touch: px(layout.touchTarget) },
      height: { wash: px(layout.headerWash) },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("tailwindcss-animate") as NonNullable<Config["plugins"]>[number]],
} satisfies Config;
