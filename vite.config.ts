import path from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'


export default defineConfig({
    resolve: {
        alias: {
            '@domain': path.resolve(__dirname, './src/domain'),
            '@endpoints': path.resolve(__dirname, './src/endpoints'),
            '@entrypoints': path.resolve(__dirname, './src/entrypoints'),
            '@peer': path.resolve(__dirname, './src/peer'),
            '@peer.test': path.resolve(__dirname, './src/peer.test'),
            '@session': path.resolve(__dirname, './src/session'),
            '@shared': path.resolve(__dirname, './src/shared'),
            '@serializers': path.resolve(__dirname, './src/serializers'),
            '@transports': path.resolve(__dirname, './src/transports'),
        },
    },
    build: {
        outDir: 'build',
        lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            name: 'wamp3js',
            fileName: 'index',
            // formats: ['es'],
        }
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
    plugins: [
        dts()
    ],
})
