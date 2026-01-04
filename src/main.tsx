import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
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
      })
      .catch(err => {
        console.warn('[Main] Falha ao registrar Service Worker:', err);
      });
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
