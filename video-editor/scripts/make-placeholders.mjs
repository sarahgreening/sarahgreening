// Creates a sample project with placeholder footage + product image so the whole
// pipeline can be tested without real files. Usage: npm run placeholders
import fs from "node:fs";
import path from "node:path";
import { has, projectDir, requireFfmpeg, ROOT, run, writeJson } from "./lib.mjs";

requireFfmpeg();
const P = "sample";
const dir = projectDir(P);
const clips = path.join(dir, "clips");
const images = path.join(dir, "images");
fs.mkdirSync(clips, { recursive: true });
fs.mkdirSync(images, { recursive: true });

const font = path.join(ROOT, "public/fonts/Inter-Black.otf");
const fontSemi = path.join(ROOT, "public/fonts/Inter-SemiBold.otf");
// drawtext needs ':' and '\' escaped inside filter args
const ff = (p) => p.replace(/\\/g, "/").replace(/:/g, "\\:");
const product = path.join(images, "product.png");

console.log("• Drawing placeholder product image (fictional brand GLOWLY)…");
if (has("convert") || has("magick")) {
  const im = has("magick") ? "magick" : "convert";
  run(im, [
    "-size", "900x1300", "xc:none",
    "-fill", "#2B2B2B", "-draw", "roundrectangle 365,60 535,250 30,30",
    "-fill", "#FF5A7A", "-draw", "roundrectangle 240,230 660,1240 110,110",
    "-fill", "#FFFFFF", "-draw", "roundrectangle 285,560 615,1010 34,34",
    "-gravity", "north",
    "-font", font, "-pointsize", "64", "-fill", "#FF5A7A", "-annotate", "+0+610", "GLOWLY",
    "-font", fontSemi, "-pointsize", "40", "-fill", "#333333", "-annotate", "+0+735", "HYDRATING",
    "-annotate", "+0+790", "SERUM",
    "-pointsize", "30", "-fill", "#777777", "-annotate", "+0+905", "30 ml / 1 fl oz",
    product,
  ]);
} else {
  // Fallback without ImageMagick: square-cornered version drawn by ffmpeg
  run("ffmpeg", ["-y", "-f", "lavfi", "-i", "color=c=black@0.0:s=900x1300,format=rgba",
    "-vf", `drawbox=x=365:y=60:w=170:h=190:color=0x2B2B2B@1:t=fill,drawbox=x=240:y=230:w=420:h=1010:color=0xFF5A7A@1:t=fill,drawbox=x=285:y=560:w=330:h=450:color=white@1:t=fill,drawtext=fontfile='${ff(font)}':text=GLOWLY:fontsize=64:fontcolor=0xFF5A7A:x=(w-tw)/2:y=620,drawtext=fontfile='${ff(fontSemi)}':text=SERUM:fontsize=40:fontcolor=0x333333:x=(w-tw)/2:y=740`,
    "-frames:v", "1", product]);
}

const label = (t) =>
  `drawtext=fontfile='${ff(font)}':text='${t}':x=60:y=60:fontsize=52:fontcolor=white:box=1:boxcolor=black@0.45:boxborderw=18`;
const tc = `drawtext=fontfile='${ff(fontSemi)}':text='%{pts\\:hms}':x=60:y=h-110:fontsize=40:fontcolor=white@0.85`;

console.log("• Clip 1: 1920x1080 landscape, 30fps, H.264 .mp4 (tests 16:9 → 9:16 crop)…");
run("ffmpeg", ["-y",
  "-f", "lavfi", "-i", "gradients=s=1920x1080:c0=0x3A2348:c1=0xFF9AA8:x0=0:y0=0:x1=1920:y1=1080:speed=0.02:r=30:d=8",
  "-loop", "1", "-i", product,
  "-f", "lavfi", "-i", "sine=f=220:d=8:sample_rate=48000",
  "-f", "lavfi", "-i", "sine=f=330:d=8:sample_rate=48000",
  "-filter_complex", `[1]scale=-1:780[p];[0][p]overlay=x='1000-20*t':y='150+20*sin(t*2)':shortest=1,${label("PLACEHOLDER 1 - UNBOXING")},${tc},format=yuv420p[v];[2][3]amix=inputs=2,volume=0.3[a]`,
  "-map", "[v]", "-map", "[a]", "-t", "8", "-c:v", "libx264", "-crf", "20", "-c:a", "aac", "-b:a", "128k",
  path.join(clips, "01-unboxing.mp4")]);

