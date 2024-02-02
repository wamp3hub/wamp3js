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
    plugins: [
        dts()
    ],
})
