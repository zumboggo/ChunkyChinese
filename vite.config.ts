import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.GITHUB_PAGES === 'true' ? '/ChunkyChinese/' : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['seed/lms-vocab-188.csv'],
      manifest: {
        name: 'Chunky Chinese Vocab',
        short_name: 'Chunky Vocab',
        description: 'Private offline Chinese vocabulary audio lessons.',
        theme_color: '#167c80',
        background_color: '#f7f8fb',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          {
            src: `${base}pwa-192.svg`,
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: `${base}pwa-512.svg`,
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,csv}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
})
