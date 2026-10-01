import { createElement } from "react";

import { fontFamily, scriptOf, textOf, weightFromClassName } from "./fonts";

// DSN-BR-004 — Bengali never renders in Inter; the weight class picks the bundled face.
describe("font selection", () => {
  it("routes any Bengali to Hind Siliguri, Latin to Inter, symbols to the UI language", () => {
    expect(scriptOf("নমুনা শিক্ষার্থী", "en")).toBe("bn");
    expect(scriptOf("Class 10-এর নোটিশ", "en")).toBe("bn"); // mixed → Hind (it has Latin too)
    expect(scriptOf("Demo High School", "bn")).toBe("en");
    expect(scriptOf("১০:৪২", "en")).toBe("bn"); // Bengali digits
    expect(scriptOf("— 42 %", "bn")).toBe("bn");
    expect(fontFamily("bn", "semibold")).toBe("HindSiliguri_600SemiBold");
    expect(fontFamily("en", "normal")).toBe("Inter_400Regular");
  });

  it("reads the last font-weight class, ignoring variant prefixes", () => {
    expect(weightFromClassName("text-sm font-medium")).toBe("medium");
    expect(weightFromClassName("font-bold text-xl font-semibold")).toBe("semibold");
    expect(weightFromClassName("active:font-bold")).toBe("bold");
    expect(weightFromClassName("font-extrabold")).toBe("bold");
    expect(weightFromClassName(undefined)).toBe("normal");
  });

  it("collects plain text from nested children", () => {
    expect(textOf(["Hello ", createElement("span", null, "বিশ্ব"), 42])).toBe("Hello বিশ্ব42");
  });
});
