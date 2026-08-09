import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    // Co-located `*.test.ts` (e.g. allowed-browser-origin.test.ts) and `__tests__/`.
    include: ["**/*.test.ts"]
  }
});
