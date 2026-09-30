// Copies the api's contract into this repo (the api repo owns it; app keeps a synced copy).
// Usage: pnpm sync:api-spec [path-to-api-repo]   (default: ../api, i.e. applications/api)
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const apiRepo = resolve(process.argv[2] ?? process.env.API_REPO ?? "../api");
const source = resolve(apiRepo, "openapi/openapi.yaml");
const target = resolve("openapi/openapi.yaml");

if (!existsSync(source)) {
  console.error(
    `sync:api-spec: ${source} not found — pass the api repo path as the first argument`,
  );
  process.exit(1);
}
const before = existsSync(target) ? readFileSync(target, "utf8") : "";
copyFileSync(source, target);
const changed = before !== readFileSync(target, "utf8");
console.log(`sync:api-spec: ${changed ? "updated" : "unchanged"} ← ${source}`);
if (changed)
  console.log("sync:api-spec: now run `pnpm generate:api` and commit both files together");
