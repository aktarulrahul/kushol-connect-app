// ESLint 10 flat config. eslint-config-expo is not used: its bundled react/import plugins do not
// declare ESLint 10 support yet (checked 2026-09-30).
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

import designTokens from "./eslint-rules/design-tokens.mjs";

export default tseslint.config(
  {
    ignores: [
      "node_modules/",
      ".expo/",
      "dist/",
      "coverage/",
      "ios/",
      "android/",
      "expo-env.d.ts",
      "src/api/schema.gen.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/consistent-type-imports": "error",
      // FND-BR-002: env is read only in src/env.ts.
      "no-restricted-properties": [
        "error",
        { object: "process", property: "env", message: "Read env through src/env.ts." },
      ],
      // Boundary: the api is reached only through the generated client in src/api.
      "no-restricted-imports": [
        "error",
        { paths: [{ name: "openapi-fetch", message: "Use createApiClient from @/api/client." }] },
      ],
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "Call the api through @/api/client (openapi-fetch)." },
      ],
    },
  },
  // DSN-BR-002 / DSN-INT-002: feature code uses tokens only. Raw values are allowed where tokens
  // are defined (src/theme) and in the vendored primitives (src/components/ui).
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/theme/**", "src/components/ui/**", "**/*.test.ts", "**/*.test.tsx"],
    plugins: { "design-tokens": designTokens },
    rules: { "design-tokens/no-raw-design-values": "error" },
  },
  { files: ["src/env.ts"], rules: { "no-restricted-properties": "off" } },
  // React Native Reusables components are vendored (`npx @react-native-reusables/cli add`); keep
  // them close to upstream — only these stylistic strict rules are relaxed there.
  {
    files: ["src/components/ui/**"],
    rules: {
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { ignoreRestSiblings: true, argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["src/api/**"],
    rules: { "no-restricted-imports": "off", "no-restricted-globals": "off" },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "jest.setup.js"],
    languageOptions: { globals: { ...globals.jest } },
    rules: { "no-restricted-globals": "off" },
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      parserOptions: { projectService: false, project: false },
      globals: { ...globals.node },
    },
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      "no-restricted-properties": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
