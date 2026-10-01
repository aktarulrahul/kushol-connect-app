import {
  CircleCheck,
  Info,
  OctagonX,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react-native";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AccessibilityInfo, Pressable, View } from "react-native";
import Animated, { FadeIn, FadeOut, ReduceMotion, SlideInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { motion } from "@/theme/tokens";

import { Icon } from "./icon";
import { Text } from "./text";

// Toast (DSN-AP-010, 05 §5): queued, safe-area aware, announced to screen readers, auto-dismiss
// after 4 s, optional action. Slides + fades in; fade only under reduced motion (Reanimated's
// ReduceMotion.System drops the slide). At most three on screen; the oldest leaves first.

type Variant = "success" | "error" | "info" | "warning";
type ToastInput = {
  title: string;
  description?: string;
  variant?: Variant;
  action?: { label: string; onPress: () => void };
};
type ToastItem = ToastInput & { id: number };

const ICONS: Record<Variant, { icon: LucideIcon; tone: string }> = {
  success: { icon: CircleCheck, tone: "text-success" },
  error: { icon: OctagonX, tone: "text-destructive" },
  info: { icon: Info, tone: "text-info" },
  warning: { icon: TriangleAlert, tone: "text-warning" },
};

const ToastContext = createContext<(toast: ToastInput) => void>(() => undefined);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const insets = useSafeAreaInsets();
  const t = useT();

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((i) => i.id !== id));
  }, []);

  const show = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++;
      setItems((list) => [...list.slice(-2), { ...toast, id }]);
      AccessibilityInfo.announceForAccessibility(
        [toast.title, toast.description].filter(Boolean).join(". "),
      );
      setTimeout(() => {
        dismiss(id);
      }, motion.toastMs);
    },
    [dismiss],
  );

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext value={value}>
      {children}
      <View
        pointerEvents="box-none"
        className="absolute inset-x-0 top-0 gap-2 px-4"
        style={{ paddingTop: insets.top + 8 }}
      >
        {items.map((item) => {
          const { icon, tone } = ICONS[item.variant ?? "info"];
          return (
            <Animated.View
              key={item.id}
              entering={SlideInUp.duration(motion.duration.slow).reduceMotion(ReduceMotion.System)}
              exiting={FadeOut.duration(motion.duration.base)}
              className="w-full max-w-tablet flex-row items-start gap-3 self-center rounded-xl border border-border bg-popover p-3 shadow-lg"
            >
              <Animated.View entering={FadeIn.duration(motion.duration.base)}>
                <Icon as={icon} size={20} className={tone} />
              </Animated.View>
              <View className="flex-1 gap-0.5">
                <Text className="text-sm font-semibold">{item.title}</Text>
                {item.description ? <Text variant="muted">{item.description}</Text> : null}
              </View>
              {item.action ? (
                <Pressable
                  role="button"
                  onPress={() => {
                    item.action?.onPress();
                    dismiss(item.id);
                  }}
                  className="min-h-11 justify-center px-2"
                >
                  <Text className="text-sm font-semibold text-primary">{item.action.label}</Text>
                </Pressable>
              ) : null}
              <Pressable
                role="button"
                accessibilityLabel={t("common.actions.close")}
                onPress={() => {
                  dismiss(item.id);
                }}
                hitSlop={12}
                className={cn("size-6 items-center justify-center")}
              >
                <Icon as={X} size={16} className="text-muted-foreground" />
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext>
  );
}
