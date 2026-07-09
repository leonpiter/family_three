import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base = имя GitHub-репозитория: https://leonpiter.github.io/family_three/
export default defineConfig({
  base: '/family_three/',
  plugins: [react(), tailwindcss()],
})
