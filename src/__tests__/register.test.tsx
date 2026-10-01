import { fireEvent, screen, waitFor } from "@testing-library/react-native";

// Kept outside src/app: expo-router would treat any file there as a route.
import RegisterScreen from "@/app/register";
import { renderUi } from "@/test/render";

// The sign-up landing (owner requirement 2026-10-01): title, subtitle, the "Create account" CTA
// into the onboarding wizard, and the "Sign in" cross-link to /login.
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  Redirect: () => null,
  usePathname: () => "/register",
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("RegisterScreen", () => {
  it("renders the sign-up landing", async () => {
    await renderUi(<RegisterScreen />);
    expect(screen.getByRole("heading", { name: "আপনার অ্যাকাউন্ট খুলুন" })).toBeOnTheScreen();
    expect(screen.getByText(/স্কুলে যাচাই হওয়ার পরেই/)).toBeOnTheScreen();
    expect(screen.getByText("অ্যাকাউন্ট তৈরি করুন")).toBeOnTheScreen();
    expect(screen.getByText("আগে থেকেই অ্যাকাউন্ট আছে?")).toBeOnTheScreen();
    expect(screen.getByText("সাইন ইন করুন")).toBeOnTheScreen();
  });

  it("continues into onboarding from the CTA", async () => {
    await renderUi(<RegisterScreen />);
    await fireEvent.press(screen.getByTestId("register-cta"));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/(onboarding)/language");
    });
  });

  it("cross-links to /login", async () => {
    await renderUi(<RegisterScreen />);
    await fireEvent.press(screen.getByTestId("register-signin-link"));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });
});
