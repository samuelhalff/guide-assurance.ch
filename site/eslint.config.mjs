import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    /* Export statique (output: "export", images non optimisées) : next/image n'apporterait rien.
       Les images portent leurs propres variantes (srcset, width/height, loading). */
    rules: { "@next/next/no-img-element": "off" },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "scripts/vendor/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
