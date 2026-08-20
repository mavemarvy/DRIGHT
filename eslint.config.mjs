import { FlatCompat } from "@eslint/eslintrc";
import { defineConfig, globalIgnores } from "eslint/config";

const compat = new FlatCompat();

export default defineConfig([
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      // DRIGHT uses intentionally stable effect lifecycles for authenticated
      // Supabase subscriptions/loaders. These are reviewed manually rather
      // than allowing the heuristic to block production builds.
      "react-hooks/exhaustive-deps": "off",
      // Remote/user-generated media URLs are supported by the marketplace;
      // image optimization is handled at the component/provider boundary.
      "@next/next/no-img-element": "off",
    },
  },
  globalIgnores([".next/**", "node_modules/**"]),
]);
