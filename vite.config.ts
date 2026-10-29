import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  base: './',
  define: { __VERSION__: JSON.stringify(pkg.version) },
  build: { chunkSizeWarningLimit: 1500 },
});
