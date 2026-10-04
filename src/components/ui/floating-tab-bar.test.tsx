import { fireEvent, screen } from "@testing-library/react-native";
import { MessageCircle, UserRound } from "lucide-react-native";

import { renderUi } from "@/test/render";

import { FloatingTabBar } from "./floating-tab-bar";

describe("FloatingTabBar", () => {
  it("shows WhatsApp-style labels and calls onChange", async () => {
    const onChange = jest.fn();
    await renderUi(
      <FloatingTabBar
        accessibilityLabel="Main"
        active="chat"
        onChange={onChange}
        tabs={[
          { key: "chat", label: "Chat", icon: MessageCircle, badge: 3 },
          { key: "you", label: "Users", icon: UserRound, avatar: { name: "Karim Ahmed" } },
        ]}
      />,
      { locale: "en" },
    );
    expect(screen.getByText("Chat")).toBeTruthy();
    expect(screen.getByText("Users")).toBeTruthy();
    expect(screen.getByLabelText("Chat, 3")).toBeTruthy();
    // You tab without photo: silhouette placeholder, not initials.
    expect(screen.queryByText("KA")).toBeNull();
    expect(screen.getByRole("image", { name: "Karim Ahmed" })).toBeTruthy();
    fireEvent.press(screen.getByRole("tab", { name: "Users" }));
    expect(onChange).toHaveBeenCalledWith("you");
  });

  it("renders Bengali tab labels", async () => {
    await renderUi(
      <FloatingTabBar
        accessibilityLabel="Main"
        active="chat"
        onChange={() => {}}
        tabs={[{ key: "chat", label: "চ্যাট", icon: MessageCircle }]}
      />,
      { locale: "bn" },
    );
    expect(screen.getByText("চ্যাট")).toBeTruthy();
  });

  it("marks the active tab selected for a11y", async () => {
    await renderUi(
      <FloatingTabBar
        accessibilityLabel="Main"
        active="chat"
        onChange={() => {}}
        tabs={[
          { key: "feeds", label: "Feeds", icon: MessageCircle },
          { key: "chat", label: "Chat", icon: MessageCircle },
        ]}
      />,
      { locale: "en" },
    );
    expect(screen.getByRole("tab", { name: "Chat", selected: true })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Feeds", selected: false })).toBeTruthy();
  });
});
