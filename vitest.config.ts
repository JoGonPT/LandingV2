import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
      // Só o que é testável em Node. Componentes React e páginas ficam de fora
      // até haver ambiente de DOM ou testes E2E — incluí-los daria uma
      // percentagem enganadora, baixa por ausência de setup e não por ausência
      // de testes.
      include: ["src/lib/**/*.ts", "src/modules/**/*.ts", "src/middleware.ts", "src/app/api/**/*.ts"],
      exclude: ["**/*.test.ts", "**/types.ts", "**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
