import { Children } from "react";
import { Icon } from "@/components/ui/icon";
import { Text, TextClassContext } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { Slot } from "@rn-primitives/slot";
import { cva, type VariantProps } from "class-variance-authority";
import { BadgeCheck } from "lucide-react-native";
import { Platform, View } from "react-native";

const badgeVariants = cva(
  cn(
    "border-border group shrink-0 flex-row items-center justify-center gap-1 rounded-full border px-2 py-0.5",
    Platform.select({
      web: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive w-fit whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] [&>svg]:pointer-events-none [&>svg]:size-3",
    }),
  ),
  {
    variants: {
      variant: {
        default: cn(
          "bg-primary border-transparent",
          Platform.select({ web: "[a&]:hover:bg-primary/90" }),
        ),
        secondary: cn(
          "bg-secondary border-transparent",
          Platform.select({ web: "[a&]:hover:bg-secondary/90" }),
        ),
        destructive: cn(
          "bg-destructive border-transparent",
          Platform.select({ web: "[a&]:hover:bg-destructive/90" }),
        ),
        outline: Platform.select({ web: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground" }),
        // soft status badges (02 DSN-AP-012) — pair with an icon or word, never colour alone
        success: "border-transparent bg-success-soft",
        warning: "border-transparent bg-warning-soft",
        info: "border-transparent bg-info-soft",
        verified: "border-transparent bg-primary-soft",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const badgeTextVariants = cva("text-xs font-medium", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      secondary: "text-secondary-foreground",
      destructive: "text-destructive-foreground",
      outline: "text-foreground",
      success: "text-success",
      warning: "text-warning",
      info: "text-info",
      verified: "text-primary-soft-foreground",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type BadgeProps = React.ComponentProps<typeof View> &
  React.RefAttributes<View> & {
    asChild?: boolean;
  } & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, asChild, children, ...props }: BadgeProps) {
  const Component = asChild ? Slot : View;
  // Native Views cannot host raw strings; callers often pass counts/labels as children.
  const content =
    Platform.OS === "web"
      ? children
      : Children.map(children, (child) =>
          typeof child === "string" || typeof child === "number" ? <Text>{child}</Text> : child,
        );
  return (
    <TextClassContext.Provider value={badgeTextVariants({ variant })}>
      <Component className={cn(badgeVariants({ variant }), className)} {...props}>
        {content}
      </Component>
    </TextClassContext.Provider>
  );
}

/** "Verified" (bn/en) — only for entities the api reports as verified, never decorative. */
function VerifiedBadge({ className }: { className?: string }) {
  const t = useT();
  return (
    <Badge variant="verified" className={className}>
      <Icon as={BadgeCheck} size={12} className="text-primary-soft-foreground" />
      <Text>{t("common.verified")}</Text>
    </Badge>
  );
}

export { Badge, badgeTextVariants, badgeVariants, VerifiedBadge };
export type { BadgeProps };
