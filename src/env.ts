import { z } from "zod";

// The only module that reads process.env (FND-BR-002; lint rule in eslint.config.mjs).
// EXPO_PUBLIC_* values are inlined into the app bundle at build time and are readable by anyone
// with the APK: never put a secret in one. Each variable is referenced literally so Expo can
// inline it; per-channel values are set in EAS profiles (module 15, OPS-AP-004).

const schema = z.object({
  /** Base URL of the api, e.g. http://<lan-ip>:8080 in development. */
  EXPO_PUBLIC_API_URL: z.url({ protocol: /^https?$/ }),
});

export type Env = z.infer<typeof schema>;

export class EnvError extends Error {
  constructor(readonly vars: string[]) {
    super(`invalid or missing environment variables: ${vars.join(", ")}`);
    this.name = "EnvError";
  }
}

/** Parses raw values; reports every bad variable by name (never its value). */
export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const vars = [...new Set(result.error.issues.map((i) => String(i.path[0])))].sort();
    throw new EnvError(vars);
  }
  return result.data;
}

export const env: Env = parseEnv({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
});
