import { screen } from "@testing-library/react-native";

import { AuthIllustration } from "@/components/auth/auth-illustration";
import { renderUi } from "@/test/render";

// The owned verification-scene artwork (owner request 2026-10-01): renders in both size
// variants and stays decorative — hidden from assistive tech.
describe("AuthIllustration", () => {
  it("renders the hero variant", () => {
    renderUi(<AuthIllustration variant="hero" />);
    expect(screen.getByTestId("auth-illustration-hero")).toBeOnTheScreen();
  });

  it("renders the compact variant", () => {
    renderUi(<AuthIllustration variant="compact" />);
    expect(screen.getByTestId("auth-illustration-compact")).toBeOnTheScreen();
  });

  it("is decorative — hidden from screen readers", () => {
    renderUi(<AuthIllustration />);
    const illustration = screen.getByTestId("auth-illustration-hero");
    expect(illustration.props["aria-hidden"]).toBe(true);
    expect(illustration.props.accessibilityElementsHidden).toBe(true);
  });
});
