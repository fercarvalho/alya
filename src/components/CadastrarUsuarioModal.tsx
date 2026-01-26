import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';
import PhotoUpload from './PhotoUpload';
import { validateEmail } from '../utils/validation';
import { applyPhoneMask, removePhoneMask, validatePhoneFormat } from '../utils/phoneMask';

interface CadastrarUsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CadastrarUsuarioModal: React.FC<CadastrarUsuarioModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    role: 'user',
    modules: [] as string[],
    isActive: true
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const getDefaultModulesForRole = (role: string): string[] => {
    switch (role) {
      case 'admin':
        return ['dashboard', 'transactions', 'products', 'clients', 'reports', 'metas', 'dre', 'admin'];
      case 'user':
        return ['dashboard', 'transactions', 'products', 'clients', 'reports', 'metas', 'dre'];
      case 'guest':
        return ['dashboard', 'metas', 'reports', 'dre'];
      default:
        return [];
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'phone') {
      const masked = applyPhoneMask(value);
      setFormData(prev => ({ ...prev, [field]: masked }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleEmailBlur = () => {
    if (formData.email) {
      const validation = validateEmail(formData.email);
      if (!validation.isValid) {
        setErrors(prev => ({ ...prev, email: validation.error || 'Email inválido' }));
      }
    }
  };

  const handlePhoneBlur = () => {
    if (formData.phone) {
      const validation = validatePhoneFormat(formData.phone);
      if (!validation.isValid) {
        setErrors(prev => ({ ...prev, phone: validation.error || 'Telefone inválido' }));
      }
    }
  };

  const handlePhotoProcessed = (file: File) => {
    setPhotoFile(file);
  };

  const handlePhotoRemoved = () => {
    setPhotoFile(null);
    setPhotoUrl(null);
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      setIsUploadingPhoto(true);
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch(`${API_BASE_URL}/user/upload-photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        return result.data.photoUrl;
      } else {
        throw new Error(result.error || 'Erro ao fazer upload da foto');
      }
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      throw error;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.firstName || formData.firstName.trim().length < 2) {
      newErrors.firstName = 'Nome deve ter pelo menos 2 caracteres';
    }
    
    if (!formData.lastName || formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Sobrenome deve ter pelo menos 2 caracteres';
    }
    
    if (!formData.username || formData.username.trim().length < 3) {
      newErrors.username = 'Username deve ter pelo menos 3 caracteres';
    }
    
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (formData.username && !usernameRegex.test(formData.username.trim())) {
      newErrors.username = 'Username não pode conter espaços ou acentos';
    }
    
    if (formData.email) {
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) {
        newErrors.email = emailValidation.error || 'Email inválido';
      }
    }
    
    if (formData.phone) {
      const phoneValidation = validatePhoneFormat(formData.phone);
      if (!phoneValidation.isValid) {
        newErrors.phone = phoneValidation.error || 'Telefone inválido';
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Se há foto, fazer upload primeiro
      let finalPhotoUrl = photoUrl;
      if (photoFile && !photoUrl) {
        finalPhotoUrl = await uploadPhoto(photoFile);
        setPhotoUrl(finalPhotoUrl);
      }
      
      // Preparar dados para envio
      const userData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        username: formData.username.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone ? removePhoneMask(formData.phone) : undefined,
        photoUrl: finalPhotoUrl || undefined,
        role: formData.role,
        modules: formData.modules.length > 0 ? formData.modules : getDefaultModulesForRole(formData.role),
        isActive: formData.isActive
      };
      
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Resetar formulário
        setFormData({
          firstName: '',
          lastName: '',
          username: '',
          email: '',
          phone: '',
          role: 'user',
          modules: [],
          isActive: true
        });
        setPhotoFile(null);
        setPhotoUrl(null);
        setErrors({});
        onSuccess();
        onClose();
      } else {
        setErrors({ general: result.error || 'Erro ao criar usuário' });
      }
    } catch (error: any) {
      setErrors({ general: error.message || 'Erro ao criar usuário' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-amber-600" />
            Novo Usuário
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
              {errors.general}
            </div>
          )}

          {/* Nome e Sobrenome */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                  errors.firstName ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'
                }`}
                placeholder="Nome"
                disabled={isSubmitting}
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sobrenome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                  errors.lastName ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'
                }`}
                placeholder="Sobrenome"
                disabled={isSubmitting}
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                errors.username ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'
              }`}
              placeholder="username"
              disabled={isSubmitting}
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username}</p>
            )}
          </div>

          {/* Email e Telefone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onBlur={handleEmailBlur}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                  errors.email ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'
                }`}
                placeholder="email@exemplo.com"
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Telefone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                onBlur={handlePhoneBlur}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                  errors.phone ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'
                }`}
                placeholder="(00) 00000-0000"
                disabled={isSubmitting}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Foto */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Foto de Perfil
            </label>
            <PhotoUpload
              onPhotoProcessed={handlePhotoProcessed}
              onPhotoRemoved={handlePhotoRemoved}
              disabled={isSubmitting || isUploadingPhoto}
            />
          </div>

          {/* Função e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Função <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => {
                  const role = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    role,
                    modules: getDefaultModulesForRole(role)
                  }));
                }}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50"
                disabled={isSubmitting}
              >
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
                <option value="guest">Convidado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.isActive ? 'active' : 'inactive'}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.value === 'active' }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50"
                disabled={isSubmitting}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploadingPhoto}
              className="px-6 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting || isUploadingPhoto ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {isUploadingPhoto ? 'Enviando foto...' : 'Criando...'}
                </>
              ) : (
                'Criar Usuário'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

export default CadastrarUsuarioModal;
