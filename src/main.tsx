import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

// Registrar Service Worker se estiver em modo demo (GitHub Pages)
if (typeof window !== 'undefined' && 
    (window.location.hostname.includes('github.io') || 
     window.location.hostname === 'alya.fercarvalho.com' ||
     window.location.hostname.includes('demo'))) {
  if ('serviceWorker' in navigator) {
    const base = window.location.pathname.replace(/\/app\/.*$/, '/') || '/';
    navigator.serviceWorker.register(base + 'sw.js', { scope: base })
      .then(reg => {
        console.log('[Main] Service Worker registrado:', reg.scope);
        
        // Verificar atualizações periodicamente
        setInterval(() => {
          reg.update().then(() => {
            console.log('[Main] Verificação de atualização do Service Worker');
          });
        }, 60000); // Verificar a cada minuto
        
        // Escutar atualizações
        reg.addEventListener('updatefound', () => {
          console.log('[Main] Nova versão do Service Worker encontrada');
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nova versão instalada, recarregar para ativar
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
        console.warn('[Main] Falha ao registrar Service Worker:', err);
      });
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
