import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_VERSION = readFileSync(resolve(__dirname, '../VERSION'), 'utf8').trim();
const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(APP_VERSION),
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  },
  build: {
    // Strip all console statements in production builds (fixes ZAP: Information Disclosure)
    minify: 'esbuild',
    sourcemap: false,
    esbuildOptions: {
      drop: isProduction ? ['console', 'debugger'] : [],
    },
  },
  server: {
    host: true,
  }
});