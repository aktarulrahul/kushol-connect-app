// KLIPY GIFs + stickers picker (05 · owner 2026-10-18). KLIPY rules this sheet follows: the
// device calls KLIPY itself, results keep KLIPY's order in their own tab, the search box reads
// "Search KLIPY" and a "Powered by KLIPY" mark sits under the results. Paging is a "load more"
// at the end of the grid (the sheet body is already a ScrollView — no nested virtualized list).
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, View } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { useT } from "@/i18n/locale-provider";
import {
  KLIPY_SEARCH_PLACEHOLDER,
  klipyBrowse,
  type KlipyConfig,
  type KlipyItem,
  type KlipyKind,
} from "@/lib/chat/klipy";
import { cn } from "@/lib/utils";
import { color } from "@/theme/tokens";

export function KlipyPickerSheet({
  open,
  onOpenChange,
  config,
  initialKind = "gifs",
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: KlipyConfig;
  initialKind?: KlipyKind;
  /** A picked GIF/sticker, with the search text that found it ("" from trending). */
  onPick: (kind: KlipyKind, item: KlipyItem, query: string) => void;
}) {
  const t = useT();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("chat.klipy.title")}>
      {open ? (
        <KlipyBrowser
          config={config}
          initialKind={initialKind}
          onPick={(kind, item, query) => {
            onOpenChange(false);
            onPick(kind, item, query);
          }}
        />
      ) : null}
    </Sheet>
  );
}

function KlipyBrowser({
  config,
  initialKind,
  onPick,
}: {
  config: KlipyConfig;
  initialKind: KlipyKind;
  onPick: (kind: KlipyKind, item: KlipyItem, query: string) => void;
}) {
  const t = useT();
  const [kind, setKind] = useState<KlipyKind>(initialKind);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(query.trim());
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  const results = useInfiniteQuery({
    queryKey: ["klipy", kind, debounced, config.customerId],
    queryFn: ({ pageParam, signal }) => klipyBrowse(config, kind, debounced, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    staleTime: 5 * 60_000,
  });
  const items = results.data?.pages.flatMap((p) => p.items) ?? [];
  const columns = kind === "gifs" ? "w-1/2" : "w-1/4";

  return (
    <View className="gap-3">
      <View accessibilityRole="tablist" className="flex-row gap-2">
        {(["gifs", "stickers"] as const).map((tab) => (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: kind === tab }}
            onPress={() => {
              setKind(tab);
            }}
            className={cn(
              "rounded-full px-4 py-1.5",
              kind === tab ? "bg-primary-soft" : "bg-muted",
            )}
          >
            <Text
              className={cn(
                "text-sm font-semibold",
                kind === tab ? "text-primary" : "text-muted-foreground",
              )}
            >
              {t(tab === "gifs" ? "chat.klipy.tab_gifs" : "chat.klipy.tab_stickers")}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="flex-row items-center gap-2">
        <Search size={18} color={color["muted-foreground"]} />
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={KLIPY_SEARCH_PLACEHOLDER}
          accessibilityLabel={KLIPY_SEARCH_PLACEHOLDER}
          autoCorrect={false}
          returnKeyType="search"
          className="flex-1"
        />
        {query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("chat.klipy.clear")}
            hitSlop={8}
            onPress={() => {
              setQuery("");
            }}
          >
            <X size={18} color={color["muted-foreground"]} />
          </Pressable>
        ) : null}
      </View>

      {results.isLoading ? (
        <View className="items-center py-10">
          <ActivityIndicator color={color.primary} />
        </View>
      ) : results.isError ? (
        <Text variant="muted" className="py-10 text-center">
          {t("chat.klipy.failed")}
        </Text>
      ) : items.length === 0 ? (
        <Text variant="muted" className="py-10 text-center">
          {t("chat.klipy.empty")}
        </Text>
      ) : (
        <View className="-m-0.5 flex-row flex-wrap">
          {items.map((item) => (
            <Pressable
              key={item.slug}
              accessibilityRole="button"
              accessibilityLabel={`${t(kind === "gifs" ? "chat.klipy.send_gif" : "chat.klipy.send_sticker")} ${item.title}`.trim()}
              onPress={() => {
                onPick(kind, item, debounced);
              }}
              className={cn(columns, "p-0.5")}
            >
              <Image
                source={{ uri: item.preview.url }}
                accessibilityIgnoresInvertColors
                resizeMode={kind === "gifs" ? "cover" : "contain"}
                className={cn("w-full rounded-lg", kind === "gifs" && "bg-muted")}
                style={{ aspectRatio: kind === "gifs" ? 4 / 3 : 1 }}
              />
            </Pressable>
          ))}
        </View>
      )}

      {results.hasNextPage ? (
        <Button
          variant="outline"
          loading={results.isFetchingNextPage}
          onPress={() => {
            void results.fetchNextPage();
          }}
        >
          <Text>{t("chat.klipy.load_more")}</Text>
        </Button>
      ) : null}
      <Text className="text-center text-xs font-semibold uppercase text-muted-foreground">
        {t("chat.klipy.powered")}
      </Text>
    </View>
  );
}
