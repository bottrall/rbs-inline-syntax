import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.js"],
    coverage: {
      provider: "v8",
      reporter: ["text"],
      include: ["**/*.{js,mjs,cjs}"],
      exclude: ["test/**", "vitest.config.js"],
      thresholds: {
        perFile: true,
        functions: 100,
        statements: 75,
      },
    },
  },
});
