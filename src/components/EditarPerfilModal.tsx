import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';
import PhotoUpload from './PhotoUpload';
import { validateEmail } from '../utils/validation';
import { applyPhoneMask, removePhoneMask, validatePhoneFormat } from '../utils/phoneMask';

interface EditarPerfilModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EditarPerfilModal: React.FC<EditarPerfilModalProps> = ({
  isOpen,
  onClose
}) => {
  const { user, token, refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [password, setPassword] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone ? applyPhoneMask(user.phone) : ''
      });
      setPhotoUrl(user.photoUrl || null);
      setPassword('');
      setPhotoFile(null);
      setErrors({});
    }
  }, [isOpen, user]);

  const handleInputChange = (field: string, value: string) => {
    if (field === 'phone') {
      const masked = applyPhoneMask(value);
      setFormData(prev => ({ ...prev, [field]: masked }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    // Limpar erro do campo
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
    
    if (!password) {
      newErrors.password = 'Senha atual é obrigatória';
    }
    
    if (!formData.firstName || formData.firstName.trim().length < 2) {
      newErrors.firstName = 'Nome deve ter pelo menos 2 caracteres';
    }
    
    if (!formData.lastName || formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Sobrenome deve ter pelo menos 2 caracteres';
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
      // Se há foto nova, fazer upload primeiro
      let finalPhotoUrl = photoUrl;
      if (photoFile && !photoUrl) {
        finalPhotoUrl = await uploadPhoto(photoFile);
        setPhotoUrl(finalPhotoUrl);
      }
      
      // Preparar dados para envio
      const updateData: any = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        password // Senha atual para validação
      };
      
      if (formData.email !== undefined) {
        updateData.email = formData.email.trim() || null;
      }
      
      if (formData.phone !== undefined) {
        updateData.phone = formData.phone ? removePhoneMask(formData.phone) : null;
      }
      
      if (finalPhotoUrl !== undefined) {
        updateData.photoUrl = finalPhotoUrl || null;
      }
      
      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Atualizar contexto
        await refreshUser();
        setPassword('');
        setPhotoFile(null);
        setErrors({});
        onClose();
      } else {
        setErrors({ general: result.error || 'Erro ao atualizar perfil' });
      }
    } catch (error: any) {
      setErrors({ general: error.message || 'Erro ao atualizar perfil' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !user) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <User className="w-5 h-5 text-amber-600" />
            Editar Perfil
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

          {/* Senha Atual */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Senha Atual <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) {
                  setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.password;
                    return newErrors;
                  });
                }
              }}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                errors.password ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'
              }`}
              placeholder="Digite sua senha atual"
              disabled={isSubmitting}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Necessária para confirmar sua identidade
            </p>
          </div>

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
              initialPhotoUrl={photoUrl || undefined}
              disabled={isSubmitting || isUploadingPhoto}
            />
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
                  {isUploadingPhoto ? 'Enviando foto...' : 'Salvando...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

export default EditarPerfilModal;
