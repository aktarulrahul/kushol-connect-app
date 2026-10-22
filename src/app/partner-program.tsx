import { useState } from "react";
import { Pressable, ScrollView, Switch, View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ClipboardList,
  QrCode,
  RefreshCw,
  ShoppingBag,
  Users,
} from "lucide-react-native";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SegmentedPill } from "@/components/ui/segmented-pill";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/i18n/locale-provider";
import { spacingUnit } from "@/theme/tokens";
import {
  useCreatePartnerTask,
  useMarkPartnerOrdersSeen,
  usePartnerOrders,
  usePartnerPrograms,
  usePartnerTasks,
  usePartnerVolunteers,
  useReviewPartnerTask,
  useSetStoreEnabled,
  useStoreEnabled,
  volunteeringKeys,
} from "@/lib/volunteering/use-volunteering";

// Partner program console (2026-10-21): pick a program, assign volunteer tasks (or drop them in
// the open pool), review submitted proofs, toggle the campus store and watch the order feed.
// Fixture seam: src/fixtures/volunteering.ts (one-file live swap).
type Segment = "tasks" | "volunteers";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function statusTone(status: string): string {
  if (status === "APPROVED" || status === "COMPLETED" || status === "CHECKED_IN") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "SUBMITTED_FOR_REVIEW") return "bg-amber-100 text-amber-800";
  if (status === "REVISION_REQUESTED" || status === "REVOKED") return "bg-red-100 text-red-700";
  return "bg-muted text-muted-foreground";
}

