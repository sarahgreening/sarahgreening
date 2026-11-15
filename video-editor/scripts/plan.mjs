// Generates three different edits (A/B/C) from the same footage.
// Usage: npm run plan -- <project>
// Reads  projects/<p>/brief.json + media.json
// Writes projects/<p>/edits/{a-tiktok-shop,b-amazon,c-ugc-review}.json and src/studio-preview.json
// The edit JSON files are safe to hand-edit afterwards (then just re-run render).
import path from "node:path";
import { getProjectArg, projectDir, readJson, ROOT, writeJson } from "./lib.mjs";

const P = getProjectArg();
const dir = projectDir(P);
const brief = readJson(path.join(dir, "brief.json"));
const media = readJson(path.join(dir, "media.json"));

const FPS = 30;
const TARGET = brief.durationSec ?? 15;
const MAX_ZOOM = brief.maxZoom ?? 1.2;
const clips = media.clips;
if (!clips.length) throw new Error("No clips ingested. Run: npm run ingest -- " + P);

const productImage =
  media.images.find((i) => i.file === brief.product.image) ?? media.images[0];
const product = { ...brief.product, image: productImage?.src };
const hint = (c) => brief.clipHints?.[c.file] ?? {};

// --- Window picking: each time a clip is reused we take a different part of it ---
const uses = new Map();
const SPREAD = [0, 0.55, 0.25, 0.85, 0.4, 0.7];
function pickWindow(clip, lenSec, mode) {
  const n = uses.get(clip.file) ?? 0;
  uses.set(clip.file, n + 1);
  let rate = 1;
  if (lenSec > clip.durationSec - 0.1) rate = Math.max(0.5, (clip.durationSec - 0.1) / lenSec);
  const span = lenSec * rate;
  const maxStart = Math.max(0, clip.durationSec - span - 0.05);
  let start;
  const best = hint(clip).bestMomentSec;
  if (mode === "best" && best !== undefined) start = best - span / 2;
  else if (mode === "end") start = maxStart;
  else start = maxStart * SPREAD[n % SPREAD.length];
  return { trimStartSec: +Math.min(maxStart, Math.max(0, start)).toFixed(2), playbackRate: +rate.toFixed(3) };
}

function clipSegment(clip, lenSec, opts) {
  const h = hint(clip);
  return {
    name: `${clip.file} (${opts.note ?? "shot"})`,
    kind: "video",
    src: clip.src,
    srcWidth: clip.width,
    srcHeight: clip.height,
    durationSec: lenSec,
    ...pickWindow(clip, lenSec, opts.window ?? "spread"),
    volume: opts.volume ?? 1,
    focusX: h.focusX ?? 0.5,
    focusY: h.focusY ?? 0.5,
    fit: "cover",
    zoomFrom: opts.zoom?.[0] ?? 1,
    zoomTo: opts.zoom?.[1] ?? 1,
    transitionIn: opts.transition ?? "none",
    ...(opts.label ? { label: opts.label } : {}),
  };
}

function imageSegment(lenSec, opts) {
  return {
    name: "Product image",
    kind: "image",
    src: productImage.src,
    srcWidth: productImage.width,
    srcHeight: productImage.height,
    durationSec: lenSec,
    fit: "contain", // whole product always visible, never cropped
    zoomFrom: opts.zoom?.[0] ?? 1,
    zoomTo: opts.zoom?.[1] ?? 1.05,
    transitionIn: opts.transition ?? "none",
    ...(opts.label ? { label: opts.label } : {}),
  };
}

