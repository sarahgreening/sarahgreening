// Normalises a project's raw clips + images into public/media/<project>/ and
// writes projects/<project>/media.json. Usage: npm run ingest -- <project> [--force]
//
// Clips  → H.264 High, yuv420p, Rec.709 SDR, 30fps CFR, AAC 48kHz stereo.
//          Handles iPhone HEVC/.MOV, HDR (HLG/Dolby Vision/PQ → tone-mapped SDR),
//          60/120/240fps, rotation metadata and clips with no audio.
// Images → copied byte-for-byte (no recompression, so packaging/branding is
//          untouched). HEIC is converted losslessly to PNG.
import fs from "node:fs";
import path from "node:path";
import {
  ffprobe, flag, getProjectArg, has, hasFilter, IMAGE_EXT, listFiles,
  projectDir, publicMediaDir, requireFfmpeg, run, VIDEO_EXT, writeJson,
} from "./lib.mjs";

requireFfmpeg();
const P = getProjectArg();
const force = Boolean(flag("force"));
const FPS = 30;
// Keep enough resolution to fill 1080x1920 and still allow ~1.33x zoom without softening.
const COVER_W = 1440, COVER_H = 2560;

const src = projectDir(P);
const dst = publicMediaDir(P);
fs.mkdirSync(dst, { recursive: true });
const safe = (f) => path.parse(f).name.replace(/[^a-zA-Z0-9_-]+/g, "-");
const fresh = (input, output) =>
  !force && fs.existsSync(output) && fs.statSync(output).mtimeMs > fs.statSync(input).mtimeMs;

const canToneMap = hasFilter("zscale") && hasFilter("tonemap");
const manifest = { project: P, clips: [], images: [] };

const clipFiles = listFiles(path.join(src, "clips"), VIDEO_EXT);
const imageFiles = listFiles(path.join(src, "images"), IMAGE_EXT);
if (!clipFiles.length) console.warn(`! No clips found in projects/${P}/clips/`);

for (const file of clipFiles) {
  const input = path.join(src, "clips", file);
  const outName = `${safe(file)}.mp4`;
  const output = path.join(dst, outName);
  const info = ffprobe(input);
  const v = info.streams.find((s) => s.codec_type === "video");
  if (!v) { console.warn(`! ${file}: no video stream, skipped`); continue; }
  const hasAudio = info.streams.some((s) => s.codec_type === "audio");
  const rotation = Math.abs(
    Number(v.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? v.tags?.rotate ?? 0),
  );
  const [w, h] = rotation % 180 === 90 ? [v.height, v.width] : [v.width, v.height];
  const hdr = ["arib-std-b67", "smpte2084"].includes(v.color_transfer);

  // Downscale only (never upscale) to the smallest size that still covers 1440x2560.
  const f = Math.min(1, Math.max(COVER_W / w, COVER_H / h));
  const tw = Math.round((w * f) / 2) * 2, th = Math.round((h * f) / 2) * 2;

  const vf = [];
  if (hdr) {
    if (canToneMap) {
      vf.push("zscale=t=linear:npl=100", "format=gbrpf32le", "zscale=p=bt709",
        "tonemap=tonemap=hable:desat=0", "zscale=t=bt709:m=bt709:r=tv");
    } else {
      console.warn(`! ${file} is HDR but this ffmpeg lacks zscale; colours may look washed out. ` +
        `On iPhone set Settings → Camera → Formats → Most Compatible, or turn off HDR Video.`);
    }
  }
  vf.push(`scale=${tw}:${th}:flags=lanczos`, `fps=${FPS}`, "format=yuv420p");

  if (fresh(input, output)) {
    console.log(`• ${file}: up to date`);
  } else {
    console.log(`• ${file}: ${v.codec_name} ${w}x${h} ${v.r_frame_rate}${hdr ? " HDR" : ""}${hasAudio ? "" : " (no audio)"} → ${tw}x${th} H.264 ${FPS}fps`);
    const args = ["-y", "-v", "error", "-i", input];
    if (!hasAudio) args.push("-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo");
    args.push(
      "-map", "0:v:0", "-map", hasAudio ? "0:a:0" : "1:a:0",
      "-vf", vf.join(","),
      "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-profile:v", "high",
      "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
      "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
      "-shortest", "-movflags", "+faststart", output,
    );
    run("ffmpeg", args);
  }
  const o = ffprobe(output);
  const ov = o.streams.find((s) => s.codec_type === "video");
  manifest.clips.push({
    file, src: `media/${P}/${outName}`, width: ov.width, height: ov.height,
    durationSec: Number(Number(o.format.duration).toFixed(3)),
    originalAudio: hasAudio, sourceCodec: v.codec_name, hdr, rotation,
  });
}

for (const file of imageFiles) {
  const input = path.join(src, "images", file);
  const ext = path.extname(file).toLowerCase();
  const heic = ext === ".heic" || ext === ".heif";
  const outName = heic ? `${safe(file)}.png` : `${safe(file)}${ext}`;
  const output = path.join(dst, outName);
  if (!fresh(input, output)) {
    if (!heic) fs.copyFileSync(input, output); // byte-identical: branding untouched
    else if (has("magick")) run("magick", [input, output]);
    else if (has("convert")) run("convert", [input, output]);
    else if (has("sips")) run("sips", ["-s", "format", "png", input, "--out", output]);
    else throw new Error(`Cannot convert ${file}: install ImageMagick, or export the photo as PNG/JPG.`);
    console.log(`• ${file} → ${outName}`);
  }
  const s = ffprobe(output).streams[0];
  manifest.images.push({ file, src: `media/${P}/${outName}`, width: s.width, height: s.height });
}

writeJson(path.join(src, "media.json"), manifest);
console.log(`✓ Ingested ${manifest.clips.length} clip(s), ${manifest.images.length} image(s) → projects/${P}/media.json`);
