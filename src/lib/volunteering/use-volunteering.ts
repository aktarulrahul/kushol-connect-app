// Volunteering hooks (2026-10-21): partner program console (assign/review tasks, store toggle,
// order feed) and the volunteer task loop + gate express check-in. All reads/writes go through
// the fixture seam in src/fixtures/volunteering.ts (one-file live swap swaps it).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as seam from "@/fixtures/volunteering";

export const volunteeringKeys = {
  programs: ["volunteering", "programs"] as const,
  partnerTasks: (campaignId: string) => ["volunteering", "partner-tasks", campaignId] as const,
  volunteers: (campaignId: string) => ["volunteering", "volunteers", campaignId] as const,
  myTasks: ["volunteering", "my-tasks"] as const,
  orders: ["volunteering", "partner-orders"] as const,
  storeEnabled: ["volunteering", "store-enabled"] as const,
};

export function usePartnerPrograms() {
  return useQuery({ queryKey: volunteeringKeys.programs, queryFn: seam.listPartnerPrograms });
}

export function usePartnerTasks(campaignId: string) {
  return useQuery({
    queryKey: volunteeringKeys.partnerTasks(campaignId),
    queryFn: () => seam.listPartnerTasks(campaignId),
    enabled: campaignId.length > 0,
  });
}

export function usePartnerVolunteers(campaignId: string) {
  return useQuery({
    queryKey: volunteeringKeys.volunteers(campaignId),
    queryFn: () => seam.listCampaignVolunteers(campaignId),
    enabled: campaignId.length > 0,
  });
}

export function useCreatePartnerTask(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: seam.CreateTaskInput) => seam.createPartnerTask(campaignId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: volunteeringKeys.partnerTasks(campaignId) });
      void qc.invalidateQueries({ queryKey: volunteeringKeys.myTasks });
    },
  });
}

export function useReviewPartnerTask(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, approve }: { taskId: string; approve: boolean }) =>
      seam.reviewPartnerTask(taskId, approve),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: volunteeringKeys.partnerTasks(campaignId) });
      void qc.invalidateQueries({ queryKey: volunteeringKeys.myTasks });
    },
  });
}

export function useMyVolunteering() {
  return useQuery({ queryKey: volunteeringKeys.myTasks, queryFn: seam.listMyTasks });
}

export function useStartMyTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => seam.startMyTask(taskId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: volunteeringKeys.myTasks });
    },
  });
}

export function useClaimPoolTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => seam.claimPoolTask(taskId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: volunteeringKeys.myTasks });
      void qc.invalidateQueries({ queryKey: volunteeringKeys.partnerTasks("cmp_demo_1") });
      void qc.invalidateQueries({ queryKey: volunteeringKeys.partnerTasks("cmp_demo_2") });
    },
  });
}

export function useSubmitMyTaskProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => seam.submitMyTaskProof(taskId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: volunteeringKeys.myTasks });
      void qc.invalidateQueries({ queryKey: volunteeringKeys.partnerTasks("cmp_demo_1") });
      void qc.invalidateQueries({ queryKey: volunteeringKeys.partnerTasks("cmp_demo_2") });
    },
  });
}

export function useExpressCheckIn() {
  return useMutation({ mutationFn: (code: string) => seam.expressCheckIn(code) });
}

export function useRecentCheckIns(enabled: boolean) {
  return useQuery({
    queryKey: ["volunteering", "recent-checkins"] as const,
    queryFn: seam.listRecentCheckIns,
    enabled,
  });
}

export function usePartnerOrders() {
  return useQuery({ queryKey: volunteeringKeys.orders, queryFn: seam.listPartnerOrders });
}

export function useMarkPartnerOrdersSeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => seam.markPartnerOrdersSeen(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: volunteeringKeys.orders });
    },
  });
}

export function useStoreEnabled() {
  return useQuery({ queryKey: volunteeringKeys.storeEnabled, queryFn: seam.getStoreEnabled });
}

export function useSetStoreEnabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => seam.setStoreEnabled(enabled),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: volunteeringKeys.storeEnabled });
    },
  });
}
