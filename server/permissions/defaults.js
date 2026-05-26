// =============================================================================
// server/permissions/defaults.js — Fase 2.4 do alya
// =============================================================================
//
// FALLBACK_DEFAULTS: mapa hardcoded de defaults por role.
//
// Fonte da verdade em runtime: tabela `role_default_permissions` (editável
// pela UI a partir da Fase 2.7). Este módulo serve como:
//   1. FALLBACK quando a tabela está vazia para uma role (edge case raro;
//      defaults dropados manualmente, role nova sem defaults aplicados).
//   2. REFERÊNCIA do "padrão original" no botão "Restaurar padrão" da UI.
//
// Mantenha em sincronia com migration 020 (PERMISSOES-GRANULARES) e
// migration 021 (ROLE-DEFAULT-PERMISSIONS).
// =============================================================================

/**
 * Mapeamento role × subsistema → access_level.
 * Uma role sem entry pra um subsistema = sem acesso àquele subsistema.
 *
 * Casos especiais (granularidade fina por módulo dentro de um subsistema):
 *   - admin: edita SÓ o módulo 'admin' do subsistema admin (não recebe
 *     activeSessions/anomalies/securityAlerts — exclusivos do superadmin).
 *   - guest: gestao limitado a faq + documentacao (sem roadmap).
 *
 * Esses casos são tratados em buildDefaultsForRole abaixo.
 */
const SUBSYSTEM_DEFAULTS = {
  superadmin: {
    admin: 'edit',
    gestao: 'edit',
    financeiro: 'edit',
    gerenciamento: 'edit',
    especial: 'edit',
  },
  admin: {
    // 'admin' subsistema NÃO entra aqui (é especial — só o módulo 'admin').
    gestao: 'edit',
    financeiro: 'edit',
    gerenciamento: 'edit',
    especial: 'edit',
  },
  manager: {
    gestao: 'edit',
    financeiro: 'edit',
    gerenciamento: 'edit',
    especial: 'edit',
  },
  user: {
    gestao: 'view',
    financeiro: 'view',
    gerenciamento: 'edit',
    especial: 'edit',
  },
  guest: {
    // 'gestao' NÃO entra aqui (é especial — só faq + documentacao).
    financeiro: 'view',
    gerenciamento: 'view',
    especial: 'view',
  },
};

/**
 * Constrói o mapa { moduleKey: accessLevel } esperado para uma role,
 * dado o catálogo completo de módulos ativos.
 *
 * @param {string} roleKey — 'superadmin' | 'admin' | 'manager' | 'user' | 'guest'
 * @param {Array<{key:string, subsystemKey:string, isActive:boolean}>} modules
 * @returns {Object<string, 'view'|'edit'>} — { moduleKey: accessLevel }
 */
function buildDefaultsForRole(roleKey, modules) {
  const result = {};
  const subsystemMap = SUBSYSTEM_DEFAULTS[roleKey];

  for (const m of modules) {
    if (!m.isActive) continue;

    // Casos especiais antes da regra geral.
    if (roleKey === 'admin' && m.subsystemKey === 'admin') {
      if (m.key === 'admin') result[m.key] = 'edit';
      continue;
    }
    if (roleKey === 'superadmin' && m.subsystemKey === 'admin') {
      result[m.key] = 'edit';
      continue;
    }
    if (roleKey === 'guest' && m.subsystemKey === 'gestao') {
      if (m.key === 'faq' || m.key === 'documentacao') {
        result[m.key] = 'view';
      }
      continue;
    }

    // Regra geral por subsistema.
    if (subsystemMap && subsystemMap[m.subsystemKey]) {
      result[m.key] = subsystemMap[m.subsystemKey];
    }
  }

  return result;
}

module.exports = {
  SUBSYSTEM_DEFAULTS,
  buildDefaultsForRole,
};
