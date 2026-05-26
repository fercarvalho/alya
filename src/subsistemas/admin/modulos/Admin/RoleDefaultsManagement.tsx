// =============================================================================
// RoleDefaultsManagement — gestão de funções (roles) e seus padrões
// =============================================================================
//
// Aba "Padrões de Função" do painel Admin (só superadmin).
//   - Lista todas as funções (5 sistema + custom) dinamicamente do banco.
//   - Edita matriz de defaults por função.
//   - Cria funções novas (zerada ou clonando de outra existente).
//   - Edita label/descrição de qualquer função (key é imutável).
//   - Exclui funções custom (bloqueia se houver users; oferece migração).
//
// Port adaptado do impgeo. Diferenças do alya:
//   - Response shape `{ data: Role[] }` (sem wrapping em `roles`)
//   - Response de role-defaults: `{ data: Record<role, Record<key, level>> }`
//     (não `Record<role, ModulePermission[]>`); convertemos client-side
//   - Sem `./api` helper local; usamos API_BASE_URL inline
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Save, RotateCcw, AlertTriangle, Loader2, CheckCircle, Plus, Pencil, Trash2, X, ChevronRight, Users as UsersIcon,
} from 'lucide-react';
import PermissionsMatrix, { type ModulePermission, type AccessLevel } from './PermissionsMatrix';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/config/api';
import { useModules } from '@/hooks/useModules';

interface Role {
  key: string;
  label: string;
  description: string | null;
  is_system: boolean;
  sort_order: number;
  users_count?: number;
}

interface RoleUsage {
  role: string;
  label: string;
  users: Array<{ id: string; username: string; firstName?: string | null; lastName?: string | null }>;
}

const fetchOpts = (token: string | null, method: string = 'GET', body?: unknown): RequestInit => ({
  method,
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
});