export default function PartnerProgramScreen() {
  const t = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const programs = usePartnerPrograms();
  const [programId, setProgramId] = useState("cmp_demo_1");
  const [segment, setSegment] = useState<Segment>("tasks");

  const tasks = usePartnerTasks(programId);
  const volunteers = usePartnerVolunteers(programId);
  const review = useReviewPartnerTask(programId);
  const create = useCreatePartnerTask(programId);

  const store = useStoreEnabled();
  const setStore = useSetStoreEnabled();
  const orders = usePartnerOrders();
  const markSeen = useMarkPartnerOrdersSeen();
  const unseen = (orders.data ?? []).filter((o) => !o.seen).length;

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [xp, setXp] = useState("50");
  const [assignee, setAssignee] = useState<string>("pool");
  const [requiresProof, setRequiresProof] = useState(true);

  const volunteerNames = (volunteers.data ?? [])
    .filter((v) => v.status === "APPROVED" || v.status === "CHECKED_IN")
    .map((v) => v.name);

  const reviewTask = (taskId: string, approve: boolean) => {
    review.mutate(
      { taskId, approve },
      {
        onSuccess: (task) => {
          toast({
            title: t(
              approve ? "events.app.review_approved_toast" : "events.app.review_revision_toast",
              { title: task.titleBn },
            ),
            variant: "success",
          });
        },
        onError: () => {
          toast({ title: t("errors.network"), variant: "error" });
        },
      },
    );
  };

  const submitTask = () => {
    if (title.trim().length < 3) {
      toast({ title: t("events.app.task_title_required"), variant: "warning" });
      return;
    }
    create.mutate(
      {
        titleBn: title.trim(),
        priority,
        xpReward: Number(xp) || 0,
        requiresProof,
        ...(assignee === "pool" ? {} : { assigneeName: assignee }),
      },
      {
        onSuccess: (task) => {
          setTitle("");
          setFormOpen(false);
          void qc.invalidateQueries({ queryKey: volunteeringKeys.partnerTasks(programId) });
          toast({
            title: t("events.app.task_created_toast", { title: task.titleBn }),
            variant: "success",
          });
        },
        onError: () => {
          toast({ title: t("errors.network"), variant: "error" });
        },
      },
    );
  };

  return (
    <Screen
      className="gap-4 px-4 py-2"
      header={<ScreenHeader title={t("events.app.program_title")} />}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacingUnit * 10 }}
        className="gap-4"
      >
        {/* Program picker */}
        <View className="gap-2">
          <Text variant="muted" className="text-xs font-semibold uppercase">
            {t("events.app.programs_label")}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {(programs.data ?? []).map((program) => (
              <Pressable
                key={program.id}
                accessibilityRole="button"
                accessibilityState={{ selected: programId === program.id }}
                onPress={() => {
                  setProgramId(program.id);
                }}
                className={`rounded-2xl border px-4 py-2 ${
                  programId === program.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    programId === program.id ? "text-primary" : "text-foreground"
                  }`}
                  numberOfLines={1}
                >
                  {program.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Campus store + order feed */}
        <Card className="rounded-3xl gap-3 p-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <ShoppingBag size={18} className="text-primary" />
              <Text className="font-bold text-foreground">{t("events.app.store_toggle")}</Text>
            </View>
            <Switch
              value={store.data ?? false}
              onValueChange={(value) => {
                setStore.mutate(value);
              }}
              accessibilityLabel={t("events.app.store_toggle")}
            />
          </View>
          <Text variant="muted" className="text-xs">
            {t("events.app.store_on_hint")}
          </Text>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-bold text-foreground">
                {t("events.app.orders_title")}
              </Text>
              {unseen > 0 ? (
                <Badge className="bg-primary text-white">{String(unseen)}</Badge>
              ) : null}
            </View>
            {unseen > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onPress={() => {
                  markSeen.mutate();
                }}
              >
                <Text className="text-xs">{t("events.app.mark_seen")}</Text>
              </Button>
            ) : null}
          </View>
          {(orders.data ?? []).slice(0, 5).map((order) => (
            <View
              key={order.orderId}
              className="flex-row items-center justify-between rounded-xl border border-border px-3 py-2"
            >
              <View className="min-w-0 flex-1 gap-0.5">
                <Text className="text-xs font-bold text-foreground" numberOfLines={1}>
                  {order.orderCode} · {order.buyer}
                </Text>
                <Text variant="muted" className="text-xs">
                  {new Date(order.placedAt).toLocaleString()}
                </Text>
              </View>
              <Text className="text-sm font-bold tabular-nums text-foreground">
                ৳{String(order.totalBdt)}
              </Text>
              {!order.seen ? <View className="ml-2 size-2 rounded-full bg-primary" /> : null}
            </View>
          ))}
          {(orders.data ?? []).length === 0 ? (
            <Text variant="muted" className="text-xs">
              {t("events.app.orders_empty")}
            </Text>
          ) : null}
        </Card>

        {/* Express check-in quick action */}
        <Button
          variant="outline"
          className="self-stretch"
          onPress={() => {
            router.push("/checkin-scan");
          }}
        >
          <QrCode size={18} />
          <Text>{t("events.app.scan_btn")}</Text>
        </Button>

        {/* Tasks | Volunteers */}
        <SegmentedPill
          accessibilityLabel={t("events.app.program_title")}
          value={segment}
          onChange={(next) => {
            setSegment(next);
          }}
          segments={[
            { value: "tasks", label: t("events.app.tasks_segment") },
            { value: "volunteers", label: t("events.app.volunteers_segment") },
          ]}
        />

        {segment === "tasks" ? (
          <View className="gap-3">
            <Button
              variant={formOpen ? "ghost" : "outline"}
              className="self-stretch"
              onPress={() => {
                setFormOpen(!formOpen);
              }}
            >
              <ClipboardList size={16} />
              <Text>{formOpen ? t("common.actions.cancel") : t("events.app.new_task_btn")}</Text>
            </Button>

            {formOpen ? (
              <Card className="rounded-3xl gap-3 p-5">
                <TextField
                  label={t("events.app.task_title_label")}
                  value={title}
                  onChangeText={setTitle}
                  required
                />
                <View className="gap-1.5">
                  <Text className="text-xs font-semibold text-muted-foreground">
                    {t("events.app.priority_label")}
                  </Text>
                  <SegmentedPill
                    accessibilityLabel={t("events.app.priority_label")}
                    value={priority}
                    onChange={(next) => {
                      setPriority(next);
                    }}
                    segments={PRIORITIES.map((p) => ({ value: p, label: p }))}
                  />
                </View>
                <TextField
                  label={t("events.app.xp_label")}
                  value={xp}
                  onChangeText={setXp}
                  keyboardType="number-pad"
                />
                <View className="gap-1.5">
                  <Text className="text-xs font-semibold text-muted-foreground">
                    {t("events.app.assignee_label")}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: assignee === "pool" }}
                      onPress={() => {
                        setAssignee("pool");
                      }}
                      className={`rounded-full border px-3 py-1.5 ${
                        assignee === "pool" ? "border-primary bg-primary/10" : "border-border"
                      }`}
                    >
                      <Text className="text-xs font-semibold text-foreground">
                        {t("events.app.assign_pool")}
                      </Text>
                    </Pressable>
                    {volunteerNames.map((name) => (
                      <Pressable
                        key={name}
                        accessibilityRole="button"
                        accessibilityState={{ selected: assignee === name }}
                        onPress={() => {
                          setAssignee(name);
                        }}
                        className={`rounded-full border px-3 py-1.5 ${
                          assignee === name ? "border-primary bg-primary/10" : "border-border"
                        }`}
                      >
                        <Text className="text-xs font-semibold text-foreground" numberOfLines={1}>
                          {name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-foreground">{t("events.app.requires_proof")}</Text>
                  <Switch
                    value={requiresProof}
                    onValueChange={setRequiresProof}
                    accessibilityLabel={t("events.app.requires_proof")}
                  />
                </View>
                <Button
                  className="self-stretch"
                  loading={create.isPending}
                  onPress={() => {
                    submitTask();
                  }}
                >
                  <Text>{t("events.app.create_btn")}</Text>
                </Button>
              </Card>
            ) : null}

            {(tasks.data ?? []).map((task) => (
              <Card key={task.id} className="rounded-2xl gap-2 p-4">
                <View className="flex-row items-start justify-between gap-2">
                  <Text className="flex-1 text-sm font-bold text-foreground">{task.titleBn}</Text>
                  <Badge className={statusTone(task.status)}>
                    <Text className="text-xs font-bold">{task.status.replaceAll("_", " ")}</Text>
                  </Badge>
                </View>
                <View className="flex-row flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <Text className="text-xs">{task.priority}</Text>
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Text className="text-xs">
                      {t("events.partner.xp_reward_badge", { xp: task.xpReward })}
                    </Text>
                  </Badge>
                  <View className="flex-row items-center gap-1">
                    <Users size={12} className="text-muted-foreground" />
                    <Text variant="muted" className="text-xs">
                      {task.assigneeName ?? t("events.app.assign_pool")}
                    </Text>
                  </View>
                </View>
                {task.status === "SUBMITTED_FOR_REVIEW" ? (
                  <View className="flex-row gap-2 pt-1">
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600"
                      disabled={review.isPending}
                      onPress={() => {
                        reviewTask(task.id, true);
                      }}
                    >
                      <CheckCircle2 size={14} color="white" />
                      <Text className="text-white">{t("events.app.approve_btn")}</Text>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={review.isPending}
                      onPress={() => {
                        reviewTask(task.id, false);
                      }}
                    >
                      <RefreshCw size={14} />
                      <Text>{t("events.app.revision_btn")}</Text>
                    </Button>
                  </View>
                ) : null}
              </Card>
            ))}
            {(tasks.data ?? []).length === 0 ? (
              <Text variant="muted" className="text-center text-xs">
                {t("events.app.tasks_empty")}
              </Text>
            ) : null}
          </View>
        ) : (
          <View className="gap-2">
            {(volunteers.data ?? []).map((volunteer) => (
              <View
                key={volunteer.userId}
                className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
              >
                <View className="min-w-0 flex-1 gap-0.5">
                  <Text className="text-sm font-bold text-foreground">{volunteer.name}</Text>
                  <Text variant="muted" className="text-xs">
                    {volunteer.roleTitle} ·{" "}
                    <Text className="font-mono font-bold text-primary">
                      {volunteer.checkInCode}
                    </Text>
                  </Text>
                </View>
                <Badge className={statusTone(volunteer.status)}>
                  <Text className="text-xs font-bold">{volunteer.status.replaceAll("_", " ")}</Text>
                </Badge>
              </View>
            ))}
            {(volunteers.data ?? []).length === 0 ? (
              <Text variant="muted" className="text-center text-xs">
                {t("events.app.volunteers_empty")}
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
