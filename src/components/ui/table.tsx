import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";

import { cn } from "@/lib/utils";

import { Text } from "./text";

// Compact table for small read-only data on mobile (receipts, fee breakdowns, timetables). Long
// lists stay FlatList patterns in the feature modules (05 §2.2 "Table shell N/A on RN"); this one
// scrolls horizontally on 360pt screens and announces a header row.

export type TableColumn<T> = {
  key: string;
  header: string;
  /** Fixed column width in spacing units (Tailwind w-*), e.g. "w-28". */
  width?: string;
  align?: "start" | "end";
  render: (row: T) => ReactNode;
};

function Table<T>({
  columns,
  rows,
  getRowKey,
  caption,
  className,
}: {
  columns: readonly TableColumn<T>[];
  rows: readonly T[];
  getRowKey: (row: T) => string;
  caption?: string;
  className?: string;
}) {
  return (
    <View className={cn("overflow-hidden rounded-lg border border-border bg-card", className)}>
      {caption ? (
        <Text variant="caption" className="px-3 pt-3">
          {caption}
        </Text>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View role="table" accessibilityLabel={caption}>
          <View role="row" className="flex-row border-b border-border bg-muted">
            {columns.map((c) => (
              <View key={c.key} role="columnheader" className={cn("px-3 py-2", c.width ?? "w-32")}>
                <Text
                  className={cn(
                    "text-xs font-semibold text-muted-foreground",
                    c.align === "end" && "text-right",
                  )}
                >
                  {c.header}
                </Text>
              </View>
            ))}
          </View>
          {rows.map((row, i) => (
            <View
              key={getRowKey(row)}
              role="row"
              className={cn("flex-row", i < rows.length - 1 && "border-b border-border")}
            >
              {columns.map((c) => (
                <View
                  key={c.key}
                  role="cell"
                  className={cn(
                    "justify-center px-3 py-2.5",
                    c.width ?? "w-32",
                    c.align === "end" && "items-end",
                  )}
                >
                  {c.render(row)}
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export { Table };
