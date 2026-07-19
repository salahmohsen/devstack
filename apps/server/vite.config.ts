import { defineConfig } from "vite-plus";

export default defineConfig({
  build: {
    ssr: "src/index.ts",
    outDir: "dist",
    rollupOptions: {
      output: {
        entryFileNames: "index.mjs"
      }
    }
  },
  ssr: {
    noExternal: [/@tsu-stack/, /@noble/]
  }
});
