// App-side token storage (IDT-AP-009). The interface is async so the SecureStore-backed
// implementation (expo-secure-store — never AsyncStorage, 03 `05-app-tasks.md` §4) drops in at
// integration without touching callers; today an in-memory instance backs the mock flows.

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export interface TokenStore {
  get(): Promise<AuthTokens | null>;
  set(tokens: AuthTokens): Promise<void>;
  clear(): Promise<void>;
}

export class MemoryTokenStore implements TokenStore {
  private tokens: AuthTokens | null = null;

  get(): Promise<AuthTokens | null> {
    return Promise.resolve(this.tokens);
  }

  set(tokens: AuthTokens): Promise<void> {
    this.tokens = { ...tokens };
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.tokens = null;
    return Promise.resolve();
  }
}

/** App-wide instance. TODO(integration): swap for a SecureStore-backed TokenStore (IDT-AP-009). */
export const tokenStore: TokenStore = new MemoryTokenStore();
