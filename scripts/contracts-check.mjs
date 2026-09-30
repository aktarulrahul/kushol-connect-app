// Drift check (CI): regenerates the client from the committed spec copy into a temp file and
// fails if src/api/schema.gen.ts differs. The api repo is not available in CI, so "copy matches
// the api" is checked locally by `pnpm sync:api-spec` before committing.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "kushol-app-contracts-"));
const out = join(dir, "schema.gen.ts");
try {
  const bin = (name) => join("node_modules", ".bin", name);
  execFileSync(bin("openapi-typescript"), ["openapi/openapi.yaml", "--output", out], {
    stdio: "ignore",
  });
  execFileSync(bin("prettier"), ["--write", out, "--config", ".prettierrc.json"], {
    stdio: "ignore",
  });
  const fresh = readFileSync(out, "utf8");
  const committed = readFileSync("src/api/schema.gen.ts", "utf8");
  if (fresh !== committed) {
    console.error("contracts: src/api/schema.gen.ts is stale — run `pnpm generate:api`");
    process.exit(1);
  }
  console.log("contracts: no drift");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
