import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',   // SW updates automatically on every new deploy
      injectRegister: 'auto',

      manifest: {
        name: 'אשדוד שליח',
        short_name: 'אשדוד שליח',
        description: 'מערכת ניהול משלוחים לעיר אשדוד',
        start_url: '/',
        display: 'standalone',
        background_color: '#061b31',
        theme_color: '#533afd',
        orientation: 'portrait-primary',
        lang: 'he',
        dir: 'rtl',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },

      workbox: {
        // Pre-cache all built assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MiB
        // Purge stale caches from previous builds automatically
        cleanupOutdatedCaches: true,

        runtimeCaching: [
          {
            // Supabase API — network first, short cache fallback
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 }, // 5 min
              networkTimeoutSeconds: 10,
            },
          },
          {
            // External fonts
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],

        // New SW takes control immediately — users get update right away
        skipWaiting: true,
        clientsClaim: true,

        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],

  server: {
    port: 3000,
  },
})
