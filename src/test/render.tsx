import { PortalHost } from "@rn-primitives/portal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ToastProvider } from "@/components/ui/toast";
import type { Locale } from "@/i18n";
import { LocaleProvider } from "@/i18n/locale-provider";

/** A 360pt-wide phone (the design's primary target, 05 §6). */
const phone = {
  frame: { x: 0, y: 0, width: 360, height: 780 },
  insets: { top: 24, left: 0, right: 0, bottom: 16 },
};

/** Renders inside the same providers as the root layout (fresh query cache per test). */
export function renderUi(ui: ReactNode, { locale = "bn" }: { locale?: Locale } = {}) {
  // gcTime Infinity: no cache timers left running after unmount (Jest would wait on them).
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <SafeAreaProvider initialMetrics={phone}>
      <QueryClientProvider client={client}>
        <LocaleProvider initialLocale={locale}>
          <ToastProvider>
            {ui}
            <PortalHost />
          </ToastProvider>
        </LocaleProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}
