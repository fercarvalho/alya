import React, { useState, useEffect } from 'react';
import { X, User, Shield, Check, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config/api';

interface Module {
  id: string;
  key: string;
  name: string;
  icon: string;
  isActive: boolean;
}

interface SimpleUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userData: any) => void;
  availableModules: Module[];
}

const SimpleUserModal: React.FC<SimpleUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  availableModules
}) => {
  const { token, user: currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    role: 'user' as 'superadmin' | 'admin' | 'user' | 'guest',
    isActive: true,
    modules: [] as string[]
  });

  // Definir módulos padrão baseado na role
  const getDefaultModules = (role: 'superadmin' | 'admin' | 'user' | 'guest'): string[] => {
    switch (role) {
      case 'superadmin':
        return ['dashboard', 'transactions', 'products', 'clients', 'reports', 'metas', 'dre', 'projecao', 'admin', 'activeSessions', 'anomalies', 'securityAlerts'];
      case 'admin':
        return ['dashboard', 'transactions', 'products', 'clients', 'reports', 'metas', 'dre', 'projecao', 'admin'];
      case 'user':
        return ['dashboard', 'transactions', 'products', 'clients', 'reports', 'metas', 'dre'];
      case 'guest':
        return ['dashboard', 'metas', 'reports', 'dre'];
      default:
        return [];
    }
  };

  // Atualizar módulos quando a role mudar
  useEffect(() => {
    if (isOpen) {
      const defaultModules = getDefaultModules(formData.role);
      setFormData(prev => ({ ...prev, modules: defaultModules }));
    }
  }, [formData.role, isOpen]);

  // Fechar modal com ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  // Reset form quando modal abrir
  useEffect(() => {
    if (isOpen) {
      setFormData({
        username: '',
        role: 'user',
        isActive: true,
        modules: getDefaultModules('user')
      });
      setError('');
    }
  }, [isOpen]);

  const handleModuleToggle = (moduleKey: string) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.includes(moduleKey)
        ? prev.modules.filter(m => m !== moduleKey)
        : [...prev.modules, moduleKey]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações
    if (!formData.username.trim()) {
      setError('Nome de usuário é obrigatório');
      return;
    }

    if (formData.username.length < 3) {
      setError('Nome de usuário deve ter pelo menos 3 caracteres');
      return;
    }

    if (formData.modules.length === 0) {
      setError('Selecione pelo menos um módulo');
      return;
    }

    setIsSubmitting(true);

    try {
      // Para cadastro simplificado, criar dados mínimos
      const userData = {
        username: formData.username.trim(),
        firstName: formData.username.trim(), // Usar username como nome
        lastName: 'Usuário', // Placeholder
        email: `${formData.username.toLowerCase()}@temp.local`, // Email temporário
        phone: '00000000000', // Placeholder
        cpf: '00000000000', // Placeholder
        birthDate: '2000-01-01', // Placeholder
        gender: 'Não informado',
        position: 'Usuário',
        address: {
          cep: '00000000',
          street: 'A definir',
          number: 'S/N',
          complement: '',
          neighborhood: 'A definir',
          city: 'A definir',
          state: 'SP'
        },
        role: formData.role,
        modules: formData.modules,
        isActive: formData.isActive
      };

      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar usuário');
      }

      onSuccess(result);
      // Modal será fechado pelo handler que chama o UserCreatedModal
    } catch (err: any) {
      setError(err.message || 'Erro ao criar usuário');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const roleOptions = [
    ...(currentUser?.role === 'superadmin' ? [{ value: 'superadmin', label: 'Super Administrador', description: 'Acesso total ao sistema', color: 'red' }] : []),
    { value: 'admin', label: 'Administrador', description: 'Acesso admin sem segurança avançada', color: 'orange' },
    { value: 'user', label: 'Usuário', description: 'Acesso completo sem admin', color: 'blue' },
    { value: 'guest', label: 'Convidado', description: 'Acesso somente leitura', color: 'gray' }
  ];

  return (
    <div
      className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center px-4 pb-4 pt-[180px] z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 w-full max-w-2xl max-h-[calc(100vh-220px)] overflow-y-auto shadow-2xl border border-gray-200/50">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-amber-200/50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2">
              <User className="w-6 h-6 text-amber-700" />
              Cadastro Simplificado
            </h2>
            <button
              onClick={onClose}
              className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 p-2 rounded-full transition-all"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Content */}
          <div className="space-y-6">
            {/* Erro */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Nome de Usuário */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nome de Usuário *
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Digite o nome de usuário"
                required
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-gray-500">
                Este será o login do usuário no sistema
              </p>
            </div>

            {/* Função */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Função (Role) *
              </label>
              <div className="grid gap-3">
                {roleOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.role === option.value
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-amber-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={option.value}
                      checked={formData.role === option.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as any }))}
                      className="sr-only"
                      disabled={isSubmitting}
                    />
                    <div className="flex items-center gap-3 flex-1">
                      <Shield className={`w-5 h-5 ${formData.role === option.value ? 'text-amber-600' : 'text-gray-400'}`} />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{option.label}</p>
                        <p className="text-sm text-gray-500">{option.description}</p>
                      </div>
                      {formData.role === option.value && (
                        <Check className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Status
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="sr-only peer"
                  disabled={isSubmitting}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                <span className="ml-3 text-sm font-medium text-gray-900">
                  {formData.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Usuários inativos não podem fazer login
              </p>
            </div>

            {/* Módulos */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Módulos de Acesso *
              </label>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 mb-3">
                  Módulos pré-selecionados para <span className="font-semibold">{roleOptions.find(r => r.value === formData.role)?.label}</span>.
                  Você pode adicionar ou remover módulos conforme necessário.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {availableModules.filter(m => m.isActive).map((module) => (
                    <label
                      key={module.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        formData.modules.includes(module.key)
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.modules.includes(module.key)}
                        onChange={() => handleModuleToggle(module.key)}
                        className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                        disabled={isSubmitting}
                      />
                      <span className="text-sm font-medium">{module.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">ℹ️</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-1">Informações Importantes</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Uma senha temporária será gerada automaticamente</li>
                    <li>• O usuário receberá um email com as credenciais de acesso</li>
                    <li>• Você pode editar o usuário depois para adicionar mais informações</li>
                    <li>• Dados pessoais serão preenchidos com valores padrão</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Criando...
                </>
              ) : (
                <>
                  <User className="w-4 h-4" />
                  Criar Usuário
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SimpleUserModal;
