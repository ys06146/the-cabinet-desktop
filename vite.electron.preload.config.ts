import { builtinModules } from 'node:module';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'electron/preload/index.ts'),
      formats: ['cjs'],
      fileName: () => 'index.cjs',
    },
    outDir: resolve(__dirname, 'dist-electron/preload'),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: ['electron', ...builtinModules, ...builtinModules.map((module) => `node:${module}`)],
    },
  },
});
