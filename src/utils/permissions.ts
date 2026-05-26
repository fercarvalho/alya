// =============================================================================
// src/utils/permissions.ts — Fase 2.5 do alya
// =============================================================================
//
// Helpers de autorização granular no frontend. Espelham server/permissions/
// index.js para que UI e API tenham o mesmo entendimento de "tem acesso?".
//
// Convenções (idênticas ao backend):
//   - superadmin sempre tem 'edit' em tudo (bypass total, primeiro check)
//   - access_level 'edit' implica 'view' (quem edita, vê)
//   - Ausência de entry em modulesAccess = sem acesso
//
// O `user.modulesAccess` é populado em /api/auth/login e /api/auth/verify
// (Fase 2.4b). Formato canônico: { [moduleKey: string]: 'view' | 'edit' }.
//
// Backward-compat: aceitamos AINDA shape antigo Array<{moduleKey, accessLevel}>
// caso algum caller emita response stale do período Fase 1.x. Normalizamos
// pra Record antes de qualquer comparação.
// =============================================================================

export type AccessLevel = 'view' | 'edit';
export type ModulesAccessMap = Record<string, AccessLevel>;

interface UserLike {
  role?: string;
  modulesAccess?:
    | ModulesAccessMap
    | Array<{ moduleKey?: string; accessLevel?: string }>;
}

/**
 * Normaliza modulesAccess pro shape canônico Record. Aceita:
 *   - Record (formato Fase 2.4+): retorna como veio (cópia rasa pra segurança)
 *   - Array (formato Fase 1.x stale): converte cada item válido
 *   - undefined/null/qualquer outra coisa: {}
 */
function normalizeModulesAccess(input: UserLike['modulesAccess']): ModulesAccessMap {
  if (!input) return {};
  if (Array.isArray(input)) {
    const out: ModulesAccessMap = {};
    for (const item of input) {
      const key = item?.moduleKey;
      const lvl = item?.accessLevel;
      if (typeof key === 'string' && key.length > 0 && (lvl === 'view' || lvl === 'edit')) {
        out[key] = lvl;
      }
    }
    return out;
  }
  if (typeof input === 'object') {
    const out: ModulesAccessMap = {};
    for (const [k, v] of Object.entries(input)) {
      if (typeof k === 'string' && k.length > 0 && (v === 'view' || v === 'edit')) {
        out[k] = v;
      }
    }
    return out;
  }
  return {};
}

/** Superadmin tem bypass total. */
export function isSuperadmin(user: UserLike | null | undefined): boolean {
  return !!user && user.role === 'superadmin';
}

/**
 * Retorna o access_level efetivo do user para um módulo, ou null se sem acesso.
 * Superadmin sempre recebe 'edit' (bypass), independente do que estiver no map.
 */
export function getModuleAccess(
  user: UserLike | null | undefined,
  moduleKey: string,
): AccessLevel | null {
  if (!user || !moduleKey) return null;
  if (isSuperadmin(user)) return 'edit';
  const map = normalizeModulesAccess(user.modulesAccess);
  const lvl = map[moduleKey];
  return lvl === 'edit' || lvl === 'view' ? lvl : null;
}

/** Pode visualizar (view OU edit). */
export function hasModuleView(
  user: UserLike | null | undefined,
  moduleKey: string,
): boolean {
  const a = getModuleAccess(user, moduleKey);
  return a === 'view' || a === 'edit';
}

/** Pode editar (somente edit). */
export function hasModuleEdit(
  user: UserLike | null | undefined,
  moduleKey: string,
): boolean {
  return getModuleAccess(user, moduleKey) === 'edit';
}

/**
 * Lista de module_keys que o user tem qualquer acesso (view ou edit).
 * Útil pra filtrar nav, listas de módulos no Picker, etc.
 *
 * NÃO inclui módulos que estejam fora do modulesAccess do user (mesmo se
 * forem ativos no catálogo) — exceto pra superadmin via bypass. Se você
 * precisa do "todos os módulos visíveis no catálogo", filtre o catálogo
 * direto com hasModuleView.
 */
export function listAccessibleModuleKeys(user: UserLike | null | undefined): string[] {
  if (!user) return [];
  const map = normalizeModulesAccess(user.modulesAccess);
  return Object.entries(map)
    .filter(([, lvl]) => lvl === 'view' || lvl === 'edit')
    .map(([key]) => key);
}
