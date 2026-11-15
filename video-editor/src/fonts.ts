import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Fonts are bundled in public/fonts so every machine renders identical text.
export const FONT = "InterBundled";

const weights: Array<[string, string]> = [
  ["600", "Inter-SemiBold.otf"],
  ["700", "Inter-Bold.otf"],
  ["800", "Inter-ExtraBold.otf"],
  ["900", "Inter-Black.otf"],
];

export const fontsLoaded = Promise.all(
  weights.map(([weight, file]) =>
    loadFont({ family: FONT, url: staticFile(`fonts/${file}`), weight }),
  ),
);
