import { MemoryTokenStore } from "./token-store";

describe("MemoryTokenStore", () => {
  it("stores, returns and clears the token pair", async () => {
    const store = new MemoryTokenStore();
    expect(await store.get()).toBeNull();

    await store.set({ accessToken: "a1", refreshToken: "r1" });
    expect(await store.get()).toEqual({ accessToken: "a1", refreshToken: "r1" });

    await store.set({ accessToken: "a2", refreshToken: "r2" });
    expect(await store.get()).toEqual({ accessToken: "a2", refreshToken: "r2" });

    await store.clear();
    expect(await store.get()).toBeNull();
  });

  it("defensive-copies on set so later mutation cannot leak in", async () => {
    const store = new MemoryTokenStore();
    const tokens = { accessToken: "a1", refreshToken: "r1" };
    await store.set(tokens);
    tokens.accessToken = "mutated";
    expect((await store.get())?.accessToken).toBe("a1");
  });
});
