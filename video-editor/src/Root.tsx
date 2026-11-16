import { Composition, Folder } from "remotion";
import { calculateProductVideoMetadata, ProductVideo } from "./ProductVideo";
import type { EditSpec } from "./types";
import { CaptionedClip, calculateCaptionedClipMetadata } from "./captioned/CaptionedClip";
import type { CaptionedClipProps } from "./captioned/types";
import { calculatePhotoStoryMetadata, PhotoStory } from "./story/PhotoStory";
import type { PhotoStoryProps } from "./story/types";
import vansStory from "../projects/vans-floral-ugc/edits/ugc-story.json";
import captionedSample from "../projects/poppin-crunch-sharks/edits/captioned.json";
// Written by `npm run plan -- <project>`: the three edits of the last planned
// project, so you can preview and tweak them in Remotion Studio.
import preview from "./studio-preview.json";

const edits = preview.edits as unknown as EditSpec[];

export const RemotionRoot: React.FC = () => {
  return (
    <Folder name="Product-Videos">
      {/* Generic composition used by scripts/render.mjs (props passed at render time). */}
      <Composition
        id="ProductVideo"
        component={ProductVideo}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={edits[0]}
        calculateMetadata={calculateProductVideoMetadata}
      />
      <Composition
        id="Edit-A"
        component={ProductVideo}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={edits[0]}
        calculateMetadata={calculateProductVideoMetadata}
      />
      <Composition
        id="Edit-B"
        component={ProductVideo}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={edits[1]}
        calculateMetadata={calculateProductVideoMetadata}
      />
      <Composition
        id="Edit-C"
        component={ProductVideo}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={edits[2]}
        calculateMetadata={calculateProductVideoMetadata}
      />
      {/* Existing video + designed captions (props passed at render time). */}
      <Composition
        id="CaptionedClip"
        component={CaptionedClip}
        durationInFrames={510}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={captionedSample as unknown as CaptionedClipProps}
        calculateMetadata={calculateCaptionedClipMetadata}
      />
      {/* Photo-based UGC story (props passed at render time). */}
      <Composition
        id="PhotoStory"
        component={PhotoStory}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={vansStory as unknown as PhotoStoryProps}
        calculateMetadata={calculatePhotoStoryMetadata}
      />
    </Folder>
  );
};
