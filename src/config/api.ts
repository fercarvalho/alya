// Configuração centralizada da API
// Usa variável de ambiente VITE_API_BASE_URL em produção
// Detecta automaticamente se está em localhost ou produção (GitHub Pages)
// Em produção: usa /api (interceptado pelo Service Worker)
// Em desenvolvimento: usa /api (proxy do Vite redireciona para http://localhost:8001/api)
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (isLocalhost ? '/api' : '/api');

