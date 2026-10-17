import { fireEvent, screen, waitFor } from "@testing-library/react-native";

// Kept outside src/app: expo-router would treat any file there as a route.
import LoginScreen from "@/app/login";
import LanguageScreen from "@/app/(onboarding)/language";
import { renderUi } from "@/test/render";
import { useAuthStore } from "@/lib/auth/auth-store";
import { requestOtpLive, resendOtpLive, verifyOtpLive } from "@/lib/auth/live-otp";
import { useOnboardingStore } from "@/lib/onboarding/onboarding-store";
import type { User } from "@/fixtures/auth";

// Cross-navigation (owner requirement 2026-10-01): the login screen's register hint now opens
// /register (not the wizard directly), and the language step links back to /login.
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  Redirect: () => null,
  usePathname: () => "/login",
}));

// The live OTP transport is faked: no request leaves the test, and no SMS is ever sent.
jest.mock("@/lib/auth/live-otp", () => ({
  requestOtpLive: jest.fn(),
  resendOtpLive: jest.fn(),
  verifyOtpLive: jest.fn(),
}));
const mockRequest = jest.mocked(requestOtpLive);
const mockResend = jest.mocked(resendOtpLive);
const mockVerify = jest.mocked(verifyOtpLive);
const mockSignIn = jest.fn();
const realSignIn = useAuthStore.getState().signIn;

const sentResult = {
  sentAt: "2026-10-17T10:00:00.000Z",
  cooldownSeconds: 60,
  channel: "sms" as const,
};
const verifiedUser: User = {
  id: "user_login_1",
  role: "super_admin",
  status: "VERIFIED",
  locale: "en",
  fullName: "Aktarul Islam",
  maskedPhone: "+8801XXXXXX013",
  schoolId: null,
  isAmbassador: false,
  plan: "pro",
};

beforeEach(() => {
  jest.clearAllMocks();
  useOnboardingStore.getState().reset();
  useAuthStore.setState({ me: null, status: "anon", stale: false, signIn: realSignIn });
});

describe("login ↔ register cross-navigation", () => {
  it("shows the animated verification illustration (owner request 2026-10-01)", async () => {
    await renderUi(<LoginScreen />);
    // Decorative — hidden from assistive tech, hence includeHiddenElements:
    expect(
      screen.getByTestId("auth-illustration-hero", { includeHiddenElements: true }),
    ).toBeOnTheScreen();
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

// Phone (SMS) OTP sign-in — app only (owner rule 2026-10-17): BD number validation, the first send
// starts the 60 s resend cooldown, a verified code signs in, and the user can change the number.
describe("phone OTP sign-in", () => {
  beforeEach(() => {
    useAuthStore.setState({ signIn: mockSignIn });
    mockRequest.mockResolvedValue(sentResult);
  });

  it("refuses a non-BD number without calling the api", async () => {
    await renderUi(<LoginScreen />, { locale: "en" });
    await fireEvent.changeText(screen.getByLabelText("Mobile number"), "12345");
    await fireEvent.press(screen.getByTestId("login-send-code"));
    expect(
      await screen.findByText("Enter a valid Bangladeshi mobile number (e.g. 01712345678)"),
    ).toBeOnTheScreen();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it("sends to the normalized number, holds resend for the cooldown, then signs in", async () => {
    mockVerify.mockResolvedValue({
      status: "ok",
      accessToken: "access_test",
      refreshToken: "refresh_test",
      user: verifiedUser,
    });
    await renderUi(<LoginScreen />, { locale: "en" });
    await fireEvent.changeText(screen.getByLabelText("Mobile number"), "01776300013");
    await fireEvent.press(screen.getByTestId("login-send-code"));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith({ phone: "+8801776300013", purpose: "login" }, "en");
    });
    // The login screen's send is the first send: resend waits out the cooldown, no auto-resend.
    expect(await screen.findByText("Resend in 60s")).toBeOnTheScreen();
    expect(screen.getByText("Sent to +8801776300013")).toBeOnTheScreen();
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockResend).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText("6-digit OTP code"), "123456");
    await fireEvent.press(screen.getByText("Verify"));
    await waitFor(() => {
      expect(mockVerify).toHaveBeenCalledWith(
        { phone: "+8801776300013", otpCode: "123456", purpose: "login" },
        "en",
      );
    });
    expect(mockSignIn).toHaveBeenCalledWith(verifiedUser, {
      accessToken: "access_test",
      refreshToken: "refresh_test",
    });
    expect(mockReplace).toHaveBeenCalledWith("/chat");
  });

  it("goes back to number entry on an unknown number and on 'use a different number'", async () => {
    mockVerify.mockResolvedValue({ status: "unknown_phone" });
    await renderUi(<LoginScreen />, { locale: "en" });
    await fireEvent.changeText(screen.getByLabelText("Mobile number"), "01712345678");
    await fireEvent.press(screen.getByTestId("login-send-code"));

    await fireEvent.press(await screen.findByTestId("login-change-target"));
    expect(await screen.findByLabelText("Mobile number")).toBeOnTheScreen();
    expect(screen.queryByLabelText("6-digit OTP code")).toBeNull();

    await fireEvent.press(screen.getByTestId("login-send-code"));
    await fireEvent.changeText(await screen.findByLabelText("6-digit OTP code"), "654321");
    await fireEvent.press(screen.getByText("Verify"));
    expect(await screen.findByLabelText("Mobile number")).toBeOnTheScreen();
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});
