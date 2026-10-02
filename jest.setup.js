// Test-only public value so src/env.ts parses (not a secret).
process.env.EXPO_PUBLIC_API_URL = "http://api.test";

// The app token store talks to the keychain. Tests that need a pair use MemoryTokenStore.
jest.mock("expo-secure-store", () => {
  const memory = new Map();
  return {
    getItemAsync: jest.fn((key) => Promise.resolve(memory.get(key) ?? null)),
    setItemAsync: jest.fn((key, value) => {
      memory.set(key, value);
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key) => {
      memory.delete(key);
      return Promise.resolve();
    }),
  };
});

// Reanimated 4 loads its native worklets module on import; use the libraries' own Jest mocks.
jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));
// The mock lacks useReducedMotion; tests flip globalThis.__REDUCE_MOTION__ to exercise both modes.
jest.mock("react-native-reanimated", () => ({
  ...require("react-native-reanimated/mock"),
  useReducedMotion: () => globalThis.__REDUCE_MOTION__ === true,
}));
