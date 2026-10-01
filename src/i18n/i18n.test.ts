import { createT, errorKey, formatNumber, resolveLocale, translate } from "./index";

// DSN-UT-002 — t() never throws and never returns an empty string: requested locale → bn → key.

describe("t()", () => {
  it("defaults to Bengali and switches to English", () => {
    expect(createT("bn")("common.actions.save")).toBe("সংরক্ষণ করুন");
    expect(createT("en")("common.actions.save")).toBe("Save");
  });

  it("falls back to the key literal for an unknown key, with a dev warning", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(translate("en", "common.does_not_exist")).toBe("common.does_not_exist");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("missing key"));
    warn.mockRestore();
  });

  it("never throws, even for nonsense input", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    for (const locale of ["fr", "", undefined, null, 42] as unknown as "bn"[]) {
      expect(() => translate(locale, "common.actions.save")).not.toThrow();
      expect(translate(locale, "common.actions.save")).toBe("সংরক্ষণ করুন");
    }
    warn.mockRestore();
  });

  it("interpolates params and formats numbers per language", () => {
    expect(createT("en")("common.table.page_of", { page: 2, pages: 10 })).toBe("Page 2 of 10");
    expect(createT("bn")("common.table.page_of", { page: 2, pages: 10 })).toBe("পৃষ্ঠা ২ / ১০");
    expect(createT("bn")("common.table.selected", { count: 1234 })).toBe(
      "১,২৩৪টি বাছাই করা হয়েছে",
    );
  });

  it("leaves a placeholder visible when its param is missing", () => {
    expect(createT("en")("common.table.selected")).toBe("{count} selected");
  });

  it("resolves only bn and en; anything else is bn", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("en-US")).toBe("bn");
    expect(resolveLocale(undefined)).toBe("bn");
    warn.mockRestore();
  });

  it("formats numbers with Bengali digits in bn", () => {
    expect(formatNumber("bn", 2026)).toBe("২,০২৬");
    expect(formatNumber("en", 2026)).toBe("2,026");
  });

  it("maps api problem codes to errors.* keys (open set → generic)", () => {
    expect(errorKey("NOT_FOUND")).toBe("errors.not_found");
    expect(errorKey("RATE_LIMITED")).toBe("errors.rate_limited");
    expect(errorKey("SOMETHING_NEW")).toBe("errors.generic");
    expect(errorKey(undefined)).toBe("errors.generic");
  });
});
