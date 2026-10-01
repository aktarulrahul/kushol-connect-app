import { fireEvent, screen, waitFor } from "@testing-library/react-native";

// Kept outside src/app: expo-router would treat any file there as a route.
import HierarchyScreen from "@/app/(onboarding)/hierarchy";
import { fixtureFlags, resetFixtureAuth } from "@/fixtures/auth";
import { useOnboardingStore } from "@/lib/onboarding/onboarding-store";
import { renderUi } from "@/test/render";

// The four-cascade hierarchy picker + school-request sheet (owner requirement 2026-10-01):
// City → School → Class → Section dropdowns, a city change resets the downstream picks, and
// "Can't find your school?" opens the request form whose POC phone reuses the shared BD
// mobile validation; success shows the confirmation copy and returns to the step with a notice.
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  Redirect: () => null,
  usePathname: () => "/(onboarding)/hierarchy",
}));

beforeEach(() => {
  jest.clearAllMocks();
  resetFixtureAuth();
  useOnboardingStore.getState().reset();
});

describe("hierarchy cascade", () => {
  it("walks city → school → class → section with derived class levels", async () => {
    await renderUi(<HierarchyScreen />);

    await fireEvent.press(await screen.findByLabelText("শহর"));
    await fireEvent.press(await screen.findByText("ঢাকা"));
    await fireEvent.press(await screen.findByLabelText("স্কুল"));
    await fireEvent.press(await screen.findByText("ডেমো উচ্চ বিদ্যালয়"));

    // Class options come from the school's sections (6, 9, 10) — nothing else:
    await fireEvent.press(await screen.findByLabelText("শ্রেণি"));
    expect(await screen.findByText("শ্রেণি ৬")).toBeOnTheScreen();
    expect(screen.getByText("শ্রেণি ৯")).toBeOnTheScreen();
    expect(screen.getByText("শ্রেণি ১০")).toBeOnTheScreen();
    expect(screen.queryByText("শ্রেণি ৭")).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByText("শ্রেণি ৯"));
    await fireEvent.press(await screen.findByLabelText("শাখা"));
    expect(await screen.findByText("শাখা A")).toBeOnTheScreen();
    expect(screen.getByText("শাখা B")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("শাখা A"));
    await waitFor(() => {
      expect(useOnboardingStore.getState().draft).toMatchObject({
        cityId: "city_dhaka",
        schoolId: "school_demo_high",
        classLevel: 9,
        sectionId: "sec_9_a_demo_high",
      });
    });
  });

  it("resets school, class and section when the city changes", async () => {
    await renderUi(<HierarchyScreen />);

    await fireEvent.press(await screen.findByLabelText("শহর"));
    await fireEvent.press(await screen.findByText("ঢাকা"));
    await fireEvent.press(await screen.findByLabelText("স্কুল"));
    await fireEvent.press(await screen.findByText("ডেমো উচ্চ বিদ্যালয়"));
    await fireEvent.press(await screen.findByLabelText("শ্রেণি"));
    await fireEvent.press(await screen.findByText("শ্রেণি ৯"));

    await fireEvent.press(await screen.findByLabelText("শহর"));
    await fireEvent.press(await screen.findByText("চট্টগ্রাম"));

    await waitFor(() => {
      const draft = useOnboardingStore.getState().draft;
      expect(draft.cityId).toBe("city_chattogram");
      expect(draft.schoolId).toBeNull();
      expect(draft.classLevel).toBeNull();
      expect(draft.sectionId).toBeNull();
    });
    // And the Chattogram master data loads into the school dropdown:
    expect(await screen.findByText("ডেমো পাবলিক স্কুল")).toBeOnTheScreen();
  });
});

describe("school request", () => {
  const openSheet = async () => {
    await fireEvent.press(await screen.findByLabelText("শহর"));
    await fireEvent.press(await screen.findByText("ঢাকা"));
    await fireEvent.press(await screen.findByTestId("school-request-open"));
  };

  it("shows the phone error for an invalid POC number, then the confirmation on success", async () => {
    await renderUi(<HierarchyScreen />);
    await openSheet();

    fireEvent.changeText(await screen.findByLabelText("প্রতিষ্ঠানের নাম"), "ডেমো কলেজ");
    fireEvent.changeText(screen.getByLabelText("যোগাযোগের ব্যক্তির নাম"), "ডেমো পিওসি");
    fireEvent.changeText(screen.getByLabelText("যোগাযোগের মোবাইল নম্বর"), "12345");
    fireEvent.press(screen.getByTestId("school-request-submit"));

    expect(await screen.findByText("সঠিক মোবাইল নম্বর দিন (যেমন 01712345678)")).toBeOnTheScreen();
    expect(screen.queryByText("আবেদন জমা হয়েছে")).not.toBeOnTheScreen();

    fireEvent.changeText(screen.getByLabelText("যোগাযোগের মোবাইল নম্বর"), "01812345678");
    fireEvent.press(screen.getByTestId("school-request-submit"));

    expect(await screen.findByText("আবেদন জমা হয়েছে")).toBeOnTheScreen();
    expect(screen.getByText(/আবেদন অ্যাডমিন প্রতিষ্ঠানটি যুক্ত করতে/)).toBeOnTheScreen();
  });

  it("returns to the hierarchy step with a notice after the confirmation", async () => {
    await renderUi(<HierarchyScreen />);
    await openSheet();

    fireEvent.changeText(await screen.findByLabelText("প্রতিষ্ঠানের নাম"), "ডেমো কলেজ");
    fireEvent.changeText(screen.getByLabelText("যোগাযোগের ব্যক্তির নাম"), "ডেমো পিওসি");
    fireEvent.changeText(screen.getByLabelText("যোগাযোগের মোবাইল নম্বর"), "01812345678");
    fireEvent.press(screen.getByTestId("school-request-submit"));
    await screen.findByText("আবেদন জমা হয়েছে");

    fireEvent.press(screen.getByTestId("school-request-back"));
    expect(
      await screen.findByText(
        "আবেদন পাওয়া গেছে — প্রতিষ্ঠানটি যুক্ত হলেই আপনি এগিয়ে যেতে পারবেন।",
      ),
    ).toBeOnTheScreen();
  });

  it("surfaces the conflict copy when a request for the institution already exists", async () => {
    fixtureFlags.setSchoolRequest("conflict");
    await renderUi(<HierarchyScreen />);
    await openSheet();

    fireEvent.changeText(await screen.findByLabelText("প্রতিষ্ঠানের নাম"), "ডেমো কলেজ");
    fireEvent.changeText(screen.getByLabelText("যোগাযোগের ব্যক্তির নাম"), "ডেমো পিওসি");
    fireEvent.changeText(screen.getByLabelText("যোগাযোগের মোবাইল নম্বর"), "01812345678");
    fireEvent.press(screen.getByTestId("school-request-submit"));

    expect(
      await screen.findByText(/এই প্রতিষ্ঠানের জন্য আবেদন আগেই জমা আছে/),
    ).toBeOnTheScreen();
  });
});
