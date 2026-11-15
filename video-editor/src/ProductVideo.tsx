import { Audio } from "@remotion/media";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import React from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Sequence,
  staticFile,
} from "remotion";
import { Captions } from "./components/Captions";
import { EndCard, HookText, TitleCard } from "./components/Overlays";
import { SegmentView } from "./components/SegmentView";
import { fontsLoaded } from "./fonts";
import { getTotalFrames, hasTransition, secToFrames } from "./timeline";
import { getPresentation } from "./transitions";
import type { EditSpec } from "./types";

export const calculateProductVideoMetadata: CalculateMetadataFunction<
  EditSpec
> = async ({ props }) => {
  await fontsLoaded;
  return {
    durationInFrames: getTotalFrames(props),
    fps: props.fps,
    width: props.width,
    height: props.height,
  };
};

const HOOK_VARIANT = {
  "tiktok-shop": "slab",
  "amazon-influencer": "clean",
  ugc: "handwritten",
} as const;

export const ProductVideo: React.FC<EditSpec> = (spec) => {
  const { fps, segments, product } = spec;
  const tFrames = secToFrames(spec.transitionSec, fps);

  const series: React.ReactNode[] = [];
  segments.forEach((seg, i) => {
    if (hasTransition(seg, i)) {
      series.push(
        <TransitionSeries.Transition
          key={`t-${i}`}
          presentation={getPresentation(seg.transitionIn ?? "fade")}
          timing={linearTiming({ durationInFrames: tFrames })}
        />,
      );
    }
    const dur = secToFrames(seg.durationSec, fps);
    series.push(
      <TransitionSeries.Sequence key={`s-${i}`} name={seg.name} durationInFrames={dur} premountFor={fps}>
        <SegmentView segment={seg} durationInFrames={dur} maxZoom={spec.maxZoom} product={product} />
      </TransitionSeries.Sequence>,
    );
  });
  if (spec.endCardSec > 0) {
    if (segments.length > 0) {
      series.push(
        <TransitionSeries.Transition
          key="t-end"
          presentation={fade()}
          timing={linearTiming({ durationInFrames: tFrames })}
        />,
      );
    }
    series.push(
      <TransitionSeries.Sequence key="end" name="End card" durationInFrames={secToFrames(spec.endCardSec, fps)}>
        <EndCard product={product} cta={spec.cta} showPrice={spec.showPrice} />
      </TransitionSeries.Sequence>,
    );
  }

  const hookFrames = secToFrames(spec.hookDurationSec, fps);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* isolation keeps transition z-indexes from covering the text overlays */}
      <AbsoluteFill style={{ isolation: "isolate" }}>
        <TransitionSeries name="Footage">{series}</TransitionSeries>
      </AbsoluteFill>

      {spec.hookDurationSec > 0 ? (
        <Sequence name="Hook" durationInFrames={hookFrames}>
          <HookText
            text={spec.hook}
            durationInFrames={hookFrames}
            product={product}
            variant={HOOK_VARIANT[spec.platform]}
          />
        </Sequence>
      ) : null}

      {spec.titleCard.durationSec > 0 ? (
        <Sequence
          name="Product title"
          from={secToFrames(spec.titleCard.startSec, fps)}
          durationInFrames={secToFrames(spec.titleCard.durationSec, fps)}
        >
          <TitleCard
            product={product}
            durationInFrames={secToFrames(spec.titleCard.durationSec, fps)}
            showPrice={spec.showPrice}
            showRating={spec.showRating}
          />
        </Sequence>
      ) : null}

      <Captions captions={spec.captions} style={spec.captionStyle} product={product} bottomPx={spec.captionBottomPx} />

      {spec.music ? (
        <Audio name="Music" src={staticFile(spec.music.src)} volume={spec.music.volume} />
      ) : null}
    </AbsoluteFill>
  );
};
