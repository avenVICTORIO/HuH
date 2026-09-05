import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { viteSingleFile } from "vite-plugin-singlefile";

// Baut den Canvas als eine einzige HTML-Datei (JS + CSS inline) nach ../public.
export default defineConfig({
  plugins: [svelte(), viteSingleFile()],
  build: {
    outDir: "../public",
    emptyOutDir: false,
    rollupOptions: { input: "skills-canvas.html" },
  },
});
