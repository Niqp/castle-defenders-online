import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  server: {
    proxy: {
      '/socket.io': 'http://localhost:3001',
      '/api': 'http://localhost:3001'
    }
  }
});
