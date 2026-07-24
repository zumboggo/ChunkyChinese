import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const base = process.env.GITHUB_PAGES === 'true' ? '/ChunkyChinese/' : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'cloud-data',
              test: /[\\/](?:src[\\/](?:db|supabaseSync)\.ts|node_modules[\\/](?:@supabase|idb)[\\/])/u,
            },
          ],
        },
      },
    },
  },
  server: process.env.PORT ? { port: Number(process.env.PORT) } : undefined,
  preview: process.env.PORT ? { port: Number(process.env.PORT) } : undefined,
  // A second dev-server instance (e.g. the Claude preview) gets its own dep
  // cache so it doesn't contend with an already-running `npm run dev`.
  cacheDir: process.env.PORT ? `node_modules/.vite-${process.env.PORT}` : undefined,
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['tests/**', 'node_modules/**', 'dist/**'],
  },
})
