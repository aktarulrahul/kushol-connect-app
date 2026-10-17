// WhatsApp-style conversation wallpaper (05 · owner 2026-10-17): original education line art —
// pens, pencils, books, school tools, science and maths — drawn as one react-native-svg pattern:
// identical on Android and iOS, no bitmap assets, crisp at every pixel density, rendered once
// behind the (transparent) message list so scrolling never repaints it.
import { StyleSheet } from "react-native";
import Svg, { Defs, G, Path, Pattern, Rect } from "react-native-svg";

import {
  WALLPAPER_DOODLES,
  WALLPAPER_STROKE_OPACITY,
  WALLPAPER_STROKE_WIDTH,
  WALLPAPER_TILE,
} from "@/components/chat/chat-wallpaper-doodles";
import { color, teal } from "@/theme/tokens";

export function ChatWallpaper() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}>
      <Defs>
        <Pattern
          id="kc-chat-doodles"
          patternUnits="userSpaceOnUse"
          width={WALLPAPER_TILE}
          height={WALLPAPER_TILE}
        >
          <G
            fill="none"
            stroke={color.primary}
            strokeOpacity={WALLPAPER_STROKE_OPACITY}
            strokeWidth={WALLPAPER_STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {WALLPAPER_DOODLES.map((doodle, i) => (
              <Path key={i} d={doodle.d} transform={doodle.transform} />
            ))}
          </G>
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={teal[100]} />
      <Rect width="100%" height="100%" fill="url(#kc-chat-doodles)" />
    </Svg>
  );
}
