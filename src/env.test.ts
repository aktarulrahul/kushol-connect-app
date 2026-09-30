import { EnvError, parseEnv } from "./env";

describe("parseEnv", () => {
  it("accepts a valid environment", () => {
    expect(parseEnv({ EXPO_PUBLIC_API_URL: "https://api.example.test" })).toEqual({
      EXPO_PUBLIC_API_URL: "https://api.example.test",
    });
  });

  it("names the bad variable without echoing its value", () => {
    expect.assertions(3);
    try {
      parseEnv({ EXPO_PUBLIC_API_URL: "not a url" });
    } catch (err) {
      expect(err).toBeInstanceOf(EnvError);
      expect((err as EnvError).vars).toEqual(["EXPO_PUBLIC_API_URL"]);
      expect((err as Error).message).not.toContain("not a url");
    }
  });

  it("rejects a missing value", () => {
    expect(() => parseEnv({})).toThrow(EnvError);
  });
});
