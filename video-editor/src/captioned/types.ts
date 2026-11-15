/** Props for the CaptionedClip composition: one existing video + designed text captions. */

export type CaptionFont = "serif" | "script" | "caps";

export type CaptionLine = {
  text: string;
  font: CaptionFont;
  /** px at 1080 wide */
  size: number;
  /** "accent" uses the theme accent colour */
  color?: "ink" | "accent";
};

export type CaptionBlock = {
  name: string;
  startSec: number;
  endSec: number;
  lines: CaptionLine[];
  /** Vertical position of the block's top edge, px from the top of the 1920 frame. */
  top: number;
  align: "left" | "center" | "right";
  /** "light" = white text for dark/busy areas, "dark" = navy text for white areas. */
  tone: "light" | "dark";
  sparkles?: boolean;
};

export type CaptionTheme = {
  /** Accent on white/light backgrounds, e.g. the packaging's blue. */
  accent: string;
  /** Lighter accent for dark/busy backgrounds. */
  accentOnDark: string;
  inkLight: string;
  inkDark: string;
};

export type CaptionedClipProps = {
  src: string; // inside public/
  durationSec: number;
  fps: number;
  width: number;
  height: number;
  volume: number;
  theme: CaptionTheme;
  captions: CaptionBlock[];
};
