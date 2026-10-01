// Local ESLint plugin: DSN-BR-002 / DSN-INT-002 — feature code uses design tokens only.
// Raw colours, pixel/rem sizes and font families belong in src/theme (and the vendored
// src/components/ui primitives); everywhere else they fail lint. The web repo runs the same rule
// (its own copy in eslint-rules/design-tokens.mjs); the style keys cover React Native names.

const COLOR_FN = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(/i;
const HEX = /(^|[^\w&])#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b/i;
// Tailwind arbitrary values carrying raw colours or lengths: bg-[#123], p-[13px], text-[1.1rem]…
const ARBITRARY =
  /\[(?:#|(?:rgba?|hsla?|oklch|oklab|color-mix)\(|-?\d*\.?\d+(?:px|rem|em|pt|vh|vw)\b)/i;
const ARBITRARY_FONT = /\bfont-\[/;

// Style-object keys whose numeric literal values are raw sizes.
const SIZE_KEY =
  /^(?:margin|padding)(?:Top|Right|Bottom|Left|Horizontal|Vertical|Block|Inline|Start|End)?$|^(?:gap|rowGap|columnGap|fontSize|lineHeight|letterSpacing|borderRadius|border(?:Top|Bottom)(?:Left|Right)Radius)$/;
const COLOR_KEY = /color$/i;
const KEYWORD = /^(?:inherit|initial|unset|currentcolor|transparent)$/i;

function checkString(context, node, value) {
  if (ARBITRARY.test(value)) {
    context.report({ node, messageId: "arbitrary" });
  } else if (ARBITRARY_FONT.test(value)) {
    context.report({ node, messageId: "font" });
  } else if (HEX.test(value) || COLOR_FN.test(value)) {
    context.report({ node, messageId: "color" });
  }
}

function keyName(property) {
  if (property.key.type === "Identifier") return property.key.name;
  if (property.key.type === "Literal") return String(property.key.value);
  return undefined;
}

/** @type {import("eslint").Rule.RuleModule} */
const noRawDesignValues = {
  meta: {
    type: "problem",
    docs: {
      description: "Use design tokens instead of raw colours, sizes and fonts (DSN-INT-002)",
    },
    messages: {
      color: "Raw colour — use a token (e.g. text-primary, bg-muted, color.primary) (DSN-INT-002).",
      arbitrary:
        "Arbitrary Tailwind value with a raw colour or length — use a token class (DSN-INT-002).",
      font: "Raw font family — fonts come from the theme (font-bn / font-en) (DSN-INT-002).",
      size: "Raw size `{{key}}: {{value}}` — use a spacing/type/radius token (DSN-INT-002).",
    },
    schema: [],
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value === "string") checkString(context, node, node.value);
      },
      TemplateElement(node) {
        checkString(context, node, node.value.cooked ?? node.value.raw);
      },
      Property(node) {
        const key = keyName(node);
        if (!key) return;
        if (key === "fontFamily") {
          context.report({ node, messageId: "font" });
          return;
        }
        const value = node.value;
        if (
          SIZE_KEY.test(key) &&
          value.type === "Literal" &&
          typeof value.value === "number" &&
          value.value !== 0
        ) {
          context.report({ node, messageId: "size", data: { key, value: String(value.value) } });
        }
        if (
          COLOR_KEY.test(key) &&
          value.type === "Literal" &&
          typeof value.value === "string" &&
          !KEYWORD.test(value.value) &&
          !HEX.test(value.value) && // the Literal visitor already reports these
          !COLOR_FN.test(value.value)
        ) {
          context.report({ node: value, messageId: "color" }); // named colours: "red", "teal"…
        }
      },
    };
  },
};

export default {
  meta: { name: "design-tokens" },
  rules: { "no-raw-design-values": noRawDesignValues },
};
