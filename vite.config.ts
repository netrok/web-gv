import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    cors: true,
    hmr: { clientPort: 5173 }, // no fijes 'host'
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          datagrid: ['@mui/x-data-grid'],
          tanstack: ['@tanstack/react-query'],
          utils: ['axios', 'zod', 'jwt-decode'],
        },
      },
    },
  },
})
