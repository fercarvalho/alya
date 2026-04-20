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
    host: 'localhost',
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace']
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar bibliotecas de gráficos (Recharts é grande)
          'charts-vendor': ['recharts'],
          // Separar bibliotecas de PDF (jspdf e html2canvas são grandes)
          'pdf-vendor': ['jspdf', 'html2canvas'],
          // Separar bibliotecas de ícones
          'icons-vendor': ['lucide-react'],
          // Separar bibliotecas de datas
          'date-vendor': ['date-fns'],
          // Separar bibliotecas de imagem
          'image-vendor': ['browser-image-compression', 'react-easy-crop']
        }
      }
    },
    chunkSizeWarningLimit: 1000 // Aumentar limite para 1MB se necessário
  }
})
