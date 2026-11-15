// Renders every edit of a project to H.264/AAC MP4, then runs QC on the actual
// files: ffprobe checks, audio level, black-frame scan, preview PNGs + contact sheet.
// Usage: npm run render -- <project> [--only=a-tiktok-shop] [--concurrency=4]
// Env:   REMOTION_BROWSER_EXECUTABLE=/path/to/chrome-headless-shell (optional)
//        REMOTION_LICENSE_KEY=... (only if your company needs a Remotion license)
import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderMedia, selectComposition } from "@remotion/renderer";
import dns from "node:dns/promises";
import fs from "node:fs";
import path from "node:path";
import { ffprobe, flag, getProjectArg, outDir, projectDir, readJson, requireFfmpeg, ROOT, run, writeJson } from "./lib.mjs";

requireFfmpeg();
const P = getProjectArg();
const only = flag("only");
const concurrency = flag("concurrency") ? Number(flag("concurrency")) : null;
const logLevel = process.env.VERBOSE ? "verbose" : "error";
const editsDir = path.join(projectDir(P), "edits");
const out = outDir(P);
fs.mkdirSync(out, { recursive: true });

const editFiles = fs.readdirSync(editsDir).filter((f) => f.endsWith(".json"))
  .filter((f) => !only || f.startsWith(only)).sort();
if (!editFiles.length) throw new Error(`No edits in projects/${P}/edits. Run: npm run plan -- ${P}`);

// ---------- Browser ----------
const FALLBACK_BROWSERS = [
  "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell",
];
function findFallbackBrowser() {
  const roots = ["/opt/pw-browsers", path.join(process.env.HOME ?? "", ".cache/ms-playwright")];
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    for (const d of fs.readdirSync(r).filter((x) => x.startsWith("chromium_headless_shell")).sort().reverse()) {
      const p = path.join(r, d, "chrome-headless-shell-linux64", "chrome-headless-shell");
      if (fs.existsSync(p)) return p;
    }
  }
  return FALLBACK_BROWSERS.find((p) => fs.existsSync(p)) ?? null;
}
async function resolveBrowser() {
  if (process.env.REMOTION_BROWSER_EXECUTABLE) return process.env.REMOTION_BROWSER_EXECUTABLE;
  const cached = path.join(ROOT, "node_modules/.remotion/chrome-headless-shell");
  const alreadyDownloaded = fs.existsSync(cached) && fs.readdirSync(cached).some((d) => d !== "download.lock");
  // The downloader's network errors can't be caught, so check reachability first.
  const canDownload = alreadyDownloaded || (await dns.lookup("remotion.media").then(() => true, () => false));
  try {
    if (!canDownload) throw Object.assign(new Error("remotion.media unreachable"), { code: "ENOTFOUND" });
    await ensureBrowser(); // Remotion's own headless shell (preferred)
    return null;
  } catch (e) {
    const fb = findFallbackBrowser();
    if (!fb) throw new Error(`Remotion could not download its browser (${e.message}) and no fallback was found. ` +
      `Set REMOTION_BROWSER_EXECUTABLE to a chrome-headless-shell binary.`);
    console.warn(`! Remotion's browser download failed (${e.code ?? e.message}); using preinstalled ${fb}`);
    return fb;
  }
}

