import createClient, { type Middleware } from "openapi-fetch";

import { env } from "@/env";

import type { components, paths } from "./schema.gen";

// The only way the app talks to the api (lint rule in eslint.config.mjs). Types come from the api's
// OpenAPI spec (`pnpm sync:api-spec && pnpm generate:api`) — never hand-written.

export type Schemas = components["schemas"];
export type Problem = Schemas["Problem"];
export type Locale = "bn" | "en";

/** RFC 7807 body the api returns for every error (see applications/api internal/problem). */
export function isProblem(body: unknown): body is Problem {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as { code?: unknown }).code === "string" &&
    typeof (body as { status?: unknown }).status === "number"
  );
}

/** Sends Accept-Language so the api localizes problem messages (bn default). */
export function localeMiddleware(locale: Locale): Middleware {
  return {
    onRequest({ request }) {
      request.headers.set("Accept-Language", locale);
      return request;
    },
  };
}

export function createApiClient(
  options: {
    baseUrl?: string;
    locale?: Locale;
    fetch?: (input: Request) => Promise<Response>;
  } = {},
) {
  const client = createClient<paths>({
    baseUrl: options.baseUrl ?? env.EXPO_PUBLIC_API_URL,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });
  client.use(localeMiddleware(options.locale ?? "bn"));
  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;
