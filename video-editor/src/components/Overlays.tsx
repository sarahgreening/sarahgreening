import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT } from "../fonts";
import type { ProductInfo } from "../types";

// TikTok / Reels UI covers roughly the top 150px, the right 140px and the
// bottom ~420px of a 1080x1920 frame. All overlays stay inside this box.
export const SAFE = { top: 170, side: 80, bottom: 440 };

const ease = Easing.bezier(0.16, 1, 0.3, 1);

const inOut = (frame: number, dur: number, fps: number) =>
  Math.min(
    interpolate(frame, [0, 0.25 * fps], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: ease,
    }),
    interpolate(frame, [dur - 0.25 * fps, dur], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

export const Label: React.FC<{ text: string; color: string }> = ({
  text,
  color,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.side,
        top: SAFE.top + 40, // same slot as the title card; planner keeps them apart
        padding: "12px 26px",
        borderRadius: 999,
        background: color,
        color: "#fff",
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: 40,
        letterSpacing: 1,
        textTransform: "uppercase",
        opacity: interpolate(frame, [0, 0.3 * fps], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        translate: `${interpolate(frame, [0, 0.4 * fps], [-40, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: ease,
        })}px 0px`,
      }}
    >
      {text}
    </div>
  );
};

export const HookText: React.FC<{
  text: string;
  durationInFrames: number;
  product: ProductInfo;
  variant: "slab" | "clean" | "handwritten";
}> = ({ text, durationInFrames, product, variant }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12, stiffness: 180 } });
  const opacity = inOut(frame, durationInFrames, fps);

  const base: React.CSSProperties = {
    position: "absolute",
    left: SAFE.side,
    right: SAFE.side + 40,
    top: SAFE.top + 60,
    textAlign: "center",
    fontFamily: FONT,
    lineHeight: 1.08,
    opacity,
  };

  if (variant === "slab") {
    return (
      <div style={{ ...base, scale: String(interpolate(pop, [0, 1], [0.6, 1])) }}>
        <span
          style={{
            display: "inline",
            background: product.accentColor,
            color: "#111",
            fontWeight: 900,
            fontSize: 96,
            padding: "6px 22px",
            boxDecorationBreak: "clone",
            WebkitBoxDecorationBreak: "clone",
            textTransform: "uppercase",
          }}
        >
          {text}
        </span>
      </div>
    );
  }
  if (variant === "clean") {
    return (
      <div
        style={{
          ...base,
          translate: `0px ${interpolate(pop, [0, 1], [30, 0])}px`,
          color: "#fff",
          fontWeight: 800,
          fontSize: 84,
          textShadow: "0 6px 24px rgba(0,0,0,0.55)",
        }}
      >
        {text}
      </div>
    );
  }
  return (
    <div
      style={{
        ...base,
        scale: String(interpolate(pop, [0, 1], [0.85, 1])),
        color: "#fff",
        fontWeight: 900,
        fontSize: 88,
        WebkitTextStroke: "14px #000",
        paintOrder: "stroke fill",
      }}
    >
      {text}
    </div>
  );
};

export const Stars: React.FC<{ color: string; delay: number }> = ({
  color,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const s = spring({
          frame: frame - delay - i * 3,
          fps,
          config: { damping: 10, stiffness: 200 },
        });
        return (
          <svg key={i} width={52} height={52} viewBox="0 0 24 24" style={{ scale: String(s) }}>
            <path
              d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z"
              fill={color}
            />
          </svg>
        );
      })}
    </div>
  );
};

export const TitleCard: React.FC<{
  product: ProductInfo;
  durationInFrames: number;
  showPrice: boolean;
  showRating: boolean;
}> = ({ product, durationInFrames, showPrice, showRating }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = inOut(frame, durationInFrames, fps);
  const x = interpolate(frame, [0, 0.45 * fps], [-80, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.side,
        top: SAFE.top + 40,
        maxWidth: 1080 - SAFE.side * 2 - 60,
        opacity,
        translate: `${x}px 0px`,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.96)",
          borderLeft: `14px solid ${product.brandColor}`,
          borderRadius: 24,
          padding: "26px 34px",
          boxShadow: "0 18px 50px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 700, color: "#555", letterSpacing: 2, textTransform: "uppercase" }}>
          {product.name}
        </div>
        <div style={{ fontSize: 76, fontWeight: 900, color: "#111", lineHeight: 1.05 }}>
          {product.shortName}
        </div>
        {showRating ? <Stars color="#FFB400" delay={8} /> : null}
      </div>
      {showPrice && product.price ? (
        <div
          style={{
            display: "inline-block",
            marginTop: 18,
            padding: "12px 28px",
            borderRadius: 18,
            background: product.brandColor,
            color: "#fff",
            fontSize: 56,
            fontWeight: 900,
            scale: String(
              spring({ frame: frame - 10, fps, config: { damping: 9, stiffness: 220 } }),
            ),
          }}
        >
          {product.price}
        </div>
      ) : null}
    </div>
  );
};

export const EndCard: React.FC<{
  product: ProductInfo;
  cta: string;
  showPrice: boolean;
}> = ({ product, cta, showPrice }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14 } });
  const pulse = 1 + 0.04 * Math.sin((frame / fps) * Math.PI * 2 * 1.4);
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, #ffffff 0%, ${product.brandColor}40 100%), #ffffff`,
        alignItems: "center",
        fontFamily: FONT,
      }}
    >
      {product.image ? (
        <Img
          src={staticFile(product.image)}
          style={{
            position: "absolute",
            top: SAFE.top + 60,
            width: 760,
            height: 760,
            objectFit: "contain", // never crop or stretch packaging
            scale: String(interpolate(enter, [0, 1], [0.9, 1])),
            filter: "drop-shadow(0 40px 60px rgba(0,0,0,0.25))",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          top: SAFE.top + 860,
          left: SAFE.side,
          right: SAFE.side,
          textAlign: "center",
          opacity: enter,
        }}
      >
        <div style={{ fontSize: 80, fontWeight: 900, color: "#111", lineHeight: 1.05 }}>
          {product.shortName}
        </div>
        {showPrice && product.price ? (
          <div style={{ fontSize: 60, fontWeight: 800, color: product.brandColor, marginTop: 10 }}>
            {product.price}
          </div>
        ) : null}
        <div
          style={{
            display: "inline-block",
            marginTop: 30,
            padding: "26px 48px",
            borderRadius: 999,
            background: "#111",
            color: "#fff",
            fontSize: 50,
            fontWeight: 800,
            scale: String(pulse),
          }}
        >
          {cta}
        </div>
      </div>
    </AbsoluteFill>
  );
};
