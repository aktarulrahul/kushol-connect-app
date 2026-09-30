// Config plugin: adopt the UIScene life cycle on iOS.
//
// iOS 27 stops apps built with its SDK from launching unless they use scenes (the app traps in
// UIKit's "NoSceneLifecycleAdoption" check). Expo 57.0.26 ships the scene delegate
// (ExpoAppSceneDelegate, "Required by the iOS 27") but its prebuild template (57.0.28) still
// creates the window in AppDelegate. This plugin wires the two together on every prebuild, so
// ios/ stays generated (CNG). Delete it once Expo's template does this itself.
const { withAppDelegate, withInfoPlist } = require("expo/config-plugins");

const TEMPLATE_CLASS = "class AppDelegate: ExpoAppDelegate {";
// The template's window creation + React Native start; the scene delegate does both instead.
const TEMPLATE_START =
  /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;

function withSceneManifest(config) {
  return withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            // @objc name of expo's ExpoAppSceneDelegate
            UISceneDelegateClassName: "EXExpoAppSceneDelegate",
          },
        ],
      },
    };
    return c;
  });
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (c) => {
    let src = c.modResults.contents;
    if (src.includes("ExpoReactNativeFactoryProvider")) return c; // already applied
    if (
      c.modResults.language !== "swift" ||
      !src.includes(TEMPLATE_CLASS) ||
      !TEMPLATE_START.test(src)
    ) {
      throw new Error(
        "with-ios-scene-lifecycle: AppDelegate.swift no longer matches the Expo 57 template — " +
          "check whether Expo now adopts scenes itself and remove or update this plugin.",
      );
    }
    src = src
      .replace(
        TEMPLATE_CLASS,
        "class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {",
      )
      .replace(
        TEMPLATE_START,
        "\n    // Window + React Native start in ExpoAppSceneDelegate (UIScene life cycle, required by iOS 27).\n",
      );
    c.modResults.contents = src;
    return c;
  });
}

module.exports = function withIosSceneLifecycle(config) {
  return withSceneAppDelegate(withSceneManifest(config));
};
