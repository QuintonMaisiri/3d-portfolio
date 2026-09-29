// @react-three/fiber 9.8.1 creates a THREE.Clock for its render loop, and
// three r183+ logs "Clock: This module has been deprecated" whenever one is
// constructed. This swaps in an identical clock class (same fields and
// methods R3F uses: start, stop, getDelta, getElapsedTime, elapsedTime,
// oldTime, running) so behaviour is unchanged and the warning goes away.
// Safe to re-run; remove once R3F moves to THREE.Timer.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "node_modules", "@react-three", "fiber", "dist");
const CLOCK =
  "new (class Clock{constructor(a=true){this.autoStart=a;this.startTime=0;this.oldTime=0;this.elapsedTime=0;this.running=false}" +
  "start(){this.startTime=performance.now();this.oldTime=this.startTime;this.elapsedTime=0;this.running=true}" +
  "stop(){this.getElapsedTime();this.running=false;this.autoStart=false}" +
  "getElapsedTime(){this.getDelta();return this.elapsedTime}" +
  "getDelta(){let d=0;if(this.autoStart&&!this.running){this.start();return 0}if(this.running){const n=performance.now();d=(n-this.oldTime)/1000;this.oldTime=n;this.elapsedTime+=d}return d}})()";

if (!existsSync(dist)) {
  console.warn("[patch-r3f-clock] @react-three/fiber not installed yet, skipping");
  process.exit(0);
}

for (const file of readdirSync(dist).filter((f) => f.endsWith(".js"))) {
  const path = join(dist, file);
  const source = readFileSync(path, "utf8");
  // ESM builds use THREE.Clock; CommonJS builds use THREE__namespace.Clock.
  const pattern = /new (?:THREE|THREE__namespace)\.Clock\(\)/g;
  if (!pattern.test(source)) continue;
  writeFileSync(path, source.replace(pattern, CLOCK));
  console.log(`[patch-r3f-clock] replaced THREE.Clock in ${file}`);
}
