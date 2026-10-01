import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Circle, Defs, LinearGradient, Path, Rect, Stop, Svg } from "react-native-svg";

import { cn } from "@/lib/utils";
import { color, teal } from "@/theme/tokens";

// Auth illustration (owner request 2026-10-01, owed): our own animated verification scene —
// a soft teal token-gradient blob, a floating shield with a check, a chat bubble with three
// staggered typing dots and one orbiting dot. SVG shapes inside reanimated Animated.Views;
// every loop carries reduceMotion: ReduceMotion.System so reduced-motion users get the static
// scene (DSN-BR-007). Decorative only — hidden from screen readers. Colours come from the
// theme tokens exclusively (DSN-BR-002); two size variants: hero (login + register landing)
// and compact (onboarding welcome screens).

const STAGE = { width: 256, height: 160 };

function useFloat(distance: number, duration: number, delay = 0) {
  const offset = useSharedValue(0);
  useEffect(() => {
    offset.value = withDelay(
      delay,
      withRepeat(
        withTiming(distance, {
          duration,
          easing: Easing.inOut(Easing.sin),
          reduceMotion: ReduceMotion.System,
        }),
        -1,
        true,
      ),
    );
  }, [distance, duration, delay, offset]);
  return useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));
}

function TypingDot({ index }: { index: number }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withDelay(
      index * 180,
      withRepeat(
        withTiming(0.3, {
          duration: 520,
          easing: Easing.inOut(Easing.sin),
          reduceMotion: ReduceMotion.System,
        }),
        -1,
        true,
      ),
    );
  }, [index, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[style, { backgroundColor: teal[700] }]} className="size-2 rounded-full" />;
}

function AuthIllustration({
  variant = "hero",
  className,
}: {
  variant?: "hero" | "compact";
  className?: string;
}) {
  const orbit = useSharedValue(0);
  useEffect(() => {
    orbit.value = withRepeat(
      withTiming(360, { duration: 9000, easing: Easing.linear, reduceMotion: ReduceMotion.System }),
      -1,
      false,
    );
  }, [orbit]);
  const orbitStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${orbit.value}deg` }] }));

  const shieldFloat = useFloat(-7, 1700);
  const bubbleFloat = useFloat(-5, 2100, 500);

  return (
    <View
      testID={`auth-illustration-${variant}`}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn(
        "w-full items-center justify-center",
        variant === "hero" ? "h-48" : "h-24",
        className,
      )}
    >
      <View
        style={{
          width: STAGE.width,
          height: STAGE.height,
          transform: [{ scale: variant === "hero" ? 1 : 0.55 }],
        }}
      >
        {/* gradient blob backdrop */}
        <Svg width={STAGE.width} height={STAGE.height} style={{ position: "absolute", left: 0, top: 0 }}>
          <Defs>
            <LinearGradient id="auth-illustration-blob" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={teal[100]} />
              <Stop offset="1" stopColor={teal[300]} />
            </LinearGradient>
          </Defs>
          <Circle cx="120" cy="86" rx="104" ry="64" fill="url(#auth-illustration-blob)" opacity={0.55} />
          <Circle cx="188" cy="52" r="34" fill={teal[200]} opacity={0.5} />
        </Svg>

        {/* orbiting dot — rotates around the stage centre */}
        <Animated.View
          style={[
            orbitStyle,
            {
              position: "absolute",
              left: (STAGE.width - 168) / 2,
              top: (STAGE.height - 148) / 2,
              width: 168,
              height: 148,
            },
          ]}
        >
          <View
            style={{ position: "absolute", left: 78, top: 0, opacity: 0.9, backgroundColor: color.primary }}
            className="size-3 rounded-full"
          />
        </Animated.View>

        {/* floating shield with check */}
        <Animated.View
          style={[shieldFloat, { position: "absolute", left: 94, top: 18, width: 68, height: 80 }]}
        >
          <Svg width={68} height={80} viewBox="0 0 24 28">
            <Path
              d="M12 1.8 20.6 5a1.6 1.6 0 0 1 1 1.5v6.3c0 5.4-3.7 9.4-9.3 11.3a1.5 1.5 0 0 1-1 0C5.7 22.2 2 18.2 2 12.8V6.5A1.6 1.6 0 0 1 3 5Z"
              fill={color.card}
              stroke={teal[700]}
              strokeWidth={1.4}
            />
            <Path
              d="m8.4 13.6 2.6 2.6 4.9-5.2"
              stroke={teal[800]}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Animated.View>

        {/* chat bubble with three staggered typing dots */}
        <Animated.View
          style={[bubbleFloat, { position: "absolute", left: 26, top: 78, width: 84, height: 62 }]}
        >
          <Svg width={84} height={62} viewBox="0 0 84 62">
            <Rect
              x="2"
              y="2"
              width="80"
              height="44"
              rx="12"
              fill={color.card}
              stroke={teal[200]}
              strokeWidth={1.5}
            />
            <Path d="M20 45 v13 l14-13 Z" fill={color.card} />
            <Path
              d="M20 44.6 v13 l14-13"
              fill="none"
              stroke={teal[200]}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          </Svg>
          <View
            style={{ position: "absolute", left: 0, top: 17, width: 84 }}
            className="flex-row items-center justify-center gap-2"
          >
            <TypingDot index={0} />
            <TypingDot index={1} />
            <TypingDot index={2} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

export { AuthIllustration };
