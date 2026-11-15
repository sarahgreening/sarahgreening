// Creates projects/<name>/ with clips/, images/ and a brief.json template.
// Usage: npm run new -- <name>
import fs from "node:fs";
import path from "node:path";
import { projectDir, readJson, writeJson } from "./lib.mjs";

const name = process.argv[2];
if (!name || !/^[a-z0-9-]+$/.test(name)) {
  console.error("Usage: npm run new -- <name>   (lowercase letters, numbers, dashes)");
  process.exit(1);
}
const dir = projectDir(name);
if (fs.existsSync(path.join(dir, "brief.json"))) {
  console.error(`projects/${name} already exists.`);
  process.exit(1);
}
fs.mkdirSync(path.join(dir, "clips"), { recursive: true });
fs.mkdirSync(path.join(dir, "images"), { recursive: true });
const template = readJson(path.join(path.dirname(new URL(import.meta.url).pathname), "brief.template.json"));
writeJson(path.join(dir, "brief.json"), template);
console.log(`✓ Created projects/${name}/
  1. Put your videos in   projects/${name}/clips/   (name them 01-..., 02-... to set the order)
  2. Put product photos in projects/${name}/images/ (PNG with transparent background is best)
  3. Edit projects/${name}/brief.json (product name, price, colours, hooks, caption scripts)
  4. Run: npm run pipeline -- ${name}`);
