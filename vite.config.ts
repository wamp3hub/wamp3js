import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
    resolve: {
        alias: {
            '@domain': path.resolve(__dirname, './src/domain'),
            '@endpoints': path.resolve(__dirname, './src/endpoints'),
            '@entrypoints': path.resolve(__dirname, './src/entrypoints'),
            '@peer': path.resolve(__dirname, './src/peer'),
            '@session': path.resolve(__dirname, './src/session'),
            '@shared': path.resolve(__dirname, './src/shared'),
            '@serializers': path.resolve(__dirname, './src/serializers'),
            '@transports': path.resolve(__dirname, './src/transports'),
        },
    },
    build: {
        outDir: 'build',
    },
    server: {
        proxy: {
            '/wamp/v1/interview': {
                target: 'http://0.0.0.0:8888',
                changeOrigin: true,
            },
            '/wamp/v1/websocket': {
                target: 'ws://0.0.0.0:8888',
                ws: true,
            },
        }
    },
})
