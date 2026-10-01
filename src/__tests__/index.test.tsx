import { fireEvent, screen } from "@testing-library/react-native";

// Kept outside src/app: expo-router would treat any file there as a route.
import Index from "@/app/index";
import { renderUi } from "@/test/render";

// The dev-only api card has its own tests; here it would make a real request.
jest.mock("@/dev/dev-status", () => ({ DevStatus: () => null }));

// DSN-IT-002 (app root render) + DSN-E2E-001 logic: bn by default, en on toggle.
it("renders the holding screen in Bengali and switches to English", async () => {
  await renderUi(<Index />);
  expect(screen.getByRole("heading", { name: "কুশল কানেক্ট" })).toBeOnTheScreen();
  expect(screen.getByText("শীঘ্রই আসছে")).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole("tab", { name: "English" }));
  expect(await screen.findByText("Coming soon")).toBeOnTheScreen();
  expect(screen.getByRole("tab", { name: "English" })).toBeSelected();
});
