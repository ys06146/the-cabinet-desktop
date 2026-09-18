import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const cspPlaceholder = '__THE_CABINET_CSP__';

function createContentSecurityPolicy(command: 'build' | 'serve'): string {
  const connectSources =
    command === 'serve'
      ? "connect-src 'self' ws://127.0.0.1:5173 http://127.0.0.1:5173"
      : "connect-src 'self'";

  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    connectSources,
    "base-uri 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "form-action 'none'",
  ].join('; ');
}

function contentSecurityPolicyPlugin(command: 'build' | 'serve'): Plugin {
  return {
    name: 'the-cabinet-content-security-policy',
    transformIndexHtml(html) {
      return html.replace(cspPlaceholder, createContentSecurityPolicy(command));
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [contentSecurityPolicyPlugin(command), react()],
  base: './',
  build: {
    outDir: resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
}));