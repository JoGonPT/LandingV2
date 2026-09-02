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
      // `server-only` é um guarda de compilação do Next: importá-lo faz falhar
      // o build se alguém puxar o módulo para um componente de cliente. Não
      // existe fora do Next, e sem este alias qualquer módulo que o use fica
      // impossível de testar — o que seria trocar uma garantia por outra.
      "server-only": path.resolve(__dirname, "src/test/server-only-stub.ts"),
    },
  },
});
