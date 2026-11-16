import { Audio } from "@remotion/media";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import React from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Easing,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AestheticCaption } from "../captioned/AestheticCaption";
import { FONT, fontsLoaded, SERIF } from "../fonts";
import { getPresentation } from "../transitions";
import type { Callout, PhotoStoryProps, ProductCardSpec, StoryScene } from "./types";

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const f = (sec: number, fps: number) => Math.max(1, Math.round(sec * fps));

const totalFrames = (p: PhotoStoryProps) =>
  p.scenes.reduce(
    (acc, s, i) => acc + f(s.durationSec, p.fps) - (i > 0 && (s.transitionIn ?? "none") !== "none" ? f(p.transitionSec, p.fps) : 0),
    0,
  );

export const calculatePhotoStoryMetadata: CalculateMetadataFunction<PhotoStoryProps> = async ({ props }) => {
  await fontsLoaded;
  return { durationInFrames: totalFrames(props), fps: props.fps, width: props.width, height: props.height };
};

/** Dot with a soft pulse, a line that draws itself, then a label pill. */
const CalloutView: React.FC<{ c: Callout; w: number; h: number; ink: string }> = ({ c, w, h, ink }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame() - Math.round(c.delaySec * fps);
  const dot = spring({ frame, fps, config: { damping: 12 } });
  const line = interpolate(frame, [6, 20], [1, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const label = interpolate(frame, [16, 28], [0, 1], { ...clamp, easing: ease });
  const pulse = (frame % 36) / 36;
  const [x1, y1, x2, y2] = [c.x * w, c.y * h, c.labelX * w, c.labelY * h];
  return (
    <>
      <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ink} strokeWidth={2.5} pathLength={1} strokeDasharray={1} strokeDashoffset={line} />
        <circle cx={x1} cy={y1} r={26 * pulse * dot} fill="none" stroke="#fff" strokeWidth={2} opacity={(1 - pulse) * dot} />
        <circle cx={x1} cy={y1} r={9 * dot} fill="#fff" stroke={ink} strokeWidth={2.5} />
      </svg>
      <div
        style={{
          position: "absolute",
          left: x2,
          top: y2,
          translate: `-50% ${-50 + (1 - label) * 30}%`,
          opacity: label,
          padding: "12px 24px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.9)",
          border: `1.5px solid ${ink}33`,
          boxShadow: "0 8px 24px rgba(59,42,34,0.15)",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 30,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: ink,
          whiteSpace: "nowrap",
        }}
      >
        {c.text}
      </div>
    </>
  );
};

/**
 * One photo. Product photos ("contain") are never cropped, recoloured or
 * distorted: uniform scale only, edges feathered into a matching backdrop.
 */
const SceneView: React.FC<{ scene: StoryScene; dur: number; bg: string; maxZoom: number; ink: string }> = ({
  scene, dur, bg, maxZoom, ink,
}) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const sw = scene.srcWidth, sh = scene.srcHeight;
  const cover = scene.fit === "cover";
  const scale = cover ? Math.max(W / sw, H / sh) : Math.min(W / sw, H / sh);
  const rw = sw * scale, rh = sh * scale;
  const fx = scene.focusX ?? 0.5, fy = scene.focusY ?? 0.5;
  const left = cover ? (W - rw) * fx : (W - rw) / 2;
  const top = cover ? (H - rh) * fy : (H - rh) / 2;
  const z = (v: number) => Math.min(maxZoom, Math.max(1, v));
  const zoom = interpolate(frame, [0, dur], [z(scene.zoomFrom), z(scene.zoomTo)], {
    ...clamp,
    easing: Easing.bezier(0.33, 0, 0.67, 1),
  });
  const feather = "linear-gradient(to bottom, transparent 0%, #000 7%, #000 93%, transparent 100%)";
  return (
    <AbsoluteFill style={{ background: cover ? "#000" : bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ scale: String(zoom), transformOrigin: `${fx * 100}% ${fy * 100}%` }}>
        <div style={{ position: "absolute", left, top, width: rw, height: rh }}>
          <Img
            src={staticFile(scene.src)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              ...(cover ? {} : { maskImage: feather, WebkitMaskImage: feather }),
            }}
          />
          {(scene.callouts ?? []).map((c) => (
            <CalloutView key={c.text} c={c} w={rw} h={rh} ink={ink} />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const ProductCard: React.FC<{ card: ProductCardSpec; dur: number; ink: string; accent: string }> = ({ card, dur, ink, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 140 } });
  const exit = interpolate(frame, [dur - 8, dur], [1, 0], clamp);
  const ctaPulse = 1 + 0.035 * Math.sin((frame / fps) * Math.PI * 2 * 1.3);
  const imgW = 330;
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        right: 150,
        top: card.top,
        display: "flex",
        alignItems: "center",
        gap: 26,
        padding: "22px 30px 22px 18px",
        borderRadius: 34,
        background: "rgba(250,247,243,0.94)",
        boxShadow: "0 24px 60px rgba(30,20,15,0.35)",
        opacity: Math.min(enter, exit),
        translate: `0px ${(1 - enter) * 120}px`,
      }}
    >
      <Img
        src={staticFile(card.image)}
        style={{ width: imgW, height: (imgW * card.imageHeight) / card.imageWidth * 0.62, objectFit: "cover", borderRadius: 22 }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 26, letterSpacing: "0.2em", color: accent, textTransform: "uppercase" }}>
          {card.kicker}
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: 54, lineHeight: 1.02, color: ink }}>
          {card.title}
        </div>
        <div
          style={{
            alignSelf: "flex-start",
            marginTop: 8,
            padding: "12px 26px",
            borderRadius: 999,
            background: ink,
            color: "#fff",
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 28,
            scale: String(ctaPulse),
          }}
        >
          {card.cta}
        </div>
      </div>
    </div>
  );
};

