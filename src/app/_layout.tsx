import "../../global.css";

import {
  HindSiliguri_400Regular,
  HindSiliguri_500Medium,
  HindSiliguri_600SemiBold,
  HindSiliguri_700Bold,
} from "@expo-google-fonts/hind-siliguri";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SplashReveal } from "@/components/ui/splash-reveal";
import { ToastProvider } from "@/components/ui/toast";
import { LocaleProvider } from "@/i18n/locale-provider";
import { AuthProvider } from "@/lib/auth/auth-provider";
import { useAuthStore } from "@/lib/auth/auth-store";
import { color } from "@/theme/tokens";

// Root providers (DSN-AP-001…003): fonts → theme → locale. The native splash (lockup on paper)
// stays up until Hind Siliguri and Inter are loaded from the bundle — never an unstyled first
// frame and no network on first launch. If a font fails (a corrupt install), the app still
// renders with the system Bengali/Latin fonts instead of staying blank.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    HindSiliguri_400Regular,
    HindSiliguri_500Medium,
    HindSiliguri_600SemiBold,
    HindSiliguri_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }),
  );
  const authStatus = useAuthStore((s) => s.status);
  // Restore starts with font loading so the splash covers the session read. Guards mount only
  // after it finishes — a reload must not paint /login and then jump back.
  useEffect(() => {
    void useAuthStore.getState().hydrate();
  }, []);
  const authReady = authStatus === "anon" || authStatus === "authed";
  const ready = (fontsLoaded || fontError !== null) && authReady;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <ToastProvider>
            <AuthProvider>
              <StatusBar style="dark" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: color.background },
                }}
              />
              <PortalHost />
              <SplashReveal />
            </AuthProvider>
          </ToastProvider>
        </LocaleProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