console.log("• Clip 2: 1080x1920 portrait, 60fps, 10-bit HEVC .mov (like an iPhone)…");
run("ffmpeg", ["-y",
  "-f", "lavfi", "-i", "gradients=s=1080x1920:c0=0x0E5E6F:c1=0xBDEBE4:x0=0:y0=0:x1=1080:y1=1920:speed=0.03:r=60:d=7",
  "-loop", "1", "-i", product,
  "-f", "lavfi", "-i", "sine=f=440:d=7:sample_rate=48000",
  "-filter_complex", `[1]scale=-1:1100[p];[0][p]overlay=x='(W-w)/2':y='420+60*sin(t*1.5)':shortest=1,${label("PLACEHOLDER 2 - TEXTURE")},${tc},format=yuv420p10le[v];[2]volume=0.25[a]`,
  "-map", "[v]", "-map", "[a]", "-t", "7", "-r", "60", "-c:v", "libx265", "-tag:v", "hvc1", "-x265-params", "log-level=error", "-crf", "24",
  "-c:a", "aac", path.join(clips, "02-texture.mov")]);

console.log("• Clip 3: 1440x1080 (4:3), 30fps, NO audio track (tests silent clips)…");
run("ffmpeg", ["-y",
  "-f", "lavfi", "-i", "gradients=s=1440x1080:c0=0xF6C28B:c1=0x8C3B2F:x0=0:y0=1080:x1=1440:y1=0:speed=0.02:r=30:d=7",
  "-loop", "1", "-i", product,
  "-filter_complex", `[1]scale=-1:820[p];[0][p]overlay=x='180+25*t':y=140:shortest=1,${label("PLACEHOLDER 3 - RESULTS")},${tc},format=yuv420p[v]`,
  "-map", "[v]", "-t", "7", "-c:v", "libx264", "-crf", "20", "-an", path.join(clips, "03-results.mp4")]);

writeJson(path.join(dir, "brief.json"), {
  product: {
    name: "GLOWLY Hydrating Serum 30 ml",
    shortName: "GLOWLY Serum",
    price: "$24.99",
    brandColor: "#FF5A7A",
    accentColor: "#FFE14D",
    benefits: ["72-hour hydration", "Fragrance free", "Derm tested"],
    image: "product.png",
  },
  durationSec: 15,
  hooks: {
    tiktok: "My dry skin was GONE in a week",
    amazon: "The serum I keep re-buying",
    ugc: "Honest review after 2 weeks",
  },
  scripts: {
    tiktok: "This serum fixed my dry skin in one week. Look at that texture. It sinks in with zero sticky feel. Grab it before it sells out again.",
    amazon: "This is the GLOWLY hydrating serum I keep repurchasing. Lightweight, fragrance free, and it lasts all day. Full details are in my storefront.",
    ugc: "Okay, honest review after two weeks. My skin feels softer and way less flaky. One bottle lasts forever. Would I buy it again? Yes.",
  },
  ctas: {
    tiktok: "Tap the cart to shop",
    amazon: "Link in my storefront",
    ugc: "Would you try it?",
  },
  clipHints: {
    "01-unboxing.mp4": { focusX: 0.62, focusY: 0.5, bestMomentSec: 3, label: "Unboxing" },
    "02-texture.mov": { focusX: 0.5, focusY: 0.5, bestMomentSec: 2, label: "Texture" },
    "03-results.mp4": { focusX: 0.3, focusY: 0.5, bestMomentSec: 4, label: "Results" },
  },
  music: null,
});
console.log(`✓ Sample project ready in projects/${P}/`);
