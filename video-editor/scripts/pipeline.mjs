// ingest → plan → render (+QC) in one go. Usage: npm run pipeline -- <project>
import { spawnSync } from "node:child_process";
import path from "node:path";
import { getProjectArg, ROOT } from "./lib.mjs";

const p = getProjectArg();
const extra = process.argv.slice(2).filter((a) => a.startsWith("--"));
for (const step of ["ingest", "plan", "render"]) {
  console.log(`\n=== ${step} ===`);
  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts", `${step}.mjs`), p, ...extra], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
