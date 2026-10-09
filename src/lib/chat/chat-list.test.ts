import type { ChatGroup } from "@/fixtures/chat";

import { archivedDmCount, filterChatList } from "./chat-list";

const base = {
  status: "active",
  myRole: "member",
  memberCount: 3,
  unreadCount: 0,
  createdAt: "2026-10-01T08:00:00.000Z",
} as const;

const groups: ChatGroup[] = [
  {
    ...base,
    id: "official",
    kind: "official",
    name: "Class Ten Science",
    lastMessageAt: "2026-10-09T09:00:00.000Z",
    lastMessagePreview: "Rahima: homework due",
    unreadCount: 2,
  },
  {
    ...base,
    id: "club",
    kind: "custom",
    name: "Debate Club",
    lastMessageAt: "2026-10-09T11:00:00.000Z",
    lastMessagePreview: "Motion for Friday",
  },
  {
    ...base,
    id: "dm",
    kind: "dm",
    peer: { userId: "user_karim", name: "Karim" },
    lastMessageAt: "2026-10-09T10:00:00.000Z",
    unreadCount: 1,
  },
  {
    ...base,
    id: "dm_old",
    kind: "dm",
    status: "archived",
    peer: { userId: "user_rina", name: "Rina" },
    lastMessageAt: "2026-10-01T10:00:00.000Z",
  },
];

const ids = (list: ChatGroup[]) => list.map((g) => g.id);

describe("filterChatList", () => {
  it("lists non-archived chats, last activity first", () => {
    expect(ids(filterChatList(groups, { filter: "all", query: "" }))).toEqual([
      "club",
      "dm",
      "official",
    ]);
  });

  it("filters by chip: unread, official, community, DMs", () => {
    expect(ids(filterChatList(groups, { filter: "unread", query: "" }))).toEqual([
      "dm",
      "official",
    ]);
    expect(ids(filterChatList(groups, { filter: "official", query: "" }))).toEqual(["official"]);
    expect(ids(filterChatList(groups, { filter: "custom", query: "" }))).toEqual(["club"]);
    expect(ids(filterChatList(groups, { filter: "dm", query: "" }))).toEqual(["dm"]);
  });

  it("searches titles (DM peer names too) and previews, case-insensitively", () => {
    expect(ids(filterChatList(groups, { filter: "all", query: "KARIM" }))).toEqual(["dm"]);
    expect(ids(filterChatList(groups, { filter: "all", query: "homework" }))).toEqual(["official"]);
    expect(filterChatList(groups, { filter: "all", query: "nothing" })).toEqual([]);
  });

  it("puts pinned chats first in pin order", () => {
    expect(
      ids(filterChatList(groups, { filter: "all", query: "", pinned: ["official", "dm"] })),
    ).toEqual(["official", "dm", "club"]);
  });

  it("shows only archived DMs behind the archive entry", () => {
    expect(ids(filterChatList(groups, { filter: "dm", query: "", archived: true }))).toEqual([
      "dm_old",
    ]);
    expect(archivedDmCount(groups)).toBe(1);
  });
});
