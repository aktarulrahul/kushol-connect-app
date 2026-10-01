import {
  Bell,
  CircleAlert,
  Ellipsis,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
} from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { View } from "react-native";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge, VerifiedBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { FloatingTabBar } from "@/components/ui/floating-tab-bar";
import { Icon } from "@/components/ui/icon";
import { AvatarStack, PresenceDot, UnreadBadge } from "@/components/ui/indicators";
import { ListRow } from "@/components/ui/list-row";
import { Logo } from "@/components/ui/logo";
import { OtpInput } from "@/components/ui/otp-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Screen, Spinner } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { LanguageToggle, SegmentedPill } from "@/components/ui/segmented-pill";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Text } from "@/components/ui/text";
import { TextareaField, TextField, ToggleField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/ui/user-avatar";
import { demoCopy, pick, specimen } from "@/fixtures/ui-kit";
import { formatNumber } from "@/i18n";
import { useLocale } from "@/i18n/locale-provider";
import { color, neutral, steps, teal } from "@/theme/tokens";

// Dev-only kit (English section titles are fine — this screen never ships).

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <Text variant="caption" className="font-semibold uppercase tracking-wider">
        {title}
      </Text>
      <Card className="gap-4 px-4 py-4">{children}</Card>
    </View>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <View className="flex-row flex-wrap items-center gap-3">{children}</View>;
}

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <View className="w-16 gap-1">
      <View className="h-10 rounded-md border border-border" style={{ backgroundColor: value }} />
      <Text variant="caption" tabular>
        {name}
      </Text>
    </View>
  );
}

