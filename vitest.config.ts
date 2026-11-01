import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    coverage: {
      provider: "v8",
      thresholds: { statements: 88, branches: 80, functions: 90, lines: 90 },
      reporter: ["text", "json-summary", "html"],
      include: ["src/lib/**/*.ts", "src/state/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}", "src/lib/cloud/public-project.ts"],
    },
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
