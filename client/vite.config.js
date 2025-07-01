import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Plugin to handle unhandled errors gracefully
function errorHandlingPlugin() {
  return {
    name: 'error-handling',
    configureServer(server) {
      // Add global error handlers for the Vite dev server
      process.on('uncaughtException', (error) => {
        console.warn('Vite dev server - Uncaught Exception (handled):', error.message);
        // Don't exit the process
      });

      process.on('unhandledRejection', (reason, promise) => {
        console.warn('Vite dev server - Unhandled Rejection (handled):', reason);
        // Don't exit the process
      });

      // Handle server errors
      server.httpServer?.on('error', (error) => {
        console.warn('Vite HTTP server error (handled):', error.message);
      });

      server.httpServer?.on('clientError', (error, socket) => {
        console.warn('Vite client error (handled):', error.message);
        if (socket.writable && !socket.destroyed) {
          socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    errorHandlingPlugin()
  ],
  server: {
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
        secure: false,
        timeout: 10000,
        proxyTimeout: 10000,
        configure: (proxy, options) => {
          // Handle proxy errors gracefully
          proxy.on('error', (err, req, res) => {
            console.warn('Socket.IO proxy error (handled):', err.message);
            if (res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'text/plain' });
              res.end('Service temporarily unavailable');
            }
          });
          
          // Handle connection errors on the proxy itself
          proxy.on('close', () => {
            console.warn('Socket.IO proxy connection closed');
          });
        },
        // Handle WebSocket upgrade errors
        onError: (err, req, res) => {
          console.warn('Socket.IO proxy upgrade error (handled):', err.message);
        }
      },
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        timeout: 10000,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.warn('API proxy error (handled):', err.message);
            if (res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Service temporarily unavailable' }));
            }
          });
        }
      }
    }
  }
});
