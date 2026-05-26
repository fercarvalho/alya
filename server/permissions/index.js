// =============================================================================
// server/permissions/index.js — Fase 2.4 do alya
// =============================================================================
//
// Helpers de autorização granular. Centralizam toda a lógica de "tem acesso?"
// para que endpoints não fiquem espalhando ifs com role/modulesAccess.
//
// Convenções:
//   - superadmin sempre tem edit em tudo (bypass total — verificado primeiro)
//   - access_level 'edit' implica 'view' (quem pode editar, pode ver)
//   - Ausência de entry em modulesAccess = sem acesso
//
// `user.modulesAccess` é populado em parseUser quando o user é carregado do
// banco. Formato: { [moduleKey]: 'view' | 'edit' }.
// =============================================================================

const { buildDefaultsForRole } = require('./defaults');

/** Superadmin tem bypass total. */
function isSuperadmin(user) {
  return !!user && user.role === 'superadmin';
}

/**
 * Retorna o access_level efetivo do user para um módulo, ou null se sem acesso.
 * @returns {'view' | 'edit' | null}
 */
function getModuleAccess(user, moduleKey) {
  if (!user || !moduleKey) return null;
  if (isSuperadmin(user)) return 'edit';
  const access = user.modulesAccess && user.modulesAccess[moduleKey];
  return access === 'edit' || access === 'view' ? access : null;
}

/** Pode ver (view OU edit). */
function hasModuleView(user, moduleKey) {
  const a = getModuleAccess(user, moduleKey);
  return a === 'view' || a === 'edit';
}

/** Pode editar (somente edit). */
function hasModuleEdit(user, moduleKey) {
  return getModuleAccess(user, moduleKey) === 'edit';
}

/**
 * Lista de module_keys que o user tem qualquer acesso (view ou edit).
 * Útil pra compor a nav e checagens em massa no frontend.
 */
function listAccessibleModules(user) {
  if (!user) return [];
  if (isSuperadmin(user)) {
    // Sem o catálogo carregado aqui não dá pra listar todos; o caller que
    // precisa disso (ex.: /auth/verify) já popula modulesAccess com todos
    // os módulos do banco antes de chamar.
    return Object.keys(user.modulesAccess || {});
  }
  return Object.entries(user.modulesAccess || {})
    .filter(([, level]) => level === 'view' || level === 'edit')
    .map(([key]) => key);
}

/**
 * Carrega os defaults da tabela `role_default_permissions` para uma role.
 * Se a tabela estiver vazia pra essa role, faz fallback pro hardcoded.
 *
 * @param {object} pool — pg Pool ou Client (transação)
 * @param {string} roleKey
 * @returns {Promise<Object<string, 'view'|'edit'>>}
 */
async function loadRoleDefaults(pool, roleKey) {
  const r = await pool.query(
    `SELECT module_key, access_level
       FROM role_default_permissions
      WHERE role = $1`,
    [roleKey]
  );

  if (r.rows.length > 0) {
    const map = {};
    for (const row of r.rows) map[row.module_key] = row.access_level;
    return map;
  }

  // Fallback: hardcoded. Precisa carregar o catálogo de módulos pra montar.
  const mods = await pool.query(
    `SELECT key, subsystem_key, is_active FROM modules WHERE is_active = TRUE`
  );
  const modsCamel = mods.rows.map(m => ({
    key: m.key,
    subsystemKey: m.subsystem_key,
    isActive: m.is_active,
  }));
  return buildDefaultsForRole(roleKey, modsCamel);
}

/**
 * Lê as permissões granulares de um user da tabela user_module_permissions.
 *
 * @param {object} pool — pg Pool ou Client (transação)
 * @param {string} userId
 * @returns {Promise<Object<string, 'view'|'edit'>>}
 */
async function loadUserPermissions(pool, userId) {
  const r = await pool.query(
    `SELECT module_key, access_level
       FROM user_module_permissions
      WHERE user_id = $1`,
    [userId]
  );
  const map = {};
  for (const row of r.rows) map[row.module_key] = row.access_level;
  return map;
}

/**
 * Substitui o conjunto inteiro de permissões de um user.
 * Atomicamente: TRUNCATE pro user específico + reinsert.
 *
 * Fase 2.10 — dual-write em `users.modules TEXT[]` foi REMOVIDO junto com
 * a coluna (migration 023). user_module_permissions é a única source of
 * truth. Update do timestamp em users.updated_at é mantido pra refletir
 * que o user "mudou" (consumido por auditorias e cache invalidation).
 *
 * @param {object} pool
 * @param {string} userId
 * @param {Object<string, 'view'|'edit'>} modulesAccess — { moduleKey: level }
 * @returns {Promise<Object<string, 'view'|'edit'>>} — o map aplicado
 */
