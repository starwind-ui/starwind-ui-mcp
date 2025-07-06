import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettier from "eslint-plugin-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  // Global configuration
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // Base configs
  js.configs.recommended,
  tseslint.configs.recommended,

  {
    plugins: {
      prettier: prettier,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "prettier/prettier": "off",
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",
      "@typescript-eslint/no-explicit-any": "off", // you may want this as it can get annoying
      "@typescript-eslint/no-unused-vars": "off", // I sometimes purposely have unused vars as this is a template
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },

  // Ignore patterns
  {
    ignores: ["dist/**", "**/*.d.ts", "scripts/", ".github/", ".changeset/"],
  },
]);
