import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Custom plugin to handle static assets (data and icons) in development and copy them in production
function poePlannerAssetsPlugin() {
  return {
    name: 'poe-planner-assets',
    configureServer(server) {
      // Middleware to serve static directories in development
      server.middlewares.use((req, res, next) => {
        // Match relative paths /data/...
        if (req.url.startsWith('/data/')) {
          const relativePath = req.url.replace(/^\/data\//, '');
          const filePath = path.resolve(__dirname, 'data', relativePath);
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(fs.readFileSync(filePath));
            return;
          }
        }
        // Match relative paths /icons/...
        if (req.url.startsWith('/icons/')) {
          const relativePath = req.url.replace(/^\/icons\//, '');
          const filePath = path.resolve(__dirname, 'src/renderer/icons', relativePath);
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            if (filePath.endsWith('.png')) {
              res.setHeader('Content-Type', 'image/png');
            } else if (filePath.endsWith('.css')) {
              res.setHeader('Content-Type', 'text/css');
            }
            res.end(fs.readFileSync(filePath));
            return;
          }
        }
        next();
      });
    },
    closeBundle() {
      // Copy assets to output directory during production build
      const srcDataDir = path.resolve(__dirname, 'data');
      const destDataDir = path.resolve(__dirname, 'src/renderer/dist/data');
      const srcIconsDir = path.resolve(__dirname, 'src/renderer/icons');
      const destIconsDir = path.resolve(__dirname, 'src/renderer/dist/icons');

      try {
        const copyFilter = (source) => !source.includes('.git');
        
        if (fs.existsSync(srcDataDir)) {
          fs.cpSync(srcDataDir, destDataDir, { recursive: true, filter: copyFilter });
          console.log('Successfully copied data folder to dist/data');
        }
        if (fs.existsSync(srcIconsDir)) {
          fs.cpSync(srcIconsDir, destIconsDir, { recursive: true, filter: copyFilter });
          console.log('Successfully copied icons folder to dist/icons');
        }
      } catch (err) {
        console.error('Failed to copy static assets to build folder:', err);
      }
    }
  };
}

export default defineConfig({
  root: path.resolve(__dirname, 'src/renderer'),
  base: './', // Ensures assets are loaded with relative paths, vital for Electron file:// URLs
  plugins: [react(), poePlannerAssetsPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: path.resolve(__dirname, 'src/renderer/dist'),
    emptyOutDir: true,
    target: 'esnext'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer/src'),
    },
  },
});