// --- Fit the timeline to exactly TARGET seconds (whole frames) ---
function fitDuration(spec) {
  const f = (s) => Math.max(1, Math.round(s * FPS));
  const t = f(spec.transitionSec);
  const transitions = spec.segments.filter((s, i) => i > 0 && s.transitionIn !== "none").length + 1;
  const available = f(TARGET) - f(spec.endCardSec) + transitions * t;
  const current = spec.segments.reduce((a, s) => a + f(s.durationSec), 0);
  let assigned = 0;
  spec.segments.forEach((s, i) => {
    const frames = i === spec.segments.length - 1
      ? available - assigned
      : Math.round((f(s.durationSec) * available) / current);
    assigned += frames;
    s.durationSec = +(frames / FPS).toFixed(4);
  });
  // re-pick trims now that lengths changed, keeping each segment's start inside its clip
  spec.segments.forEach((s) => {
    if (s.kind !== "video") return;
    const clip = clips.find((c) => c.src === s.src);
    const rate = Math.max(0.5, Math.min(1, (clip.durationSec - 0.1) / s.durationSec));
    s.playbackRate = +rate.toFixed(3);
    s.trimStartSec = +Math.min(s.trimStartSec, Math.max(0, clip.durationSec - s.durationSec * rate - 0.05)).toFixed(2);
  });
  return spec;
}

// --- Keep segment labels out of the hook/title-card slot (same screen area) ---
function scheduleLabels(spec) {
  const blocked = [];
  if (spec.hookDurationSec > 0) blocked.push([0, spec.hookDurationSec]);
  blocked.push([spec.titleCard.startSec, spec.titleCard.startSec + spec.titleCard.durationSec]);
  let t = 0;
  spec.segments.forEach((s, i) => {
    if (i > 0 && s.transitionIn !== "none") t -= spec.transitionSec;
    const start = t, end = t + s.durationSec;
    t = end;
    if (!s.label) return;
    let from = start;
    for (const [b0, b1] of blocked) if (from < b1 && b0 < end) from = Math.max(from, b1 + 0.15);
    if (end - from < 1) delete s.label;
    else if (from > start) s.labelFromSec = +(from - start).toFixed(2);
  });
  return spec;
}

// --- Captions: spread the script's words across the speaking window ---
function scriptToCaptions(text, startSec, endSec) {
  const words = text.trim().split(/\s+/);
  const weight = (w) => 1 + w.length * 0.12 + (/[.!?]$/.test(w) ? 1.2 : /[,;:]$/.test(w) ? 0.5 : 0);
  const total = words.reduce((a, w) => a + weight(w), 0);
  const span = (endSec - startSec) * 1000;
  let t = startSec * 1000;
  return words.map((w, i) => {
    const d = (weight(w) / total) * span;
    const c = {
      text: (i === 0 ? "" : " ") + w,
      startMs: Math.round(t),
      endMs: Math.round(t + d * 0.92),
      timestampMs: Math.round(t + d / 2),
      confidence: null,
      ...(/[.!?]$/.test(w) ? { pageBreakAfter: true } : {}),
    };
    t += d;
    return c;
  });
}

const base = {
  fps: FPS, width: 1080, height: 1920, maxZoom: MAX_ZOOM,
  product, ...(brief.music ? { music: brief.music } : {}),
};
// Order clips: the one with a "bestMomentSec" hint (or the first) leads the hook.
const byBest = [...clips].sort((a, b) => (hint(b).bestMomentSec !== undefined) - (hint(a).bestMomentSec !== undefined));
const cycle = (arr, n) => Array.from({ length: n }, (_, i) => arr[i % arr.length]);

// A — TikTok Shop: hook-first, fast cuts (~1.5s), punch zooms, bold pop captions, price.
function editA() {
  const order = cycle(byBest, 7);
  const trans = ["none", "zoom-punch", "slide-left", "none", "zoom-punch", "slide-up", "none"];
  const zooms = [[1, 1.15], [1.12, 1], [1, 1.1], [1.15, 1.02], [1, 1.12], [1.1, 1], [1, 1.08]];
  const spec = {
    ...base,
    editName: "A - TikTok Shop: Hook & Fast Cuts",
    platform: "tiktok-shop",
    hook: brief.hooks?.tiktok ?? `You NEED this ${product.shortName}`,
    hookDurationSec: 2.2,
    cta: brief.ctas?.tiktok ?? "Tap the cart to shop",
    endCardSec: 2.5,
    transitionSec: 0.27,
    captionStyle: "bold-pop",
    titleCard: { startSec: 2.4, durationSec: 3 },
    showPrice: true,
    showRating: false,
    segments: order.map((c, i) =>
      clipSegment(c, 1.6, { window: i === 0 ? "best" : "spread", zoom: zooms[i], transition: trans[i], note: `cut ${i + 1}` })),
  };
  fitDuration(spec);
  scheduleLabels(spec);
  spec.captions = scriptToCaptions(brief.scripts?.tiktok ?? product.name, 2.3, TARGET - spec.endCardSec - 0.2);
  return spec;
}

