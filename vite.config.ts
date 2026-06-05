import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const base = process.env.GITHUB_PAGES === 'true' ? '/ChunkyChinese/' : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['tests/**', 'node_modules/**', 'dist/**'],
  },
})
