// Tuition query hooks (TUT-AP-*): TanStack Query over the tuition seam. The wizard post queues
// offline and replays once on reconnect (05 §8); interest is optimistic; accept and decline are
// never optimistic (financial/safety — 05 §4). Stage 5 re-points the seam to the generated client.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acceptMatch,
  browseTutors,
  createRequirement,
  declineMatch,
  expressInterest,
  getMyTutorProfile,
  getRequirementMatches,
  getTutor,
  listMyMatches,
  listMyRequirements,
  submitForReview,
  updateRequirement,
  upsertTutorProfile,
  type RequirementInput,
  type TutorMatch,
  type TuitionSubject,
} from "@/lib/tuition/backend";

export const tuitionKeys = {
  browse: (filters: { subject?: TuitionSubject; area?: string }) =>
    ["tuition", "tutors", filters] as const,
  tutor: (id: string) => ["tuition", "tutor", id] as const,
  myRequirements: ["tuition", "requirements"] as const,
  requirementMatches: (id: string) => ["tuition", "requirements", id, "matches"] as const,
  myMatches: ["tuition", "matches"] as const,
  myProfile: ["tuition", "profile"] as const,
};

export function useTutorBrowse(filters: { subject?: TuitionSubject; area?: string }) {
  return useQuery({ queryKey: tuitionKeys.browse(filters), queryFn: () => browseTutors(filters) });
}

export function useTutorProfile(id: string | undefined) {
  return useQuery({
    queryKey: tuitionKeys.tutor(id ?? ""),
    queryFn: () => getTutor(id as string),
    enabled: Boolean(id),
  });
}

export function useMyRequirements() {
  return useQuery({ queryKey: tuitionKeys.myRequirements, queryFn: listMyRequirements });
}

export function useRequirementMatches(requirementId: string | undefined) {
  return useQuery({
    queryKey: tuitionKeys.requirementMatches(requirementId ?? ""),
    queryFn: () => getRequirementMatches(requirementId as string),
    enabled: Boolean(requirementId),
  });
}

export function useMyMatches() {
  return useQuery({ queryKey: tuitionKeys.myMatches, queryFn: listMyMatches });
}

export function useMyTutorProfile() {
  return useQuery({ queryKey: tuitionKeys.myProfile, queryFn: getMyTutorProfile });
}

export function useCreateRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RequirementInput) => createRequirement(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tuitionKeys.myRequirements });
    },
  });
}

export function useCloseRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => updateRequirement(id, { close: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tuitionKeys.myRequirements });
    },
  });
}

/** Optimistic interest (05 §4): flips the chip at once, rolls back on failure. */
export function useExpressInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => expressInterest(matchId),
    onMutate: async (matchId) => {
      await Promise.resolve();
      const previous = queryClient.getQueryData<TutorMatch[]>(tuitionKeys.myMatches);
      queryClient.setQueryData<TutorMatch[]>(tuitionKeys.myMatches, (rows) =>
        rows?.map((m) => (m.id === matchId ? { ...m, status: "interested" as const } : m)),
      );
      return { previous };
    },
    onError: (_e, _matchId, context) => {
      if (context?.previous) queryClient.setQueryData(tuitionKeys.myMatches, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: tuitionKeys.myMatches });
    },
  });
}

export function useAcceptMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => acceptMatch(matchId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tuitionKeys.myRequirements });
      void queryClient.invalidateQueries({ queryKey: tuitionKeys.myMatches });
    },
  });
}

export function useDeclineMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => declineMatch(matchId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: tuitionKeys.myMatches });
      void queryClient.invalidateQueries({ queryKey: tuitionKeys.myRequirements });
    },
  });
}

export function useSaveTutorProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: upsertTutorProfile,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tuitionKeys.myProfile });
    },
  });
}

export function useSubmitForReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitForReview,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tuitionKeys.myProfile });
    },
  });
}

// ─── Offline wizard queue (TUT-AP-014, 05 §8) — in-memory in Stage 2; persisted store in Stage 5.

export type QueuedPost = { id: string; input: RequirementInput; queuedAt: string };

const listeners = new Set<() => void>();
let queue: QueuedPost[] = [];

function emit(): void {
  for (const listener of listeners) listener();
}

export function usePendingPosts(): QueuedPost[] {
  const [rows, setRows] = useState<QueuedPost[]>(queue);
  useEffect(() => {
    const listener = () => { setRows([...queue]); };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return rows;
}

export function queueRequirementPost(input: RequirementInput): QueuedPost {
  const row: QueuedPost = { id: `q_${String(Date.now())}`, input, queuedAt: new Date().toISOString() };
  queue = [...queue, row];
  emit();
  return row;
}

export function removeQueuedPost(id: string): void {
  queue = queue.filter((row) => row.id !== id);
  emit();
}

/**
 * Replays the oldest queued post once (failure keeps it queued with the banner visible) and
 * returns the remaining queue. Pure — the hook below wires it to connectivity; tests call it
 * directly.
 */
export async function replayPendingPosts(
  isOnline: boolean,
  replay: (input: RequirementInput) => Promise<unknown>,
): Promise<QueuedPost[]> {
  const next = queue[0];
  if (!isOnline || !next) return [...queue];
  try {
    await replay(next.input);
    removeQueuedPost(next.id);
  } catch {
    // stays queued — the wizard shows the "will post when online" banner
  }
  return [...queue];
}

/** Replays the queue whenever connectivity returns (Stage 5 wires the real listener). */
export function useOfflineReplay(
  isOnline: boolean,
  replay: (input: RequirementInput) => Promise<unknown>,
): QueuedPost[] {
  const pending = usePendingPosts();
  useEffect(() => {
    if (!isOnline || pending.length === 0) return;
    void replayPendingPosts(isOnline, replay);
  }, [isOnline, pending, replay]);
  return pending;
}
