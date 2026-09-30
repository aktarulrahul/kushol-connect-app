# Kushol Connect — app

Expo (React Native) app for students, teachers and guardians. Its own git repository: nothing is
shared with `api` or `web` except the api's OpenAPI contract, which is **copied** here.

Specs: `docs/modules/*/05-app-tasks.md` · stack: `docs/tech-stack.md` · build rules:
`docs/prompt/prompt-build.md`.

## Setup

```bash
pnpm install
cp .env.example .env    # set your machine's LAN IP so a phone can reach the api
pnpm start
```

Node ≥ 22.12 (`.nvmrc`), pnpm 11 (`packageManager`), `node-linker=hoisted` for React Native.
Dependencies are pinned exactly (`.npmrc`); Expo-managed packages use the SDK's versions
(`pnpm exec expo install --check`). Native `ios/`/`android/` folders are generated (CNG), never
committed. Development builds (not Expo Go) arrive with 06's native FCM module.

## Layout

| Path                                     | What                                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/env.ts`                             | The only reader of `process.env` (zod). `EXPO_PUBLIC_*` ships in the bundle — never a secret             |
| `src/api/`                               | `schema.gen.ts` (generated) + `client.ts` (`createApiClient`, `isProblem`). The only way to call the api |
| `openapi/openapi.yaml`                   | Synced copy of `applications/api/openapi/openapi.yaml` — do not edit                                     |
| `src/app/`                               | expo-router routes (only route files here; tests live in `src/__tests__`). Placeholder `/` until 03      |
| `src/theme` · `src/i18n` · `src/schemas` | Arrive with 02-design-system (tokens, bn/en catalogs) and 03 (form schemas)                              |

Lint enforces the boundaries: `process.env` only in `src/env.ts`; `fetch` and `openapi-fetch` only
in `src/api/`.

## API contract

```bash
pnpm sync:api-spec      # copy ../api/openapi/openapi.yaml (or pass the api repo path)
pnpm generate:api       # regenerate src/api/schema.gen.ts
```

Commit the spec copy and the generated file together. CI runs `pnpm contracts:check`.

## Checks

```bash
pnpm gate               # format:check · lint · typecheck · test · contracts:check
pnpm doctor             # expo-doctor
```
