import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Racine du projet, pour reproduire l'alias `@/*` -> `./*` du tsconfig.
const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": rootDir },
  },
  test: {
    // Logique métier pure : pas besoin d'un DOM.
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
