import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Relax some React 19 compiler rules for common patterns
  {
    rules: {
      // setState in useEffect is valid for form initialization from props
      "react-hooks/set-state-in-effect": "warn",
      // Date.now() in render is acceptable for relative time displays
      "react-hooks/purity": "warn",
      // Static components in render (like custom Tooltip) are acceptable with memoization
      "react-hooks/static-components": "warn",
      // Ref assignment pattern for sync with latest value
      "react-hooks/refs": "warn",
      // React compiler can't always preserve existing useMemo - this is acceptable
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]);

export default eslintConfig;
