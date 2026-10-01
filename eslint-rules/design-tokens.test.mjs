// DSN-IT-001 — the token-only lint rule (DSN-INT-002) rejects raw design values in feature code.
// Runs with Node's test runner (ESLint 10 is ESM-only, so not under Jest): pnpm test:rules
import { describe, it } from "node:test";

import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";

import plugin from "./design-tokens.mjs";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester({
  languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
}).run("no-raw-design-values", plugin.rules["no-raw-design-values"], {
  valid: [
    { code: `const a = <View className="bg-primary p-4 rounded-lg" />;` },
    { code: `const s = { paddingTop: insets.top, padding: 0, color: "transparent" };` },
    { code: `const s = { backgroundColor: color.primary };` },
    { code: `const label = "Class 10 · Science";` },
  ],
  invalid: [
    { code: `const a = <View className="bg-[#095777]" />;`, errors: [{ messageId: "arbitrary" }] },
    { code: `const a = <View className="mt-[13px]" />;`, errors: [{ messageId: "arbitrary" }] },
    { code: `const a = <Text style={{ color: "#fff" }} />;`, errors: [{ messageId: "color" }] },
    { code: `const a = <Text style={{ color: "teal" }} />;`, errors: [{ messageId: "color" }] },
    {
      code: `const a = <Text style={{ fontFamily: "Inter" }} />;`,
      errors: [{ messageId: "font" }],
    },
    {
      code: `const s = StyleSheet.create({ box: { paddingHorizontal: 12, borderRadius: 8 } });`,
      errors: [{ messageId: "size" }, { messageId: "size" }],
    },
  ],
});
