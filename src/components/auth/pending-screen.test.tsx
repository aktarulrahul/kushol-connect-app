import { act, screen, waitFor } from "@testing-library/react-native";

import { PendingScreen } from "@/components/auth/pending-screen";
import { renderUi } from "@/test/render";
import {
  fixtureApproveCurrentUser,
  fixtureRejectCurrentUser,
  fixtureSession,
  register,
  requestOtp,
  resetFixtureAuth,
  verifyOtp,
} from "@/fixtures/auth";
import { useAuthStore } from "@/lib/auth/auth-store";

// IDT-AP-008 — the pending gate content: numbered explainer for PENDING, rejected reason +
// resubmit, and the mid-session open (VERIFIED → toast + tabs, no re-login).
jest.setTimeout(30_000);

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  Redirect: () => null,
  usePathname: () => "/verification-pending",
}));

async function seedPendingSession() {
  resetFixtureAuth();
  await requestOtp({ phone: "+8801712345678" });
  await verifyOtp({ phone: "+8801712345678", otpCode: "123456", purpose: "register" });
  const result = await register({
    locale: "bn",
    role: "student",
    fullName: "ডেমো শিক্ষার্থী",
    phone: "+8801712345678",
    schoolId: "school_demo_high",
    sectionId: "sec_10_a_demo_high",
  });
  useAuthStore.setState({ me: result.user, status: "authed", stale: false });
  return result.user;
}

beforeEach(() => {
  jest.clearAllMocks();
  resetFixtureAuth();
  useAuthStore.setState({ me: null, status: "anon", stale: false });
});

describe("PendingScreen", () => {
  it("explains what happens now for a PENDING account", async () => {
    await seedPendingSession();
    await renderUi(<PendingScreen />);

    expect(await screen.findByText("অ্যাকাউন্ট যাচাই চলছে")).toBeOnTheScreen();
    expect(screen.getByText("এখন কী হবে?")).toBeOnTheScreen();
    expect(screen.getByText("আপনার তথ্য স্কুল ভেরিফায়ারের কাছে যাবে")).toBeOnTheScreen();
    expect(screen.getByText("সেটিংস")).toBeOnTheScreen();
    expect(screen.getByText("লগআউট")).toBeOnTheScreen();
  });

  it("shows the rejection reason with a resubmit path", async () => {
    await seedPendingSession();
    fixtureRejectCurrentUser("নাম ও আইডি মিলছে না");
    await renderUi(<PendingScreen />);

    expect(await screen.findByText("আবেদন ফেরত পাঠানো হয়েছে")).toBeOnTheScreen();
    expect(screen.getByText(/নাম ও আইডি মিলছে না/)).toBeOnTheScreen();
    expect(screen.getByText("ঠিক করে আবার জমা দিন")).toBeOnTheScreen();
  });

  it("opens the tabs mid-session once the status flips to VERIFIED", async () => {
    await seedPendingSession();
    await renderUi(<PendingScreen />);
    await screen.findByText("অ্যাকাউন্ট যাচাই চলছে");

    fixtureApproveCurrentUser(); // the School Admin approves in 07
    await act(() => {
      useAuthStore.setState({ me: fixtureSession().user }); // what the ≤30 s status poll delivers
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/chat");
    });
  });
});
