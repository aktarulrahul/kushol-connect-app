import { CircleAlert, type LucideIcon } from "lucide-react-native";
import { View } from "react-native";

import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";
import { buttonTextVariants, buttonVariants } from "./button";
import { Icon } from "./icon";
import { Text } from "./text";

// Confirmation modal (DSN-AP-018, design-reference §6.3 — CircleUp 47/83): centred card with a
// circular icon badge, title, consequence, Cancel (outline) + primary/destructive action.

type ConfirmModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: LucideIcon;
  onConfirm: () => void;
};

function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  icon = CircleAlert,
  onConfirm,
}: ConfirmModalProps) {
  const t = useT();
  const variant = destructive ? "destructive" : "default";
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="items-center bg-card">
        <View
          className={cn(
            "size-14 items-center justify-center rounded-full",
            destructive ? "bg-destructive-soft" : "bg-primary-soft",
          )}
        >
          <Icon as={icon} size={26} className={destructive ? "text-destructive" : "text-primary"} />
        </View>
        <AlertDialogHeader className="items-center">
          <AlertDialogTitle className="text-center">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-center">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="w-full flex-row gap-3">
          <AlertDialogCancel className="flex-1">
            <Text>{cancelLabel ?? t("common.actions.cancel")}</Text>
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn("flex-1", buttonVariants({ variant }))}
            onPress={onConfirm}
          >
            <Text className={buttonTextVariants({ variant })}>
              {confirmLabel ?? t("common.actions.confirm")}
            </Text>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { ConfirmModal };
