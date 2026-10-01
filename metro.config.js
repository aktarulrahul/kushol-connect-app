const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// inlineRem 16 keeps NativeWind's rem equal to the web's (p-4 = 16px on both platforms).
module.exports = withNativeWind(getDefaultConfig(__dirname), {
  input: "./global.css",
  inlineRem: 16,
});
