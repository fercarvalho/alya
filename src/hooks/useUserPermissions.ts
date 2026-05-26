// =============================================================================
// useUserPermissions — Fase 2.6 do alya
// =============================================================================
//
// Hook que encapsula o ciclo de vida da matriz granular de um user específico:
//
//   1. Fetch inicial via GET /api/admin/users/:id/permissions
//   2. Cruza com o catálogo `modules` pra montar Array<ModulePermission>
//      (a matriz precisa do moduleName e subsystemKey de cada módulo, que
//      vem do catálogo, não do endpoint de perms)
//   3. Expõe estado local (`permissions`, `setPermissions`) pro PermissionsMatrix
//      manipular livremente até o usuário clicar "Salvar"
//   4. `save()` envia PUT com o map { moduleKey: level } (filtra entries null)
//   5. `resetToDefaults()` chama POST /reset-to-defaults e recarrega
//
// O componente que usa esse hook fica responsável por chamar save() no
// botão de submit do form. Não chamamos auto-save por mudança — UX prefere
// "edita tudo, salva no fim".
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';
import type { ModulePermission, AccessLevel } from '../subsistemas/admin/modulos/Admin/PermissionsMatrix';
import { useModules } from './useModules';

interface UseUserPermissionsArgs {
  userId: string | null;
  /** Quando false, o hook não dispara fetch. Útil pra esperar o modal abrir. */
  enabled?: boolean;
}

interface UseUserPermissionsReturn {
  /** Matriz pronta pra passar ao <PermissionsMatrix>. */
  permissions: ModulePermission[];
  /** Atualiza a matriz local (sem salvar). */
  setPermissions: React.Dispatch<React.SetStateAction<ModulePermission[]>>;
  /** Role atual do user-alvo (vem do endpoint, fonte da verdade). */
  targetRole: string | null;
  /** True enquanto o fetch inicial roda. */
  isLoading: boolean;
  /** True durante save/reset. */
  isSaving: boolean;
  /** Erro mais recente (null quando tudo ok). */
  error: string | null;
  /** Recarrega do servidor (descarta mudanças locais). */
  reload: () => Promise<void>;
  /** Persiste a matriz atual no servidor (PUT). */
  save: () => Promise<void>;
  /** Reaplica defaults da role atual no servidor e recarrega. */
  resetToDefaults: () => Promise<void>;
}

export function useUserPermissions({
  userId,
  enabled = true,
}: UseUserPermissionsArgs): UseUserPermissionsReturn {
  const { token } = useAuth();
  const { modules, isLoading: isLoadingCatalog } = useModules();

  const [permissions, setPermissions] = useState<ModulePermission[]>([]);
  const [targetRole, setTargetRole] = useState<string | null>(null);
  const [serverAccess, setServerAccess] = useState<Record<string, AccessLevel>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Constrói a matriz combinando catálogo (nomes/subsystemKey) com o map
  // de access_level vindo do endpoint.
  const buildMatrix = useCallback((accessMap: Record<string, AccessLevel>) => {
    const activeModules = modules.filter((m) => m.isActive);
    return activeModules.map<ModulePermission>((m: any) => ({
      moduleKey: m.key,
      moduleName: m.name,
      subsystemKey: m.subsystemKey,
      accessLevel: accessMap[m.key] ?? null,
    }));
  }, [modules]);

  // Rebuilds quando catálogo termina de carregar ou serverAccess muda
  useEffect(() => {
    if (!isLoadingCatalog && modules.length > 0) {
      setPermissions(buildMatrix(serverAccess));
    }
  }, [isLoadingCatalog, modules, serverAccess, buildMatrix]);

  const authHeaders = useMemo<HeadersInit>(() => {
    const h: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const fetchPerms = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/permissions`, {
        method: 'GET',
        credentials: 'include',
        headers: authHeaders,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setTargetRole(json.data.role ?? null);
      setServerAccess(json.data.modulesAccess ?? {});
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar permissões');
    } finally {
      setIsLoading(false);
    }
  }, [userId, authHeaders]);

  useEffect(() => {
    if (enabled && userId) fetchPerms();
  }, [enabled, userId, fetchPerms]);

  const save = useCallback(async () => {
    if (!userId) return;
    setIsSaving(true);
    setError(null);
    try {
      // Filtra entries null antes do payload (backend espera só view/edit).
      const modulesAccess: Record<string, AccessLevel> = {};
      for (const p of permissions) {
        if (p.accessLevel === 'view' || p.accessLevel === 'edit') {
          modulesAccess[p.moduleKey] = p.accessLevel;
        }
      }
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/permissions`, {
        method: 'PUT',
        credentials: 'include',
        headers: authHeaders,
        body: JSON.stringify({ modulesAccess }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setServerAccess(json.data?.modulesAccess ?? modulesAccess);
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar permissões');
      throw e; // re-throw pra caller decidir se aborta o submit do form
    } finally {
      setIsSaving(false);
    }
  }, [userId, permissions, authHeaders]);

  const resetToDefaults = useCallback(async () => {
    if (!userId) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/users/${userId}/permissions/reset-to-defaults`,
        { method: 'POST', credentials: 'include', headers: authHeaders }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setTargetRole(json.data?.role ?? targetRole);
      setServerAccess(json.data?.modulesAccess ?? {});
    } catch (e: any) {
      setError(e.message || 'Erro ao resetar permissões');
    } finally {
      setIsSaving(false);
    }
  }, [userId, authHeaders, targetRole]);

  return {
    permissions,
    setPermissions,
    targetRole,
    isLoading: isLoading || isLoadingCatalog,
    isSaving,
    error,
    reload: fetchPerms,
    save,
    resetToDefaults,
  };
}
