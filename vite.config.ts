import { fileURLToPath, URL } from 'node:url'
import path from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'


const SOURCE_PATH = new URL('./src', import.meta.url)


export default defineConfig({
    resolve: {
        alias: {
            '~': fileURLToPath(SOURCE_PATH),
        },
    },
    build: {
        outDir: 'build',
        lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            name: 'wamp3js',
            fileName: 'index',
        }
    },
    // server: {
    //     proxy: {
    //         '/wamp/v1/interview': {
    //             target: 'http://0.0.0.0:8800',
    //             changeOrigin: true,
    //         },
    //         '/wamp/v1/websocket': {
    //             target: 'ws://0.0.0.0:8800',
    //             ws: true,
    //         },
    //     }
    // },
    plugins: [
        dts()
    ],
})
