import { fireEvent, screen } from "@testing-library/react-native";

import { AttachmentCaptionSheet } from "@/components/chat/attachment-caption-sheet";
import { MessageBubble } from "@/components/chat/message-bubble";
import { PollSheet } from "@/components/chat/poll-sheet";
import type { ChatMessage } from "@/fixtures/chat";
import { DEMO_MAGIC } from "@/fixtures/media";
import { renderUi } from "@/test/render";

// 05 · owner 2026-10-18 — polls (render, vote, compose), KLIPY GIFs/stickers and the WhatsApp
// caption preview in the app.

const base = {
  groupId: "grp_official_10a",
  senderId: "user_demo_karim",
  senderName: "করিম আহমেদ",
  clientMsgId: "00000000-0000-4000-8000-000000000301",
  createdAt: "2026-10-18T09:00:00.000Z",
} as const;

const klipy = {
  slug: "hello-hi-662",
  title: "Hello",
  url: "https://static.klipy.com/md.gif",
  width: 400,
  height: 300,
};

describe("poll bubble", () => {
  const poll: ChatMessage = {
    ...base,
    id: "msg_poll",
    kind: "poll",
    poll: {
      question: "Which day suits the exam?",
      options: [
        { text: "Sunday", votes: 2 },
        { text: "Monday", votes: 1 },
      ],
      userVoted: [0],
    },
  };

  it("shows the question, tallies and my vote, and votes on tap", async () => {
    const onVotePoll = jest.fn();
    await renderUi(
      <MessageBubble message={poll} isOwn={false} showSender onVotePoll={onVotePoll} />,
      { locale: "en" },
    );
    expect(screen.getByText("Which day suits the exam?")).toBeOnTheScreen();
    expect(screen.getByText("Select one")).toBeOnTheScreen();
    expect(screen.getByText("3 votes")).toBeOnTheScreen();
    const sunday = screen.getByLabelText("Sunday, 2 votes");
    expect(sunday.props.accessibilityState).toEqual(expect.objectContaining({ checked: true }));
    await fireEvent.press(screen.getByLabelText("Monday, 1 votes"));
    expect(onVotePoll).toHaveBeenCalledWith(poll, 1);
  });

  it("is read-only without a vote handler (focus menu preview)", async () => {
    await renderUi(<MessageBubble message={poll} isOwn showSender={false} />, { locale: "en" });
    expect(screen.getByLabelText("Sunday, 2 votes").props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
  });
});

describe("KLIPY bubbles", () => {
  it("renders a GIF inside the bubble with its badge", async () => {
    await renderUi(
      <MessageBubble
        message={{ ...base, id: "msg_gif", kind: "gif", klipy }}
        isOwn
        showSender={false}
      />,
      { locale: "en" },
    );
    expect(screen.getByLabelText("Hello")).toBeOnTheScreen();
    expect(screen.getByText("GIF")).toBeOnTheScreen();
  });

  it("renders a KLIPY sticker without a bubble", async () => {
    await renderUi(
      <MessageBubble
        message={{
          ...base,
          id: "msg_sticker",
          kind: "sticker",
          klipy: { ...klipy, title: "Wave" },
        }}
        isOwn={false}
        showSender
      />,
      { locale: "en" },
    );
    expect(screen.getByLabelText("Wave")).toBeOnTheScreen();
    expect(screen.queryByText("GIF")).toBeNull();
  });
});

describe("poll sheet", () => {
  it("validates, then creates a poll from the filled options", async () => {
    const onCreate = jest.fn();
    await renderUi(<PollSheet open onOpenChange={jest.fn()} onCreate={onCreate} />, {
      locale: "en",
    });
    await fireEvent.changeText(screen.getByLabelText("Question"), "Which day suits the exam?");
    await fireEvent.changeText(screen.getByLabelText("Option 1"), "Sunday");
    await fireEvent.press(screen.getByText("Create"));
    expect(screen.getByText("Add at least 2 options")).toBeOnTheScreen();
    expect(onCreate).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText("Option 2"), "Monday");
    await fireEvent.press(screen.getByText("Add option"));
    await fireEvent.changeText(screen.getByLabelText("Option 3"), "Tuesday");
    await fireEvent.press(screen.getByText("Create"));
    expect(onCreate).toHaveBeenCalledWith({
      question: "Which day suits the exam?",
      options: ["Sunday", "Monday", "Tuesday"],
      allowMultiple: false,
    });
  });
});

describe("attachment caption sheet", () => {
  it("previews a document and sends it with the caption", async () => {
    const onSend = jest.fn();
    const pick = {
      kind: "pdf" as const,
      headerBytes: DEMO_MAGIC.pdf,
      sizeBytes: 830_000,
      fileName: "routine.pdf",
    };
    await renderUi(<AttachmentCaptionSheet pick={pick} onCancel={jest.fn()} onSend={onSend} />, {
      locale: "en",
    });
    expect(screen.getByText("Send document")).toBeOnTheScreen();
    expect(screen.getByText("routine.pdf")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Caption"), " Exam routine ");
    await fireEvent.press(screen.getByText("Send"));
    expect(onSend).toHaveBeenCalledWith(pick, "Exam routine");
  });
});