// ---------- QC helpers ----------
const sec = (s) => `t${s.toFixed(2).padStart(5, "0")}s`; // e.g. t04.20s (no colons: safe on Mac/Windows/iPhone)
function qcFile(file, spec, expectedFrames) {
  const info = ffprobe(file);
  const v = info.streams.find((s) => s.codec_type === "video");
  const a = info.streams.find((s) => s.codec_type === "audio");
  const duration = Number(info.format.duration);
  const expected = expectedFrames / spec.fps;
  const vol = run("ffmpeg", ["-hide_banner", "-i", file, "-map", "0:a:0", "-af", "volumedetect", "-f", "null", "-"], { quiet: true }).stderr;
  const meanDb = Number(/mean_volume:\s*(-?[\d.]+|-inf)/.exec(vol)?.[1] ?? -Infinity);
  const black = run("ffmpeg", ["-hide_banner", "-i", file, "-vf", "blackdetect=d=0.4:pix_th=0.08", "-an", "-f", "null", "-"], { quiet: true }).stderr;
  const blackRuns = [...black.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const checks = {
    "video codec is H.264": v?.codec_name === "h264",
    "1080x1920 (9:16)": v?.width === 1080 && v?.height === 1920,
    "yuv420p, BT.709 (accurate colour on phones)": v?.pix_fmt === "yuv420p" && v?.color_space === "bt709",
    [`frame rate ${spec.fps}fps`]: v?.avg_frame_rate === `${spec.fps}/1`,
    "audio codec is AAC": a?.codec_name === "aac",
    [`duration ${expected.toFixed(2)}s ±0.1s`]: Math.abs(duration - expected) <= 0.1,
    "audio is not silent": meanDb > -60,
    "no black gaps ≥0.4s": blackRuns.length === 0,
  };
  return {
    file: path.relative(ROOT, file),
    sizeMB: +(fs.statSync(file).size / 1e6).toFixed(2),
    durationSec: +duration.toFixed(3),
    video: v && { codec: v.codec_name, profile: v.profile, width: v.width, height: v.height, pixFmt: v.pix_fmt, fps: v.avg_frame_rate, bitrateKbps: Math.round(v.bit_rate / 1000) },
    audio: a && { codec: a.codec_name, sampleRate: a.sample_rate, channels: a.channels, meanVolumeDb: meanDb },
    blackRuns,
    checks,
    pass: Object.values(checks).every(Boolean),
  };
}

function previews(file, spec, key, durationSec) {
  const dir = path.join(out, "previews", key);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const moments = [
    ["hook", Math.min(0.8, durationSec / 4)],
    ...(spec.titleCard ? [["title-card", spec.titleCard.startSec + spec.titleCard.durationSec / 2]] : []),
    // captioned clips: one frame in the middle of every caption
    ...(spec.captions ?? []).filter((c) => c.lines).map((c) => [`caption-${c.name}`, (c.startSec + c.endSec) / 2]),
    ...(spec.titleCard ? [["25pct", durationSec * 0.25]] : []),
    ["50pct", durationSec * 0.5],
    ...(spec.titleCard ? [["75pct", durationSec * 0.75]] : []),
    ["end-card", durationSec - 0.6],
  ];
  const files = [];
  for (const [name, t] of moments) {
    const f = path.join(dir, `${sec(t)}-${name}.png`);
    run("ffmpeg", ["-y", "-v", "error", "-ss", t.toFixed(3), "-i", file, "-frames:v", "1", f]);
    files.push(path.relative(ROOT, f));
  }
  // one frame per second, 5 columns, labelled — quick visual scan of the whole edit
  const sheet = path.join(out, "previews", `${key}-contact-sheet.jpg`);
  run("ffmpeg", ["-y", "-v", "error", "-i", file, "-vf",
    `fps=1,scale=216:384,drawtext=text='%{pts\\:hms}':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6,tile=5x${Math.ceil(Math.round(durationSec) / 5)}:padding=6:color=white`,
    "-frames:v", "1", "-q:v", "3", sheet]);
  files.push(path.relative(ROOT, sheet));
  return files;
}

// ---------- Render ----------
const browserExecutable = await resolveBrowser();
console.log("• Bundling Remotion project…");
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/index.ts"), rspack: true });

const report = { project: P, renderedAt: new Date().toISOString(), browser: browserExecutable ?? "remotion-default", outputs: [] };
for (const f of editFiles) {
  const key = path.basename(f, ".json");
  const spec = readJson(path.join(editsDir, f));
  const outputLocation = path.join(out, `${P}-${key}.mp4`);
  const composition = await selectComposition({ serveUrl, id: spec.composition ?? "ProductVideo", inputProps: spec, browserExecutable, logLevel });
  console.log(`• Rendering ${spec.editName} → ${path.relative(ROOT, outputLocation)} (${composition.durationInFrames} frames)`);
  const t0 = Date.now();
  let last = -1;
  await renderMedia({
    composition, serveUrl, inputProps: spec, outputLocation, browserExecutable,
    codec: "h264", audioCodec: "aac", audioBitrate: "192k", crf: 18, x264Preset: "medium",
    pixelFormat: "yuv420p", colorSpace: "bt709", enforceAudioTrack: true, overwrite: true, logLevel,
    ...(concurrency ? { concurrency } : {}),
    ...(process.env.REMOTION_LICENSE_KEY ? { licenseKey: process.env.REMOTION_LICENSE_KEY } : {}),
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== last) { last = pct; process.stdout.write(`  ${pct}%`); }
    },
  });
  process.stdout.write(`  (${((Date.now() - t0) / 1000).toFixed(1)}s)\n`);
  const qc = qcFile(outputLocation, spec, composition.durationInFrames);
  qc.edit = spec.editName;
  qc.previews = previews(outputLocation, spec, key, qc.durationSec);
  report.outputs.push(qc);
  for (const [name, ok] of Object.entries(qc.checks)) console.log(`    ${ok ? "✓" : "✗"} ${name}`);
}

writeJson(path.join(out, "qc-report.json"), report);
const md = [`# QC report: ${P}`, "", `Rendered ${report.renderedAt}`, ""];
for (const o of report.outputs) {
  md.push(`## ${o.pass ? "PASS" : "FAIL"} - ${o.edit}`, "", `- File: \`${o.file}\` (${o.sizeMB} MB, ${o.durationSec}s)`,
    `- Video: ${o.video.codec} ${o.video.profile}, ${o.video.width}x${o.video.height}, ${o.video.pixFmt}, ${o.video.fps}, ${o.video.bitrateKbps} kbps`,
    `- Audio: ${o.audio.codec}, ${o.audio.sampleRate} Hz, ${o.audio.channels} ch, mean ${o.audio.meanVolumeDb} dB`, "");
  for (const [n, ok] of Object.entries(o.checks)) md.push(`- [${ok ? "x" : " "}] ${n}`);
  md.push("", "Preview frames:", ...o.previews.map((p) => `- \`${p}\``), "");
}
fs.writeFileSync(path.join(out, "QC.md"), md.join("\n"));
const allPass = report.outputs.every((o) => o.pass);
console.log(`${allPass ? "✓ All outputs passed QC" : "✗ Some outputs FAILED QC"} → out/${P}/QC.md`);
process.exit(allPass ? 0 : 2);
