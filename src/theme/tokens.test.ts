import config from "../../tailwind.config";

import { avatarPalette, avatarTintFor, brand, color, hexToOklch, motion, neutral, steps, teal, text } from "./tokens";

// DSN-UT-005 — token values pinned to docs/design-reference/README.md §2 (the web repo runs the
// same pins), NativeWind theme built only from tokens (DSN-AP-001), and the light theme's
// contrast (WCAG 2.2 AA).

const REFERENCE = {
  primary: "#095777",
  secondary: "#386070",
  swoosh: "#707070",
  paper: "#FAFBFC",
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
  it("pin the design-reference palette", () => {
    expect(brand).toEqual(REFERENCE);
    expect(teal[800]).toBe(REFERENCE.primary);
    expect(neutral[900]).toBe(REFERENCE.ink);
    expect(color.primary).toBe(REFERENCE.primary);
    expect(color.background).toBe(REFERENCE.paper);
    expect(color.foreground).toBe(REFERENCE.ink);
  });

  it("generate scales that get darker step by step", () => {
    for (const scale of [teal, neutral]) {
      const l = steps.map((s) => hexToOklch(scale[s]).l);
      for (let i = 1; i < l.length; i++) expect(l[i]).toBeLessThan(l[i - 1] ?? 1);
    }
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
    ["muted-foreground", color["muted-foreground"]],
    ["primary (links)", color.primary],
    ["destructive", color.destructive],
    ["success", color.success],
    ["warning", color.warning],
    ["info", color.info],
  ])("text %s is ≥ 4.5:1 on every surface", (_, fg) => {
    for (const bg of Object.values(surfaces)) expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
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

  it("input borders and the focus ring are ≥ 3:1 (WCAG 1.4.11)", () => {
    for (const bg of Object.values(surfaces)) {
      expect(contrast(color.input, bg)).toBeGreaterThanOrEqual(3);
      expect(contrast(color.ring, bg)).toBeGreaterThanOrEqual(3);
    }
  });
});
