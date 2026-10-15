import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API_PORT = process.env.API_PORT || 8000

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // cardapio.html é a mesma aplicação, com as tags de prévia neutras para os links /r/... (ver vercel.json)
  build: { rollupOptions: { input: { main: 'index.html', cardapio: 'cardapio.html' } } },
  server: {
    host: true, // permite abrir pelo celular na mesma rede (QR code)
    port: 5190, // 5180 é do Bar Total; 5173 do sistema de delivery
    strictPort: true,
    proxy: {
      '/api': `http://localhost:${API_PORT}`,
      '/ws': { target: `ws://localhost:${API_PORT}`, ws: true },
    },
  },
})
