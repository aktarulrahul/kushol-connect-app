import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { motion } from "@/theme/tokens";

import { Logo } from "./logo";

// One-time reveal after the native splash (design-reference §5: ≤ 900ms, never looped; static
// under reduced motion). The overlay repeats the native splash — lockup on paper — then fades
// away, so the hand-off from native to JS is seamless. Plays once per cold start.
const HOLD_MS = 150;

export function SplashReveal() {
  const reduceMotion = useReducedMotion();
  const [done, setDone] = useState(false);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    const fade = motion.duration.reveal - HOLD_MS * 3; // 450ms of the ≤ 900ms budget
    opacity.value = withDelay(HOLD_MS, withTiming(0, { duration: fade }));
    scale.value = withDelay(HOLD_MS, withTiming(1.04, { duration: fade }));
    const timer = setTimeout(() => {
      setDone(true);
    }, HOLD_MS + fade);
    return () => {
      clearTimeout(timer);
    };
  }, [reduceMotion, opacity, scale]);

  const overlay = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const logo = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (done || reduceMotion) return null; // reduced motion: no reveal, straight to the app
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="items-center justify-center bg-background"
      style={[StyleSheet.absoluteFill, overlay]}
    >
      <Animated.View style={logo}>
        <Logo size="xl" decorative />
      </Animated.View>
    </Animated.View>
  );
}
