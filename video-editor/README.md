# Product Video Editor (Remotion)

Turns raw product clips and product photos into **three different 15-second, 9:16 (1080x1920) edits**
for TikTok Shop, Amazon Influencer and UGC, then checks each finished MP4 automatically.

| Edit | Style | What's different |
| --- | --- | --- |
| **A – TikTok Shop** | Hook first, ~1.5s fast cuts | Yellow slab hook, punch-zoom/slide transitions, bold word-pop captions, price badge, "Tap the cart" end card |
| **B – Amazon Influencer** | Calm product demo | Opens on the product photo + title card with stars and price, benefits as labels, crossfades, clean boxed captions |
| **C – UGC Review** | Results first (reverse order) | Outlined hook, wipe/slide transitions, karaoke captions, star rating, product photo mid-way |

Output: H.264 High, yuv420p, BT.709, 30 fps, AAC 48 kHz stereo, `+faststart`. This plays everywhere and is accepted by TikTok, Amazon and Instagram.

## Quick start

```bash
npm install
npm run sample            # placeholder footage → 3 rendered MP4s + QC in out/sample/
```

## Your own product

```bash
npm run new -- my-serum   # creates projects/my-serum/{clips,images,brief.json}
# 1. copy videos into   projects/my-serum/clips/   (name them 01-…, 02-… to set the order)
# 2. copy photos into   projects/my-serum/images/  (transparent PNG of the product is best)
# 3. edit projects/my-serum/brief.json  (name, price, brand colours, hooks, caption text, clip hints)
npm run pipeline -- my-serum
```

Results are in `out/my-serum/`:

- `my-serum-a-tiktok-shop.mp4`, `my-serum-b-amazon.mp4`, `my-serum-c-ugc-review.mp4`
- `previews/<edit>/t00.80s-hook.png` … full-resolution QC frames taken from the finished MP4
- `previews/<edit>-contact-sheet.jpg`, one frame per second, for a quick visual scan
- `QC.md` / `qc-report.json`, pass/fail for codec, size, colour, fps, duration, audio level and black frames

### Step by step

| Command | Does |
| --- | --- |
| `npm run ingest -- <p>` | Normalises clips: iPhone HEVC/.MOV, HDR (tone-mapped to SDR), 60/120 fps, rotation, missing audio. Becomes H.264 30 fps in `public/media/<p>/`. Images are copied **byte-for-byte**; HEIC is converted to PNG. |
| `npm run plan -- <p>` | Writes the 3 edit specs to `projects/<p>/edits/*.json` (trims, crops, order, zooms, transitions, captions). |
| `npm run render -- <p>` | Renders every edit and runs QC. `--only=b-amazon` renders one. |
| `npm run studio` | Opens Remotion Studio with the last planned project (Edit-A/B/C) for live preview. |

### Fine-tuning an edit

Every edit is plain JSON in `projects/<p>/edits/`. Change it, then run `npm run render -- <p>` (don't re-run `plan`, which overwrites the files). Useful fields:

- Each segment's `trimStartSec`, `durationSec` and `playbackRate` (trim/speed), plus array order (reorder).
- `focusX` / `focusY` (0–1) set the crop centre when a landscape clip is cropped to 9:16. Set these per clip in `brief.json` → `clipHints` so every edit uses them.
- `zoomFrom` / `zoomTo` are limited by `maxZoom` (default 1.2) so the product never gets over-enlarged.
- `transitionIn` takes `none | fade | slide-left | slide-up | wipe | zoom-punch`.
- `captions` holds word timings in ms. `captionBottomPx` moves captions up or down to keep them off the product label.
- `hook`, `cta`, `titleCard`, `showPrice`, `showRating`, `endCardSec`.

## Brand-safety rules (enforced in code)

- No colour grading, filters, blur or recolouring on footage or product images.
- Aspect ratio is always preserved. Footage is cover-cropped and product photos are contain-fitted, so packaging is never cut off or stretched.
- Zoom is uniform scale only, capped by `maxZoom`.
- Product images are copied untouched (no recompression).
- Brand colours are used for accents (labels, borders, CTA) and never applied to the product.
- Text stays inside the TikTok/Reels safe area (clear of the top bar, right-hand buttons and bottom caption area).
- Fonts (Inter, OFL licence) are bundled, so renders look the same on every machine.

## Getting footage off an iPhone

- **Best quality, fastest:** AirDrop the videos to a Mac and drop them into `projects/<p>/clips/`.
- Or use the Files app / iCloud Drive and download them on the computer.
- HDR iPhone video is fine (the ingest step tone-maps it). To skip that step: Settings → Camera → Record Video → turn off **HDR Video**.
- Shoot vertical when you can. Landscape works too, but it gets cropped, so set `focusX` on it.

## Requirements

Node 20+ and FFmpeg/FFprobe on the PATH (`brew install ffmpeg` on macOS). Remotion downloads its own headless
Chrome the first time. If that download is blocked, set `REMOTION_BROWSER_EXECUTABLE` to any `chrome-headless-shell`
binary (the render script finds Playwright's copy automatically).

Remotion is free for individuals and companies of up to 3 people; larger companies need a licence
(https://remotion.dev/license). If you have one, set `REMOTION_LICENSE_KEY` before rendering.
