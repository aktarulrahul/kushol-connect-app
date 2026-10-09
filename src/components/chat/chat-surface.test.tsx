import { fireEvent, screen } from "@testing-library/react-native";
import { Pin, Trash2 } from "lucide-react-native";

import type { ChatGroup, ChatMessage } from "@/fixtures/chat";
import { renderUi } from "@/test/render";

import { Composer } from "./composer";
import { formatListTime, GroupRow } from "./group-row";
import { MessageBubble } from "./message-bubble";
import { MessageFocusMenu } from "./message-menu";

// Spartens chat/channel parity (owner 2026-10-09): list row states, bubble marks, composer
// banners and the long-press focus menu.

const group: ChatGroup = {
  id: "grp_club",
  kind: "custom",
  name: "Demo Club",
  status: "active",
  myRole: "member",
  memberCount: 12,
  unreadCount: 3,
  createdAt: "2026-10-01T10:00:00.000Z",
  lastMessagePreview: "Rahima: see you",
  lastMessageAt: "2026-10-01T12:24:00.000Z",
};

const message: ChatMessage = {
  id: "msg_1",
  groupId: "grp_club",
  senderId: "user_demo_teacher",
  senderName: "Demo Teacher",
  kind: "text",
  body: "Test on Sunday",
  clientMsgId: "00000000-0000-4000-8000-000000000001",
  createdAt: "2026-10-01T12:00:00.000Z",
};

describe("GroupRow (Spartens chat item)", () => {
  it("shows a draft instead of the preview and announces unread, pinned and muted", async () => {
    await renderUi(<GroupRow group={group} onPress={jest.fn()} draft="half done" pinned muted />, {
      locale: "en",
    });
    expect(screen.getByText("Draft: half done")).toBeOnTheScreen();
    expect(screen.queryByText("Rahima: see you")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Demo Club, 3 unread, Pinned, Muted" }),
    ).toBeOnTheScreen();
  });

  it("formats list times: today, yesterday, older", () => {
    const now = new Date(2026, 9, 9, 15, 0);
    expect(formatListTime(new Date(2026, 9, 9, 9, 5).toISOString(), "Yesterday", now)).toBe(
      "০৯:০৫",
    );
    expect(formatListTime(new Date(2026, 9, 8, 9, 5).toISOString(), "Yesterday", now)).toBe(
      "Yesterday",
    );
    expect(formatListTime(new Date(2026, 9, 1, 9, 5).toISOString(), "Yesterday", now)).toBe("১/১০");
  });
});

describe("MessageBubble (Spartens channel marks)", () => {
  it("labels an edited message", async () => {
    await renderUi(
      <MessageBubble
        message={{ ...message, editedAt: "2026-10-01T12:05:00.000Z" }}
        isOwn
        showSender={false}
      />,
      { locale: "en" },
    );
    expect(screen.getByText("edited")).toBeOnTheScreen();
  });

  it("names the quoted author and jumps to the original on tap", async () => {
    const onPressReply = jest.fn();
    await renderUi(
      <MessageBubble
        message={{ ...message, replyTo: "msg_0", replyPreview: "When is the test?" }}
        isOwn
        showSender={false}
        replyAuthor="Karim"
        onPressReply={onPressReply}
      />,
      { locale: "en" },
    );
    expect(screen.getByText("Karim")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Karim When is the test?" }));
    expect(onPressReply).toHaveBeenCalledWith("msg_0");
  });

  it("renders 1–3 emoji large, without the text bubble", async () => {
    await renderUi(
      <MessageBubble message={{ ...message, body: "👍" }} isOwn showSender={false} />,
      { locale: "en" },
    );
    expect(screen.getByText("👍")).toBeOnTheScreen();
  });

  it("resends a failed bubble on tap", async () => {
    const onRetry = jest.fn();
    await renderUi(
      <MessageBubble
        message={message}
        isOwn
        showSender={false}
        sendState="failed"
        onRetry={onRetry}
      />,
      { locale: "en" },
    );
    await fireEvent.press(screen.getByText("Test on Sunday"));
    expect(onRetry).toHaveBeenCalledWith(message);
  });
});

describe("Composer (Spartens chat input)", () => {
  const handlers = {
    onChangeText: jest.fn(),
    onOpenAttach: jest.fn(),
    onStartVoice: jest.fn(),
  };

  it("shows the mic while the field is empty", async () => {
    await renderUi(<Composer value="" onSend={jest.fn()} {...handlers} />, { locale: "en" });
    expect(screen.getByRole("button", { name: "Voice" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Send" })).toBeNull();
  });

  it("sends trimmed text", async () => {
    const onSend = jest.fn();
    await renderUi(<Composer value="  hello  " onSend={onSend} {...handlers} />, {
      locale: "en",
    });
    await fireEvent.press(screen.getByRole("button", { name: "Send" }));
    expect(onSend).toHaveBeenCalledWith("hello");
  });

  it("shows the reply quote and the editing banner with their cancel buttons", async () => {
    const onCancelReply = jest.fn();
    const onCancelEdit = jest.fn();
    await renderUi(
      <>
        <Composer
          value=""
          onSend={jest.fn()}
          {...handlers}
          reply={{ author: "Karim", preview: "When is the test?" }}
          onCancelReply={onCancelReply}
        />
        <Composer
          value="fixed"
          onSend={jest.fn()}
          {...handlers}
          editing
          onCancelEdit={onCancelEdit}
        />
      </>,
      { locale: "en" },
    );
    expect(screen.getByText("When is the test?")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Cancel reply" }));
    expect(onCancelReply).toHaveBeenCalled();
    expect(screen.getByText("Editing message")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Cancel editing" }));
    expect(onCancelEdit).toHaveBeenCalled();
  });

  it("locks a read-only room", async () => {
    await renderUi(
      <Composer value="" onSend={jest.fn()} {...handlers} disabled disabledNotice="Read only" />,
      { locale: "en" },
    );
    expect(screen.getByText("Read only")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Write a message…")).toBeNull();
  });
});

describe("MessageFocusMenu", () => {
  it("lists the allowed actions, runs one and closes", async () => {
    const onClose = jest.fn();
    const onPin = jest.fn();
    await renderUi(
      <MessageFocusMenu
        anchor={{ x: 16, y: 300, width: 200, height: 60 }}
        align="start"
        preview={null}
        actions={[
          { key: "pin", label: "Pin this message", icon: Pin, onPress: onPin },
          {
            key: "delete",
            label: "Delete message",
            icon: Trash2,
            destructive: true,
            onPress: jest.fn(),
          },
        ]}
        onReact={jest.fn()}
        onClose={onClose}
      />,
      { locale: "en" },
    );
    expect(screen.getByRole("menuitem", { name: "Delete message" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("menuitem", { name: "Pin this message" }));
    expect(onClose).toHaveBeenCalled();
    expect(onPin).toHaveBeenCalled();
  });

  it("reacts from the quick bar", async () => {
    const onReact = jest.fn();
    await renderUi(
      <MessageFocusMenu
        anchor={{ x: 16, y: 300, width: 200, height: 60 }}
        align="end"
        preview={null}
        actions={[]}
        onReact={onReact}
        onClose={jest.fn()}
      />,
      { locale: "en" },
    );
    await fireEvent.press(screen.getByRole("button", { name: "❤️" }));
    expect(onReact).toHaveBeenCalledWith("❤️");
  });
});
