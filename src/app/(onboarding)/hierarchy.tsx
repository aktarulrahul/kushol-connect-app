import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { SchoolRequestSheet } from "@/components/auth/school-request-sheet";
import { OnboardingHeader, stepHref } from "@/components/onboarding/onboarding-header";
import { useStepGuard } from "@/components/onboarding/step-guard";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type Option,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { FixtureError, listCities, listSchools, listSections } from "@/fixtures/auth";
import { useLocale, useT } from "@/i18n/locale-provider";
import { distinctClassLevels, sectionsForClass } from "@/lib/onboarding/hierarchy";
import { useOnboardingStore } from "@/lib/onboarding/onboarding-store";

// Step 3 — hierarchy picker (owner requirement 2026-10-01): FOUR cascading dropdowns from the
// backend master data — City → School → Class → Section. Class is derived: the chosen school's
// sections are grouped by their distinct classLevel values (sorted numerically), and the Section
// dropdown lists only that class's sections. classLevel is a UI filter only — the registration
// payload keeps sending sectionId. Missing school? The "Can't find your school?" affordance
// opens the school-request sheet; the application admin then connects the POC to onboard the
// institution, and until it exists the user stays on this step. Data comes from the seam,
// cached 5 minutes (03 `02` §4 `hierarchy:{cityId}`); skeleton rows while loading and
// error+retry per dropdown (05 §2.2).
const HIERARCHY_STALE_TIME = 5 * 60_000;

function isOfflineError(error: unknown): boolean {
  return error instanceof FixtureError && error.code === "OFFLINE";
}

function SelectSkeleton() {
  return (
    <View className="gap-2">
      <Skeleton className="h-12 w-full" />
    </View>
  );
}

