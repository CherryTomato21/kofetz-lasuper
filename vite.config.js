import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'קופץ לסופר',
        short_name: 'קופץ',
        description: 'רשימת קניות משפחתית ברספונסיביות מלאה',
        theme_color: '#121212',
        background_color: '#121212',
        display: 'standalone',
        dir: 'rtl',
        lang: 'he',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})