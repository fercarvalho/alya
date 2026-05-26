// =============================================================================
// SimpleUserModal — fluxo "Novo usuário em 2 etapas" (Fase 2.8 do alya)
// =============================================================================
//
// Substitui o fluxo legado de 1 etapa (grid binário de checkboxes de módulo
// + criação direta) pelo padrão do impgeo:
//
//   Step 1: dados básicos (username, role, isActive). Botão "Continuar para
//           permissões →" chama GET /api/admin/permissions/defaults?role=X
//           e abre a Step 2 pré-preenchida.
//   Step 2: PermissionsMatrix com defaults granulares da role escolhida.
//           Admin pode ajustar view/edit por módulo. Footer "← Voltar"
//           (preserva dados da Step 1) e "Criar Usuário" (POST final com
//           modulesAccess granular).
//
// Backend (Fase 2.8): POST /api/admin/users aceita modulesAccess opcional
// (precedência sobre `modules` legado). GET .../permissions/defaults?role=X
// retorna a matriz canônica daquela role.
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { X, User, Shield, Check, ArrowLeft, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/config/api';
import PermissionsMatrix, { type ModulePermission, type AccessLevel } from './PermissionsMatrix';

interface Module {
  id: string;
  key: string;
  name: string;
  icon: string;
  isActive: boolean;
  subsystemKey?: string;
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
  availableModules,
}) => {
  const { token, user: currentUser } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(false);
  const [error, setError] = useState('');

  // Step 1 — dados básicos
  const [formData, setFormData] = useState({
    username: '',
    role: 'user' as string,
    isActive: true,
  });

  // Step 2 — matriz granular (preenchida ao avançar)
  const [pendingPermissions, setPendingPermissions] = useState<ModulePermission[]>([]);

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFormData({ username: '', role: 'user', isActive: true });
      setPendingPermissions([]);
      setError('');
    }
  }, [isOpen]);

  // ESC fecha
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isSubmitting && !isLoadingDefaults) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, isLoadingDefaults, onClose]);

  // Bloqueio: admin (não-superadmin) não pode atribuir módulos exclusivos do
  // superadmin no momento da criação (igual ao lockedReasons da edição).
  const lockedReasons = useMemo<Record<string, string>>(() => {
    if (currentUser?.role === 'superadmin') return {};
    const reasons: Record<string, string> = {};
    for (const k of ['activeSessions', 'anomalies', 'securityAlerts']) {
      reasons[k] = 'Módulo exclusivo do superadmin';
    }
    return reasons;
  }, [currentUser?.role]);

  // Step 1 → Step 2: valida e busca defaults da role
  const handleProceedToPermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.username.trim()) { setError('Nome de usuário é obrigatório'); return; }
    if (formData.username.length < 3) { setError('Nome de usuário deve ter pelo menos 3 caracteres'); return; }

    setIsLoadingDefaults(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/permissions/defaults?role=${encodeURIComponent(formData.role)}`,
        { credentials: 'include', headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      const defaultsMap: Record<string, AccessLevel> = json.data.modulesAccess || {};
      // Constrói a matriz cruzando com availableModules (que tem moduleName +
      // subsystemKey, que o endpoint de defaults não retorna).
      const matrix: ModulePermission[] = availableModules
        .filter((m) => m.isActive)
        .map((m) => ({
          moduleKey: m.key,
          moduleName: m.name,
          subsystemKey: m.subsystemKey || 'admin', // fallback raro
          accessLevel: defaultsMap[m.key] ?? null,
        }));
      setPendingPermissions(matrix);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar permissões padrão da role');
    } finally {
      setIsLoadingDefaults(false);
    }
  };

  // Botão "Resetar para defaults da role" na Step 2 → re-busca os defaults
  // (caso admin tenha mudado tudo manualmente e queira voltar ao padrão).
  const handleReloadDefaults = async () => {
    setIsLoadingDefaults(true);
    setError('');
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/permissions/defaults?role=${encodeURIComponent(formData.role)}`,
        { credentials: 'include', headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
      const defaultsMap: Record<string, AccessLevel> = json.data.modulesAccess || {};
      setPendingPermissions((prev) =>
        prev.map((p) => ({ ...p, accessLevel: defaultsMap[p.moduleKey] ?? null }))
      );
    } catch (err: any) {
      setError(err.message || 'Erro ao recarregar defaults');
    } finally {
      setIsLoadingDefaults(false);
    }
  };

  // Submit final (Step 2): POST com modulesAccess
  const handleConfirmCreate = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const modulesAccess: Record<string, AccessLevel> = {};
      for (const p of pendingPermissions) {
        if (p.accessLevel === 'view' || p.accessLevel === 'edit') {
          modulesAccess[p.moduleKey] = p.accessLevel;
        }
      }
      const userData = {
        username: formData.username.trim(),
        firstName: formData.username.trim(), // placeholder
        lastName: 'Usuário',
        email: `${formData.username.toLowerCase()}@temp.local`,
        phone: '00000000000',
        cpf: '00000000000',
        birthDate: '2000-01-01',
        gender: 'Não informado',
        position: 'Usuário',
        address: { cep: '00000000', street: 'A definir', number: 'S/N', complement: '', neighborhood: 'A definir', city: 'A definir', state: 'SP' },
        role: formData.role,
        modulesAccess, // Fase 2.8 — granular em vez de modules:string[]
        isActive: formData.isActive,
      };
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(userData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao criar usuário');
      if (result.warning) setError(`⚠️ ${result.warning}`);
      onSuccess(result);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar usuário');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const roleOptions = [
    ...(currentUser?.role === 'superadmin' ? [{ value: 'superadmin', label: 'Super Administrador', description: 'Acesso total ao sistema' }] : []),
    { value: 'admin',   label: 'Administrador', description: 'Acesso admin sem segurança avançada' },
    { value: 'manager', label: 'Gerente',       description: 'Intermediário entre admin e usuário' },
    { value: 'user',    label: 'Usuário',       description: 'Acesso completo sem admin' },
    { value: 'guest',   label: 'Convidado',     description: 'Acesso somente leitura' },
  ];

  return (
    <div
      className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center px-4 pb-4 pt-[120px] z-[10050]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting && !isLoadingDefaults) onClose();
      }}
    >
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 w-full max-w-3xl max-h-[calc(100vh-160px)] overflow-y-auto shadow-2xl border border-gray-200/50">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-amber-200/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2">
                <User className="w-6 h-6 text-amber-700" />
                Novo usuário
              </h2>
              {/* Indicador de etapa */}
              <div className="flex items-center gap-2 text-xs text-amber-700/70">
                <span className={`px-2 py-0.5 rounded ${step === 1 ? 'bg-amber-200 font-semibold' : 'bg-amber-100'}`}>1 · Dados</span>
                <span>→</span>
                <span className={`px-2 py-0.5 rounded ${step === 2 ? 'bg-amber-200 font-semibold' : 'bg-amber-100'}`}>2 · Permissões</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 p-2 rounded-full transition-all"
              disabled={isSubmitting || isLoadingDefaults}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step 1 — dados básicos */}
        {step === 1 && (
          <form onSubmit={handleProceedToPermissions}>
            <div className="space-y-6">
              {error && (
                <div className={`p-4 border rounded-lg ${error.startsWith('⚠️') ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                  <p className={`text-sm ${error.startsWith('⚠️') ? 'text-amber-800' : 'text-red-800'}`}>{error}</p>
                </div>
              )}

              {/* Username */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nome de Usuário *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Digite o nome de usuário"
                  required
                  disabled={isLoadingDefaults}
                />
                <p className="mt-1 text-xs text-gray-500">Este será o login do usuário no sistema.</p>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Função (Role) *</label>
                <div className="grid gap-3">
                  {roleOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.role === option.value ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={option.value}
                        checked={formData.role === option.value}
                        onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                        className="sr-only"
                        disabled={isLoadingDefaults}
                      />
                      <div className="flex items-center gap-3 flex-1">
                        <Shield className={`w-5 h-5 ${formData.role === option.value ? 'text-amber-600' : 'text-gray-400'}`} />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{option.label}</p>
                          <p className="text-sm text-gray-500">{option.description}</p>
                        </div>
                        {formData.role === option.value && <Check className="w-5 h-5 text-amber-600" />}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Status</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="sr-only peer"
                    disabled={isLoadingDefaults}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  <span className="ml-3 text-sm font-medium text-gray-900">{formData.isActive ? 'Ativo' : 'Inativo'}</span>
                </label>
                <p className="mt-1 text-xs text-gray-500">Usuários inativos não podem fazer login.</p>
              </div>

              {/* Info box: avisa que perms vão ser definidas no próximo passo */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <Lock className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900 mb-1">Próximo passo: permissões granulares</p>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• Você poderá ajustar Ver/Editar por módulo na próxima tela</li>
                      <li>• Defaults da função escolhida virão pré-preenchidos</li>
                      <li>• Senha temporária e link de convite serão gerados ao confirmar</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Step 1 */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 mt-6 -mx-6 -mb-6 border-t flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors" disabled={isLoadingDefaults}>
                Cancelar
              </button>
              <button type="submit" disabled={isLoadingDefaults} className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2">
                {isLoadingDefaults ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Carregando defaults...
                  </>
                ) : (
                  <>Continuar para permissões →</>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 2 — PermissionsMatrix */}
        {step === 2 && (
          <div className="space-y-4">
            {error && (
              <div className={`p-4 border rounded-lg ${error.startsWith('⚠️') ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                <p className={`text-sm ${error.startsWith('⚠️') ? 'text-amber-800' : 'text-red-800'}`}>{error}</p>
              </div>
            )}

            {/* Meta do user em criação */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <strong>{formData.username}</strong> · {roleOptions.find((r) => r.value === formData.role)?.label || formData.role}
                {!formData.isActive && <span className="ml-2 text-xs bg-amber-200 px-2 py-0.5 rounded">inativo</span>}
                <p className="text-xs text-amber-800/80 mt-0.5">Defaults da função já aplicados — ajuste o que quiser antes de criar.</p>
              </div>
            </div>

            <PermissionsMatrix
              permissions={pendingPermissions}
              onChange={setPendingPermissions}
              onResetToDefaults={handleReloadDefaults}
              isBusy={isSubmitting || isLoadingDefaults}
              lockedReasons={lockedReasons}
            />

            {/* Footer Step 2 */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 -mx-6 -mb-6 border-t flex justify-between gap-3">
              <button
                type="button"
                onClick={() => { setStep(1); setError(''); }}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCreate}
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
                    Criar usuário
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleUserModal;
