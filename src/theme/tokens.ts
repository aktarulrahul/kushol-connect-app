// Design tokens — the only place raw colour, size, font and motion values live in the app
// (DSN-BR-002, DSN-BR-005). Canonical values: docs/design-reference/README.md §2–§3, pinned by
// tokens.test.ts (DSN-UT-005). The web repo encodes the same values in its own src/theme; both
// generate identical scales from the same code.
//
// Scales are generated in code from the brand colours (design-reference §2: "do not hand-pick
// one-off hex values"): OKLCH lightness steps like Tailwind's, with the brand colour pinned to the
// step closest to its own lightness. tailwind.config.ts feeds these values to NativeWind.

/** Owner-approved palette v3 (2026-10-22 — Electric Indigo & Periwinkle mesh-glow system). */
export const brand = {
  /** Electric indigo — primary buttons, FAB, active navigation icons, links, chat send. */
  primary: "#5856D6",
  /** Interactive highlight — active bottom-tab icon, chat send button, links (kushol-600). */
  secondary: "#7E3AF2",
  /** Periwinkle — header radial glow highlight, active dark-mode accents (kushol-400). */
  glow: "#8488F6",
  /** Gradient mid-stop, secondary interactive elements (kushol-500). */
  mid: "#6867E8",
  /** Button hover/pressed state, solid fallback for glass sub-cards (kushol-700). */
  deep: "#4643BA",
  /** Deep active states, high-contrast borders (kushol-800). */
  deep800: "#373499",
  /** Coral rose — urgency: unread badges, live indicators (AA badge form `#DC2626`). */
  coral: "#F43F5E",
  /** Swoosh gray — brand graphic only, never a UI text colour. */
  swoosh: "#707070",
  /** Selected/soft surface tint (kushol-50): selected tiles, unread highlight, soft badge fill. */
  tint: "#EEEDFA",
  /** 1.5px border for active/selected cards and tiles (kushol-200). */
  border: "#ACA9F2",
  /** Cool gray — main app background and bottom-sheet container (never pure white). */
  paper: "#F7F8FA",
  /** Primary headings, numeric values, event titles, product prices — never pure black. */
  ink: "#111827",
} as const;

/**
 * Status colours. Success/check-in is the owner's emerald (2026-10-22); `color.success` carries
 * the AA-readable text form (`#1D7A3C`) — the raw `#24A148` stays on soft surfaces and badges.
 */
export const status = {
  success: "#24A148",
  warning: "#E8741E", // owner orange — campaigns / food / featured
  danger: "#B91C1C", // AA text form of the #EF4444 coral error accent
  info: "#5856D6", // electric indigo — info keeps the primary family
} as const;

/** AA-readable emerald for success text on light surfaces (owner pill text is #22A047 on tint). */
export const successText = "#1D7A3C";
/** AA-readable coral for error text on light surfaces (owner solid is #EF4444). */
export const coralText = "#DC2626";

/**
 * Module & category accent pairings (owner 2026-10-22) — category progress bars, module badges,
 * status indicators. `tint` is the soft pill background; `solid` the bar/dot/badge colour.
 */
export const accents = {
  orange: { solid: "#E8741E", tint: "#FDF1E8" }, // campaigns / food / featured
  indigo: { solid: "#5856D6", tint: "#EDEDFA" }, // messaging / transport / official
  emerald: { solid: "#24A148", text: "#22A047", tint: "#E6F6EC" }, // QR verified / in-stock / positive
  orchid: { solid: "#D946EF", tint: "#FAE8FF" }, // campus events / fest
  violet: { solid: "#8B5CF6", tint: "#F2EBFE" }, // bills / academic fees / VIP pass
  coral: { solid: "#EF4444", tint: "#FEF2F2" }, // urgent alert / sold out / invalid QR / error
} as const;

/**
 * Mesh-glow header, primary CTA and QR pass frame gradients (owner 2026-10-22). On RN these
 * feed expo-linear-gradient `colors` (the CSS radial is approximated with the same stops).
 */
export const gradient = {
  /** Header mesh glow: radial at 65% 35% on web; vertical falloff on RN. */
  headerGlow: ["#8488F6", "#6362E2", "#524FD1"] as const,
  /** Full-width primary CTA ("Register Now", "Claim Your Pass", "Save / Checkout"). */
  primaryCta: ["#6A68E6", "#5856D6"] as const,
  /** QR entry pass frame (inner QR container stays pure white). */
  qrFrame: ["#6362E2", "#524FD1"] as const,
} as const;

