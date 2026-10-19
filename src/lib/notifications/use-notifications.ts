// Query hooks over the notifications backend (NTF-AP-003/005/008). Live sessions hit the
// generated client; fixture sessions hit the seam â€” the selector decides (backend.ts).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteDevice,
  getPreferences,
  listDeliveries,
  listInbox,
  markInboxRead as markInboxReadBackend,
  markOpened,
  patchPreference,
  registerDevice,
  sendTestPush,
  type NotificationClass,
} from "@/lib/notifications/backend";
import { useAuthStore } from "@/lib/auth/auth-store";

type PreferenceRows = Awaited<ReturnType<typeof getPreferences>>;

export const ntfKeys = {
  prefs: ["notifications", "prefs"] as const,
  deliveries: (page: number) => ["notifications", "deliveries", page] as const,
  inbox: ["notifications", "inbox"] as const,
};

export function useNotificationPreferences() {
  return useQuery({ queryKey: ntfKeys.prefs, queryFn: getPreferences });
}

export function usePatchPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, muted }: { classId: NotificationClass; muted: boolean }) =>
      patchPreference(classId, muted),
    // Optimistic flip (US-006: the switch never waits on the network).
    onMutate: async ({ classId, muted }) => {
      await Promise.resolve();
      const previous = queryClient.getQueryData<PreferenceRows>(ntfKeys.prefs);
      queryClient.setQueryData<PreferenceRows>(ntfKeys.prefs, (rows) =>
        rows?.map((r) => (r.class === classId ? { ...r, muted } : r)),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(ntfKeys.prefs, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ntfKeys.prefs });
    },
  });
}

export function useNotificationDeliveries(page: number) {
  return useQuery({ queryKey: ntfKeys.deliveries(page), queryFn: () => listDeliveries(page) });
}

/** Fire-and-forget opened report (NTF-AP-008) â€” failures never surface. */
export function reportOpened(deliveryId: string): void {
  void markOpened(deliveryId).catch(() => undefined);
}

export function useRegisterDevice() {
  return useMutation({
    mutationFn: (input: { token: string; platform: "ios" | "android"; appVersion?: string }) => {
      const verified = useAuthStore.getState().me?.status === "VERIFIED";
      return registerDevice(input, verified);
    },
    retry: 2,
  });
}

export function useDeleteDevice() {
  return useMutation({
    mutationFn: (deviceId: string) => {
      return deleteDevice(deviceId);
    },
  });
}

export function useSendTestPush() {
  return useMutation({ mutationFn: sendTestPush });
}

/** The caller's in-app inbox (NTF-BE-006; owner 2026-10-19) â€” newest first. */
export function useInbox(limit = 20) {
  return useQuery({ queryKey: ntfKeys.inbox, queryFn: () => listInbox(limit) });
}

/** Marks one inbox row read (fire-and-forget); the list query refetches on next focus. */
export function markInboxReadNotification(notificationId: string): void {
  markInboxReadBackend(notificationId).catch(() => undefined);
}
