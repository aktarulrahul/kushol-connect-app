import { Redirect } from "expo-router";
import { useEffect } from "react";

import { PendingScreen } from "@/components/auth/pending-screen";
import { useAuthStore } from "@/lib/auth/auth-store";

// Pending gate route (IDT-AP-008) — "what happens now" for a PENDING account, with logout,
// settings, and the rejected + resubmit state. The content is shared with the /(tabs) guard.
// Gate (owner requirement 2026-10-01): a signed-out visitor is redirected to /login; PENDING
// users see the explainer.
export default function VerificationPendingScreen() {
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    if (status === "idle") void hydrate();
  }, [status, hydrate]);

  if (status === "anon") return <Redirect href="/login" />;
  return <PendingScreen />;
}
