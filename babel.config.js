// NativeWind v4: className → styles at build time (jsxImportSource), plus its preset (which also
// registers the Reanimated/Worklets plugin).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
  };
};
