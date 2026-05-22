import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { createHash } from 'crypto'

// Se BASE_PATH estiver definido, usar ele (para build de demo)
// Caso contrário, usar './' (para desenvolvimento)
const basePath = process.env.BASE_PATH || './';

/**
 * Plugin que injeta __BUILD_HASH__ no `dist/sw.js` após o build.
 *
 * O SW do Alya (public/sw.js, NÃO confundir com docs/sw.js do demo) usa
 * essa string como versão dos caches — cada build invalida caches antigos
 * automaticamente. Sem o plugin, o literal `__BUILD_HASH__` ficaria no SW
 * e nenhuma invalidação aconteceria.
 *
 * Roda apenas no closeBundle de build (não toca em dev). Hash baseado no
 * conteúdo do próprio SW pra ser determinístico (mesmo input = mesmo hash).
 */
function injectSwBuildHash(): Plugin {
  return {
    name: 'inject-sw-build-hash',
    apply: 'build',
    closeBundle() {
      const swPath = resolve(__dirname, 'dist/sw.js');
      if (!existsSync(swPath)) return;
      const content = readFileSync(swPath, 'utf-8');
      const hash = createHash('sha256').update(content).digest('hex').slice(0, 10);
      const next = content.replace(/__BUILD_HASH__/g, hash);
      writeFileSync(swPath, next, 'utf-8');
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [react(), injectSwBuildHash()],
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
