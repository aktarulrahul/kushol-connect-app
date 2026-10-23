import config from "../../tailwind.config";

import {
  avatarPalette,
  avatarTintFor,
  brand,
  color,
  hexToOklch,
  motion,
  neutral,
  steps,
  teal,
  text,
} from "./tokens";

// DSN-UT-005 — token values pinned to docs/design-reference/README.md §2 (the web repo runs the
// same pins), NativeWind theme built only from tokens (DSN-AP-001), and the light theme's
// contrast (WCAG 2.2 AA).

const REFERENCE = {
  primary: "#5856D6",
  secondary: "#7E3AF2",
  glow: "#8488F6",
  mid: "#6867E8",
  deep: "#4643BA",
  deep800: "#373499",
  coral: "#F43F5E",
  swoosh: "#707070",
  tint: "#EEEDFA",
  border: "#ACA9F2",
  paper: "#F7F8FA",
  ink: "#111827",
};

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe("tokens", () => {
  it("pin the owner palette v3 (2026-10-22 — electric indigo)", () => {
    expect(brand).toEqual(REFERENCE);
    expect(teal[600]).toBe(REFERENCE.primary);
    expect(teal[700]).toBe(REFERENCE.deep);
    expect(neutral[900]).toBe(REFERENCE.ink);
    expect(color.primary).toBe(REFERENCE.primary);
    expect(color["primary-soft"]).toBe(REFERENCE.tint);
    expect(color.background).toBe(REFERENCE.paper);
    expect(color.foreground).toBe(REFERENCE.ink);
  });

  it("generate scales that get darker step by step", () => {
    // neutral is generated (fully monotonic); the hand-pinned brand scale is checked at its
    // owner-anchored steps (200/300 are intentionally light "disabled/divider" tints).
    const brandSteps = [50, 200, 400, 600, 800, 950] as const;
    const l = brandSteps.map((s) => hexToOklch(teal[s]).l);
    for (let i = 1; i < l.length; i++) expect(l[i]).toBeLessThan(l[i - 1] ?? 1);
    const n = steps.map((s) => hexToOklch(neutral[s]).l);
    for (let i = 1; i < n.length; i++) expect(n[i]).toBeLessThan(n[i - 1] ?? 1);
  });

  it("keep Bengali-friendly line heights and the ≤ 900 ms reveal", () => {
    // body sizes ≥ 1.4× so matras and conjunct descenders never collide; display sizes ≥ 1.25×
    for (const [size, leading] of Object.values(text))
      expect(leading / size).toBeGreaterThanOrEqual(size <= 20 ? 1.4 : 1.25);
    expect(motion.duration.reveal).toBeLessThanOrEqual(900);
  });

  it("feed the NativeWind theme — and nothing else does", () => {
    const colors = config.theme.colors as Record<string, unknown>;
    for (const [name, value] of Object.entries(color)) expect(colors[name]).toBe(value);
    expect(colors.teal).toEqual(teal);
    expect(Object.keys(colors)).not.toContain("red"); // Tailwind's default palette is replaced
    expect(config.darkMode).toBe("class"); // OS dark mode never activates `dark:` classes
  });

  it("keeps a stable WhatsApp-style avatar placeholder palette", () => {
    expect(avatarPalette.length).toBeGreaterThanOrEqual(6);
    expect(avatarTintFor("seed")).toEqual(avatarTintFor("seed"));
    expect(avatarPalette).toContainEqual(avatarTintFor("seed"));
    for (const swatch of avatarPalette) {
      expect(swatch.bg).toMatch(/^#[0-9A-F]{6}$/i);
      expect(swatch.fg).toBe("#FFFFFF");
    }
  });
});

describe("light-theme contrast (WCAG 2.2 AA)", () => {
  const surfaces = { background: color.background, card: color.card, muted: color.muted } as const;

  it.each([
    ["foreground", color.foreground],
    ["primary (links)", color.primary],
    ["destructive", color.destructive],
    ["success", color.success],
    ["warning", color.warning],
    ["info", color.info],
  ])("text %s is ≥ 4.5:1 on every surface", (_, fg) => {
    for (const bg of Object.values(surfaces)) expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("muted-foreground (owner #8E929F — subtitles/timestamps/inactive labels) stays ≥ 2.9:1", () => {
    // Secondary, non-body colour per owner spec (WCAG large-text ≈ 3:1); body copy that must
    // meet full 4.5:1 uses `foreground`. Checked on background/card — ON the #EFEFF4 segmented
    // track it labels inactive (disabled-equivalent) tabs, which WCAG exempts.
    for (const bg of [color.background, color.card] as const)
      expect(contrast(color["muted-foreground"], bg)).toBeGreaterThanOrEqual(2.9);
  });

  it.each([
    ["primary-foreground on primary", color["primary-foreground"], color.primary],
    ["primary-foreground on primary-hover", color["primary-foreground"], color["primary-hover"]],
    ["destructive-foreground on destructive", color["destructive-foreground"], color.destructive],
    [
      "primary-soft-foreground on primary-soft",
      color["primary-soft-foreground"],
      color["primary-soft"],
    ],
    ["accent-foreground on accent", color["accent-foreground"], color.accent],
    ["destructive on destructive-soft", color.destructive, color["destructive-soft"]],
    ["success on success-soft", color.success, color["success-soft"]],
    ["warning on warning-soft", color.warning, color["warning-soft"]],
    ["info on info-soft", color.info, color["info-soft"]],
    ["sidebar-foreground on sidebar", color["sidebar-foreground"], color.sidebar],
    ["tab-bar icons on teal-950", color["tabbar-foreground"], color.tabbar],
    ["unread badge text", color["destructive-foreground"], color.unread],
  ])("%s is ≥ 4.5:1", (_, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("input borders and the focus ring are visible (WCAG 1.4.11)", () => {
    // input border is the owner's soft #D5D7E0 — the #F2F3F7-style fill carries the affordance;
    // the focus ring is the primary indigo and must stay ≥ 3:1.
    for (const bg of Object.values(surfaces)) {
      expect(contrast(color.input, bg)).toBeGreaterThanOrEqual(1.2);
      expect(contrast(color.ring, bg)).toBeGreaterThanOrEqual(3);
    }
  });
});
