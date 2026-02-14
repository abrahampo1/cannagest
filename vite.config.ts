import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main process (must be CJS for @prisma/client compatibility)
        // Output as .cjs so Node.js treats it as CJS despite "type": "module" in package.json
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            lib: {
              entry: 'electron/main.ts',
              formats: ['cjs'],
              fileName: () => 'main.cjs',
            },
            rollupOptions: {
              external: ['electron', 'prisma', '@prisma/client', 'better-sqlite3', 'bcryptjs', 'archiver', 'adm-zip'],
            }
          }
        }
      },
      {
        // Preload script (must be CJS for Electron's sandboxed preload)
        // Output as .cjs so Node.js treats it as CJS despite "type": "module" in package.json
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            lib: {
              entry: 'electron/preload.ts',
              formats: ['cjs'],
              fileName: () => 'preload.cjs',
            },
            rollupOptions: {
              external: ['electron'],
            }
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    }
  },
  base: './',
  build: {
    outDir: 'dist'
  }
})
