import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script', // חובה כדי שהדפדפן ירשום את האפליקציה ברקע
      includeAssets: ['favicon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'קופץ לסופר',
        short_name: 'לסופר',
        description: 'רשימת קניות משפחתית רספונסיבית',
        theme_color: '#121212',
        background_color: '#121212',
        display: 'standalone',
        start_url: '/', // חובה כדי שכרום יאפשר התקנה
        dir: 'rtl',
        lang: 'he',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})