// B — Amazon Influencer: product-first, calm demo, benefits as labels, clean captions.
function editB() {
  const segs = [];
  if (productImage) segs.push(imageSegment(2.6, { zoom: [1, 1.05] }));
  clips.forEach((c, i) =>
    segs.push(clipSegment(c, 3.4, {
      window: "spread", zoom: [1, 1.06], transition: "fade",
      label: product.benefits?.[i], note: "demo",
    })));
  const spec = {
    ...base,
    editName: "B - Amazon Influencer: Product Demo",
    platform: "amazon-influencer",
    hook: brief.hooks?.amazon ?? product.shortName,
    hookDurationSec: 0, // title card does the job here
    cta: brief.ctas?.amazon ?? "Link in my storefront",
    endCardSec: 3,
    transitionSec: 0.4,
    captionStyle: "clean-box",
    titleCard: { startSec: 0.2, durationSec: 2.6 },
    showPrice: true,
    showRating: true,
    segments: segs,
  };
  fitDuration(spec);
  scheduleLabels(spec);
  spec.captions = scriptToCaptions(brief.scripts?.amazon ?? product.name, 0.4, TARGET - spec.endCardSec - 0.2);
  return spec;
}

// C — UGC review: results-first (reverse order), product image mid-way, karaoke captions, stars.
function editC() {
  const rev = [...clips].reverse();
  const segs = [
    clipSegment(rev[0], 3, { window: "end", zoom: [1.08, 1], label: hint(rev[0]).label, note: "results first" }),
  ];
  rev.slice(1).forEach((c) =>
    segs.push(clipSegment(c, 2.8, { window: "best", zoom: [1, 1.08], transition: "wipe", label: hint(c).label, note: "review" })));
  if (productImage) segs.push(imageSegment(2.4, { transition: "slide-up", zoom: [1.02, 1.08] }));
  segs.push(clipSegment(rev[0], 2.4, { window: "spread", zoom: [1, 1.1], transition: "fade", note: "final look" }));
  const spec = {
    ...base,
    editName: "C - UGC: Honest Review",
    platform: "ugc",
    hook: brief.hooks?.ugc ?? "Honest review",
    hookDurationSec: 2.5,
    cta: brief.ctas?.ugc ?? "Would you try it?",
    endCardSec: 2.2,
    transitionSec: 0.35,
    captionStyle: "karaoke",
    titleCard: { startSec: 2.8, durationSec: 2.8 },
    showPrice: false,
    showRating: true,
    segments: segs,
  };
  fitDuration(spec);
  scheduleLabels(spec);
  spec.captions = scriptToCaptions(brief.scripts?.ugc ?? product.name, 0.3, TARGET - spec.endCardSec - 0.2);
  return spec;
}

const edits = { "a-tiktok-shop": editA(), "b-amazon": editB(), "c-ugc-review": editC() };
for (const [key, spec] of Object.entries(edits)) {
  writeJson(path.join(dir, "edits", `${key}.json`), spec);
  console.log(`• ${key}: ${spec.segments.length} segments, ${spec.captions.length} caption words`);
}
writeJson(path.join(ROOT, "src", "studio-preview.json"), { project: P, edits: Object.values(edits) });
console.log(`✓ Edits written to projects/${P}/edits/ (and loaded into Studio)`);
