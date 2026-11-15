import React from "react";
import {
  Easing,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT, SCRIPT, SERIF } from "../fonts";
import type { CaptionBlock, CaptionLine, CaptionTheme } from "./types";

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SIDE = 80; // left safe margin
const RIGHT = 150; // keep clear of TikTok's right-hand buttons
const EMOJI = /\p{Extended_Pictographic}/u;

const fontStyle = (line: CaptionLine): React.CSSProperties => {
  if (line.font === "serif") {
    return { fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.05 };
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

/** Hand-drawn underline that draws itself under an emphasised word. */
const Swoosh: React.FC<{ start: number; color: string }> = ({ start, color }) => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [start, start + 12], [1, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <svg
      viewBox="0 0 200 20"
      preserveAspectRatio="none"
      style={{ position: "absolute", left: "-4%", bottom: "-0.12em", width: "108%", height: "0.28em", overflow: "visible" }}
    >
      <path
        d="M4 14 C 50 4, 120 4, 196 10"
        fill="none"
        stroke={color}
        strokeWidth={7}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={draw}
      />
    </svg>
  );
};

/** Emoji: springs in, then wiggles gently. */
const Emoji: React.FC<{ char: string; start: number; size: number }> = ({ char, start, size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - start, fps, config: { damping: 8, stiffness: 220 } });
  const wiggle = frame > start + 10 ? Math.sin((frame - start) / 4) * 9 : 0;
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: "'Apple Color Emoji', 'Noto Color Emoji', sans-serif",
        fontStyle: "normal",
        fontSize: size * 0.8,
        marginLeft: "0.15em",
        scale: String(pop),
        rotate: `${wiggle}deg`,
        textShadow: "none",
        filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.25))",
      }}
    >
      {char}
    </span>
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

  let order = 0; // running index used to stagger every word in the block
  const justify = block.align === "left" ? "flex-start" : block.align === "right" ? "flex-end" : "center";

  const glass = block.style === "glass";
  const glassIn = interpolate(frame, [0, 10], [0, 1], { ...clamp, easing: ease });

  const lines = block.lines.map((line, li) => {
    const color = line.color === "accent" ? accent : ink;
    const base: React.CSSProperties = { ...fontStyle(line), fontSize: line.size, color, textShadow: shadow };

    if (line.font === "script") {
      // hand-written feel: wipe on left→right; trailing emoji pops in after
      const m = line.text.match(/^(.*?)\s*(\p{Extended_Pictographic}️?)?$/u);
      const text = m?.[1] ?? line.text;
      const emoji = m?.[2];
      const start = 4 + order * 3;
      order += 2;
      const wipe = Math.min(0.6 * fps, durationInFrames * 0.3);
      const reveal = interpolate(frame, [start, start + wipe], [0, 100], { ...clamp, easing: Easing.out(Easing.quad) });
      return (
        <div key={li} style={{ display: "flex", alignItems: "center", rotate: "-3deg", margin: "4px 0" }}>
          <div style={{ ...base, whiteSpace: "nowrap", padding: "0 12px", clipPath: `inset(-20% ${100 - reveal}% -20% -5%)` }}>{text}</div>
          {emoji ? <Emoji char={emoji} start={start + wipe - 2} size={line.size} /> : null}
        </div>
      );
    }

    const words = line.text.split(" ");
    return (
      <div key={li} style={{ ...base, display: "flex", flexWrap: "wrap", justifyContent: justify, alignItems: "center", columnGap: "0.25em" }}>
        {words.map((raw, wi) => {
          const start = 2 + order++ * 3;
          if (EMOJI.test(raw)) return <Emoji key={wi} char={raw} start={start + 4} size={line.size} />;
          const emph = /^\*.+\*[,.!?…]*$/.test(raw);
          const word = raw.replace(/\*/g, "");
          let style: React.CSSProperties;
          if (block.motion === "pop") {
            const s = spring({ frame: frame - start, fps, config: { damping: 9, stiffness: 200 } });
            style = { opacity: Math.min(1, s * 2), scale: String(s), translate: `0px ${(1 - Math.min(1, s)) * 30}px` };
          } else {
            const p = interpolate(frame, [start, start + 14], [0, 1], { ...clamp, easing: ease });
            style = { opacity: p, filter: `blur(${(1 - p) * 14}px)`, translate: `0px ${(1 - p) * 26}px` };
          }
          const tracking = line.font === "caps"
            ? `${interpolate(frame, [start, start + 24], [0.6, 0.32], { ...clamp, easing: ease })}em`
            : undefined;
          return (
            <span
              key={wi}
              style={{ display: "inline-block", position: "relative", letterSpacing: tracking, color: emph ? accent : undefined, ...style }}
            >
              {word}
              {emph ? <Swoosh start={start + 10} color={accent} /> : null}
            </span>
          );
        })}
      </div>
    );
  });

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
      {/* inner box hugs the text so sparkles sit around it, never on the letters */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: justify }}>
        {glass ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "14px 30px",
              borderRadius: 999,
              background: light ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.55)",
              border: "1.5px solid rgba(255,255,255,0.8)",
              backdropFilter: "blur(14px)",
              boxShadow: "0 10px 30px rgba(12,45,87,0.12)",
              opacity: glassIn,
              scale: String(interpolate(glassIn, [0, 1], [0.92, 1])),
            }}
          >
            {lines}
          </div>
        ) : (
          lines
        )}
        {block.sparkles
          ? (
              [
                { left: -46, top: -34 },
                { right: -50, top: "18%" },
                { left: "22%", bottom: -44 },
              ] as React.CSSProperties[]
            ).map((pos, i) => {
              const s = `${block.name}-${i}`;
              return (
                <div key={i} style={{ position: "absolute", ...pos }}>
                  <Sparkle seed={s} size={26 + random(`${s}-size`) * 20} delay={8 + i * 5} color={theme.accentOnDark} x={0} y={0} />
                </div>
              );
            })
          : null}
      </div>
    </div>
  );
};
