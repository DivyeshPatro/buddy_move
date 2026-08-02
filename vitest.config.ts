import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: 'jsdom',
    globals: true,
    exclude: ["node_modules", "dist", "backend/src", "e2e"],
  },
  esbuild: {
    target: "es2022",
  },
});
