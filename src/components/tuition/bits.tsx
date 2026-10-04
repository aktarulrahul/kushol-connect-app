// Shared tuition UI bits (TUT): subject/class chips, status chips, the verified badge (icon +
// text — trust is never colour-only, 02 §7) and bn-numeral budget text (05 §6).
import { Pressable, View } from "react-native";
import { BadgeCheck } from "lucide-react-native";

import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import type { MatchStatus, RequirementStatus, TuitionClassLevel, TuitionSubject } from "@/fixtures/tuition";

export function bnNumber(value: number): string {
  return new Intl.NumberFormat("bn-BD").format(value);
}

export function SubjectChips({
  selected,
  onToggle,
  disabled = false,
  errorKey,
}: {
  selected: TuitionSubject[];
  onToggle: (subject: TuitionSubject) => void;
  disabled?: boolean;
  errorKey?: string | null;
}) {
  const t = useT();
  const subjects: TuitionSubject[] = [
    "math",
    "physics",
    "chemistry",
    "biology",
    "english",
    "bangla",
    "higher_math",
    "ict",
  ];
  return (
    <View accessibilityLabel={t("tuition.wizard.subjects_q")}>
      <View className="flex-row flex-wrap gap-2">
        {subjects.map((subject) => {
          const active = selected.includes(subject);
          return (
            <Pressable
              key={subject}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active, disabled }}
              accessibilityLabel={t(`tuition.subject.${subject}` as Parameters<typeof t>[0])}
              disabled={disabled}
              onPress={() => { onToggle(subject); }}
              className={`rounded-full border px-4 py-2.5 ${
                active ? "border-primary bg-primary-soft" : "border-border bg-background"
              }`}
            >
              <Text className={`text-sm ${active ? "font-semibold text-primary" : "text-foreground"}`}>
                {active ? "✓ " : ""}
                {t(`tuition.subject.${subject}` as Parameters<typeof t>[0])}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {errorKey ? (
        <Text role="alert" className="text-xs text-destructive">
          {t(errorKey as Parameters<typeof t>[0])}
        </Text>
      ) : null}
    </View>
  );
}

export function ClassChips({
  selected,
  onToggle,
}: {
  selected: TuitionClassLevel[];
  onToggle: (level: TuitionClassLevel) => void;
}) {
  const t = useT();
  const levels: TuitionClassLevel[] = ["class_6", "class_7", "class_8", "class_9", "class_10", "ssc", "hsc"];
  return (
    <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
      {levels.map((level) => {
        const active = selected.includes(level);
        return (
          <Pressable
            key={level}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={t(`tuition.class.${level}` as Parameters<typeof t>[0])}
            onPress={() => { onToggle(level); }}
            className={`rounded-full border px-4 py-2.5 ${
              active ? "border-primary bg-primary" : "border-border bg-background"
            }`}
          >
            <Text className={`text-sm ${active ? "font-semibold text-primary-foreground" : "text-foreground"}`}>
              {t(`tuition.class.${level}` as Parameters<typeof t>[0])}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function RequirementStatusChip({ status }: { status: RequirementStatus }) {
  const t = useT();
  const variant = status === "open" ? "outline" : status === "matched" ? "default" : "destructive";
  return (
    <Badge variant={variant}>
      <Text className="text-xs">{t(`tuition.requirement_status.${status}` as Parameters<typeof t>[0])}</Text>
    </Badge>
  );
}

export function MatchStatusChip({ status }: { status: MatchStatus }) {
  const t = useT();
  const variant = status === "accepted" ? "default" : status === "declined" || status === "expired" ? "destructive" : "secondary";
  return (
    <Badge variant={variant}>
      <Text className="text-xs">{t(`tuition.match_status.${status}` as Parameters<typeof t>[0])}</Text>
    </Badge>
  );
}

export function VerifiedBadge() {
  const t = useT();
  return (
    <View className="flex-row items-center gap-1" accessibilityLabel={t("tuition.badge.verified")}>
      <BadgeCheck size={14} className="text-primary" />
      <Text className="text-xs font-semibold text-primary">{t("tuition.badge.verified")}</Text>
    </View>
  );
}

export function BudgetText({ min, max }: { min: number; max: number }) {
  return (
    <Text className="text-sm tabular-nums text-foreground">
      {bnNumber(min)}–{bnNumber(max)} ৳
    </Text>
  );
}
