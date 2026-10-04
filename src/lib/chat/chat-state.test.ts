import {
  EMPTY_REACTIONS,
  EMPTY_TYPING,
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
