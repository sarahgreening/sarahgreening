import { Video } from "@remotion/media";
import { AbsoluteFill, CalculateMetadataFunction, Sequence, staticFile } from "remotion";
import { fontsLoaded } from "../fonts";
import { AestheticCaption } from "./AestheticCaption";
import type { CaptionedClipProps } from "./types";

export const calculateCaptionedClipMetadata: CalculateMetadataFunction<CaptionedClipProps> = async ({ props }) => {
  await fontsLoaded;
  return {
    durationInFrames: Math.round(props.durationSec * props.fps),
    fps: props.fps,
    width: props.width,
    height: props.height,
  };
};

/**
 * The original video, untouched (no crop, zoom or colour change), with designed
 * caption blocks layered on top. Audio passes through unchanged.
 */
export const CaptionedClip: React.FC<CaptionedClipProps> = ({ src, volume, theme, captions, fps }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Video name="Original video" src={staticFile(src)} volume={volume} style={{ width: "100%", height: "100%" }} />
      {captions.map((block) => {
        const from = Math.round(block.startSec * fps);
        const dur = Math.max(1, Math.round((block.endSec - block.startSec) * fps));
        return (
          <Sequence key={block.name} name={`Caption: ${block.name}`} from={from} durationInFrames={dur} layout="none">
            <AestheticCaption block={block} durationInFrames={dur} theme={theme} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
