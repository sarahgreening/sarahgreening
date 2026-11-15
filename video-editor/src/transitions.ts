import type {
  TransitionPresentation,
  TransitionPresentationComponentProps,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import type { TransitionKind } from "./types";

type Empty = Record<string, never>;

/** A quick "punch-in": the old shot scales up and fades, the new one lands from slightly zoomed. */
const ZoomPunch: React.FC<TransitionPresentationComponentProps<Empty>> = ({
  children,
  presentationDirection,
  presentationProgress: p,
}) => {
  const exiting = presentationDirection === "exiting";
  return React.createElement(
    AbsoluteFill,
    {
      style: {
        opacity: exiting ? interpolate(p, [0, 1], [1, 0]) : 1,
        scale: String(exiting ? interpolate(p, [0, 1], [1, 1.15]) : interpolate(p, [0, 1], [1.12, 1])),
        zIndex: exiting ? 1 : 0,
      },
    },
    children,
  );
};

export const getPresentation = (
  kind: TransitionKind,
): TransitionPresentation<Record<string, unknown>> => {
  switch (kind) {
    case "slide-left":
      return slide({ direction: "from-right" }) as TransitionPresentation<Record<string, unknown>>;
    case "slide-up":
      return slide({ direction: "from-bottom" }) as TransitionPresentation<Record<string, unknown>>;
    case "wipe":
      return wipe({ direction: "from-left" }) as TransitionPresentation<Record<string, unknown>>;
    case "zoom-punch":
      return { component: ZoomPunch, props: {} } as TransitionPresentation<Record<string, unknown>>;
    case "fade":
    default:
      return fade() as TransitionPresentation<Record<string, unknown>>;
  }
};
