import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  base: '/trimble-agent-demos/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        clash: resolve(root, 'clash/index.html'),
        drawings: resolve(root, 'drawings/index.html'),
      },
    },
  },
})
