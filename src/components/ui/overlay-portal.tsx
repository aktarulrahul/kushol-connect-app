import { Portal } from "@rn-primitives/portal";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { BackHandler, StyleSheet, View } from "react-native";

// Full-window overlay rendered through the root `PortalHost` (src/app/_layout.tsx) — the same
// layer the dialogs use — instead of React Native's `Modal` (owner 2026-10-17, Android
// screenshots). A `Modal` opens a separate Android dialog window; with this app's edge-to-edge
// main window that window did not line up with the screen, so bottom sheets ended above the
// composer with the screen showing underneath. In the app's own window the overlay covers the
// whole display on Android and iOS alike, shares the coordinate space of `measureInWindow`, and
// the safe-area insets mean the same thing inside and outside it.
//
// Mounted only while `visible` (entering animations replay each open). The Android back button
// closes the top-most overlay first (the latest listener wins).

function OverlayPortal({
  visible,
  onRequestClose,
  children,
  testID,
}: {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
  testID?: string;
}) {
  const name = `overlay-${useId()}`;
  const close = useRef(onRequestClose);
  useEffect(() => {
    close.current = onRequestClose;
  }, [onRequestClose]);

  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      close.current();
      return true;
    });
    return () => {
      sub.remove();
    };
  }, [visible]);

  if (!visible) return null;
  return (
    <Portal name={name}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID={testID}>
        {children}
      </View>
    </Portal>
  );
}

export { OverlayPortal };
