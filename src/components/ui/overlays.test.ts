import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

// Guard (owner 2026-10-17, Android bottom-sheet screenshots): overlays render through
// `OverlayPortal` (the app's own edge-to-edge window), never React Native's `Modal` (a separate
// Android dialog window that ended above the composer), and pinned bottom bars use
// `BottomActionBar` so their buttons clear the gesture / navigation bar.

const SRC = join(__dirname, "..", "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : [];
  });
}

const files = sourceFiles(SRC).map((path) => ({
  path: relative(SRC, path).replace(/\\/g, "/"),
  text: readFileSync(path, "utf8"),
}));

describe("overlay + bottom bar conventions", () => {
  it("never uses React Native's Modal for an overlay", () => {
    const offenders = files.filter(({ text }) =>
      /import\s*{[^}]*\bModal\b[^}]*}\s*from\s*["']react-native["']/.test(text),
    );
    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  it("pins bottom action bars only through BottomActionBar", () => {
    const offenders = files.filter(
      ({ path, text }) =>
        path !== "components/ui/bottom-action-bar.tsx" &&
        /absolute inset-x-0 bottom-0 border-t/.test(text),
    );
    expect(offenders.map((f) => f.path)).toEqual([]);
  });
});
