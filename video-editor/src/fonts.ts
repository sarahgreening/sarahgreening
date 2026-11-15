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

export const SERIF = "FrauncesBundled"; // soft italic serif (OFL)
export const SCRIPT = "CaveatBundled"; // handwritten script (OFL)

export const fontsLoaded = Promise.all([
  ...weights.map(([weight, file]) =>
    loadFont({ family: FONT, url: staticFile(`fonts/${file}`), weight }),
  ),
  loadFont({ family: SERIF, url: staticFile("fonts/fraunces-latin-400-italic.woff2"), weight: "400", style: "italic" }),
  loadFont({ family: SERIF, url: staticFile("fonts/fraunces-latin-600-italic.woff2"), weight: "600", style: "italic" }),
  loadFont({ family: SCRIPT, url: staticFile("fonts/caveat-latin-700-normal.woff2"), weight: "700" }),
]);
