import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "coverage/**",
      "next-env.d.ts",
      "nestjs-api/**",
      // A exclusão de `src/lib/transfercrm/**/*.js` foi removida com os próprios
      // ficheiros: eram output compilado versionado ao lado das fontes `.ts`, e
      // ficavam fora do lint — livres para divergir em silêncio do TypeScript
      // que supostamente refletiam.
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
