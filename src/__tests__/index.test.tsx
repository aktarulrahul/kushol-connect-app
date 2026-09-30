import { render, screen } from "@testing-library/react-native";

// Kept outside src/app: expo-router would treat any file there as a route.
import Index from "@/app/index";

it("renders the placeholder header", async () => {
  await render(<Index />);
  expect(screen.getByRole("header")).toHaveTextContent("কুশল CONNECT");
});
