import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import fs from 'fs';

const hasLocalCerts = fs.existsSync('./certs/localhost-key.pem') && fs.existsSync('./certs/localhost.pem');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['util', 'buffer', 'process', 'stream'], // Polyfill Node.js modules for simple-peer
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  define: {
    global: 'globalThis', // Already good for browser compatibility
  },
  server: {
    host: '0.0.0.0', // Allow LAN access
    port: 3000,
    ...(hasLocalCerts ? {
      https: {
        key: fs.readFileSync('./certs/localhost-key.pem'),
        cert: fs.readFileSync('./certs/localhost.pem'),
      },
    } : {}),
    proxy: {
      '/api': {
        target: 'http://localhost:9000', // Backend unified server
        changeOrigin: true,
        secure: false,
      },
      '/ai': {
        target: 'http://localhost:9000', // AI is now part of the main backend
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      // Use pre-built browser bundle for simple-peer to avoid CJS module.exports issues
      'simple-peer': 'simple-peer/simplepeer.min.js',
    },
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Heavy standalone libs (no React dependency at module scope)
            if (id.includes('three') || id.includes('@react-three')) {
              return 'ui-three';
            }
            if (id.includes('simple-peer') || id.includes('socket.io-client')) {
              return 'realtime';
            }
            if (id.includes('framer-motion') || id.includes('/motion')) {
              return 'ui-motion';
            }
            // Icon library — large but self-contained
            if (id.includes('lucide-react')) {
              return 'ui-icons';
            }
            // Date/calendar utilities
            if (id.includes('date-fns') || id.includes('react-datepicker') || id.includes('react-calendar')) {
              return 'ui-date';
            }
            // Markdown rendering
            if (id.includes('react-markdown') || id.includes('remark-') || id.includes('unified') || id.includes('mdast') || id.includes('micromark') || id.includes('hast')) {
              return 'ui-markdown';
            }
            // Everything else (React + all React-dependent libs) in one chunk
            return 'vendor';
          }
        },
      },
    },
  },
});
