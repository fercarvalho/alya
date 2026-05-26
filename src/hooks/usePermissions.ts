import { useAuth } from '../contexts/AuthContext';
import { hasModuleView, hasModuleEdit, isSuperadmin } from '../utils/permissions';

export interface Permissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canView: boolean;
  canImport: boolean;
  canExport: boolean;
}

const DENY_ALL: Permissions = {
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canView: false,
  canImport: false,
  canExport: false,
};

/**
 * Permissões de UI granulares por módulo.
 *
 * Fase 2.5 — migra do modelo binário (user.modules.includes) pra matriz
 * granular (user.modulesAccess via helpers).
 *
 * Mapeamento granular → ações de UI:
 *   - sem entry no modulesAccess → DENY_ALL
 *   - access_level 'view'        → só canView (+ canExport pra leitura)
 *   - access_level 'edit'        → tudo true exceto canDelete pra non-admin
 *   - superadmin                 → tudo true (bypass)
 *
 * Se chamado sem `module`, faz fallback role-based — preserva comportamento
 * de componentes que ainda não passam o módulo. Esses devem ser atualizados
 * pra passar o módulo na Fase 2.6+ pra ter granularidade real.
 */
export const usePermissions = (module?: string): Permissions => {
  const { user } = useAuth();
  if (!user) return DENY_ALL;

  // Caminho granular: quando o módulo foi informado.
  if (module) {
    if (!hasModuleView(user, module)) return DENY_ALL;
    const canEdit = hasModuleEdit(user, module);
    // canDelete fica restrito a admin+: edit comum (manager/user) não
    // apaga. Mantém a postura conservadora do hook original.
    const canDelete = canEdit && (user.role === 'superadmin' || user.role === 'admin');
    return {
      canView: true,
      canEdit,
      canCreate: canEdit,
      canImport: canEdit,
      canExport: true,
      canDelete,
    };
  }

  // Fallback role-based (sem módulo): comportamento legado preservado.
  if (isSuperadmin(user) || user.role === 'admin') {
    return { canCreate: true, canEdit: true, canDelete: true, canView: true, canImport: true, canExport: true };
  }
  if (user.role === 'user' || user.role === 'manager') {
    return { canCreate: true, canEdit: true, canDelete: false, canView: true, canImport: true, canExport: true };
  }
  if (user.role === 'guest') {
    return { canCreate: false, canEdit: false, canDelete: false, canView: true, canImport: false, canExport: true };
  }
  return DENY_ALL;
};