export const PhotoStory: React.FC<PhotoStoryProps> = (p) => {
  const { fps } = p;
  const t = f(p.transitionSec, fps);
  const series: React.ReactNode[] = [];
  p.scenes.forEach((s, i) => {
    const kind = s.transitionIn ?? "none";
    if (i > 0 && kind !== "none") {
      series.push(
        <TransitionSeries.Transition key={`t${i}`} presentation={getPresentation(kind)} timing={linearTiming({ durationInFrames: t })} />,
      );
    }
    const dur = f(s.durationSec, fps);
    series.push(
      <TransitionSeries.Sequence key={`s${i}`} name={s.name} durationInFrames={dur} premountFor={fps}>
        <SceneView scene={s} dur={dur} bg={p.background} maxZoom={p.maxZoom} ink={p.theme.inkDark} />
      </TransitionSeries.Sequence>,
    );
  });

  return (
    <AbsoluteFill style={{ backgroundColor: p.background }}>
      <AbsoluteFill style={{ isolation: "isolate" }}>
        <TransitionSeries name="Photos">{series}</TransitionSeries>
      </AbsoluteFill>
      {p.captions.map((block) => {
        const dur = f(block.endSec - block.startSec, fps);
        return (
          <Sequence key={block.name} name={`Caption: ${block.name}`} from={Math.round(block.startSec * fps)} durationInFrames={dur} layout="none">
            <AestheticCaption block={block} durationInFrames={dur} theme={p.theme} />
          </Sequence>
        );
      })}
      {p.productCard ? (
        <Sequence
          name="Product card"
          from={Math.round(p.productCard.startSec * fps)}
          durationInFrames={f(p.productCard.endSec - p.productCard.startSec, fps)}
          layout="none"
        >
          <ProductCard
            card={p.productCard}
            dur={f(p.productCard.endSec - p.productCard.startSec, fps)}
            ink={p.theme.inkDark}
            accent={p.theme.accent}
          />
        </Sequence>
      ) : null}
      {p.music ? <Audio name="Music" src={staticFile(p.music.src)} volume={p.music.volume} /> : null}
    </AbsoluteFill>
  );
};
