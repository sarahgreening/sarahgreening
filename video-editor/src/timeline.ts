import type { EditSpec, Segment } from "./types";

export const secToFrames = (sec: number, fps: number) =>
  Math.max(1, Math.round(sec * fps));

export const clampZoom = (z: number | undefined, maxZoom: number) =>
  Math.min(maxZoom, Math.max(1, z ?? 1));

export const hasTransition = (s: Segment, index: number) =>
  index > 0 && (s.transitionIn ?? "none") !== "none";

/**
 * Total length in frames: every segment, plus the end card, minus the overlap
 * eaten by each transition (TransitionSeries plays both sides at once).
 */
export const getTotalFrames = (spec: EditSpec) => {
  const t = secToFrames(spec.transitionSec, spec.fps);
  let total = 0;
  spec.segments.forEach((s, i) => {
    total += secToFrames(s.durationSec, spec.fps);
    if (hasTransition(s, i)) total -= t;
  });
  if (spec.endCardSec > 0) {
    total += secToFrames(spec.endCardSec, spec.fps);
    if (spec.segments.length > 0) total -= t; // end card always fades in
  }
  return Math.max(1, total);
};
