import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: { port: 5173, host: true, strictPort: true },
    build: {
        chunkSizeWarningLimit: 1200, // opcional: sube el umbral del warning
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
});
