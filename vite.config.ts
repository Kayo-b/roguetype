import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: "src",
  publicDir: "../public",
  build: {
    outDir: "../dist",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src/ts"),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "src/styles/variables" as *;`,
      },
    },
  },
});
