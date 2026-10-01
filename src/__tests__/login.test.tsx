import { fireEvent, screen, waitFor } from "@testing-library/react-native";

// Kept outside src/app: expo-router would treat any file there as a route.
import LoginScreen from "@/app/login";
import LanguageScreen from "@/app/(onboarding)/language";
import { renderUi } from "@/test/render";
import { useOnboardingStore } from "@/lib/onboarding/onboarding-store";

// Cross-navigation (owner requirement 2026-10-01): the login screen's register hint now opens
// /register (not the wizard directly), and the language step links back to /login.
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  Redirect: () => null,
  usePathname: () => "/login",
}));

beforeEach(() => {
  jest.clearAllMocks();
  useOnboardingStore.getState().reset();
});

describe("login ↔ register cross-navigation", () => {
  it("shows the animated verification illustration (owner request 2026-10-01)", async () => {
    await renderUi(<LoginScreen />);
    expect(screen.getByTestId("auth-illustration-hero")).toBeOnTheScreen();
  });

  it("routes the register hint to /register", async () => {
    await renderUi(<LoginScreen />);
    await fireEvent.press(screen.getByTestId("login-register-hint"));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/register");
    });
  });

  it("links back to /login from the language step", async () => {
    await renderUi(<LanguageScreen />);
    await fireEvent.press(screen.getByTestId("language-signin-link"));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
    expect(screen.getByText("আগে থেকেই অ্যাকাউন্ট আছে?")).toBeOnTheScreen();
  });
});
