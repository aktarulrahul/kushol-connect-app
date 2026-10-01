import { act, fireEvent, screen } from "@testing-library/react-native";
import { useState } from "react";
import { AccessibilityInfo } from "react-native";

import { renderUi } from "@/test/render";

import { VerifiedBadge } from "./badge";
import { Button } from "./button";
import { EmptyState, ErrorState } from "./empty-state";
import { UnreadBadge } from "./indicators";
import { ListRow } from "./list-row";
import { normaliseDigits, OtpInput } from "./otp-input";
import { LanguageToggle, SegmentedPill } from "./segmented-pill";
import { Sheet } from "./sheet";
import { Text } from "./text";
import { TextField, ToggleField } from "./text-field";
import { useToast } from "./toast";
import { initials, UserAvatar } from "./user-avatar";

// DSN-UT-004 — RN primitives: fonts by script, states, accessible names, both languages, bn +30%.

const longBn = "বিদ্যালয়ের সব অভিভাবককে জরুরি বিজ্ঞপ্তি পাঠান";

type Style = Record<string, unknown>;

function flatStyle(node: { props: { style?: unknown } }): Style {
  const flatten = (s: unknown): Style =>
    Array.isArray(s)
      ? (s as unknown[]).reduce<Style>((acc, x) => ({ ...acc, ...flatten(x) }), {})
      : ((s ?? {}) as Style);
  return flatten(node.props.style);
}

describe("Text", () => {
  it("sets Bengali in Hind Siliguri and Latin in Inter, with the matching speech language", async () => {
    await renderUi(
      <>
        <Text className="font-semibold">{longBn}</Text>
        <Text>Demo High School</Text>
      </>,
    );
    const bn = screen.getByText(longBn);
    expect(flatStyle(bn).fontFamily).toBe("HindSiliguri_600SemiBold");
    expect(bn.props.accessibilityLanguage).toBe("bn-BD");
    const en = screen.getByText("Demo High School");
    expect(flatStyle(en).fontFamily).toBe("Inter_400Regular");
    expect(en.props.accessibilityLanguage).toBe("en-US");
  });

  it("never caps the line count of a long Bangla label", async () => {
    await renderUi(
      <Button>
        <Text>{longBn}</Text>
      </Button>,
    );
    expect(screen.getByText(longBn).props.numberOfLines).toBeUndefined();
  });
});

