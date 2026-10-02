import { fireEvent, screen } from "@testing-library/react-native";

import { MessageBubble } from "@/components/chat/message-bubble";
import type { ChatMessage } from "@/fixtures/chat";
import { DEMO_IMAGE_DATA_URI, DEMO_PDF_URL, mediaFixtures } from "@/fixtures/media";
import { renderUi } from "@/test/render";

const base = {
  groupId: "grp_official_10a",
  senderId: "user_demo_karim",
  senderName: "করিম আহমেদ",
  clientMsgId: "00000000-0000-4000-8000-000000000201",
  createdAt: "2026-10-01T12:00:00.000Z",
} as const;

describe("mediaFixtures preview URIs", () => {
  it("returns the embedded demo image and public sample PDF", () => {
    mediaFixtures.reset();
    expect(mediaFixtures.previewUri("asset_demo_lab")).toBe(DEMO_IMAGE_DATA_URI);
    expect(mediaFixtures.previewUri("asset_demo_syllabus")).toBe(DEMO_PDF_URL);
    expect(mediaFixtures.kindOf("asset_demo_syllabus")).toBe("pdf");
  });
});

describe("MessageBubble media", () => {
  it("renders a WhatsApp-style image bubble that opens media on press", async () => {
    const onOpenMedia = jest.fn();
    const message: ChatMessage = {
      ...base,
      id: "msg_image",
      kind: "image",
      media: mediaFixtures.confirmedRef("asset_demo_lab"),
    };
    await renderUi(
      <MessageBubble message={message} isOwn={false} showSender onOpenMedia={onOpenMedia} />,
      { locale: "en" },
    );
    await fireEvent.press(screen.getByLabelText("lab-day.jpg"));
    expect(onOpenMedia).toHaveBeenCalledWith(message);
  });

  it("renders a PDF document card with filename and size", async () => {
    const onOpenMedia = jest.fn();
    const message: ChatMessage = {
      ...base,
      id: "msg_pdf",
      kind: "pdf",
      senderId: "user_demo_me",
      media: {
        ...mediaFixtures.confirmedRef("asset_demo_syllabus"),
        fileName: "অর্ধবার্ষিক-সিলেবাস.pdf",
      },
    };
    await renderUi(
      <MessageBubble message={message} isOwn showSender={false} onOpenMedia={onOpenMedia} />,
      { locale: "en" },
    );
    expect(screen.getByText("অর্ধবার্ষিক-সিলেবাস.pdf")).toBeOnTheScreen();
    expect(screen.getByText(/PDF ·/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText(/অর্ধবার্ষিক-সিলেবাস\.pdf/));
    expect(onOpenMedia).toHaveBeenCalledWith(message);
  });

  it("shows caption under the image when body is set", async () => {
    const message: ChatMessage = {
      ...base,
      id: "msg_caption",
      kind: "image",
      body: "Lab day photos",
      media: mediaFixtures.confirmedRef("asset_demo_lab"),
    };
    await renderUi(<MessageBubble message={message} isOwn={false} showSender={false} />, {
      locale: "en",
    });
    expect(screen.getByText("Lab day photos")).toBeOnTheScreen();
  });

  it("renders text, sticker, voice, and deleted bubbles without throwing", async () => {
    const samples: ChatMessage[] = [
      {
        ...base,
        id: "msg_text",
        kind: "text",
        body: "hello",
      },
      {
        ...base,
        id: "msg_sticker",
        kind: "sticker",
        stickerId: "sticker_wave",
        senderId: "user_demo_teacher",
      },
      {
        ...base,
        id: "msg_voice",
        kind: "voice",
        media: mediaFixtures.confirmedRef("asset_demo_voice"),
      },
      {
        ...base,
        id: "msg_deleted",
        kind: "text",
        body: "gone",
        deletedAt: "2026-10-01T12:01:00.000Z",
      },
    ];
    await renderUi(
      <>
        {samples.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.senderId === "user_demo_teacher"}
            showSender={message.senderId !== "user_demo_teacher"}
            sendState="seen"
          />
        ))}
      </>,
      { locale: "en" },
    );
    expect(screen.getByText("hello")).toBeOnTheScreen();
    expect(screen.getByText("Message deleted")).toBeOnTheScreen();
  });
});
