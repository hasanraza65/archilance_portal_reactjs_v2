import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

/**
 * Deliberately minimal: this config exists to catch the class of bug a Vite
 * build CANNOT catch — undefined identifiers (a missing import is just a
 * "global" to the bundler, so it only explodes at runtime) and broken hook
 * usage. Style rules are intentionally left off.
 */
export default [
  { ignores: ["dist/**", "node_modules/**"] },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...js.configs.recommended.rules,
      "no-undef": "error",
      "react-hooks/rules-of-hooks": "error",
      // Noise we don't care about for this purpose:
      "no-unused-vars": ["warn", { varsIgnorePattern: "^React$", argsIgnorePattern: "^_" }],
      "no-empty": "off",
      "no-prototype-builtins": "off",
    },
  },
];
