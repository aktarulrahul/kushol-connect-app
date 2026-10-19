// Poll composer (05 · owner 2026-10-18): a question, 2–6 options and "allow multiple answers";
// the api's rules are checked here first so a bad poll never leaves the device.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Plus, X } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import {
  POLL_MAX_OPTIONS,
  POLL_OPTION_MAX,
  POLL_QUESTION_MAX,
  readPollDraft,
  type PollDraftError,
} from "@/lib/chat/poll";
import { color } from "@/theme/tokens";

export type PollInput = { question: string; options: string[]; allowMultiple: boolean };

export function PollSheet({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (poll: PollInput) => void;
}) {
  const t = useT();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("chat.poll.title")}>
      {open ? (
        <PollForm
          onCreate={(poll) => {
            onOpenChange(false);
            onCreate(poll);
          }}
        />
      ) : null}
    </Sheet>
  );
}

function PollForm({ onCreate }: { onCreate: (poll: PollInput) => void }) {
  const t = useT();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [error, setError] = useState<PollDraftError | null>(null);

  return (
    <View className="gap-3">
      <View className="gap-1">
        <Text className="text-sm font-medium text-foreground">{t("chat.poll.question")}</Text>
        <Input
          value={question}
          onChangeText={setQuestion}
          placeholder={t("chat.poll.question_placeholder")}
          accessibilityLabel={t("chat.poll.question")}
          maxLength={POLL_QUESTION_MAX}
        />
      </View>
      {options.map((option, index) => {
        const n = String(index + 1);
        return (
          <View key={index} className="flex-row items-center gap-2">
            <Input
              value={option}
              onChangeText={(text) => {
                setOptions(options.map((o, i) => (i === index ? text : o)));
              }}
              placeholder={t("chat.poll.option", { n })}
              accessibilityLabel={t("chat.poll.option", { n })}
              maxLength={POLL_OPTION_MAX}
              className="flex-1"
            />
            {options.length > 2 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("chat.poll.remove_option", { n })}
                hitSlop={8}
                onPress={() => {
                  setOptions(options.filter((_, i) => i !== index));
                }}
              >
                <X size={18} color={color["muted-foreground"]} />
              </Pressable>
            ) : null}
          </View>
        );
      })}
      {options.length < POLL_MAX_OPTIONS ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setOptions([...options, ""]);
          }}
          className="flex-row items-center gap-1.5 self-start rounded-full px-2 py-1 active:bg-muted"
        >
          <Plus size={16} color={color.primary} />
          <Text className="text-sm font-semibold text-primary">{t("chat.poll.add_option")}</Text>
        </Pressable>
      ) : null}
      <View className="flex-row items-center justify-between gap-3 rounded-xl bg-muted px-3 py-2.5">
        <Text className="flex-1 text-sm text-foreground">{t("chat.poll.allow_multiple")}</Text>
        <Switch
          checked={allowMultiple}
          onCheckedChange={setAllowMultiple}
          accessibilityLabel={t("chat.poll.allow_multiple")}
        />
      </View>
      {error ? (
        <Text accessibilityRole="alert" className="text-sm text-destructive">
          {t(error)}
        </Text>
      ) : null}
      <Button
        onPress={() => {
          const read = readPollDraft({ question, options, allowMultiple });
          if (!read.ok) {
            setError(read.error);
            return;
          }
          setError(null);
          onCreate({ question: read.question, options: read.options, allowMultiple });
        }}
      >
        <Text>{t("chat.poll.create")}</Text>
      </Button>
    </View>
  );
}
