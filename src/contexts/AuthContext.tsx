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

  useEffect(() => {
    // Verificar se há token salvo no localStorage
    const savedToken = localStorage.getItem('authToken');
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
        // Token inválido, remover do localStorage
        localStorage.removeItem('authToken');
        setUser(null);
        setToken(null);
      }
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      localStorage.removeItem('authToken');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<LoginResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Se for primeiro login, NÃO atualizar o estado ainda - esperar o modal ser fechado
        if (data.firstLogin && data.newPassword) {
          // Guardar token temporariamente mas não atualizar estado do usuário ainda
          localStorage.setItem('authToken', data.token);
          localStorage.setItem('pendingFirstLogin', 'true');
          
          return {
            success: true,
            firstLogin: true,
            newPassword: data.newPassword
          };
        }
        
        // Login normal: atualizar estado imediatamente
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('authToken', data.token);
        localStorage.removeItem('pendingFirstLogin');
        
        return {
          success: true,
          firstLogin: false
        };
      } else {
        const errorData = await response.json();
        console.error('Erro no login:', errorData.error);
        return {
          success: false
        };
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return {
        success: false
      };
    }
  };

  const completeFirstLogin = async () => {
    // Após o modal ser fechado, verificar o token e atualizar o estado
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
      await verifyToken(savedToken);
      localStorage.removeItem('pendingFirstLogin');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('pendingFirstLogin');
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

