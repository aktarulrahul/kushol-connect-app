import { waitFor } from "@testing-library/react-native";

// Kept outside src/app: expo-router would treat any file there as a route.
import TabsLayout from "@/app/(tabs)/_layout";
import SettingsScreen from "@/app/settings";
import VerificationPendingScreen from "@/app/verification-pending";
import { renderUi } from "@/test/render";
import { useAuthStore } from "@/lib/auth/auth-store";

// The auth gates (owner requirement 2026-10-01): status "anon" (after hydrate) is redirected to
// /login from the tabs, the pending screen and settings — while PENDING users keep using both
// the pending screen and settings.
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
