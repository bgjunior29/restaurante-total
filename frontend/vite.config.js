import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API_PORT = process.env.API_PORT || 8000

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