const RoleDefaultsManagement = () => {
  const { user, token } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';
  const { modules, isLoading: isLoadingCatalog } = useModules();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [roles, setRoles] = useState<Role[]>([]);
  const [activeRoleKey, setActiveRoleKey] = useState<string>('superadmin');
  // matrices: estado local (edição); serverSnapshot: o que está salvo.
  const [matrices, setMatrices] = useState<Record<string, ModulePermission[]>>({});
  const [serverSnapshot, setServerSnapshot] = useState<Record<string, ModulePermission[]>>({});

  // Modais
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditMetaModal, setShowEditMetaModal] = useState<Role | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<{ role: Role; usage: RoleUsage | null } | null>(null);

  // Constrói uma matriz pra uma role específica cruzando { moduleKey: level }
  // (vindo do endpoint) com o catálogo de módulos (que tem moduleName e
  // subsystemKey, ambos necessários pro PermissionsMatrix renderizar).
  const buildMatrix = useCallback((accessMap: Record<string, AccessLevel>): ModulePermission[] => {
    return modules.filter((m: any) => m.isActive).map<ModulePermission>((m: any) => ({
      moduleKey: m.key,
      moduleName: m.name,
      subsystemKey: m.subsystemKey,
      accessLevel: accessMap[m.key] ?? null,
    }));
  }, [modules]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, defaultsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/roles`, fetchOpts(token)),
        fetch(`${API_BASE_URL}/admin/role-defaults`, fetchOpts(token)),
      ]);
      if (!rolesRes.ok) {
        const j = await rolesRes.json().catch(() => ({}));
        setError((j as any).error || 'Erro ao carregar funções');
        return;
      }
      if (!defaultsRes.ok) {
        const j = await defaultsRes.json().catch(() => ({}));
        setError((j as any).error || 'Erro ao carregar padrões');
        return;
      }
      const rolesData = await rolesRes.json();
      const defaultsData = await defaultsRes.json();

      const rolesList: Role[] = rolesData.data || [];
      setRoles(rolesList);

      // defaultsData.data = Record<role, Record<moduleKey, 'view'|'edit'>>
      const built: Record<string, ModulePermission[]> = {};
      for (const r of rolesList) {
        built[r.key] = buildMatrix((defaultsData.data && defaultsData.data[r.key]) || {});
      }
      setMatrices(built);
      setServerSnapshot(JSON.parse(JSON.stringify(built)));

      // Se a role ativa não existe mais (foi deletada), pula pra primeira
      if (!rolesList.some((r) => r.key === activeRoleKey)) {
        setActiveRoleKey(rolesList[0]?.key || 'superadmin');
      }
    } catch {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, buildMatrix]);

  useEffect(() => {
    if (isSuperadmin && !isLoadingCatalog && modules.length > 0) loadAll();
    else if (!isSuperadmin) setLoading(false);
  }, [isSuperadmin, isLoadingCatalog, modules.length, loadAll]);

  const activeRole = useMemo(() => roles.find((r) => r.key === activeRoleKey), [roles, activeRoleKey]);

  const isDirty = useCallback((key: string) => {
    return JSON.stringify(matrices[key] || []) !== JSON.stringify(serverSnapshot[key] || []);
  }, [matrices, serverSnapshot]);

  const handleMatrixChange = (key: string, next: ModulePermission[]) => {
    setMatrices((prev) => ({ ...prev, [key]: next }));
    setFeedback(null);
  };

  const handleSave = async (key: string) => {
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const permissions: Record<string, AccessLevel> = {};
      for (const p of matrices[key] || []) {
        if (p.accessLevel === 'view' || p.accessLevel === 'edit') {
          permissions[p.moduleKey] = p.accessLevel;
        }
      }
      const res = await fetch(
        `${API_BASE_URL}/admin/role-defaults/${key}`,
        fetchOpts(token, 'PUT', { permissions })
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError((j as any).error || 'Erro ao salvar padrões');
        return;
      }
      setServerSnapshot((prev) => ({ ...prev, [key]: JSON.parse(JSON.stringify(matrices[key] || [])) }));
      setFeedback(`Padrões de ${roles.find((r) => r.key === key)?.label} salvos.`);
    } catch {
      setError('Erro ao conectar com o servidor');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToOriginal = async (key: string) => {
    const role = roles.find((r) => r.key === key);
    if (!role) return;
    if (!role.is_system) {
      setError('Apenas funções do sistema têm "padrão original" — para uma função custom, ajuste manualmente.');
      return;
    }
    if (!confirm(`Restaurar os padrões de ${role.label} para os valores originais? Isto sobrescreve as customizações salvas.`)) return;
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/role-defaults/${key}/reset`,
        fetchOpts(token, 'POST')
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError((j as any).error || 'Erro ao restaurar padrões');
        return;
      }
      await loadAll();
      setFeedback(`Padrões de ${role.label} restaurados ao valor original.`);
    } catch {
      setError('Erro ao conectar com o servidor');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete com fluxo de migração ──────────────────────────────────────────
  const openDeleteModal = async (role: Role) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/roles/${role.key}/usage`, fetchOpts(token));
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError((j as any).error || 'Erro ao buscar uso da função');
        return;
      }
      const j = await res.json();
      setShowDeleteModal({ role, usage: j.data });
    } catch {
      setError('Erro ao conectar com o servidor');
    }
  };

  if (!isSuperadmin) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="h-10 w-10 mx-auto text-amber-500 mb-3" />
        <p className="text-gray-700 dark:text-gray-300">
          Apenas <strong>super administradores</strong> podem gerenciar funções.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center gap-3 text-gray-600 dark:text-gray-300">
        <Loader2 className="h-5 w-5 animate-spin" />
        Carregando funções...
      </div>
    );
  }

  const dirty = activeRole ? isDirty(activeRole.key) : false;

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2 mb-1">
            <AlertTriangle className="h-5 w-5" />
            Padrões de função (defaults)
          </h2>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Estes valores definem as permissões que cada função recebe automaticamente ao criar um novo usuário ou
            resetar um existente. <strong>Não altera</strong> as permissões de usuários já configurados.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="shrink-0 inline-flex items-center gap-2 px-3 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700"
        >
          <Plus className="h-4 w-4" /> Nova função
        </button>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-300">
          {error}
        </div>
      )}
      {feedback && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {feedback}
        </div>
      )}

      {/* Sub-tabs por role */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div role="tablist" className="flex flex-wrap gap-1">
          {roles.map((role) => {
            const tabDirty = isDirty(role.key);
            return (
              <button
                key={role.key}
                role="tab"
                aria-selected={activeRoleKey === role.key}
                onClick={() => setActiveRoleKey(role.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeRoleKey === role.key
                    ? 'border-amber-500 text-amber-700 dark:text-amber-300'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-300'
                }`}
              >
                {role.label}
                {!role.is_system && (
                  <span className="inline-flex items-center text-[10px] uppercase tracking-wide bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded">
                    custom
                  </span>
                )}
                {tabDirty && (
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500" title="Mudanças não salvas" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo da role ativa */}
      {activeRole && (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {activeRole.description || (activeRole.is_system ? 'Função do sistema.' : 'Sem descrição.')}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Chave interna: <code className="text-gray-600 dark:text-gray-300">{activeRole.key}</code>
                {activeRole.is_system && <span className="ml-2 inline-flex items-center text-[10px] uppercase tracking-wide bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-1 py-0.5 rounded">sistema</span>}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setShowEditMetaModal(activeRole)}
                disabled={saving}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 bg-white dark:!bg-[#243040] border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:!bg-[#2d3f52] disabled:opacity-60"
              >
                <Pencil className="h-3.5 w-3.5" />
                Renomear/Descrição
              </button>
              {!activeRole.is_system && (
                <button
                  type="button"
                  onClick={() => openDeleteModal(activeRole)}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-red-700 dark:text-red-300 bg-white dark:!bg-[#243040] border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir função
                </button>
              )}
              {activeRole.is_system && (
                <button
                  type="button"
                  onClick={() => handleResetToOriginal(activeRole.key)}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 bg-white dark:!bg-[#243040] border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:!bg-[#2d3f52] disabled:opacity-60"
                  title="Sobrescreve os padrões salvos com os valores hardcoded originais"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restaurar padrão original
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSave(activeRole.key)}
                disabled={saving || !dirty}
                className="inline-flex items-center gap-2 px-4 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {saving ? 'Salvando...' : (dirty ? 'Salvar mudanças' : 'Salvo')}
              </button>
            </div>
          </div>

          <PermissionsMatrix
            permissions={matrices[activeRole.key] || []}
            onChange={(next) => handleMatrixChange(activeRole.key, next)}
            onResetToDefaults={activeRole.is_system
              ? () => handleResetToOriginal(activeRole.key)
              : async () => { setError('Funções custom não têm "padrão original" — ajuste manualmente.'); }
            }
            isBusy={saving}
          />
        </div>
      )}

      {showCreateModal && (
        <CreateRoleModal
          token={token}
          roles={roles}
          onClose={() => setShowCreateModal(false)}
          onCreated={async () => {
            setShowCreateModal(false);
            await loadAll();
            setFeedback('Nova função criada.');
          }}
          setError={setError}
        />
      )}

      {showEditMetaModal && (
        <EditRoleMetaModal
          token={token}
          role={showEditMetaModal}
          onClose={() => setShowEditMetaModal(null)}
          onUpdated={async () => {
            setShowEditMetaModal(null);
            await loadAll();
            setFeedback('Função atualizada.');
          }}
          setError={setError}
        />
      )}

      {showDeleteModal && (
        <DeleteRoleModal
          token={token}
          role={showDeleteModal.role}
          usage={showDeleteModal.usage}
          otherRoles={roles.filter((r) => r.key !== showDeleteModal.role.key)}
          onClose={() => setShowDeleteModal(null)}
          onDone={async () => {
            setShowDeleteModal(null);
            await loadAll();
            setFeedback(`Função "${showDeleteModal.role.label}" excluída.`);
          }}
          setError={setError}
        />
      )}
    </div>
  );
};

// ─── Modais ───────────────────────────────────────────────────────────────────

const slugify = (input: string) =>
  input.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50);

const CreateRoleModal: React.FC<{
  token: string | null;
  roles: Role[];
  onClose: () => void;
  onCreated: () => void | Promise<void>;
  setError: (e: string | null) => void;
}> = ({ token, roles, onClose, onCreated, setError }) => {
  const [label, setLabel] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [keyEdited, setKeyEdited] = useState(false);
  const [initialMatrix, setInitialMatrix] = useState<'blank' | string>('blank');
  const [submitting, setSubmitting] = useState(false);

  const handleLabelChange = (value: string) => {
    setLabel(value);
    if (!keyEdited) setKey(slugify(value));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !key.trim()) { setError('Preencha label e chave.'); return; }
    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      setError('Chave inválida — use só letras minúsculas, números e _ (deve começar com letra).');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { key: key.trim(), label: label.trim() };
      if (description.trim()) body.description = description.trim();
      if (initialMatrix !== 'blank') body.cloneFromRole = initialMatrix;
      const res = await fetch(`${API_BASE_URL}/admin/roles`, fetchOpts(token, 'POST', body));
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError((j as any).error || 'Erro ao criar função');
        return;
      }
      await onCreated();
    } catch {
      setError('Erro ao conectar com o servidor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center z-[10050] p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="bg-white dark:!bg-[#243040] rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Nova função</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fechar"><X className="h-6 w-6" /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Nome exibido *</label>
            <input type="text" value={label} onChange={(e) => handleLabelChange(e.target.value)} placeholder="Ex: Supervisor de Vendas" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1f2937] text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Chave interna *</label>
            <input type="text" value={key} onChange={(e) => { setKey(e.target.value.toLowerCase()); setKeyEdited(true); }} placeholder="supervisor_vendas" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1f2937] font-mono text-sm text-gray-900 dark:text-gray-100" />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">snake_case minúsculo. Imutável depois de criada.</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Descrição (opcional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Curta descrição do papel desta função." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1f2937] text-sm text-gray-900 dark:text-gray-100" />
          </div>

          <fieldset>
            <legend className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Matriz inicial</legend>
            <div className="grid grid-cols-1 gap-2">
              <label className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${initialMatrix === 'blank' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30' : 'border-gray-200 dark:border-gray-600 hover:border-amber-300'}`}>
                <input type="radio" name="initial" value="blank" checked={initialMatrix === 'blank'} onChange={() => setInitialMatrix('blank')} className="mt-1" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Começar zerada</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Função nasce sem nenhuma permissão. Você ajusta tudo manualmente depois.</div>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${initialMatrix !== 'blank' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30' : 'border-gray-200 dark:border-gray-600 hover:border-amber-300'}`}>
                <input type="radio" name="initial" value="clone" checked={initialMatrix !== 'blank'} onChange={() => setInitialMatrix(roles.find((r) => r.key !== key)?.key || roles[0].key)} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100">Clonar de uma função existente</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Copia toda a matriz de outra função para servir de base.</div>
                  {initialMatrix !== 'blank' && (
                    <select value={initialMatrix} onChange={(e) => setInitialMatrix(e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#1f2937] text-gray-900 dark:text-gray-100">
                      {roles.map((r) => (<option key={r.key} value={r.key}>{r.label} ({r.key})</option>))}
                    </select>
                  )}
                </div>
              </label>
            </div>
          </fieldset>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:!bg-[#2d3f52] rounded-lg hover:bg-gray-200 dark:hover:!bg-[#354b60]">Cancelar</button>
            <button type="submit" disabled={submitting} className="px-5 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2 disabled:opacity-70">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {submitting ? 'Criando...' : 'Criar função'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditRoleMetaModal: React.FC<{
  token: string | null;
  role: Role;
  onClose: () => void;
  onUpdated: () => void | Promise<void>;
  setError: (e: string | null) => void;
}> = ({ token, role, onClose, onUpdated, setError }) => {
  const [label, setLabel] = useState(role.label);
  const [description, setDescription] = useState(role.description || '');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/roles/${role.key}`, fetchOpts(token, 'PUT', { label, description }));
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError((j as any).error || 'Erro ao atualizar');
        return;
      }
      await onUpdated();
    } catch {
      setError('Erro ao conectar com o servidor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center z-[10050] p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="bg-white dark:!bg-[#243040] rounded-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Editar função</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fechar"><X className="h-6 w-6" /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Chave (imutável): <code className="text-gray-700 dark:text-gray-200">{role.key}</code></p>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Nome exibido *</label>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1f2937] text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Descrição</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1f2937] text-sm text-gray-900 dark:text-gray-100" />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:!bg-[#2d3f52] rounded-lg hover:bg-gray-200 dark:hover:!bg-[#354b60]">Cancelar</button>
            <button type="submit" disabled={submitting} className="px-5 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2 disabled:opacity-70">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DeleteRoleModal: React.FC<{
  token: string | null;
  role: Role;
  usage: RoleUsage | null;
  otherRoles: Role[];
  onClose: () => void;
  onDone: () => void | Promise<void>;
  setError: (e: string | null) => void;
}> = ({ token, role, usage, otherRoles, onClose, onDone, setError }) => {
  const [migrateTo, setMigrateTo] = useState<string>(otherRoles[0]?.key || '');
  const [resetPermissions, setResetPermissions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const hasUsers = (usage?.users.length || 0) > 0;

  const doMigrateAndDelete = async () => {
    if (!migrateTo) { setError('Escolha uma função de destino para os usuários.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const migrateRes = await fetch(
        `${API_BASE_URL}/admin/roles/${role.key}/migrate-users`,
        fetchOpts(token, 'POST', { toKey: migrateTo, resetPermissions })
      );
      if (!migrateRes.ok) {
        const j = await migrateRes.json().catch(() => ({}));
        setError((j as any).error || 'Erro ao migrar usuários');
        return;
      }
      const delRes = await fetch(`${API_BASE_URL}/admin/roles/${role.key}`, fetchOpts(token, 'DELETE'));
      if (!delRes.ok) {
        const j = await delRes.json().catch(() => ({}));
        setError((j as any).error || 'Erro ao excluir');
        return;
      }
      await onDone();
    } catch {
      setError('Erro ao conectar com o servidor');
    } finally {
      setSubmitting(false);
    }
  };

  const doDeleteOnly = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/roles/${role.key}`, fetchOpts(token, 'DELETE'));
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError((j as any).error || 'Erro ao excluir');
        return;
      }
      await onDone();
    } catch {
      setError('Erro ao conectar com o servidor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center z-[10050] p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="bg-white dark:!bg-[#243040] rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-red-700 dark:text-red-300 flex items-center gap-2"><Trash2 className="h-5 w-5" /> Excluir função</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fechar"><X className="h-6 w-6" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            Vai excluir a função <strong>{role.label}</strong> (<code className="text-xs">{role.key}</code>).
          </p>

          {!hasUsers && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Nenhum usuário usa esta função — pode excluir com segurança.
            </div>
          )}

          {hasUsers && (
            <>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <div className="text-sm font-medium text-amber-900 dark:text-amber-200 flex items-center gap-2 mb-2">
                  <UsersIcon className="h-4 w-4" />
                  {usage?.users.length} usuário(s) ainda usam esta função
                </div>
                <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-0.5 max-h-32 overflow-y-auto">
                  {usage?.users.map((u) => (
                    <li key={u.id}>• <strong>{u.username}</strong>{u.firstName || u.lastName ? ` (${[u.firstName, u.lastName].filter(Boolean).join(' ')})` : ''}</li>
                  ))}
                </ul>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Migrar usuários para a função:</label>
                <select value={migrateTo} onChange={(e) => setMigrateTo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1f2937] text-sm text-gray-900 dark:text-gray-100">
                  {otherRoles.map((r) => (<option key={r.key} value={r.key}>{r.label} ({r.key})</option>))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input type="checkbox" checked={resetPermissions} onChange={(e) => setResetPermissions(e.target.checked)} />
                Resetar permissões granulares dos usuários migrados para os padrões da nova função
              </label>
            </>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={onClose} disabled={submitting} className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:!bg-[#2d3f52] rounded-lg hover:bg-gray-200 dark:hover:!bg-[#354b60]">Cancelar</button>
          {!hasUsers && (
            <button type="button" onClick={doDeleteOnly} disabled={submitting} className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 disabled:opacity-70">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {submitting ? 'Excluindo...' : 'Excluir'}
            </button>
          )}
          {hasUsers && (
            <button type="button" onClick={doMigrateAndDelete} disabled={submitting || !migrateTo} className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 disabled:opacity-70">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              {submitting ? 'Processando...' : 'Migrar e excluir'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleDefaultsManagement;
