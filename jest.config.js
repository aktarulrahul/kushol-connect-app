// jest-expo with the pnpm store layout: packages that ship untranspiled JSX/ESM must be
// transformed even when they resolve under node_modules/.pnpm/…
const transpile = [
  "(jest-)?react-native",
  "@react-native(-community)?",
  "expo(nent)?",
  "@expo(nent)?/.*",
  "@expo-google-fonts/.*",
  "react-navigation",
  "@react-navigation/.*",
  "@rn-primitives/.*",
  "nativewind",
  "react-native-css-interop",
  "lucide-react-native",
  "react-native-svg",
  "react-native-reanimated",
  "react-native-worklets",
  "react-native-webview",
  "standard-navigation",
].join("|");

/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/src/**/*.test.{ts,tsx}"],
  setupFiles: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // the package's "react-native" entry is .mjs, which jest-expo does not transform
    "^lucide-react-native$":
      "<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js",
  },
  transformIgnorePatterns: [`node_modules/(?!(?:\\.pnpm/[^/]+/node_modules/)?(?:${transpile}))`],
};
