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
        chunkSizeWarningLimit: 5000,
        commonjsOptions: {
            transformMixedEsModules: true,
        },
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('src/data/mockTBData')) return 'mock-data';

                    if (id.includes('node_modules')) {
                        if (id.includes('@puckeditor/core')) {
                            return 'puck';
                        }

                        if (id.includes('@nivo/') || id.includes('d3-')) {
                            return 'charts';
                        }

                        if (id.includes('@fullcalendar/')) {
                            return 'fullcalendar';
                        }

                        if (id.includes('xlsx')) {
                            return 'xlsx';
                        }

                        if (id.includes('@microsoft/signalr')) {
                            return 'signalr';
                        }

                        if (id.includes('oidc-client-ts') || id.includes('react-oidc-context')) {
                            return 'auth';
                        }

                        if (
                            id.includes('@bufbuild/')
                            || id.includes('@connectrpc/')
                            || id.includes('@protobuf-ts/')
                        ) {
                            return 'grpc';
                        }
                    }

                    return undefined;
                },
            },
        },
    },
});
