// Swipe-to-reply (Spartens BaseMessage, owner 2026-10-09): drag an incoming bubble right or an
// outgoing bubble left past the threshold to quote it. Built on React Native's PanResponder so
// it needs no extra native module; it only claims clearly horizontal drags, so the list keeps
// scrolling and long-press still opens the focus menu. Reduced motion: no spring on release.
import { Reply } from "lucide-react-native";
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, PanResponder, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const THRESHOLD = 56;
const MAX_PULL = 80;

export function SwipeToReply({
  direction,
  enabled = true,
  onReply,
  children,
}: {
  /** "right" for incoming bubbles (swipe toward the middle), "left" for outgoing. */
  direction: "right" | "left";
  enabled?: boolean;
  onReply: () => void;
  children: ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const [offset] = useState(() => new Animated.Value(0));
  const onReplyRef = useRef(onReply);
  useLayoutEffect(() => {
    onReplyRef.current = onReply;
  });
  const sign = direction === "right" ? 1 : -1;

  const responder = useMemo(() => {
    const settle = () => {
      if (reducedMotion) {
        offset.setValue(0);
        return;
      }
      Animated.spring(offset, {
        toValue: 0,
        useNativeDriver: true,
        speed: 24,
        bounciness: 4,
      }).start();
    };
    // The ref is read only inside gesture callbacks (never while rendering): latest-callback
    // pattern so a mid-swipe re-render doesn't rebuild the responder and drop the gesture.
    // eslint-disable-next-line react-hooks/refs
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_event, g) =>
        enabled && sign * g.dx > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_event, g) => {
        offset.setValue(sign * Math.min(MAX_PULL, Math.max(0, sign * g.dx)));
      },
      onPanResponderRelease: (_event, g) => {
        if (sign * g.dx >= THRESHOLD) onReplyRef.current();
        settle();
      },
      onPanResponderTerminate: settle,
    });
  }, [enabled, offset, reducedMotion, sign]);

  const iconOpacity = offset.interpolate({
    inputRange: sign > 0 ? [0, THRESHOLD] : [-THRESHOLD, 0],
    outputRange: sign > 0 ? [0, 1] : [1, 0],
    extrapolate: "clamp",
  });

  return (
    <View {...responder.panHandlers}>
      <View
        pointerEvents="none"
        className={cn(
          "absolute inset-y-0 w-10 items-center justify-center",
          sign > 0 ? "left-0" : "right-0",
        )}
      >
        <Animated.View style={{ opacity: iconOpacity }}>
          <View className="size-8 items-center justify-center rounded-full bg-card shadow-sm">
            <Icon as={Reply} size={16} className="text-primary" />
          </View>
        </Animated.View>
      </View>
      <Animated.View style={{ transform: [{ translateX: offset }] }}>{children}</Animated.View>
    </View>
  );
}