async function setUserPermissions(pool, userId, modulesAccess) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validar keys contra o catálogo (proteção defensiva)
    const keys = Object.keys(modulesAccess || {});
    if (keys.length > 0) {
      const exist = await client.query(
        `SELECT key FROM modules WHERE key = ANY($1)`,
        [keys]
      );
      const validSet = new Set(exist.rows.map(r => r.key));
      const orphans = keys.filter(k => !validSet.has(k));
      if (orphans.length > 0) {
        throw new Error(
          `setUserPermissions: módulos inexistentes: ${orphans.join(', ')}`
        );
      }
      // Validar levels
      for (const k of keys) {
        const lvl = modulesAccess[k];
        if (lvl !== 'view' && lvl !== 'edit') {
          throw new Error(
            `setUserPermissions: access_level inválido para ${k}: ${lvl}`
          );
        }
      }
    }

    await client.query(
      `DELETE FROM user_module_permissions WHERE user_id = $1`,
      [userId]
    );

    if (keys.length > 0) {
      // Bulk insert via UNNEST pra evitar N queries
      const moduleKeysArr = keys;
      const levelsArr = keys.map(k => modulesAccess[k]);
      const idsArr = keys.map(k => `${userId}-${k}`);
      await client.query(
        `INSERT INTO user_module_permissions (id, user_id, module_key, access_level, created_at, updated_at)
         SELECT id, $1, mk, lvl, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
           FROM UNNEST($2::text[], $3::text[], $4::text[]) AS t(id, mk, lvl)`,
        [userId, idsArr, moduleKeysArr, levelsArr]
      );
    }

    // Fase 2.10 — dual-write em users.modules removido junto com a coluna
    // (migration 023). user_module_permissions é a única source of truth.
    // Touch só de updated_at pra refletir mudança de perms na timeline.
    await client.query(
      `UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [userId]
    );

    await client.query('COMMIT');
    return modulesAccess;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Aplica os defaults da role atual do user, substituindo permissões existentes.
 * Útil ao criar user novo ou no fluxo "Aplicar padrões da role" do modal.
 */
async function applyRoleDefaultsToUser(pool, userId, roleKey) {
  const defaults = await loadRoleDefaults(pool, roleKey);
  return setUserPermissions(pool, userId, defaults);
}

/**
 * Substitui os defaults de uma role inteira em transação.
 * Usado por PUT /api/admin/role-defaults/:role e por cloneRoleDefaults.
 *
 * @param {object} poolOrClient — pode ser pool ou client em transação
 * @param {string} roleKey
 * @param {Object<string, 'view'|'edit'>} modulesAccess
 */
async function setRoleDefaults(poolOrClient, roleKey, modulesAccess) {
  const keys = Object.keys(modulesAccess || {});
  // Quando chamado fora de transação (pool direto), pegamos um client pra
  // garantir atomicidade do DELETE + INSERT. Se já veio um client (chamada
  // aninhada), reusamos sem nova BEGIN.
  const isExternalClient = typeof poolOrClient.release !== 'function' ||
                            (poolOrClient.constructor && poolOrClient.constructor.name === 'Client');
  let client = poolOrClient;
  let weOpened = false;
  if (!isExternalClient && typeof poolOrClient.connect === 'function') {
    client = await poolOrClient.connect();
    weOpened = true;
  }
  try {
    if (weOpened) await client.query('BEGIN');
    await client.query('DELETE FROM role_default_permissions WHERE role = $1', [roleKey]);
    if (keys.length > 0) {
      const levelsArr = keys.map((k) => modulesAccess[k]);
      await client.query(
        `INSERT INTO role_default_permissions (role, module_key, access_level)
         SELECT $1, mk, lvl FROM UNNEST($2::text[], $3::text[]) AS t(mk, lvl)`,
        [roleKey, keys, levelsArr]
      );
    }
    if (weOpened) await client.query('COMMIT');
  } catch (e) {
    if (weOpened) { try { await client.query('ROLLBACK'); } catch {} }
    throw e;
  } finally {
    if (weOpened) client.release();
  }
}

/**
 * Clona os defaults de uma role pra outra. Lê os defaults da fromKey e
 * substitui os da toKey por eles.
 */
async function cloneRoleDefaults(pool, fromKey, toKey) {
  const src = await loadRoleDefaults(pool, fromKey);
  return setRoleDefaults(pool, toKey, src);
}

/**
 * Migra usuários de uma role pra outra. Opcionalmente reseta suas permissões
 * granulares pros defaults da nova role (caso contrário, mantém as perms
 * que tinham — pode ficar inconsistente com a nova role mas é decisão
 * explícita do admin).
 *
 * @returns {Promise<number>} — quantidade de users migrados
 */
async function migrateUsersToRole(pool, fromKey, toKey, resetPermissions = true) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const users = await client.query('SELECT id FROM users WHERE role = $1', [fromKey]);
    const ids = users.rows.map((r) => r.id);
    if (ids.length === 0) {
      await client.query('COMMIT');
      return 0;
    }
    // UPDATE role (FK ON UPDATE CASCADE da migration 022 não se aplica aqui
    // porque estamos mudando o VALOR da role, não a key da role).
    await client.query(
      `UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2)`,
      [toKey, ids]
    );
    // Defaults granulares: se pedido, reseta cada user pra defaults da toKey
    if (resetPermissions) {
      // Carrega defaults uma vez fora do loop
      const defaults = await loadRoleDefaults(client, toKey);
      const defKeys = Object.keys(defaults);
      for (const uid of ids) {
        await client.query('DELETE FROM user_module_permissions WHERE user_id = $1', [uid]);
        if (defKeys.length > 0) {
          const levelsArr = defKeys.map((k) => defaults[k]);
          const idsArr = defKeys.map((k) => `${uid}-${k}`);
          await client.query(
            `INSERT INTO user_module_permissions (id, user_id, module_key, access_level, created_at, updated_at)
             SELECT id, $1, mk, lvl, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
               FROM UNNEST($2::text[], $3::text[], $4::text[]) AS t(id, mk, lvl)`,
            [uid, idsArr, defKeys, levelsArr]
          );
        }
        // Fase 2.10 — dual-write removido junto com a coluna users.modules
        // (migration 023). Sem operação extra aqui — user_module_permissions
        // foi atualizada acima.
      }
    }
    await client.query('COMMIT');
    return ids.length;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

module.exports = {
  isSuperadmin,
  getModuleAccess,
  hasModuleView,
  hasModuleEdit,
  listAccessibleModules,
  loadRoleDefaults,
  loadUserPermissions,
  setUserPermissions,
  applyRoleDefaultsToUser,
  setRoleDefaults,
  cloneRoleDefaults,
  migrateUsersToRole,
};
