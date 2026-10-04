import { MemoryTokenStore, SecureTokenStore } from "./token-store";

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
    expect(await store.getAccount()).toBeNull();
  });

  it("keeps the account when the token pair is rotated", async () => {
    const store = new MemoryTokenStore();
    await store.set({ accessToken: "a1", refreshToken: "r1" });
    await store.setAccount({ id: "user_1" });
    await store.set({ accessToken: "a2", refreshToken: "r2" });
    expect(await store.get()).toEqual({ accessToken: "a2", refreshToken: "r2" });
    expect(await store.getAccount()).toEqual({ id: "user_1" });
  });

  it("drops an in-flight rotation that finishes after clear", async () => {
    const store = new MemoryTokenStore();
    await store.set({ accessToken: "a1", refreshToken: "r1" });
    const generation = store.generation();
    await store.clear();
    await store.setIfGeneration(generation, { accessToken: "a2", refreshToken: "r2" });
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

describe("SecureTokenStore", () => {
  function memoryKv() {
    const map = new Map<string, string>();
    return {
      map,
      getItem: (key: string) => Promise.resolve(map.get(key) ?? null),
      setItem: (key: string, value: string) => {
        map.set(key, value);
        return Promise.resolve();
      },
      deleteItem: (key: string) => {
        map.delete(key);
        return Promise.resolve();
      },
    };
  }

  it("round-trips the pair and the account in one record", async () => {
    const kv = memoryKv();
    const store = new SecureTokenStore(kv, "test.session");
    await store.set({ accessToken: "a1", refreshToken: "r1" });
    await store.setAccount({ id: "user_1", fullName: "ডেমো" });
    await store.set({ accessToken: "a2", refreshToken: "r2" });

    const restored = new SecureTokenStore(kv, "test.session");
    expect(await restored.get()).toEqual({ accessToken: "a2", refreshToken: "r2" });
    expect(await restored.getAccount()).toEqual({ id: "user_1", fullName: "ডেমো" });

    await restored.clear();
    expect(await restored.get()).toBeNull();
    expect(kv.map.has("test.session")).toBe(false);
  });

  it("drops a corrupt record", async () => {
    const kv = memoryKv();
    await kv.setItem("test.session", "{");
    const store = new SecureTokenStore(kv, "test.session");
    expect(await store.get()).toBeNull();
    expect(kv.map.has("test.session")).toBe(false);
  });
});
