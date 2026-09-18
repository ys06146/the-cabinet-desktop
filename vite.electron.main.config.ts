import { builtinModules } from 'node:module';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'electron/main/index.ts'),
      formats: ['cjs'],
      fileName: () => 'index.cjs',
    },
    outDir: resolve(__dirname, 'dist-electron/main'),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: [
        'electron',
        'electron-updater',
        ...builtinModules,
        ...builtinModules.map((module) => `node:${module}`),
      ],
    },
  },
});
