import { createTikTokStyleCaptions, type Caption } from "@remotion/captions";
import { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT } from "../fonts";
import type { CaptionStyle, ProductInfo } from "../types";
import { SAFE } from "./Overlays";

const COMBINE_MS: Record<CaptionStyle, number> = {
  "bold-pop": 700, // 1-3 words per page, punchy
  "clean-box": 1400,
  karaoke: 1800,
};

export const Captions: React.FC<{
  captions: Caption[];
  style: CaptionStyle;
  product: ProductInfo;
  bottomPx?: number;
}> = ({ captions, style, product, bottomPx }) => {
  const { fps } = useVideoConfig();
  const { pages } = useMemo(
    () =>
      createTikTokStyleCaptions({
        captions,
        combineTokensWithinMilliseconds: COMBINE_MS[style],
      }),
    [captions, style],
  );

  return (
    <AbsoluteFill>
      {pages.map((page, i) => {
        const next = pages[i + 1];
        const from = Math.round((page.startMs / 1000) * fps);
        const endMs = next ? Math.min(next.startMs, page.startMs + page.durationMs) : page.startMs + page.durationMs;
        const dur = Math.max(1, Math.round(((endMs - page.startMs) / 1000) * fps));
        return (
          <Sequence key={i} name={`Caption: ${page.text.trim()}`} from={from} durationInFrames={dur} layout="none">
            <CaptionPage page={page} style={style} product={product} bottomPx={bottomPx ?? SAFE.bottom + 80} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const CaptionPage: React.FC<{
  page: ReturnType<typeof createTikTokStyleCaptions>["pages"][number];
  style: CaptionStyle;
  product: ProductInfo;
  bottomPx: number;
}> = ({ page, style, product, bottomPx }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = page.startMs + (frame / fps) * 1000;
  const pop = spring({ frame, fps, config: { damping: 14, stiffness: 260 }, durationInFrames: 8 });

  const container: React.CSSProperties = {
    position: "absolute",
    left: SAFE.side,
    right: SAFE.side + 60, // keep clear of the TikTok action buttons on the right
    bottom: bottomPx,
    display: "flex",
    justifyContent: "center",
    textAlign: "center",
    fontFamily: FONT,
  };

  if (style === "bold-pop") {
    return (
      <div style={{ ...container, scale: String(interpolate(pop, [0, 1], [0.7, 1])) }}>
        <div style={{ fontSize: 100, fontWeight: 900, lineHeight: 1.05, textTransform: "uppercase" }}>
          {page.tokens.map((t, i) => {
            const active = nowMs >= t.fromMs && nowMs < t.toMs;
            return (
              <span
                key={i}
                style={{
                  whiteSpace: "pre",
                  color: active ? product.accentColor : "#fff",
                  WebkitTextStroke: "16px #000",
                  paintOrder: "stroke fill",
                }}
              >
                {t.text}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  if (style === "clean-box") {
    return (
      <div style={{ ...container, opacity: pop }}>
        <div
          style={{
            background: "rgba(255,255,255,0.95)",
            borderRadius: 22,
            padding: "18px 30px",
            fontSize: 58,
            fontWeight: 700,
            lineHeight: 1.2,
            color: "#111",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          }}
        >
          {page.tokens.map((t, i) => {
            const active = nowMs >= t.fromMs && nowMs < t.toMs;
            return (
              <span key={i} style={{ whiteSpace: "pre", color: active ? product.brandColor : "#111" }}>
                {t.text}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  // karaoke: upcoming words are dimmed, the current word gets a coloured pill
  return (
    <div style={{ ...container, opacity: pop }}>
      <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.35, color: "#fff", WebkitTextStroke: "12px rgba(0,0,0,0.85)", paintOrder: "stroke fill" }}>
        {page.tokens.map((t, i) => {
          const active = nowMs >= t.fromMs && nowMs < t.toMs;
          const spoken = nowMs >= t.toMs;
          const lead = t.text.match(/^\s*/)?.[0] ?? "";
          return (
            <span key={i} style={{ whiteSpace: "pre" }}>
              {lead}
              <span
                style={{
                  opacity: active || spoken ? 1 : 0.7,
                  background: active ? product.brandColor : "transparent",
                  borderRadius: 14,
                  padding: "0 10px",
                  margin: "0 -10px",
                }}
              >
                {t.text.trimStart()}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
};
