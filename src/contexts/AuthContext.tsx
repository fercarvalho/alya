import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE_URL } from '../config/api';

interface User {
  id: string;
  username: string;
  role: string;
  modules?: string[];
  isActive?: boolean;
  lastLogin?: string;
}

interface LoginResponse {
  success: boolean;
  firstLogin?: boolean;
  newPassword?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
  isLoading: boolean;
  completeFirstLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Detectar se está em modo demo
  // Modo demo é ativado APENAS quando:
  // 1. A variável de ambiente VITE_DEMO_MODE está definida como 'true'
  // 2. OU quando o hostname contém 'demo' ou 'github.io' (ambientes de demonstração)
  // Em produção normal (alya.sistemas.viverdepj.com.br), NÃO é modo demo
  const isDemoMode = typeof window !== 'undefined' && (
    import.meta.env.VITE_DEMO_MODE === 'true' ||
    (window.location.hostname.includes('github.io') || 
     window.location.hostname.includes('demo') ||
     window.location.hostname.includes('demo.'))
  );

  // Função auxiliar para usar storage correto
  const getStorage = () => isDemoMode ? sessionStorage : localStorage;

  useEffect(() => {
    // Verificar se há token salvo (usando storage correto baseado no modo)
    const storage = getStorage();
    const savedToken = storage.getItem('authToken');
    if (savedToken) {
      verifyToken(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setToken(tokenToVerify);
      } else {
        // Token inválido, remover do storage
        const storage = getStorage();
        storage.removeItem('authToken');
        setUser(null);
        setToken(null);
      }
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      const storage = getStorage();
      storage.removeItem('authToken');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<LoginResponse> => {
    try {
      // Garantir que o Service Worker está pronto (se estiver em modo demo)
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const isDemoMode = window.location.hostname.includes('github.io') || 
                          window.location.hostname === 'alya.fercarvalho.com' ||
                          window.location.hostname.includes('demo');
        if (isDemoMode) {
          try {
            await navigator.serviceWorker.ready;
            console.log('[AuthContext] Service Worker está pronto');
          } catch (e) {
            console.warn('[AuthContext] Service Worker não está pronto:', e);
          }
        }
      }

      console.log('[AuthContext] Tentando login:', { username, apiUrl: `${API_BASE_URL}/auth/login` });
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      console.log('[AuthContext] Resposta recebida:', { ok: response.ok, status: response.status });

      if (response.ok) {
        const data = await response.json();
        console.log('[AuthContext] Dados recebidos:', { success: data.success, hasUser: !!data.user, hasToken: !!data.token });
        
        // Se for primeiro login, NÃO atualizar o estado ainda - esperar o modal ser fechado
        const storage = getStorage();
        if (data.firstLogin && data.newPassword) {
          // Guardar token temporariamente mas não atualizar estado do usuário ainda
          storage.setItem('authToken', data.token);
          storage.setItem('pendingFirstLogin', 'true');
          
          return {
            success: true,
            firstLogin: true,
            newPassword: data.newPassword
          };
        }
        
        // Login normal: atualizar estado imediatamente
        if (data.success && data.user && data.token) {
          setUser(data.user);
          setToken(data.token);
          storage.setItem('authToken', data.token);
          storage.removeItem('pendingFirstLogin');
          
          return {
            success: true,
            firstLogin: false
          };
        } else {
          console.error('[AuthContext] Resposta inválida:', data);
          return {
            success: false
          };
        }
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `Erro HTTP ${response.status}` };
        }
        console.error('[AuthContext] Erro no login:', errorData);
        return {
          success: false
        };
      }
    } catch (error) {
      console.error('[AuthContext] Erro ao fazer login:', error);
      return {
        success: false
      };
    }
  };

  const completeFirstLogin = async () => {
    // Após o modal ser fechado, verificar o token e atualizar o estado
    const storage = getStorage();
    const savedToken = storage.getItem('authToken');
    if (savedToken) {
      await verifyToken(savedToken);
      storage.removeItem('pendingFirstLogin');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    const storage = getStorage();
    storage.removeItem('authToken');
    storage.removeItem('pendingFirstLogin');
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isLoading,
    completeFirstLogin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

