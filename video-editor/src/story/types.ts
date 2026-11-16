import type { CaptionBlock, CaptionTheme } from "../captioned/types";

/** A labelled pointer to a product detail. Coordinates are 0..1 within the photo. */
export type Callout = {
  text: string;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  /** seconds after the scene starts */
  delaySec: number;
};

export type StoryScene = {
  name: string;
  src: string; // inside public/
  srcWidth: number;
  srcHeight: number;
  durationSec: number;
  /** "contain" = whole photo visible (product shots), "cover" = fill the frame (portraits, macro). */
  fit: "contain" | "cover";
  focusX?: number;
  focusY?: number;
  zoomFrom: number;
  zoomTo: number;
  transitionIn?: "none" | "fade" | "slide-left" | "slide-up" | "wipe";
  callouts?: Callout[];
};

export type ProductCardSpec = {
  startSec: number;
  endSec: number;
  image: string;
  imageWidth: number;
  imageHeight: number;
  kicker: string;
  title: string;
  cta: string;
  top: number;
};

export type PhotoStoryProps = {
  composition: "PhotoStory";
  editName: string;
  fps: number;
  width: number;
  height: number;
  /** Frame colour behind "contain" photos; match the product photo backdrop. */
  background: string;
  transitionSec: number;
  maxZoom: number;
  scenes: StoryScene[];
  theme: CaptionTheme;
  captions: CaptionBlock[];
  productCard?: ProductCardSpec;
  music?: { src: string; volume: number };
  /** Render with a silent audio track (add a trending sound in the TikTok app). */
  silentOk?: boolean;
};
