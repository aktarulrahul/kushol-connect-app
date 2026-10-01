import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { View } from "react-native";

import { createApiClient, type Schemas } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
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
  // TanStack Query owns the request: cached per mount, refetched on pull/reload.
  const {
    data: status,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["dev", "readyz"],
    queryFn: () => checkApi(props),
    staleTime: 0,
  });
  const router = useRouter();
  const state = status?.state ?? "checking";

  return (
    <Card className="w-full gap-4 py-5">
      <CardHeader>
        <Text variant="caption" className="font-semibold uppercase tracking-wider">
          Local development
        </Text>
      </CardHeader>
      <CardContent className="gap-3">
        <Row label="API">
          <Text className="flex-1 text-sm">{env.EXPO_PUBLIC_API_URL}</Text>
        </Row>
        <Row label="Status">
          <Badge variant={badge[state]}>
            <Text>{state}</Text>
          </Badge>
        </Row>
        {status && status.state !== "unreachable" ? (
          <Row label="Dependencies">
            <Text className="flex-1 text-sm">
              {status.dependencies.map((d) => `${d.name} ${d.ok ? "ok" : "down"}`).join(" · ") ||
                "none reported"}
            </Text>
          </Row>
        ) : null}
        {state === "unreachable" ? (
          <Text variant="muted">
            Start the stack with ./dev-start.sh. On a phone, EXPO_PUBLIC_API_URL must use this
            Mac&apos;s LAN IP.
          </Text>
        ) : null}
        <View className="flex-row flex-wrap gap-2 pt-1">
          <Button variant="outline" size="sm" loading={isFetching} onPress={() => void refetch()}>
            <Text>Check again</Text>
          </Button>
          <Button
            size="sm"
            onPress={() => {
              router.push("/dev/ui");
            }}
          >
            <Text>Open UI kit</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-3">
      <Text variant="muted" className="w-28">
        {label}
      </Text>
      {children}
    </View>
  );
}

const badge = {
  checking: "secondary",
  ready: "success",
  degraded: "warning",
  unreachable: "destructive",
} as const;
