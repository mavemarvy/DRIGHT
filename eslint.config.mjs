import { FlatCompat } from "@eslint/eslintrc";
import { defineConfig, globalIgnores } from "eslint/config";

const compat = new FlatCompat();

export default defineConfig([
  ...compat.extends("next/core-web-vitals"),
  globalIgnores([".next/**", "node_modules/**"]),
  {
    rules: {
      "react-hooks/exhaustive-deps": "off",
      "@next/next/no-img-element": "off",
    },
  },
]);
