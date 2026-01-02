// Configuração centralizada da API
// Usa variável de ambiente VITE_API_BASE_URL em produção
// Fallback para localhost em desenvolvimento
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api';

