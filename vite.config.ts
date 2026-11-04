import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/mapa-cluster/' : '/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
}));
