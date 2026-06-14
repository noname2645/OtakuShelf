import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_VERSION = readFileSync(resolve(__dirname, '../VERSION'), 'utf8').trim();

export default defineConfig({
  plugins: [react()],
  define: {
    // Access anywhere in the app as: import.meta.env.VITE_APP_VERSION
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(APP_VERSION),
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  },
  server: {
    // port: 3000,
    host: true,
  }
});