export default function HierarchyScreen() {
  const guard = useStepGuard("hierarchy");
  const router = useRouter();
  const t = useT();
  const { locale } = useLocale();
  const draft = useOnboardingStore((s) => s.draft);
  const patch = useOnboardingStore((s) => s.patch);
  const goTo = useOnboardingStore((s) => s.goTo);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestNotice, setRequestNotice] = useState(false);

  const cities = useQuery({
    queryKey: ["hierarchy", "cities"],
    queryFn: listCities,
    staleTime: HIERARCHY_STALE_TIME,
  });
  const cityId = draft.cityId;
  const schools = useQuery({
    queryKey: ["hierarchy", "schools", cityId],
    queryFn: () => listSchools(cityId as string),
    enabled: cityId !== null,
    staleTime: HIERARCHY_STALE_TIME,
  });
  const schoolId = draft.schoolId;
  const sections = useQuery({
    queryKey: ["hierarchy", "sections", schoolId],
    queryFn: () => listSections(schoolId as string),
    enabled: schoolId !== null,
    staleTime: HIERARCHY_STALE_TIME,
  });

  const cityOptions = useMemo(() => cities.data ?? [], [cities.data]);
  const schoolOptions = useMemo(() => schools.data ?? [], [schools.data]);
  const sectionList = useMemo(() => sections.data ?? [], [sections.data]);
  const classLevels = useMemo(() => distinctClassLevels(sectionList), [sectionList]);
  const classSections = useMemo(
    () => (draft.classLevel === null ? [] : sectionsForClass(sectionList, draft.classLevel)),
    [sectionList, draft.classLevel],
  );

  if (guard) return guard;

  const label = (bn: string, en: string) => (locale === "bn" ? bn : en);
  const city = cityOptions.find((c) => c.id === draft.cityId);
  const school = schoolOptions.find((s) => s.id === draft.schoolId);
  const section = sectionList.find((s) => s.id === draft.sectionId);
  const complete = draft.cityId !== null && draft.schoolId !== null && draft.sectionId !== null;

  const next = () => {
    if (goTo("contact")) router.push(stepHref("contact"));
  };

  const pickCity = (option: Option | null) => {
    setRequestNotice(false);
    patch({ cityId: option?.value ?? null, schoolId: null, sectionId: null, classLevel: null });
  };
  const pickSchool = (option: Option | null) => {
    patch({ schoolId: option?.value ?? null, sectionId: null, classLevel: null });
  };
  const pickClass = (option: Option | null) => {
    patch({ classLevel: option?.value ? Number(option.value) : null, sectionId: null });
  };
  const pickSection = (option: Option | null) => {
    patch({ sectionId: option?.value ?? null });
  };

  return (
    <Screen className="pt-1">
      <OnboardingHeader title={t("auth.hierarchy.title")} />

      {requestNotice ? (
        <View role="alert" className="rounded-lg bg-info-soft p-3">
          <Text>{t("auth.school_request.notice")}</Text>
        </View>
      ) : null}

      <View className="gap-1.5">
        <Text variant="label">{t("auth.hierarchy.city")}</Text>
        {cities.isPending ? (
          <SelectSkeleton />
        ) : cities.isError ? (
          <ErrorState
            description={isOfflineError(cities.error) ? t("auth.hierarchy.offline") : undefined}
            onRetry={() => void cities.refetch()}
          />
        ) : cityOptions.length === 0 ? (
          <EmptyState />
        ) : (
          <Select
            value={city ? { value: city.id, label: label(city.nameBn, city.nameEn) } : undefined}
            onValueChange={pickCity}
          >
            <SelectTrigger accessibilityLabel={t("auth.hierarchy.city")}>
              <SelectValue placeholder={t("validation.choose_one")} />
            </SelectTrigger>
            <SelectContent>
              {cityOptions.map((option) => (
                <SelectItem
                  key={option.id}
                  value={option.id}
                  label={label(option.nameBn, option.nameEn)}
                >
                  {label(option.nameBn, option.nameEn)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </View>

      <View className="gap-1.5">
        <Text variant="label">{t("auth.hierarchy.school")}</Text>
        {cityId === null ? (
          <Text variant="muted">{t("auth.hierarchy.pick_city_first")}</Text>
        ) : schools.isPending ? (
          <SelectSkeleton />
        ) : schools.isError ? (
          <ErrorState
            description={isOfflineError(schools.error) ? t("auth.hierarchy.offline") : undefined}
            onRetry={() => void schools.refetch()}
          />
        ) : (
          <>
            {schoolOptions.length === 0 ? (
              <EmptyState
                title={t("auth.hierarchy.empty_title")}
                description={t("auth.hierarchy.empty_hint")}
              />
            ) : (
              <Select
                value={
                  school
                    ? { value: school.id, label: label(school.nameBn, school.nameEn) }
                    : undefined
                }
                onValueChange={pickSchool}
              >
                <SelectTrigger accessibilityLabel={t("auth.hierarchy.school")}>
                  <SelectValue placeholder={t("validation.choose_one")} />
                </SelectTrigger>
                <SelectContent>
                  {schoolOptions.map((option) => (
                    <SelectItem
                      key={option.id}
                      value={option.id}
                      label={label(option.nameBn, option.nameEn)}
                    >
                      {label(option.nameBn, option.nameEn)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="link"
              className="self-start"
              onPress={() => {
                setRequestOpen(true);
              }}
              testID="school-request-open"
            >
              <Text>{t("auth.hierarchy.no_school")}</Text>
            </Button>
          </>
        )}
      </View>

      <View className="gap-1.5">
        <Text variant="label">{t("auth.hierarchy.class_label")}</Text>
        {schoolId === null ? (
          <Text variant="muted">{t("auth.hierarchy.pick_school_first")}</Text>
        ) : sections.isPending ? (
          <SelectSkeleton />
        ) : sections.isError ? (
          <ErrorState
            description={isOfflineError(sections.error) ? t("auth.hierarchy.offline") : undefined}
            onRetry={() => void sections.refetch()}
          />
        ) : classLevels.length === 0 ? (
          <EmptyState />
        ) : (
          <Select
            value={
              draft.classLevel === null
                ? undefined
                : {
                    value: String(draft.classLevel),
                    label: t("auth.hierarchy.class_option", { level: draft.classLevel }),
                  }
            }
            onValueChange={pickClass}
          >
            <SelectTrigger accessibilityLabel={t("auth.hierarchy.class_label")}>
              <SelectValue placeholder={t("validation.choose_one")} />
            </SelectTrigger>
            <SelectContent>
              {classLevels.map((level) => (
                <SelectItem
                  key={level}
                  value={String(level)}
                  label={t("auth.hierarchy.class_option", { level })}
                >
                  {t("auth.hierarchy.class_option", { level })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </View>

      <View className="gap-1.5">
        <Text variant="label">{t("auth.hierarchy.section")}</Text>
        {draft.classLevel === null ? (
          <Text variant="muted">{t("auth.hierarchy.pick_class_first")}</Text>
        ) : classSections.length === 0 ? (
          <Text variant="muted">{t("common.state.empty_title")}</Text>
        ) : (
          <Select
            value={
              section
                ? {
                    value: section.id,
                    label: t("auth.hierarchy.section_option", { name: section.name }),
                  }
                : undefined
            }
            onValueChange={pickSection}
          >
            <SelectTrigger accessibilityLabel={t("auth.hierarchy.section")}>
              <SelectValue placeholder={t("validation.choose_one")} />
            </SelectTrigger>
            <SelectContent>
              {classSections.map((option) => (
                <SelectItem
                  key={option.id}
                  value={option.id}
                  label={t("auth.hierarchy.section_option", { name: option.name })}
                >
                  {t("auth.hierarchy.section_option", { name: option.name })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </View>

      <Button size="lg" className="self-stretch" disabled={!complete} onPress={next}>
        <Text>{t("common.actions.next")}</Text>
      </Button>

      <SchoolRequestSheet
        open={requestOpen}
        onOpenChange={setRequestOpen}
        cityId={cityId ?? ""}
        onSent={() => {
          setRequestNotice(true);
        }}
      />
    </Screen>
  );
}
