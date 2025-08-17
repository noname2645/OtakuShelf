import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command, mode }) => {
  const isProd = mode === 'production';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        react: path.resolve('./node_modules/react'),
        '@': path.resolve(__dirname, './src')
      },
      extensions: ['.js', '.jsx', '.json']
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html')
        }
      }
    },

    server: {
      port: 3000,
      strictPort: true,
      host: true,
      watch: {
        usePolling: true, // 👈 important for Windows/WSL/Docker
      },
      hmr: isProd
        ? { clientPort: 443 } // only force this on Render
        : true, // default for local dev
    },
    preview: {
      port: 3000,
      strictPort: true
    }
  };
});
