import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  Sequence,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { clampZoom } from "../timeline";
import type { ProductInfo, Segment } from "../types";
import { Label } from "./Overlays";

/**
 * Renders one piece of footage or one product image in the 9:16 frame.
 *
 * Brand-safety rules enforced here:
 *  - No colour filters, grading, blur or recolouring on footage or product images.
 *  - Aspect ratio is always preserved (cover/contain maths below, never "fill" stretch).
 *  - Zoom is uniform scale only, clamped to spec.maxZoom.
 */
export const SegmentView: React.FC<{
  segment: Segment;
  durationInFrames: number;
  maxZoom: number;
  product: ProductInfo;
}> = ({ segment, durationInFrames, maxZoom, product }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H, fps } = useVideoConfig();

  const fit = segment.fit ?? (segment.kind === "image" ? "contain" : "cover");
  const fx = segment.focusX ?? 0.5;
  const fy = segment.focusY ?? 0.5;
  const sw = segment.srcWidth || W;
  const sh = segment.srcHeight || H;

  // Cover: scale until both sides fill the frame, then slide the overflow so the
  // focus point stays in view. Contain: fit inside a padded box.
  const pad = fit === "contain" ? 0.82 : 1;
  const scale =
    fit === "cover"
      ? Math.max(W / sw, H / sh)
      : Math.min((W * pad) / sw, (H * 0.62) / sh);
  const rw = sw * scale;
  const rh = sh * scale;
  const left = fit === "cover" ? (W - rw) * fx : (W - rw) / 2;
  const top = fit === "cover" ? (H - rh) * fy : (H - rh) / 2 - H * 0.03;

  const zoom = interpolate(
    frame,
    [0, durationInFrames],
    [clampZoom(segment.zoomFrom, maxZoom), clampZoom(segment.zoomTo, maxZoom)],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.33, 0, 0.67, 1),
    },
  );

  const mediaStyle: React.CSSProperties = {
    position: "absolute",
    left,
    top,
    width: rw,
    height: rh,
  };

  return (
    <AbsoluteFill
      style={{
        background:
          fit === "contain"
            ? `radial-gradient(circle at 50% 42%, #ffffff 0%, ${product.brandColor}33 55%, ${product.brandColor}66 100%), #ffffff`
            : "#000",
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          scale: String(zoom),
          transformOrigin: `${fx * 100}% ${fy * 100}%`,
        }}
      >
        {segment.kind === "video" ? (
          <Video
            name={segment.name}
            src={staticFile(segment.src)}
            trimBefore={Math.round((segment.trimStartSec ?? 0) * fps)}
            playbackRate={segment.playbackRate ?? 1}
            volume={segment.volume ?? 1}
            objectFit="fill" // box already has the source aspect ratio, so no stretching
            style={mediaStyle}
          />
        ) : (
          <Img
            src={staticFile(segment.src)}
            style={{
              ...mediaStyle,
              objectFit: "contain",
              filter:
                fit === "contain"
                  ? "drop-shadow(0 40px 60px rgba(0,0,0,0.25))"
                  : undefined,
            }}
          />
        )}
      </AbsoluteFill>
      {segment.label ? (
        <Sequence name="Label" from={Math.round((segment.labelFromSec ?? 0) * fps)} layout="none">
          <Label text={segment.label} color={product.brandColor} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
