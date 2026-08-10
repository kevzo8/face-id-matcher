import { defineConfig } from 'vite';

// Dev server for the SDK demo. Serves /demo and proxies liveness API calls to
// the FastAPI backend on port 8000.
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
