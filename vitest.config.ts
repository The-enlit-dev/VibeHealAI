import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["{server,shared,desktop,scripts}/**/*.test.ts"],
    environment: "node",
    restoreMocks: true,
  },
});