describe("Button", () => {
  it("presses", async () => {
    const onPress = jest.fn();
    await renderUi(
      <Button onPress={onPress}>
        <Text>সংরক্ষণ করুন</Text>
      </Button>,
    );
    await fireEvent.press(screen.getByRole("button", { name: "সংরক্ষণ করুন" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("while loading is busy and disabled", async () => {
    const onPress = jest.fn();
    await renderUi(
      <Button onPress={onPress} loading>
        <Text>সংরক্ষণ করুন</Text>
      </Button>,
    );
    const busy = screen.getByRole("button");
    expect(busy).toBeBusy();
    expect(busy).toBeDisabled();
    await fireEvent.press(busy);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("TextField", () => {
  it("labels the input and announces a new error", async () => {
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    function Form() {
      const [error, setError] = useState<string>();
      return (
        <>
          <TextField label="শিক্ষার্থীর নাম" {...(error ? { error } : {})} />
          <Button
            onPress={() => {
              setError("এই ঘরটি পূরণ করুন");
            }}
          >
            <Text>জমা দিন</Text>
          </Button>
        </>
      );
    }
    await renderUi(<Form />);
    expect(screen.getByLabelText("শিক্ষার্থীর নাম")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "জমা দিন" }));
    expect(await screen.findByText("এই ঘরটি পূরণ করুন")).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledWith("এই ঘরটি পূরণ করুন");
  });

  it("toggle rows are one checkbox/switch target with state", async () => {
    function Toggles() {
      const [on, setOn] = useState(false);
      return (
        <ToggleField
          kind="switch"
          label="Push notifications"
          checked={on}
          onCheckedChange={setOn}
        />
      );
    }
    await renderUi(<Toggles />);
    const row = screen.getByRole("switch", { name: "Push notifications" });
    expect(row).not.toBeChecked();
    await fireEvent.press(row);
    expect(screen.getByRole("switch", { name: "Push notifications" })).toBeChecked();
  });
});

describe("OtpInput", () => {
  it("accepts Bengali digits and completes at six", async () => {
    expect(normaliseDigits("১২৩ 4৫৬")).toBe("123456");
    const onComplete = jest.fn();
    function Otp() {
      const [code, setCode] = useState("");
      return (
        <OtpInput
          value={code}
          onChange={setCode}
          onComplete={onComplete}
          accessibilityLabel="যাচাই কোড"
        />
      );
    }
    await renderUi(<Otp />);
    await fireEvent.changeText(screen.getByLabelText("যাচাই কোড"), "১২৩৪৫৬");
    expect(onComplete).toHaveBeenCalledWith("123456");
    expect(screen.getByText("6")).toBeOnTheScreen();
  });
});

describe("identity & lists", () => {
  it("initials keep whole Bengali graphemes; the avatar is one named image", async () => {
    expect(initials("কুশল")).toBe("কু");
    expect(initials("নমুনা শিক্ষার্থী")).toBe("নশি");
    await renderUi(<UserAvatar name="Demo Teacher" verified />, { locale: "en" });
    expect(screen.getByRole("image", { name: "Demo Teacher — Verified" })).toBeOnTheScreen();
  });

  it("unread counts use the locale's digits and cap at 99+", async () => {
    await renderUi(
      <>
        <UnreadBadge count={7} />
        <UnreadBadge count={240} />
        <UnreadBadge count={0} />
      </>,
    );
    expect(screen.getByText("৭")).toBeOnTheScreen();
    expect(screen.getByText("৯৯+")).toBeOnTheScreen();
  });

  it("ListRow is pressable and shows the unread badge", async () => {
    const onPress = jest.fn();
    await renderUi(
      <ListRow
        title="দশম শ্রেণি"
        preview="নমুনা শিক্ষক: আগামীকাল ক্লাস হবে"
        unread={3}
        onPress={onPress}
      />,
    );
    await fireEvent.press(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalled();
    expect(screen.getByText("৩")).toBeOnTheScreen();
  });

  it("VerifiedBadge speaks the current language", async () => {
    await renderUi(<VerifiedBadge />, { locale: "en" });
    expect(screen.getByText("Verified")).toBeOnTheScreen();
  });
});

describe("SegmentedPill & LanguageToggle", () => {
  it("exposes tabs with the selected state and switches language", async () => {
    await renderUi(
      <>
        <LanguageToggle />
        <EmptyState />
      </>,
    );
    expect(screen.getByRole("tab", { name: "বাংলা" })).toBeSelected();
    expect(screen.getByText("এখানে এখনো কিছু নেই")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("tab", { name: "English" }));
    expect(await screen.findByText("Nothing here yet")).toBeOnTheScreen();
  });

  it("a filter pill reports changes", async () => {
    const onChange = jest.fn();
    await renderUi(
      <SegmentedPill
        accessibilityLabel="filter"
        value="all"
        onChange={onChange}
        segments={[
          { value: "all", label: "সব" },
          { value: "dms", label: "ডিএম" },
        ]}
      />,
    );
    await fireEvent.press(screen.getByRole("tab", { name: "ডিএম" }));
    expect(onChange).toHaveBeenCalledWith("dms");
  });
});

describe("states, sheets & toasts", () => {
  it("ErrorState offers a retry", async () => {
    const onRetry = jest.fn();
    await renderUi(<ErrorState onRetry={onRetry} />);
    await fireEvent.press(screen.getByRole("button", { name: "আবার চেষ্টা করুন" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("Sheet shows its title; closes from the backdrop (touch) and the escape gesture (AT)", async () => {
    const onOpenChange = jest.fn();
    await renderUi(
      <Sheet open onOpenChange={onOpenChange} title="অভিভাবক সভার নোটিশ">
        <Text>{longBn}</Text>
      </Sheet>,
    );
    const title = screen.getByText("অভিভাবক সভার নোটিশ");
    expect(title).toBeOnTheScreen();
    // The panel is accessibilityViewIsModal, so the backdrop is hidden from screen readers…
    expect(screen.queryByRole("button", { name: "বন্ধ করুন" })).toBeNull();
    await fireEvent.press(
      screen.getByRole("button", { name: "বন্ধ করুন", includeHiddenElements: true }),
    );
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    // …and screen-reader users close it with the escape gesture instead.
    onOpenChange.mockClear();
    const panel = screen.getByText(longBn).parent?.parent;
    if (!panel) throw new Error("panel not found");
    await fireEvent(panel, "accessibilityEscape");
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("toasts are announced and auto-dismiss after 4 s", async () => {
    jest.useFakeTimers();
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    function Trigger() {
      const toast = useToast();
      return (
        <Button
          onPress={() => {
            toast({ title: "নোটিশ সংরক্ষণ করা হয়েছে", variant: "success" });
          }}
        >
          <Text>show</Text>
        </Button>
      );
    }
    await renderUi(<Trigger />);
    await fireEvent.press(screen.getByRole("button", { name: "show" }));
    expect(screen.getByText("নোটিশ সংরক্ষণ করা হয়েছে")).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledWith("নোটিশ সংরক্ষণ করা হয়েছে");
    await act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(screen.queryByText("নোটিশ সংরক্ষণ করা হয়েছে")).toBeNull();
    jest.useRealTimers();
  });
});
