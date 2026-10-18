const expoConfig = require("eslint-config-expo/flat");
const tsEslint = require("typescript-eslint");

module.exports = [
  ...expoConfig,
  {
    ignores: ["dist/**", ".expo/**", "web-build/**", "node_modules/**"],
  },
  {
    // This config is loaded as CommonJS; declare the Node global so `no-undef`
    // does not flag `tsconfigRootDir: __dirname` below.
    files: ["eslint.config.js"],
    languageOptions: {
      globals: { __dirname: "readonly" },
    },
  },
  {
    files: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsEslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tsEslint.plugin,
    },
    rules: {
      "@typescript-eslint/no-deprecated": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },
  {
    files: [
      "src/components/**/*.{ts,tsx}",
      "src/features/**/components/**/*.{ts,tsx}",
    ],
    ignores: ["**/__tests__/**"],
    rules: {
      // Design tokens live in @/theme. A component style that hardcodes a
      // typographic or color value is drift the design system cannot see, so the
      // literal is rejected here and the token is the only accepted source.
      // Spacing numbers and animation values are deliberately out of scope: they
      // are context dependent and a token does not always exist for them.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Property[key.name=/^(fontSize|lineHeight|letterSpacing|opacity|fontWeight)$/][value.type='Literal']",
          message:
            "Hardcoded typographic value. Import the token from @/theme (fontWeights, letterSpacings, opacities or a typography variant) instead of writing a literal.",
        },
        {
          selector:
            "Property[key.name=/^(fontSize|lineHeight|letterSpacing|opacity)$/][value.type='UnaryExpression']",
          message:
            "Hardcoded typographic value. Import the token from @/theme instead of writing a literal.",
        },
        {
          selector:
            "Property[key.name=/^(color|backgroundColor|borderColor|borderTopColor|borderBottomColor|borderLeftColor|borderRightColor|tintColor|shadowColor)$/][value.value=/^(#|rgb|hsl)/]",
          message:
            "Hardcoded color. Import it from @/theme instead of writing a hex, rgb or hsl literal.",
        },
      ],
    },
  },
  {
    files: ["src/**/*.test.{ts,tsx}", "**/__tests__/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-floating-promises": "off",
    },
  },
];
