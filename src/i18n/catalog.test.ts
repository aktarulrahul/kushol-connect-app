import bn from "./bn.json";
import en from "./en.json";
import { KEY_PATTERN, NAMESPACES } from "./namespaces";

// DSN-UT-001 — catalog parity gate (02 `03` §2): a missing bn or en key, an empty value, a
// placeholder mismatch or a key outside the namespace registry fails CI.

const catalogs = { bn: bn as Record<string, unknown>, en: en as Record<string, unknown> };
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("bn/en catalogs", () => {
  it("are flat maps of non-empty strings", () => {
    const bad: string[] = [];
    for (const [locale, catalog] of Object.entries(catalogs)) {
      for (const [key, value] of Object.entries(catalog)) {
        if (typeof value !== "string" || value.trim() === "") bad.push(`${locale}:${key}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("have identical key sets", () => {
    const missingInEn = Object.keys(bn).filter((k) => !(k in en));
    const missingInBn = Object.keys(en).filter((k) => !(k in bn));
    expect({ missingInEn, missingInBn }).toEqual({ missingInEn: [], missingInBn: [] });
  });

  it("use the same {placeholders} in both languages", () => {
    const mismatched = Object.keys(bn).filter((key) => {
      const b = (bn as Record<string, string>)[key] ?? "";
      const e = (en as Record<string, string>)[key] ?? "";
      return placeholders(b).join() !== placeholders(e).join();
    });
    expect(mismatched).toEqual([]);
  });

  it("only use registered namespaces and the key format", () => {
    const bad = Object.keys(bn).filter((k) => !KEY_PATTERN.test(k));
    expect(bad).toEqual([]);
    expect(NAMESPACES).toHaveLength(24);
  });

  it("have Bengali text in bn for everything that isn't a proper name or code", () => {
    // bn values must actually be Bengali — catches English pasted into bn.json.
    const allowedLatin = new Set(["common.language.en"]);
    const notBengali = Object.entries(bn as Record<string, string>)
      .filter(([k, v]) => !allowedLatin.has(k) && !/[ঀ-৿]/.test(v))
      .map(([k]) => k);
    expect(notBengali).toEqual([]);
  });
});
