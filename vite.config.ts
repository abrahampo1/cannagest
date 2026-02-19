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
        // lib: false overrides vite-plugin-electron's default which adds formats:['es']
        // when package.json has "type":"module". mergeConfig concatenates arrays, so
        // ['es']+['cjs'] would produce two builds and the ESM overwrites the CJS output.
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            lib: false as any,
            rollupOptions: {
              input: 'electron/main.ts',
              external: ['electron', 'prisma', '@prisma/client', 'better-sqlite3', 'bcryptjs', 'archiver', 'adm-zip'],
              output: {
                format: 'cjs',
                entryFileNames: 'main.cjs',
              },
            }
          }
        }
      },
      {
        // Preload script (must be CJS for Electron's sandboxed preload)
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            lib: false as any,
            rollupOptions: {
              input: 'electron/preload.ts',
              external: ['electron'],
              output: {
                format: 'cjs',
                entryFileNames: 'preload.cjs',
              },
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
