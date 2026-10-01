import { cn } from "@/lib/utils";
import * as SwitchPrimitives from "@rn-primitives/switch";
import { Platform } from "react-native";

// React Native Reusables Switch, sized for 02 (DSN-AP-007): 28×48 track, 44pt target with hitSlop.
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitives.Root>) {
  return (
    <SwitchPrimitives.Root
      className={cn(
        "flex h-7 w-12 shrink-0 flex-row items-center rounded-full border border-transparent px-0.5",
        Platform.select({
          web: "focus-visible:border-ring focus-visible:ring-ring/50 peer inline-flex outline-none transition-all focus-visible:ring-[3px] disabled:cursor-not-allowed",
        }),
        props.checked ? "bg-primary" : "bg-input",
        props.disabled && "opacity-50",
        className,
      )}
      hitSlop={8}
      {...props}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "size-6 rounded-full bg-card shadow-sm transition-transform",
          Platform.select({
            web: "pointer-events-none block ring-0",
          }),
          props.checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </SwitchPrimitives.Root>
  );
}

export { Switch };
