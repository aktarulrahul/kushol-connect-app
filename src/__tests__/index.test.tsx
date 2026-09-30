import { render, screen } from "@testing-library/react-native";

// Kept outside src/app: expo-router would treat any file there as a route.
import Index from "@/app/index";

// The dev-only api card has its own tests; here it would make a real request.
jest.mock("@/dev/dev-status", () => ({ DevStatus: () => null }));

it("renders the placeholder header", async () => {
  await render(<Index />);
  expect(screen.getByRole("header")).toHaveTextContent("কুশল CONNECT");
});
