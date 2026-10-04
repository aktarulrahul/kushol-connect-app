// App-side token storage (IDT-AP-009). One store: expo-secure-store on device, localStorage on
// web (the package has no web implementation). Never AsyncStorage. The account snapshot rides in
// the same record so a fixture session and an offline restore can rebuild `me` without a second
// store. `generation` lets an in-flight refresh drop its write after sign-out.
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export interface TokenStore {
  get(): Promise<AuthTokens | null>;
  set(tokens: AuthTokens): Promise<void>;
  clear(): Promise<void>;
  getAccount(): Promise<unknown>;
  setAccount(account: unknown): Promise<void>;
  /** Bumped synchronously on clear. An in-flight refresh must not write tokens back. */
  generation(): number;
  setIfGeneration(generation: number, tokens: AuthTokens): Promise<void>;
}

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
}

const SESSION_KEY = "kushol.auth.session";

type SessionRecord = {
  accessToken: string;
  refreshToken: string;
  account: unknown;
};

function cloneAccount(account: unknown): unknown {
  if (typeof account !== "object" || account === null) return null;
  return JSON.parse(JSON.stringify(account)) as unknown;
}

function parseSession(raw: string): SessionRecord | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const record = value as {
      accessToken?: unknown;
      refreshToken?: unknown;
      account?: unknown;
    };
    if (typeof record.accessToken !== "string" || typeof record.refreshToken !== "string") {
      return null;
    }
    if (record.accessToken.length === 0 || record.refreshToken.length === 0) return null;
    return {
      accessToken: record.accessToken,
      refreshToken: record.refreshToken,
      account: record.account ?? null,
    };
  } catch {
    return null;
  }
}

function browserStorage(): Storage | null {
  if (typeof globalThis.localStorage === "undefined") return null;
  return globalThis.localStorage;
}

/** SecureStore on iOS/Android. Web refresh survives in localStorage — SecureStore is a native stub there. */
export const secureStorage: KeyValueStore = {
  async getItem(key) {
    if (Platform.OS === "web") return browserStorage()?.getItem(key) ?? null;
    return SecureStore.getItemAsync(key);
  },
  async setItem(key, value) {
    if (Platform.OS === "web") {
      browserStorage()?.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key) {
    if (Platform.OS === "web") {
      browserStorage()?.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export class MemoryTokenStore implements TokenStore {
  private tokens: AuthTokens | null = null;
  private account: unknown = null;
  private revision = 0;

  generation(): number {
    return this.revision;
  }

  get(): Promise<AuthTokens | null> {
    return Promise.resolve(this.tokens ? { ...this.tokens } : null);
  }

  set(tokens: AuthTokens): Promise<void> {
    this.tokens = { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    return Promise.resolve();
  }

  setIfGeneration(generation: number, tokens: AuthTokens): Promise<void> {
    if (generation !== this.revision) return Promise.resolve();
    return this.set(tokens);
  }

  getAccount(): Promise<unknown> {
    return Promise.resolve(this.account);
  }

  setAccount(account: unknown): Promise<void> {
    if (!this.tokens) return Promise.resolve();
    this.account = cloneAccount(account);
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.revision += 1;
    this.tokens = null;
    this.account = null;
    return Promise.resolve();
  }
}

export class SecureTokenStore implements TokenStore {
  private session: SessionRecord | null = null;
  private revision = 0;
  private tail: Promise<void>;

  constructor(
    private readonly kv: KeyValueStore,
    private readonly key = SESSION_KEY,
  ) {
    this.tail = this.read();
  }

  generation(): number {
    return this.revision;
  }

  private async read(): Promise<void> {
    try {
      const raw = await this.kv.getItem(this.key);
      if (!raw) {
        this.session = null;
        return;
      }
      const parsed = parseSession(raw);
      if (!parsed) {
        this.session = null;
        await this.kv.deleteItem(this.key);
        return;
      }
      this.session = parsed;
    } catch {
      this.session = null;
    }
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.tail.then(fn, fn);
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async persist(): Promise<void> {
    if (!this.session) {
      await this.kv.deleteItem(this.key);
      return;
    }
    await this.kv.setItem(this.key, JSON.stringify(this.session));
  }

  get(): Promise<AuthTokens | null> {
    return this.enqueue(() => {
      if (!this.session) return Promise.resolve(null);
      return Promise.resolve({
        accessToken: this.session.accessToken,
        refreshToken: this.session.refreshToken,
      });
    });
  }

  set(tokens: AuthTokens): Promise<void> {
    return this.enqueue(async () => {
      this.session = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        account: this.session?.account ?? null,
      };
      await this.persist();
    });
  }

  setIfGeneration(generation: number, tokens: AuthTokens): Promise<void> {
    if (generation !== this.revision) return Promise.resolve();
    return this.enqueue(async () => {
      if (generation !== this.revision) return;
      this.session = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        account: this.session?.account ?? null,
      };
      await this.persist();
    });
  }

  getAccount(): Promise<unknown> {
    return this.enqueue(() => Promise.resolve(this.session?.account ?? null));
  }

  setAccount(account: unknown): Promise<void> {
    return this.enqueue(async () => {
      if (!this.session) return;
      this.session = { ...this.session, account: cloneAccount(account) };
      await this.persist();
    });
  }

  clear(): Promise<void> {
    this.revision += 1;
    return this.enqueue(async () => {
      this.session = null;
      await this.kv.deleteItem(this.key);
    });
  }
}

/** App-wide instance. Tests inject `MemoryTokenStore`; the device uses this one. */
export const tokenStore: TokenStore = new SecureTokenStore(secureStorage);
