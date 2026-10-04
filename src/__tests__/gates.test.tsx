import { waitFor } from "@testing-library/react-native";

// Kept outside src/app: expo-router would treat any file there as a route.
import TabsLayout from "@/app/(tabs)/_layout";
import Index from "@/app/index";
import LoginScreen from "@/app/login";
import SettingsScreen from "@/app/settings";
import VerificationPendingScreen from "@/app/verification-pending";
import { renderUi } from "@/test/render";
import { useAuthStore } from "@/lib/auth/auth-store";
import type { User } from "@/fixtures/auth";

// The auth gates (owner requirement 2026-10-01): status "anon" (after hydrate) is redirected to
// /login from the tabs, the pending screen and settings — while PENDING users keep using both
// the pending screen and settings. Cold-start restore must not paint /login before ready.
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRedirects: string[] = [];
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  Redirect: (props: { href: string }) => {
    mockRedirects.push(props.href);
    return null;
  },
  usePathname: () => "/chat",
}));

const verifiedMe: User = {
  id: "u_gate",
  fullName: "Gate User",
  role: "student",
  status: "VERIFIED",
  locale: "bn",
  isAmbassador: false,
  plan: "free",
};

const pendingMe: User = { ...verifiedMe, id: "u_pending", status: "PENDING" };

beforeEach(() => {
  jest.clearAllMocks();
  mockRedirects.length = 0;
  useAuthStore.setState({ me: null, status: "idle", stale: false });
});

describe("anon gates", () => {
  it("the tabs gate redirects an anon visitor to /login", async () => {
    useAuthStore.setState({ status: "anon" });
    await renderUi(<TabsLayout />);
    await waitFor(() => {
      expect(mockRedirects).toContain("/login");
    });
  });

  it("the pending screen redirects an anon visitor to /login", async () => {
    useAuthStore.setState({ status: "anon" });
    await renderUi(<VerificationPendingScreen />);
    await waitFor(() => {
      expect(mockRedirects).toContain("/login");
    });
  });

  it("settings redirects an anon visitor to /login", async () => {
    useAuthStore.setState({ status: "anon" });
    await renderUi(<SettingsScreen />);
    await waitFor(() => {
      expect(mockRedirects).toContain("/login");
    });
  });
});

describe("restore gate", () => {
  it("loading does not redirect to login from the entry or login routes", async () => {
    useAuthStore.setState({ status: "checking", me: null });
    const entry = await renderUi(<Index />);
    expect(mockRedirects).not.toContain("/login");
    expect(mockRedirects).not.toContain("/chat");
    expect(entry.queryByText("লগইন করুন")).toBeNull();
    expect(entry.queryByText("শুরু করুন")).toBeNull();

    mockRedirects.length = 0;
    const login = await renderUi(<LoginScreen />);
    expect(mockRedirects).not.toContain("/login");
    expect(mockRedirects).not.toContain("/chat");
    // Login form CTAs must not paint while restore is still running.
    expect(login.queryByTestId("login-register-hint")).toBeNull();
    expect(login.queryByText("লগইন করুন")).toBeNull();
  });

  it("a restored verified session replaces entry and login with chat", async () => {
    useAuthStore.setState({ status: "authed", me: verifiedMe });
    await renderUi(<Index />);
    await waitFor(() => {
      expect(mockRedirects).toContain("/chat");
    });
    expect(mockRedirects).not.toContain("/login");

    mockRedirects.length = 0;
    await renderUi(<LoginScreen />);
    await waitFor(() => {
      expect(mockRedirects).toContain("/chat");
    });
    expect(mockRedirects).not.toContain("/login");
  });

  it("a restored pending session replaces entry with verification-pending", async () => {
    useAuthStore.setState({ status: "authed", me: pendingMe });
    await renderUi(<Index />);
    await waitFor(() => {
      expect(mockRedirects).toContain("/verification-pending");
    });
    expect(mockRedirects).not.toContain("/login");
  });

  it("tabs stay on the skeleton while restore is still loading", async () => {
    useAuthStore.setState({ status: "checking", me: null });
    await renderUi(<TabsLayout />);
    expect(mockRedirects).not.toContain("/login");
  });
});
