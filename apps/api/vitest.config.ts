import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const sharedIndex = fileURLToPath(
  new URL("../../packages/shared/src/index.ts", import.meta.url)
);

export default defineConfig({
  resolve: {
    alias: {
      "@scheduler/shared": sharedIndex
    }
  }
});
