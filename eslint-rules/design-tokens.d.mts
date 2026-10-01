import type { Rule } from "eslint";

declare const plugin: {
  meta: { name: string };
  rules: { "no-raw-design-values": Rule.RuleModule };
};
export default plugin;