/** Glassmorphic header sub-cards and circular icon buttons sitting inside the glow header. */
export const glassHeader = {
  bg: "rgba(255, 255, 255, 0.14)",
  border: "rgba(255, 255, 255, 0.22)",
  blur: 12,
  fallback: "#4643BA",
} as const;

/** Overlapping bottom-sheet container that follows a glow header. */
export const sheet = {
  background: "#F7F8FA",
  topRadius: 28,
} as const;

// ─── OKLCH colour math (sRGB ↔ OKLab, Björn Ottosson) ───────────────────────────────────────

type Oklch = { l: number; c: number; h: number };

function srgbToLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
function linearToSrgb(v: number): number {
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const to = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

export function hexToOklch(hex: string): Oklch {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

function oklchToLinear({ l: L, c, h }: Oklch): [number, number, number] {
  const A = c * Math.cos((h * Math.PI) / 180);
  const B = c * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** OKLCH → hex, reducing chroma until the colour fits the sRGB gamut. */
export function oklchToHex(color: Oklch): string {
  let c = color.c;
  for (let i = 0; i < 40; i++) {
    const rgb = oklchToLinear({ ...color, c });
    if (rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4)) {
      return rgbToHex(rgb.map(linearToSrgb) as [number, number, number]);
    }
    c *= 0.95;
  }
  return rgbToHex(oklchToLinear({ ...color, c: 0 }).map(linearToSrgb) as [number, number, number]);
}

// ─── Scales ───────────────────────────────────────────────────────────────────────────────

export const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type Step = (typeof steps)[number];
export type Scale = Record<Step, string>;

/** Target OKLCH lightness per step — Tailwind v4's rhythms for chromatic and gray scales. */
const rhythms = {
  chromatic: {
    50: 0.984,
    100: 0.953,
    200: 0.91,
    300: 0.855,
    400: 0.777,
    500: 0.704,
    600: 0.6,
    700: 0.511,
    800: 0.437,
    900: 0.386,
    950: 0.277,
  },
  gray: {
    50: 0.985,
    100: 0.967,
    200: 0.928,
    300: 0.872,
    400: 0.707,
    500: 0.551,
    600: 0.446,
    700: 0.373,
    800: 0.278,
    900: 0.21,
    950: 0.13,
  },
} as const satisfies Record<string, Record<Step, number>>;

/** Share of the base chroma per step — tints and the darkest shade carry less colour. */
const chromaShare: Record<Step, number> = {
  50: 0.12,
  100: 0.25,
  200: 0.42,
  300: 0.62,
  400: 0.85,
  500: 1,
  600: 1,
  700: 1,
  800: 1,
  900: 0.92,
  950: 0.78,
};

/** 50–950 scale with the same hue as `base`; `base` itself sits exactly on its nearest step. */
export function generateScale(base: string, rhythm: keyof typeof rhythms): Scale {
  const lightness = rhythms[rhythm];
  const b = hexToOklch(base);
  const pinned = steps.reduce((best, s) =>
    Math.abs(lightness[s] - b.l) < Math.abs(lightness[best] - b.l) ? s : best,
  );
  const scale = {} as Scale;
  for (const s of steps) {
    scale[s] =
      s === pinned
        ? base.toUpperCase()
        : oklchToHex({ l: lightness[s], c: b.c * chromaShare[s], h: b.h });
  }
  return scale;
}

/**
 * Owner soft-tint pairs for status/alert backgrounds — supplied verbatim (2026-10-22), so the
 * OKLCH `soft()` helper is only needed if a new status colour is added without an owner tint.
 */

/**
 * Owner-supplied kushol scale (2026-10-22) — kushol-700 `#662D91` is the primary brand anchor,
 * 600 is the interactive highlight and 800 the pressed state. Hand-pinned: the OKLCH generator
 * would land `#662D91` on step 800, so this scale is literal, not generated.
 */
export const teal = {
  50: "#EEEDFA",
  100: "#F2F2FC",
  200: "#ACA9F2",
  300: "#C9C8F7",
  400: "#8488F6",
  500: "#6867E8",
  600: "#5856D6",
  700: "#4643BA",
  800: "#373499",
  900: "#2B2977",
  950: "#1B1A4A",
} as const satisfies Scale;
/** Muted slate (#64748B) behind the legacy slate-* surface/text classes. */
const slateBase = "#64748B";
export const slateTeal = generateScale(slateBase, "chromatic");
export const neutral = generateScale(brand.ink, "gray"); // brand.ink lands on 900

// ─── Semantic colours (light theme; names follow shadcn/ui so its components theme directly) ─

export const color = {
  // base surfaces (owner: never pure white for the base page background)
  background: brand.paper,
  foreground: brand.ink,
  card: "#FFFFFF",
  "card-foreground": brand.ink,
  popover: "#FFFFFF",
  "popover-foreground": brand.ink,
  // brand actions (primary = electric indigo; tint = kushol-50 soft surface)
  primary: brand.primary,
  "primary-foreground": "#FFFFFF",
  "primary-hover": teal[800],
  "primary-soft": brand.tint,
  "primary-soft-foreground": teal[700],
  // quiet surfaces (shadcn "secondary" = quiet button) + segmented control track
  secondary: "#EFEFF4",
  "secondary-foreground": brand.ink,
  muted: "#EFEFF4",
  "muted-foreground": "#8E929F",
  accent: brand.tint,
  "accent-foreground": teal[700],
  // lines + focus (input/ring meet WCAG 1.4.11's 3:1 against card and background)
  border: "#EAECEF",
  input: "#D5D7E0",
  ring: brand.primary,
  // status (`destructive` is shadcn's name for danger; success text uses the AA emerald)
  destructive: status.danger,
  "destructive-foreground": "#FFFFFF",
  "destructive-soft": "#FEF2F2",
  success: successText,
  "success-foreground": "#FFFFFF",
  "success-soft": "#E6F6EC",
  warning: "#9A3412", // AA text form of the #E8741E orange accent
  "warning-foreground": "#FFFFFF",
  "warning-soft": "#FDF1E8",
  info: status.info,
  "info-foreground": "#FFFFFF",
  "info-soft": "#EDEDFA",
  // brand graphic + reference colours
  "brand-primary": brand.primary,
  "brand-secondary": brand.secondary,
  "brand-swoosh": brand.swoosh,
  "brand-tint": brand.tint,
  "brand-border": brand.border,
  paper: brand.paper,
  ink: brand.ink,
  white: "#FFFFFF",
  black: "#000000",
  // charts: indigo family first (design-reference §2 "chart series")
  "chart-1": teal[700],
  "chart-2": accents.orange.solid,
  "chart-3": teal[400],
  "chart-4": teal[300],
  "chart-5": neutral[400],
  // Command Center sidebar (design-reference §7.2: neutral shell, brand blue only for active nav)
  sidebar: "#FFFFFF",
  "sidebar-foreground": neutral[700],
  "sidebar-primary": brand.primary,
  "sidebar-primary-foreground": "#FFFFFF",
  "sidebar-accent": brand.tint,
  "sidebar-accent-foreground": teal[900],
  "sidebar-border": neutral[200],
  "sidebar-ring": teal[700],
  // App shell (design-reference §6.1): floating tab bar on blue-950, header wash tint → paper
  tabbar: teal[950],
  "tabbar-foreground": "#FFFFFF",
  wash: brand.tint,
  presence: status.success,
  unread: status.danger,
} as const;

export type ColorToken = keyof typeof color;

/**
 * Soft avatar placeholder palette (WhatsApp-style). Hash `id`/`name` into a stable index so
 * chat rows without photos get varied backgrounds instead of a single teal initials circle.
 * Icon/initials foreground is white for contrast on these mid-tones.
 */
export const avatarPalette = [
  { bg: "#5B8A7A", fg: "#FFFFFF" }, // sage teal
  { bg: "#6A8499", fg: "#FFFFFF" }, // slate blue
  { bg: "#7A6B8F", fg: "#FFFFFF" }, // soft plum
  { bg: "#9A7A5C", fg: "#FFFFFF" }, // warm sand
  { bg: "#5E8F9A", fg: "#FFFFFF" }, // muted cyan (near brand secondary)
  { bg: "#8F6B6B", fg: "#FFFFFF" }, // dusty rose
  { bg: "#6F8A5C", fg: "#FFFFFF" }, // olive
  { bg: "#5C6F8F", fg: "#FFFFFF" }, // periwinkle
] as const;

export type AvatarTint = (typeof avatarPalette)[number];

/** Stable palette pick from a chat/user id or display name. */
export function avatarTintFor(seed: string): AvatarTint {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return avatarPalette[hash % avatarPalette.length] ?? avatarPalette[0];
}

function rgbaFromHex(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${String(r)},${String(g)},${String(b)},${String(alpha)})`;
}

/** iOS expo-blur companion overlays (teal shell unchanged on Android/web). */
export const glass = {
  tabbarOverlay: rgbaFromHex(color.tabbar, 0.58),
  headerOverlay: rgbaFromHex(color.background, 0.74),
  chromeOverlay: rgbaFromHex(color.background, 0.82),
  tabbarIntensity: 72,
  headerIntensity: 88,
} as const;

// ─── Typography ────────────────────────────────────────────────────────────────────────────

/**
 * Bundled font faces (@expo-google-fonts; design-reference §3). React Native needs one family per
 * weight — Android cannot synthesise weights for custom fonts — so the <Text> primitive picks the
 * face from the weight class and the script: Bengali → Hind Siliguri, Latin → Inter
 * (DSN-BR-004: Bengali never renders in Inter).
 */
export const fontFaces = {
  bn: {
    normal: "HindSiliguri_400Regular",
    medium: "HindSiliguri_500Medium",
    semibold: "HindSiliguri_600SemiBold",
    bold: "HindSiliguri_700Bold",
  },
  en: {
    normal: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
  },
} as const;

export type FontWeightName = keyof (typeof fontFaces)["bn"];

/**
 * Type scale in px: [size, line-height]. Line heights are taller than Latin-only systems so
 * Bengali matras, conjuncts and descenders never clip (DSN-US-003).
 */
export const text = {
  xs: [12, 18],
  sm: [14, 22],
  base: [16, 26],
  lg: [18, 28],
  xl: [20, 30],
  "2xl": [24, 34],
  "3xl": [30, 40],
  "4xl": [36, 48],
  "5xl": [48, 60],
} as const satisfies Record<string, readonly [number, number]>;

// ─── Shape, depth, layout ──────────────────────────────────────────────────────────────────

/** Radius in px — 8px cards per design-reference §7.1; 20px matches the app's chat bubbles. */
export const radius = {
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  "2xl": 16,
  "3xl": 20,
  "4xl": 24,
  /** Bottom-sheet top corners that overlap a glow header (owner 2026-10-22). */
  sheet: 28,
} as const;

/** Soft single-layer shadows tinted with ink (design-reference §7.1). */
export const shadow = {
  "2xs": "0 1px rgb(17 24 39 / 0.04)",
  xs: "0 1px 2px rgb(17 24 39 / 0.05)",
  sm: "0 1px 3px rgb(17 24 39 / 0.08)",
  md: "0 4px 12px rgb(17 24 39 / 0.08)",
  lg: "0 12px 24px rgb(17 24 39 / 0.1)",
  xl: "0 20px 40px rgb(17 24 39 / 0.14)",
  "2xl": "0 28px 56px rgb(17 24 39 / 0.18)",
} as const;

/** Base spacing unit in px (Tailwind multiples: p-4 = 16px). */
export const spacingUnit = 4;

export const layout = {
  /** Landing content width (design-reference §7.1: 12-col grid, max 1200px). */
  contentMax: 1200,
  /** Section padding: 96px desktop / 56px mobile (§7.1). */
  sectionDesktop: 96,
  sectionMobile: 56,
  /** Minimum touch target (WCAG 2.5.5 / app ≥ 44pt). */
  touchTarget: 44,
  /** Phone gutters (05 §6: 16px). */
  gutter: 16,
  /** Centred column on tablets ≥ 600px (05 §6). */
  tabletMax: 600,
  /** Header wash height, teal-50 → paper (design-reference §6.1). */
  headerWash: 180,
  /** Floating tab bar (64pt tab + 2 × 10pt padding + border ≈ 86pt) plus 14pt of air — a
   * screen FAB sits this far above the safe bottom edge (chat list, Spartens FAB). */
  tabBarClearance: 100,
} as const;

// ─── Motion (DSN-BR-007: every animation has a reduced-motion form) ───────────────────────

export const motion = {
  duration: {
    /** press feedback */
    fast: 120,
    /** dialog fade/scale, tabs indicator */
    base: 180,
    /** sheet slide, toast */
    slow: 240,
    /** splash/logo reveal — one-time, never longer (design-reference §5) */
    reveal: 900,
  },
  easing: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    decelerate: "cubic-bezier(0, 0, 0, 1)",
    accelerate: "cubic-bezier(0.3, 0, 1, 1)",
  },
  /** Press scale on mobile (design-reference §6.4: 0.97 + opacity). */
  pressScale: 0.97,
  pressOpacity: 0.85,
  /** Toast auto-dismiss in ms. */
  toastMs: 4000,
} as const;
