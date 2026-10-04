import { render } from "@testing-library/react-native";
import { Platform, Text, UIManager } from "react-native";

import { GlassSurface, isExpoBlurNativeAvailable, resetExpoBlurNativeCacheForTests } from "./glass-surface";

jest.mock("expo-blur", () => {
  const { View: RNView } = require("react-native");
  return {
    BlurView: () => <RNView testID="expo-blur-view" />,
  };
});

describe("GlassSurface", () => {
  beforeEach(() => {
    resetExpoBlurNativeCacheForTests();
  });

  it("skips BlurView on Android (solid background)", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    const { queryByTestId } = await render(
      <GlassSurface variant="dark">
        <Text>child</Text>
      </GlassSurface>,
    );
    expect(queryByTestId("expo-blur-view")).toBeNull();
    expect(isExpoBlurNativeAvailable()).toBe(false);
  });

  it("uses solid bg-tabbar on iOS when ExpoBlurView is not linked", async () => {
    jest.replaceProperty(Platform, "OS", "ios");
    jest.spyOn(UIManager, "hasViewManagerConfig").mockReturnValue(false);
    const { queryByTestId } = await render(
      <GlassSurface variant="dark">
        <Text>child</Text>
      </GlassSurface>,
    );
    expect(queryByTestId("expo-blur-view")).toBeNull();
    expect(isExpoBlurNativeAvailable()).toBe(false);
  });

  it("renders BlurView on iOS when ExpoBlurView is linked", async () => {
    jest.replaceProperty(Platform, "OS", "ios");
    jest.spyOn(UIManager, "hasViewManagerConfig").mockReturnValue(true);
    const { getByTestId } = await render(
      <GlassSurface variant="light">
        <Text>child</Text>
      </GlassSurface>,
    );
    expect(getByTestId("expo-blur-view")).toBeTruthy();
    expect(isExpoBlurNativeAvailable()).toBe(true);
  });
});
