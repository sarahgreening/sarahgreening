// Shared helpers for the pipeline scripts.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const projectDir = (p) => path.join(ROOT, "projects", p);
export const publicMediaDir = (p) => path.join(ROOT, "public", "media", p);
export const outDir = (p) => path.join(ROOT, "out", p);

export const VIDEO_EXT = [".mp4", ".mov", ".m4v", ".hevc", ".webm"];
export const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif"];

export function run(cmd, args, { quiet = false } = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw new Error(`Could not run ${cmd}: ${r.error.message}`);
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")}\nexited ${r.status}\n${(r.stderr || "").slice(-3000)}`);
  }
  if (!quiet && r.stderr && process.env.VERBOSE) process.stderr.write(r.stderr);
  return r;
}

export function has(cmd) {
  const r = spawnSync(process.platform === "win32" ? "where" : "which", [cmd], { encoding: "utf8" });
  return r.status === 0;
}

export function requireFfmpeg() {
  for (const c of ["ffmpeg", "ffprobe"]) {
    if (!has(c)) {
      console.error(`\n✗ ${c} not found. Install it first:\n  macOS:   brew install ffmpeg\n  Ubuntu:  sudo apt-get install ffmpeg\n  Windows: winget install ffmpeg\n`);
      process.exit(1);
    }
  }
}

export function ffprobe(file) {
  const r = run("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file], { quiet: true });
  return JSON.parse(r.stdout);
}

export function hasFilter(name) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-filters"], { encoding: "utf8" });
  return new RegExp(`\\s${name}\\s`).test(r.stdout || "");
}

/** Natural sort so "2-foo.mov" comes before "10-bar.mov". */
export const naturalSort = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

export const listFiles = (dir, exts) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir)
        .filter((f) => !f.startsWith(".") && exts.includes(path.extname(f).toLowerCase()))
        .sort(naturalSort)
    : [];

export const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
export const writeJson = (f, data) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(data, null, 2) + "\n");
};

export function getProjectArg() {
  const p = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!p) {
    console.error("Usage: npm run <script> -- <project-name>   (folder inside projects/)");
    process.exit(1);
  }
  if (!fs.existsSync(projectDir(p))) {
    console.error(`✗ projects/${p} does not exist. Create it with: npm run new -- ${p}`);
    process.exit(1);
  }
  return p;
}

export const flag = (name) => {
  const a = process.argv.find((x) => x === `--${name}` || x.startsWith(`--${name}=`));
  if (!a) return undefined;
  return a.includes("=") ? a.split("=").slice(1).join("=") : true;
};
