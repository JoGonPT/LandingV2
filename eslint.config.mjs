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
      // O CMS é um projeto npm independente, com o seu próprio Next, o seu
      // ESLint e o seu `node_modules`. Corre Next 16 porque é o que o Payload
      // suporta; este projeto corre 15.5. Lintá-lo a partir daqui aplicaria as
      // regras erradas com a versão errada do plugin.
      "cms/**",
      // A exclusão de `src/lib/transfercrm/**/*.js` foi removida com os próprios
      // ficheiros: eram output compilado versionado ao lado das fontes `.ts`, e
      // ficavam fora do lint — livres para divergir em silêncio do TypeScript
      // que supostamente refletiam.
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
