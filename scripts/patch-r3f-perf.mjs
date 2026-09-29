// r3f-perf 7.2.3 ships a source map for its bundled font whose only source is
// the binary src/roboto.woff (no sourcesContent). Turbopack's dev server reads
// that file as text and panics ("invalid utf-8 sequence"). Removing the
// sourceMappingURL comment from the font module avoids it. Safe to re-run.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "node_modules", "r3f-perf", "dist");

for (const file of ["roboto.woff.js", "roboto.woff.mjs"]) {
  const path = join(dist, file);
  if (!existsSync(path)) continue;
  const source = readFileSync(path, "utf8");
  const patched = source.replace(/\n\/\/# sourceMappingURL=.*\s*$/, "\n");
  if (patched !== source) {
    writeFileSync(path, patched);
    console.log(`[patch-r3f-perf] removed source map reference from ${file}`);
  }
}
