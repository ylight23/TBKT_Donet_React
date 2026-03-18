import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [
        react(),   // ← Xóa toàn bộ babel plugins, dùng direct imports thủ công
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3001,
        strictPort: true,
        open: true,
        proxy: {
            '/api': {
                target: 'http://localhost:5213',
                changeOrigin: true,
            },
        },
    },
    optimizeDeps: {
        include: ['@puckeditor/core'],
    },
    build: {
        outDir: 'build',
        commonjsOptions: {
            transformMixedEsModules: true,
        },
    },
});
