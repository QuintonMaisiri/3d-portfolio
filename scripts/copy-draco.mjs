// Copies the Draco decoder shipped with three into public/draco so it is
// self-hosted and always matches the installed three version.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "three", "examples", "jsm", "libs", "draco");
const dest = join(root, "public", "draco");

if (!existsSync(src)) {
  console.warn("[copy-draco] three not installed yet, skipping");
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
for (const file of ["draco_decoder.js", "draco_decoder.wasm", "draco_wasm_wrapper.js"]) {
  cpSync(join(src, "gltf", file), join(dest, file));
}
console.log("[copy-draco] decoder copied to public/draco");
