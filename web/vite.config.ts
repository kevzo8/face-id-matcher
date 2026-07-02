import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const samplesDir = path.resolve(__dirname, '..', 'samples');

const mimeTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'static-samples',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!req.url?.startsWith('/samples/')) return next();
          const urlPath = decodeURIComponent(req.url.replace(/\\/g, '/'));
          const filePath = path.join(samplesDir, urlPath.slice('/samples/'.length));
          if (!fs.existsSync(filePath)) {
            res.statusCode = 404;
            res.end('Not found');
            return;
          }
          const ext = path.extname(filePath).toLowerCase();
          const contentType = mimeTypes[ext] || 'application/octet-stream';
          const content = fs.readFileSync(filePath);
          res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': content.length });
          res.end(content);
        });
        server.middlewares.use((req, _res, next) => {
          if (req.url?.startsWith('/presentation')) {
            req.url = '/';
          }
          next();
        });
      },
      closeBundle() {
        const src = path.join(samplesDir, 'dirty-pairs');
        const dest = path.resolve(__dirname, 'dist', 'samples', 'dirty-pairs');
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
          fs.cpSync(src, dest, { recursive: true });
          console.log(`[static-samples] Copied dirty-pairs to ${dest}`);
        }
        const screenshotSrc = path.join(samplesDir, 'screenshot.png');
        const screenshotDest = path.resolve(__dirname, 'dist', 'samples', 'screenshot.png');
        if (fs.existsSync(screenshotSrc) && !fs.existsSync(screenshotDest)) {
          fs.copyFileSync(screenshotSrc, screenshotDest);
          console.log(`[static-samples] Copied screenshot.png to ${screenshotDest}`);
        }
      },
    },
  ],
  server: {
    port: 5180,
    strictPort: true,
  },
});
