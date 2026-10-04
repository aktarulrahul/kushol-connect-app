import { useEffect, type ReactNode } from "react";
import { AppState } from "react-native";

import { Screen } from "@/components/ui/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/lib/auth/auth-store";

function BootGate() {
  return (
    <Screen className="justify-center gap-3">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-24 w-full" />
    </Screen>
  );
}

/**
 * Mounted above the navigator. Route guards stay unmounted until restore finishes, so a reload
 * does not paint /login and then jump back. Foreground retries a renew that failed offline.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);
  const renewIfNeeded = useAuthStore((s) => s.renewIfNeeded);

  useEffect(() => {
    if (status === "idle") void hydrate();
  }, [status, hydrate]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") void renewIfNeeded();
    });
    return () => {
      subscription.remove();
    };
  }, [renewIfNeeded]);

  if (status === "idle" || status === "checking") return <BootGate />;
  return children;
}