export function UiKit() {
  const { locale, t } = useLocale();
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const [notify, setNotify] = useState(true);
  const [push, setPush] = useState(false);
  const [otp, setOtp] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("chat");
  const [section, setSection] = useState<{ value: string; label: string } | undefined>();

  return (
    <View className="flex-1 bg-background">
      <Screen
        header={
          <ScreenHeader
            title="UI kit"
            leading={<UserAvatar name="Demo Admin" size="md" />}
            action={{
              icon: Search,
              accessibilityLabel: t("common.actions.search"),
              onPress: () => undefined,
            }}
          >
            <LanguageToggle />
          </ScreenHeader>
        }
      >
        <Section title="Foundations">
          <Logo size="lg" />
          <Row>
            {steps.map((s) => (
              <Swatch key={s} name={`teal ${String(s)}`} value={teal[s]} />
            ))}
          </Row>
          <Row>
            {steps.map((s) => (
              <Swatch key={s} name={`ntrl ${String(s)}`} value={neutral[s]} />
            ))}
          </Row>
          <Row>
            {(["primary", "destructive", "success", "warning", "info", "tabbar"] as const).map(
              (k) => (
                <Swatch key={k} name={k} value={color[k]} />
              ),
            )}
          </Row>
          <Text variant="display">কুশল কানেক্ট</Text>
          <Text variant="h1">{pick(locale, demoCopy.sectionGroup)}</Text>
          <Text variant="h3">{pick(locale, demoCopy.noticeTitle)}</Text>
          <Text>{specimen.paragraph}</Text>
          <Text variant="muted">{specimen.mixed}</Text>
          {(["text-xs", "text-base", "text-2xl", "text-4xl"] as const).map((size) => (
            <Text key={size} className={size}>
              {specimen.conjuncts} {specimen.numerals}
            </Text>
          ))}
        </Section>

        <Section title="Buttons">
          <Row>
            <Button>
              <Text>{t("common.actions.save")}</Text>
            </Button>
            <Button variant="secondary">
              <Text>{t("common.actions.cancel")}</Text>
            </Button>
            <Button variant="outline">
              <Text>{t("common.actions.edit")}</Text>
            </Button>
            <Button variant="ghost">
              <Text>{t("common.actions.more")}</Text>
            </Button>
            <Button variant="destructive">
              <Icon as={Trash2} size={16} className="text-destructive-foreground" />
              <Text>{t("common.actions.delete")}</Text>
            </Button>
            <Button variant="link">
              <Text>{t("common.actions.back")}</Text>
            </Button>
          </Row>
          <Row>
            <Button size="sm">
              <Text>{t("common.actions.filter")}</Text>
            </Button>
            <Button size="lg">
              <Icon as={Send} size={18} className="text-primary-foreground" />
              <Text>{t("common.actions.submit")}</Text>
            </Button>
            <Button size="icon" variant="outline" accessibilityLabel={t("common.actions.edit")}>
              <Icon as={Pencil} size={18} className="text-foreground" />
            </Button>
            <Button disabled>
              <Text>{t("common.actions.save")}</Text>
            </Button>
            <Button
              loading={busy}
              onPress={() => {
                setBusy(true);
                setTimeout(() => {
                  setBusy(false);
                }, 1500);
              }}
            >
              <Text>{t("common.actions.save")}</Text>
            </Button>
          </Row>
          <Button className="w-56">
            <Icon as={Bell} size={16} className="text-primary-foreground" />
            <Text>{pick(locale, demoCopy.longAction)}</Text>
          </Button>
        </Section>

        <Section title="Forms">
          <TextField
            label={pick(locale, demoCopy.fieldName)}
            required
            value={name}
            onChangeText={setName}
            onBlur={() => {
              setTouched(true);
            }}
            {...(touched && !name ? { error: t("validation.required") } : {})}
          />
          <TextField
            label={pick(locale, demoCopy.fieldPhone)}
            description={pick(locale, demoCopy.fieldPhoneHelp)}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            placeholder="01XXXXXXXXX"
          />
          <View className="gap-1.5">
            <Text variant="label">{pick(locale, demoCopy.fieldSection)}</Text>
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger>
                <SelectValue placeholder={t("validation.choose_one")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="9a" label="Class 9 · A" />
                <SelectItem value="10s" label={pick(locale, demoCopy.sectionGroup)} />
              </SelectContent>
            </Select>
          </View>
          <TextareaField
            label={pick(locale, demoCopy.fieldMessage)}
            error={t("validation.too_long", { max: 500 })}
          />
          <ToggleField
            label={pick(locale, demoCopy.fieldNotify)}
            checked={notify}
            onCheckedChange={setNotify}
          />
          <ToggleField
            kind="switch"
            label={pick(locale, demoCopy.fieldNotify)}
            description={pick(locale, demoCopy.fieldPhoneHelp)}
            checked={push}
            onCheckedChange={setPush}
          />
          <Text variant="label">{pick(locale, demoCopy.otp)}</Text>
          <OtpInput value={otp} onChange={setOtp} accessibilityLabel={pick(locale, demoCopy.otp)} />
        </Section>

        <Section title="Badges, avatars & lists">
          <Row>
            <Badge>
              <Text>{pick(locale, demoCopy.noticeTitle)}</Text>
            </Badge>
            <Badge variant="secondary">
              <Text>Class 10</Text>
            </Badge>
            <Badge variant="warning">
              <Text>{pick(locale, demoCopy.pending)}</Text>
            </Badge>
            <Badge variant="destructive">
              <Text>{pick(locale, demoCopy.toastFailed)}</Text>
            </Badge>
            <VerifiedBadge />
          </Row>
          <Row>
            <UserAvatar name="নমুনা শিক্ষার্থী" size="lg" online />
            <UserAvatar name="Demo Teacher" size="lg" verified />
            <UserAvatar name="কুশল" size="lg" online={false} />
            <AvatarStack total={1240}>
              <UserAvatar name="Demo One" size="sm" />
              <UserAvatar name="নমুনা দুই" size="sm" />
              <UserAvatar name="Demo Three" size="sm" />
            </AvatarStack>
            <UnreadBadge count={7} />
            <UnreadBadge count={240} />
            <PresenceDot online />
          </Row>
          <SegmentedPill
            accessibilityLabel={t("common.actions.filter")}
            value={filter}
            onChange={setFilter}
            segments={[
              { value: "all", label: pick(locale, demoCopy.filterAll) },
              { value: "official", label: pick(locale, demoCopy.filterOfficial) },
              { value: "clubs", label: pick(locale, demoCopy.filterClubs) },
              { value: "dms", label: pick(locale, demoCopy.filterDms) },
            ]}
          />
          <View className="-mx-4">
            <ListRow
              leading={<UserAvatar name={pick(locale, demoCopy.sectionGroup)} size="lg" verified />}
              title={pick(locale, demoCopy.sectionGroup)}
              preview={pick(locale, demoCopy.lastMessage)}
              time="১০:৪২"
              unread={3}
              onPress={() => undefined}
            />
            <ListRow
              leading={<UserAvatar name="Demo Student 2" size="lg" online />}
              title="Demo Student 2"
              preview={specimen.mixed}
              time="Yesterday"
              onPress={() => undefined}
            />
          </View>
        </Section>

        <Section title="Popups">
          <Row>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Text>Dialog</Text>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{pick(locale, demoCopy.noticeTitle)}</DialogTitle>
                  <DialogDescription>{specimen.paragraph}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">
                      <Text>{t("common.actions.close")}</Text>
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              onPress={() => {
                setSheetOpen(true);
              }}
            >
              <Text>Bottom sheet</Text>
            </Button>
            <Button
              variant="destructive"
              onPress={() => {
                setConfirmOpen(true);
              }}
            >
              <Text>{t("common.actions.delete")}</Text>
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <Text>Popover</Text>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72">
                <Text variant="small">{specimen.mixed}</Text>
              </PopoverContent>
            </Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" accessibilityLabel={t("common.actions.edit")}>
                  <Icon as={Pencil} size={18} className="text-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <Text>{t("common.actions.edit")}</Text>
              </TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" accessibilityLabel={t("common.actions.more")}>
                  <Icon as={Ellipsis} size={18} className="text-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>{pick(locale, demoCopy.noticeTitle)}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Text>{t("common.actions.edit")}</Text>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Text className="text-destructive">{t("common.actions.delete")}</Text>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Row>
          <Row>
            <Button
              variant="outline"
              onPress={() => {
                toast({ title: pick(locale, demoCopy.toastSaved), variant: "success" });
              }}
            >
              <Text>toast success</Text>
            </Button>
            <Button
              variant="outline"
              onPress={() => {
                toast({
                  title: pick(locale, demoCopy.toastFailed),
                  description: t("errors.network"),
                  variant: "error",
                  action: { label: t("common.actions.retry"), onPress: () => undefined },
                });
              }}
            >
              <Text>toast error</Text>
            </Button>
          </Row>
        </Section>

        <Section title="Navigation & disclosure">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="chat">
                <Text>{pick(locale, demoCopy.tabChat)}</Text>
              </TabsTrigger>
              <TabsTrigger value="notices">
                <Text>{pick(locale, demoCopy.tabNotices)}</Text>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="chat">
              <Text variant="muted">{specimen.mixed}</Text>
            </TabsContent>
            <TabsContent value="notices">
              <Text variant="muted">{specimen.paragraph}</Text>
            </TabsContent>
          </Tabs>
          <Accordion type="single" collapsible>
            <AccordionItem value="a">
              <AccordionTrigger>
                <Text>{pick(locale, demoCopy.noticeTitle)}</Text>
              </AccordionTrigger>
              <AccordionContent>
                <Text>{specimen.paragraph}</Text>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Section>

        <Section title="Cards, tables & feedback">
          <Card>
            <CardHeader>
              <CardTitle>{pick(locale, demoCopy.noticeTitle)}</CardTitle>
              <CardDescription>{pick(locale, demoCopy.schoolName)}</CardDescription>
            </CardHeader>
            <CardContent>
              <Text>{specimen.paragraph}</Text>
            </CardContent>
            <CardFooter className="gap-2">
              <Button size="sm">
                <Text>{t("common.actions.save")}</Text>
              </Button>
            </CardFooter>
          </Card>
          <Alert icon={CircleAlert} variant="destructive">
            <AlertTitle>{t("common.state.error_title")}</AlertTitle>
            <AlertDescription>{t("errors.network")}</AlertDescription>
          </Alert>
          <Table
            caption={pick(locale, demoCopy.schoolName)}
            getRowKey={(r) => r.id}
            rows={[
              { id: "1", item: pick(locale, demoCopy.fee), amount: 1200 },
              { id: "2", item: pick(locale, demoCopy.noticeTitle), amount: 0 },
            ]}
            columns={[
              {
                key: "item",
                header: pick(locale, demoCopy.fieldMessage),
                width: "w-48",
                render: (r) => <Text>{r.item}</Text>,
              },
              {
                key: "amount",
                header: pick(locale, demoCopy.amount),
                align: "end",
                render: (r) => <Text>{`৳ ${formatNumber(locale, r.amount)}`}</Text>,
              },
            ]}
          />
          <Progress value={62} />
          <Spinner />
          <View className="gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </View>
          <EmptyState
            action={
              <Button>
                <Icon as={Plus} size={16} className="text-primary-foreground" />
                <Text>{pick(locale, demoCopy.newMessage)}</Text>
              </Button>
            }
          />
          <ErrorState onRetry={() => undefined} />
        </Section>
      </Screen>

      <FloatingTabBar
        accessibilityLabel="UI kit tabs"
        tabs={[
          { key: "chat", label: pick(locale, demoCopy.tabChat), icon: MessageCircle },
          { key: "notices", label: pick(locale, demoCopy.tabNotices), icon: Bell },
        ]}
        active={tab}
        onChange={setTab}
        fab={{ accessibilityLabel: pick(locale, demoCopy.newMessage), onPress: () => undefined }}
      />

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={pick(locale, demoCopy.noticeTitle)}
        description={specimen.mixed}
        footer={
          <Button
            onPress={() => {
              setSheetOpen(false);
            }}
          >
            <Text>{t("common.actions.confirm")}</Text>
          </Button>
        }
      >
        <Text>{specimen.paragraph}</Text>
      </Sheet>

      <ConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        destructive
        icon={Trash2}
        title={pick(locale, demoCopy.dialogTitle)}
        description={pick(locale, demoCopy.dialogBody)}
        confirmLabel={t("common.actions.delete")}
        onConfirm={() => {
          toast({ title: pick(locale, demoCopy.toastSaved), variant: "success" });
        }}
      />
    </View>
  );
}
