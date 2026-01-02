import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = 'http://localhost:8001/api';

export interface SystemModule {
  id: string;
  name: string;
  key: string;
  icon: string;
  description: string;
  route?: string | null;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export const useModules = () => {
  const { user, token } = useAuth();
  const [modules, setModules] = useState<SystemModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadModules = async () => {
    try {
      setIsLoading(true);
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Usar rota pública para módulos (todos os usuários precisam ver módulos)
      const endpoint = user?.role === 'admin' 
        ? `${API_BASE_URL}/admin/modules` 
        : `${API_BASE_URL}/modules`;
      const response = await fetch(endpoint, { headers });
      const result = await response.json();
      
      if (result.success) {
        setModules(result.data);
      }
    } catch (error) {
      console.error('Erro ao carregar módulos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getVisibleModules = (): SystemModule[] => {
    if (!user || !user.modules || user.modules.length === 0) {
      // Se não há módulos definidos, retornar todos os módulos ativos
      return modules.filter(m => m.isActive);
    }
    
    // Retornar apenas módulos visíveis para o usuário e que estão ativos
    return modules.filter(m => 
      m.isActive && 
      (user.modules?.includes(m.key) || user.role === 'admin')
    );
  };

  const getModuleByKey = (key: string): SystemModule | undefined => {
    return modules.find(m => m.key === key);
  };

  useEffect(() => {
    // Carregar módulos para todos os usuários (necessário para filtrar módulos visíveis)
    if (user) {
      loadModules();
    }
  }, [user, token]);

  return {
    modules,
    isLoading,
    loadModules,
    getVisibleModules,
    getModuleByKey
  };
};

