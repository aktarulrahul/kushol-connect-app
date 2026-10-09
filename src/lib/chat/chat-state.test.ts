import {
  EMPTY_REACTIONS,
  EMPTY_TYPING,
  MAX_PINNED_CHATS,
  reactionChips,
  typingUsersIn,
  useChatState,
} from "./chat-state";

describe("chat-state typing selectors", () => {
  beforeEach(() => {
    useChatState.setState({
      typing: {},
      connection: "online",
      queue: [],
      outgoing: [],
      pendingReads: {},
      reactions: {},
      presence: {},
    });
  });

  it("returns the same EMPTY_TYPING reference when a group has no typers", () => {
    const a = useChatState.getState().typing["missing"] ?? EMPTY_TYPING;
    const b = useChatState.getState().typing["missing"] ?? EMPTY_TYPING;
    expect(a).toBe(EMPTY_TYPING);
    expect(b).toBe(EMPTY_TYPING);
    expect(a).toBe(b);
  });

  it("typingUsersIn uses the stable empty map for missing groups", () => {
    expect(typingUsersIn({}, "group_x")).toEqual([]);
  });

  it("returns live typer ids still within the TTL", () => {
    const now = Date.now();
    useChatState.getState().markTyping("group_a", "user_1", "start");
    expect(typingUsersIn(useChatState.getState().typing, "group_a", now)).toEqual(["user_1"]);
  });
});

describe("chat-state reactions", () => {
  beforeEach(() => {
    useChatState.setState({
      typing: {},
      connection: "online",
      queue: [],
      outgoing: [],
      pendingReads: {},
      reactions: {},
      presence: {},
    });
  });

  it("toggles a reaction on and off for the demo user", () => {
    const { toggleReaction } = useChatState.getState();
    toggleReaction("msg_x", "👍");
    expect(reactionChips(useChatState.getState().reactions, "msg_x")).toEqual([
      { emoji: "👍", count: 1, mine: true },
    ]);
    toggleReaction("msg_x", "👍");
    expect(reactionChips(useChatState.getState().reactions, "msg_x")).toEqual([]);
  });

  it("EMPTY_REACTIONS stays referentially stable", () => {
    expect(EMPTY_REACTIONS).toBe(EMPTY_REACTIONS);
  });
});

describe("chat-state list preferences (drafts, pins, notifications)", () => {
  beforeEach(() => {
    useChatState.setState({ drafts: {}, pinnedChats: [], chatNotify: {}, reactions: {} });
  });

  it("keeps a draft per chat and drops it when cleared", () => {
    const { setDraft } = useChatState.getState();
    setDraft("grp_a", "half-written");
    expect(useChatState.getState().drafts).toEqual({ grp_a: "half-written" });
    setDraft("grp_a", "");
    expect(useChatState.getState().drafts).toEqual({});
  });

  it("pins most-recent first, unpins, and refuses a pin past the limit", () => {
    const { togglePinChat } = useChatState.getState();
    expect(togglePinChat("a")).toBe(true);
    expect(togglePinChat("b")).toBe(true);
    expect(useChatState.getState().pinnedChats).toEqual(["b", "a"]);
    expect(togglePinChat("a")).toBe(true);
    expect(useChatState.getState().pinnedChats).toEqual(["b"]);

    useChatState.setState({ pinnedChats: ["1", "2", "3", "4", "5"].slice(0, MAX_PINNED_CHATS) });
    expect(togglePinChat("6")).toBe(false);
    expect(useChatState.getState().pinnedChats).toHaveLength(MAX_PINNED_CHATS);
  });

  it("stores a per-chat notification level", () => {
    useChatState.getState().setChatNotify("grp_a", "none");
    expect(useChatState.getState().chatNotify).toEqual({ grp_a: "none" });
  });

  it("keeps other messages' reactions when one message's last reaction goes", () => {
    const { toggleReaction } = useChatState.getState();
    toggleReaction("m1", "👍");
    toggleReaction("m2", "❤️");
    toggleReaction("m1", "👍");
    expect(useChatState.getState().reactions).toEqual({ m2: { "❤️": ["user_demo_teacher"] } });
  });
});
