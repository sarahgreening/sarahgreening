import React from "react";
import {
  Easing,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT, SCRIPT, SERIF } from "../fonts";
import type { CaptionBlock, CaptionLine, CaptionTheme } from "./types";

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SIDE = 80; // left safe margin
const RIGHT = 150; // keep clear of TikTok's right-hand buttons

const fontStyle = (line: CaptionLine): React.CSSProperties => {
  if (line.font === "serif") {
    return { fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.02 };
  }
  if (line.font === "script") {
    return { fontFamily: SCRIPT, fontWeight: 700, lineHeight: 1 };
  }
  return { fontFamily: FONT, fontWeight: 700, textTransform: "uppercase", lineHeight: 1.3 };
};

/** A 4-point "sugar crystal" sparkle. */
const Sparkle: React.FC<{ x: number; y: number; size: number; delay: number; seed: string; color: string }> = ({
  x, y, size, delay, seed, color,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phase = random(seed) * Math.PI * 2;
  const appear = interpolate(frame, [delay, delay + 0.3 * fps], [0, 1], { ...clamp, easing: ease });
  const twinkle = 0.55 + 0.45 * Math.abs(Math.sin(frame / (fps * 0.35) + phase));
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{
        position: "absolute",
        left: x,
        top: y,
        scale: String(appear * twinkle),
        rotate: `${frame * 1.2 + phase * 20}deg`,
        filter: `drop-shadow(0 0 ${size / 4}px ${color})`,
      }}
    >
      <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z" fill="#ffffff" />
    </svg>
  );
};

export const AestheticCaption: React.FC<{
  block: CaptionBlock;
  durationInFrames: number;
  theme: CaptionTheme;
}> = ({ block, durationInFrames, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const light = block.tone === "light";
  const ink = light ? theme.inkLight : theme.inkDark;
  const accent = light ? theme.accentOnDark : theme.accent;
  const shadow = light
    ? "0 2px 22px rgba(8,30,60,0.55), 0 1px 3px rgba(8,30,60,0.55)"
    : "0 0 24px rgba(255,255,255,0.95), 0 0 6px rgba(255,255,255,0.9)";

  // whole-block exit: soft fade + blur + drift up
  const exitStart = durationInFrames - Math.round(0.35 * fps);
  const exit = interpolate(frame, [exitStart, durationInFrames], [0, 1], clamp);

  let wordIndex = 0;
  const justify = block.align === "left" ? "flex-start" : block.align === "right" ? "flex-end" : "center";

  return (
    <div
      style={{
        position: "absolute",
        left: SIDE,
        right: RIGHT,
        top: block.top,
        display: "flex",
        flexDirection: "column",
        alignItems: justify,
        textAlign: block.align,
        opacity: 1 - exit,
        filter: `blur(${exit * 8}px)`,
        translate: `0px ${-exit * 14}px`,
      }}
    >
      {block.lines.map((line, li) => {
        const color = line.color === "accent" ? accent : ink;
        const base: React.CSSProperties = {
          ...fontStyle(line),
          fontSize: line.size,
          color,
          textShadow: shadow,
        };

        if (line.font === "script") {
          // hand-written feel: wipe on left→right
          const start = 4 + wordIndex * 3;
          wordIndex += 2;
          // short captions write on faster so they finish while still on screen
          const wipe = Math.min(0.6 * fps, durationInFrames * 0.3);
          const reveal = interpolate(frame, [start, start + wipe], [0, 100], { ...clamp, easing: Easing.out(Easing.quad) });
          return (
            <div
              key={li}
              style={{
                ...base,
                rotate: "-3deg",
                margin: "4px 0",
                padding: "0 12px", // room for the script's overhanging strokes
                clipPath: `inset(-20% ${100 - reveal}% -20% -5%)`,
              }}
            >
              {line.text}
            </div>
          );
        }

        const words = line.text.split(" ");
        return (
          <div key={li} style={{ ...base, display: "flex", flexWrap: "wrap", justifyContent: justify, columnGap: "0.25em" }}>
            {words.map((w, wi) => {
              const start = 2 + wordIndex++ * 3;
              const p = interpolate(frame, [start, start + 14], [0, 1], { ...clamp, easing: ease });
              const tracking = line.font === "caps"
                ? `${interpolate(frame, [start, start + 24], [0.6, 0.32], { ...clamp, easing: ease })}em`
                : undefined;
              return (
                <span
                  key={wi}
                  style={{
                    display: "inline-block",
                    opacity: p,
                    filter: `blur(${(1 - p) * 14}px)`,
                    translate: `0px ${(1 - p) * 26}px`,
                    letterSpacing: tracking,
                  }}
                >
                  {w}
                </span>
              );
            })}
          </div>
        );
      })}

      {block.sparkles
        ? [0, 1, 2].map((i) => {
            const s = `${block.name}-${i}`;
            const sideRight = i % 2 === 0;
            return (
              <Sparkle
                key={i}
                seed={s}
                size={22 + random(`${s}-size`) * 26}
                delay={8 + i * 5}
                color={theme.accentOnDark}
                x={
                  block.align === "center"
                    ? (sideRight ? 640 : 70) + random(`${s}-x`) * 120
                    : block.align === "left"
                      ? (sideRight ? 520 : -10) + random(`${s}-x`) * 160
                      : (sideRight ? 720 : 220) + random(`${s}-x`) * 100
                }
                y={-30 + random(`${s}-y`) * 140 + i * 30}
              />
            );
          })
        : null}
    </div>
  );
};
