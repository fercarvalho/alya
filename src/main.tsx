import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import { registerProductionSW } from './pwa/registerSW'
import { setupInstallPrompt } from './pwa/installPrompt'
import { injectIosMeta } from './pwa/iosMeta'

// Service Worker — 2 contextos com 2 SWs distintos no Alya:
//
//   1. DEMO (GitHub Pages: alya.fercarvalho.com, *.github.io): SW de MOCK da
//      API que intercepta /api/* e retorna dados em memória. Bloco abaixo —
//      manter intocado.
//
//   2. PROD (alya.sistemas.viverdepj.com.br e demais hosts reais com
//      backend): SW de cache + Web Push (public/sw.js → dist/sw.js).
//      Registrado via registerProductionSW(); função skipa em dev/demo.

// Demo: mantém o SW de mock da API (alya.fercarvalho.com, *.github.io).
if (typeof window !== 'undefined' &&
    (window.location.hostname.includes('github.io') ||
     window.location.hostname === 'alya.fercarvalho.com' ||
     window.location.hostname.includes('demo'))) {
  if ('serviceWorker' in navigator) {
    const base = window.location.pathname.replace(/\/app\/.*$/, '/') || '/';
    navigator.serviceWorker.register(base + 'sw.js', { scope: base })
      .then(reg => {
        console.log('[Main] Service Worker (demo) registrado:', reg.scope);

        // Verificar atualizações periodicamente
        setInterval(() => {
          reg.update().then(() => {
            console.log('[Main] Verificação de atualização do Service Worker (demo)');
          });
        }, 60000);

        reg.addEventListener('updatefound', () => {
          console.log('[Main] Nova versão do Service Worker (demo) encontrada');
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[Main] Nova versão instalada, recarregando em 2 segundos...');
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
              }
            });
          }
        });
      })
      .catch(err => {
        console.warn('[Main] Falha ao registrar Service Worker (demo):', err);
      });
  }
} else {
  // Prod: SW de cache + Web Push. registerProductionSW() skipa em dev
  // (Vite HMR) e em demo (já tratado acima).
  registerProductionSW().catch(() => { /* já loga internamente */ });
}

// PWA install — captura beforeinstallprompt e injeta meta tags Apple/iOS.
// Rodam em TODOS os contextos (incluindo demo) porque são side-effect-free:
//   - setupInstallPrompt: só registra listeners; gating real é em
//     PwaInstallBanner.tsx (esconde se for demo) + installPrompt.ts
//     (esconde se !isAuthenticated)
//   - injectIosMeta: idempotente; só atualiza/cria <meta> e <link>
setupInstallPrompt()
injectIosMeta()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
