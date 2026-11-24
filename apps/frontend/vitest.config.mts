import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const COMPONENT_TEST_TIMEOUT_MS = 20_000;

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["**/*.test.ts"],
          exclude: ["node_modules/**"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          include: ["**/*.test.tsx"],
          exclude: ["node_modules/**"],
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          // A whole view with its dialogs takes under a second on a quiet
          // machine and many times that on a busy one; the default 5s then
          // fails tests that are not wrong.
          testTimeout: COMPONENT_TEST_TIMEOUT_MS,
        },
      },
    ],
  },
});
