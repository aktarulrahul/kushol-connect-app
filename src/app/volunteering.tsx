import { Alert, ScrollView, View } from "react-native";
import { Award, Copy, Flame, QrCode, ShieldCheck, Upload } from "lucide-react-native";
import { router } from "expo-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import { spacingUnit } from "@/theme/tokens";
import {
  useClaimPoolTask,
  useMyVolunteering,
  useStartMyTask,
  useSubmitMyTaskProof,
} from "@/lib/volunteering/use-volunteering";

// Volunteer board (2026-10-21) — backed by src/fixtures/volunteering.ts: assigned/pool tasks,
// claim → start → submit proof, XP balance (credited on partner approval), the volunteer's own
// QR pass code for gate express check-in, and the e-certificate preview.
export default function VolunteeringScreen() {
  const t = useT();
  const board = useMyVolunteering();
  const start = useStartMyTask();
  const claim = useClaimPoolTask();
  const submit = useSubmitMyTaskProof();

  if (board.isLoading || !board.data) {
    return (
      <Screen
        className="gap-4 px-4 py-2"
        header={<ScreenHeader title={t("events.partner.my_tasks_title")} />}
      >
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </Screen>
    );
  }

  const { assigned, pool, xpBalance, checkInCode, certificateSerial } = board.data;

  const handleSubmitProof = (taskId: string) => {
    submit.mutate(taskId, {
      onSuccess: () => {
        Alert.alert(t("events.partner.proof_alert_title"), t("events.partner.proof_alert_body"));
      },
    });
  };

  const handleClaimPoolTask = (taskId: string) => {
    claim.mutate(taskId, {
      onSuccess: () => {
        Alert.alert(t("events.partner.claim_alert_title"), t("events.partner.claim_alert_body"));
      },
    });
  };

  return (
    <Screen
      className="gap-4 px-4 py-2"
      header={<ScreenHeader title={t("events.partner.my_tasks_title")} />}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacingUnit * 10 }}
      >
        {/* Volunteer ID card with check-in code + XP */}
        <Card className="rounded-3xl border border-primary/20 bg-primary/5 p-5 gap-3">
          <View className="flex-row items-center justify-between">
            <Badge className="bg-primary text-white">
              {t("events.partner.volunteer_id_badge")}
            </Badge>
            <View className="flex-row items-center gap-1">
              <Flame size={18} className="text-amber-500 fill-amber-500" />
              <Text className="font-bold text-primary">
                {t("settings.volunteer_xp_badge", { xp: xpBalance })}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between rounded-2xl border border-border bg-background p-3">
            <View>
              <Text className="text-xs uppercase font-bold text-muted-foreground">
                {t("events.partner.checkin_code_hint")}
              </Text>
              <Text className="font-mono text-xl font-black text-primary">{checkInCode}</Text>
            </View>
            <Button
              size="sm"
              variant="outline"
              onPress={() => {
                Alert.alert(
                  t("events.partner.copied_alert_title"),
                  t("events.partner.checkin_copied_body", { code: checkInCode }),
                );
              }}
            >
              <Copy size={14} className="text-foreground" />
            </Button>
          </View>

          {/* Express check-in: scan an attendee's pass (or show my own code above) */}
          <Button
            variant="outline"
            className="self-stretch"
            onPress={() => {
              router.push("/checkin-scan");
            }}
          >
            <QrCode size={16} />
            <Text>{t("events.app.scan_btn")}</Text>
          </Button>
        </Card>

        {/* Assigned Tasks Section */}
        <View className="gap-3 pt-4">
          <Text className="text-sm font-bold uppercase tracking-wide text-foreground">
            {t("events.partner.assigned_heading", { count: assigned.length })}
          </Text>

          {assigned.map((task) => (
            <Card key={task.id} className="rounded-2xl border border-border p-4 gap-2 bg-card">
              <View className="flex-row items-center justify-between">
                <Badge variant="outline">{task.priority}</Badge>
                <Badge
                  className={
                    task.status === "SUBMITTED_FOR_REVIEW"
                      ? "bg-amber-600 text-white"
                      : "bg-blue-600 text-white"
                  }
                >
                  {task.status}
                </Badge>
              </View>

              <Text className="text-sm font-semibold text-foreground">{task.titleBn}</Text>

              <View className="flex-row items-center justify-between pt-1">
                <Text className="text-xs font-bold text-primary">
                  {t("events.partner.xp_reward_badge", { xp: task.xpReward })}
                </Text>

                {task.status === "IN_PROGRESS" && task.requiresProof ? (
                  <Button
                    size="sm"
                    loading={submit.isPending}
                    onPress={() => {
                      handleSubmitProof(task.id);
                    }}
                  >
                    <Upload size={14} className="mr-1 text-white" />
                    <Text className="text-xs font-bold text-white">
                      {t("events.partner.submit_proof_btn")}
                    </Text>
                  </Button>
                ) : null}

                {task.status === "ASSIGNED" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    loading={start.isPending}
                    onPress={() => {
                      start.mutate(task.id);
                    }}
                  >
                    <Text className="text-xs">{t("events.partner.start_task_btn")}</Text>
                  </Button>
                ) : null}

                {task.status === "SUBMITTED_FOR_REVIEW" ? (
                  <Text className="text-xs text-amber-600 font-medium">
                    {t("events.partner.under_review_status")}
                  </Text>
                ) : null}
              </View>
            </Card>
          ))}
          {assigned.length === 0 ? (
            <Text variant="muted" className="text-center text-xs">
              {t("events.app.tasks_empty")}
            </Text>
          ) : null}
        </View>

        {/* Pool Tasks Section */}
        {pool.length > 0 ? (
          <View className="gap-3 pt-6">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold uppercase tracking-wide text-foreground">
                {t("events.partner.pool_heading", { count: pool.length })}
              </Text>
              <Badge variant="secondary">{t("events.partner.pool_hint_badge")}</Badge>
            </View>

            {pool.map((task) => (
              <Card
                key={task.id}
                className="rounded-2xl border border-dashed border-border p-4 gap-2 bg-muted/20"
              >
                <View className="flex-row items-center justify-between">
                  <Badge variant="outline">{task.priority}</Badge>
                  <Text className="text-xs font-bold text-primary">
                    {t("events.partner.xp_reward_badge", { xp: task.xpReward })}
                  </Text>
                </View>

                <Text className="text-sm font-semibold text-foreground">{task.titleBn}</Text>

                <Button
                  size="sm"
                  className="mt-1"
                  loading={claim.isPending}
                  onPress={() => {
                    handleClaimPoolTask(task.id);
                  }}
                >
                  <Text className="text-xs font-bold text-white">
                    {t("events.partner.claim_task_btn")}
                  </Text>
                </Button>
              </Card>
            ))}
          </View>
        ) : null}

        {/* Verified E-Certificate Preview */}
        <View className="gap-3 pt-6">
          <Text className="text-sm font-bold uppercase tracking-wide text-foreground">
            {t("events.partner.ecertificate_heading")}
          </Text>

          <Card className="rounded-2xl border border-border p-4 gap-3 bg-card">
            <View className="flex-row items-center gap-3">
              <View className="size-10 rounded-xl bg-purple-100 items-center justify-center">
                <Award size={20} className="text-purple-700" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-foreground">
                  {t("events.partner.certificate_name")}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {t("events.partner.certificate_serial", { serial: certificateSerial })}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between border-t border-border pt-3">
              <View className="flex-row items-center gap-1.5">
                <ShieldCheck size={16} className="text-emerald-600" />
                <Text className="text-xs font-medium text-emerald-600">
                  {t("events.partner.certificate_verify")}
                </Text>
              </View>

              <Button
                size="sm"
                variant="outline"
                onPress={() => {
                  Alert.alert(
                    t("events.partner.verify_alert_title"),
                    t("events.partner.verify_alert_body"),
                  );
                }}
              >
                <QrCode size={14} className="mr-1 text-foreground" />
                <Text className="text-xs">{t("events.partner.verify_btn")}</Text>
              </Button>
            </View>
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}
