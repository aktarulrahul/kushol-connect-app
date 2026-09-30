import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { createApiClient, type Schemas } from "@/api/client";
import { env } from "@/env";

// Development-only card on the holding screen: shows whether this build reaches the api (on a
// phone the usual failure is a wrong LAN IP in EXPO_PUBLIC_API_URL). The screen renders it only
// when __DEV__, so store builds never ship it — which is why its English text has no catalog entry.

export type ApiStatus =
  | { state: "ready" | "degraded"; dependencies: Schemas["DependencyCheck"][] }
  | { state: "unreachable" };

type Options = { fetch?: (input: Request) => Promise<Response>; timeoutMs?: number };

/** Calls /readyz; never throws. A 503 still names the failing dependencies. */
export async function checkApi(options: Options = {}): Promise<ApiStatus> {
  const api = createApiClient({ locale: "en", ...(options.fetch ? { fetch: options.fetch } : {}) });
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, options.timeoutMs ?? 3000);
  try {
    const { data, error } = await api.GET("/readyz", { signal: controller.signal });
    if (data) return { state: "ready", dependencies: data.dependencies };
    return { state: "degraded", dependencies: error.dependencies ?? [] };
  } catch {
    return { state: "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

export function DevStatus(props: Options) {
  const [status, setStatus] = useState<ApiStatus | undefined>();
  useEffect(() => {
    let live = true;
    void checkApi(props).then((s) => {
      if (live) setStatus(s);
    });
    return () => {
      live = false;
    };
    // Checked once per mount; Metro's reload (r) checks again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = status?.state ?? "checking";
  return (
    <View style={styles.card} accessibilityLanguage="en">
      <Text style={styles.title} accessibilityRole="header">
        LOCAL DEVELOPMENT
      </Text>
      <View style={styles.row}>
        <Text style={styles.label}>API</Text>
        <Text style={styles.value}>{env.EXPO_PUBLIC_API_URL}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Status</Text>
        <Text style={[styles.badge, badge[state]]}>{state}</Text>
      </View>
      {status && status.state !== "unreachable" && (
        <View style={styles.row}>
          <Text style={styles.label}>Dependencies</Text>
          <Text style={styles.value}>
            {status.dependencies.map((d) => `${d.name} ${d.ok ? "ok" : "down"}`).join(" · ") ||
              "none reported"}
          </Text>
        </View>
      )}
      {state === "unreachable" && (
        <Text style={styles.hint}>
          Start the stack with ./dev-start.sh. On a phone, EXPO_PUBLIC_API_URL must use this
          Mac&apos;s LAN IP.
        </Text>
      )}
    </View>
  );
}

const badge = StyleSheet.create({
  checking: { backgroundColor: "#f1f5f9", color: "#334155" },
  ready: { backgroundColor: "#ecfdf5", color: "#065f46" },
  degraded: { backgroundColor: "#fffbeb", color: "#92400e" },
  unreachable: { backgroundColor: "#fef2f2", color: "#991b1b" },
});

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 360,
    gap: 12,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  title: { fontSize: 12, fontWeight: "600", letterSpacing: 1, color: "#64748b" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  label: { width: 104, fontSize: 14, color: "#64748b" },
  value: { flex: 1, fontSize: 14, color: "#0f172a" },
  badge: {
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "500",
  },
  hint: { fontSize: 13, lineHeight: 18, color: "#475569" },
});
