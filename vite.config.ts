import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Se BASE_PATH estiver definido, usar ele (para build de demo)
// Caso contrário, usar './' (para desenvolvimento)
const basePath = process.env.BASE_PATH || './';

export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    port: 8000,
    open: true,
    host: 'localhost'
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar React e React DOM
          'react-vendor': ['react', 'react-dom'],
          // Separar bibliotecas de gráficos (Recharts é grande)
          'charts-vendor': ['recharts'],
          // Separar bibliotecas de PDF (jspdf e html2canvas são grandes)
          'pdf-vendor': ['jspdf', 'html2canvas'],
          // Separar bibliotecas de ícones
          'icons-vendor': ['lucide-react'],
          // Separar bibliotecas de datas
          'date-vendor': ['date-fns']
        }
      }
    },
    chunkSizeWarningLimit: 1000 // Aumentar limite para 1MB se necessário
  }
})
