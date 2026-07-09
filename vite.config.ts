import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// base = имя GitHub-репозитория: https://leonpiter.github.io/family_three/
const icon = (size: number) =>
  `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%23047857'/><text y='.9em' x='50' text-anchor='middle' font-size='62'>🌳</text></svg>`

export default defineConfig({
  base: '/family_three/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [],
      manifest: {
        name: 'Семейное древо',
        short_name: 'Древо',
        description: 'Семейное генеалогическое древо',
        lang: 'ru',
        start_url: '/family_three/',
        scope: '/family_three/',
        display: 'standalone',
        background_color: '#fafafa',
        theme_color: '#047857',
        icons: [
          { src: icon(192), sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: icon(512), sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html}'],
        navigateFallback: '/family_three/index.html',
        // Не кэшируем запросы к Supabase (данные и storage должны быть свежими)
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith('supabase.co'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
