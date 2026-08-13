import { defineConfig } from 'vite';

// Dev server for the SDK demo. Serves /demo and proxies OCR calls to the
// FastAPI backend on port 8000.
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/id-ocr': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
