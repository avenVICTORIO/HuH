import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [svelte({ preprocess: vitePreprocess({ script: true }) })],
  build: {
    sourcemap: true,
    assetsInlineLimit: 32768,
  },
  test: {
    environment: 'node',
    coverage: {
      reporter: ['text', 'json-summary'],
    },
  },
});
