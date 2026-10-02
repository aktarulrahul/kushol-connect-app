import { screen } from "@testing-library/react-native";

import { AuthIllustration } from "@/components/auth/auth-illustration";
import { renderUi } from "@/test/render";

// The owned verification-scene artwork (owner request 2026-10-01): renders in both size
// variants and stays decorative — hidden from assistive tech, so queries must opt into
// includeHiddenElements to see it.
describe("AuthIllustration", () => {
  it("renders the hero variant", async () => {
    await renderUi(<AuthIllustration variant="hero" />);
    expect(
      screen.getByTestId("auth-illustration-hero", { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it("renders the compact variant", async () => {
    await renderUi(<AuthIllustration variant="compact" />);
    expect(
      screen.getByTestId("auth-illustration-compact", { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it("is decorative — hidden from screen readers", async () => {
    await renderUi(<AuthIllustration />);
    const illustration = screen.getByTestId("auth-illustration-hero", {
      includeHiddenElements: true,
    });
    expect(illustration.props["aria-hidden"]).toBe(true);
    expect(illustration.props.accessibilityElementsHidden).toBe(true);
  });
});
