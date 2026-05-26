-- =============================================================================
-- Migration 019: user_module_permissions (Fase 2.0 do alya)
-- =============================================================================
--
-- Objetivo: criar a tabela `user_module_permissions` e migrar os dados
-- atualmente armazenados em `users.modules TEXT[]` para ela.
--
-- Por que precisamos disso:
--   - Hoje cada usuário tem um array TEXT[] de keys de módulo (modelo binário:
--     tem acesso ou não tem). Pra suportar permissões granulares
--     (view/edit) na Fase 2.1 precisamos de uma tabela com 1 linha por
--     (user, module, access_level).
--   - Esta migration apenas COPIA o estado atual com access_level='edit'
--     (modelo legado é binário; todo acesso era de fato edit). A Fase 2.1
--     fará reset + reseed com os defaults granulares por role × subsistema.
--   - `users.modules TEXT[]` é mantido por enquanto pra compatibilidade
--     com código não-migrado; será deprecado na Fase 2.10 (cleanup).
--
-- Tudo em transação com DO block validando count(novas perms) =
-- count(unnest(users.modules)).
--
-- Reversão manual: 019 - USER-MODULE-PERMISSIONS-rollback.sql.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Tabela user_module_permissions
-- -----------------------------------------------------------------------------
--   id            string composta `${user_id}-${module_key}` (padrão herdado
--                 do impgeo — facilita debug em logs)
--   user_id       FK em users(id), ON DELETE CASCADE (delete user → some
--                 perms junto, sem registros órfãos)
--   module_key    FK em modules(key), ON DELETE CASCADE (delete módulo →
--                 limpa todas as perms que apontam pra ele)
--   access_level  string livre por ora; na Fase 2.1 vira CHECK ('view','edit')
CREATE TABLE IF NOT EXISTS user_module_permissions (
    id            VARCHAR(255) PRIMARY KEY,
    user_id       VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_key    VARCHAR(100) NOT NULL REFERENCES modules(key) ON DELETE CASCADE,
    access_level  VARCHAR(20)  NOT NULL DEFAULT 'edit',
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_user_module_permissions_user_id
  ON user_module_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_module_permissions_module_key
  ON user_module_permissions(module_key);

-- -----------------------------------------------------------------------------
-- 2. Backup defensivo de users.modules (snapshot pra auditoria/rollback)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS users_modules_backup_019;
CREATE TABLE users_modules_backup_019 AS
  SELECT id AS user_id, username, role, modules
    FROM users
   WHERE modules IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. Migrar users.modules TEXT[] → user_module_permissions
-- -----------------------------------------------------------------------------
-- Cada elemento do array vira 1 row com access_level='edit'.
-- ON CONFLICT DO NOTHING garante idempotência: rodar a migration 2x não
-- duplica nada (o UNIQUE (user_id, module_key) é o disparador).
INSERT INTO user_module_permissions (id, user_id, module_key, access_level, created_at, updated_at)
SELECT CONCAT(u.id, '-', mod_key) AS id,
       u.id                       AS user_id,
       mod_key                    AS module_key,
       'edit'                     AS access_level,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
  FROM users u
  CROSS JOIN LATERAL unnest(u.modules) AS mod_key
 WHERE u.modules IS NOT NULL
   AND EXISTS (SELECT 1 FROM modules m WHERE m.key = mod_key)
ON CONFLICT (user_id, module_key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. Validação atômica
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_expected     INTEGER;
  v_actual       INTEGER;
  v_orphan_refs  INTEGER;
  v_users_total  INTEGER;
BEGIN
  -- Esperado: número de pares (user, module) distintos do array original,
  -- filtrando órfãos (módulos referenciados que não existem em `modules`).
  -- O WHERE EXISTS no INSERT já filtra; aqui replicamos pra contar.
  SELECT COUNT(*) INTO v_expected
    FROM (
      SELECT DISTINCT u.id AS user_id, mod_key AS module_key
        FROM users u
        CROSS JOIN LATERAL unnest(u.modules) AS mod_key
       WHERE u.modules IS NOT NULL
         AND EXISTS (SELECT 1 FROM modules m WHERE m.key = mod_key)
    ) t;

  SELECT COUNT(*) INTO v_actual FROM user_module_permissions;

  IF v_actual <> v_expected THEN
    RAISE EXCEPTION 'Validação falhou: esperado % perms migradas, obtido %',
      v_expected, v_actual;
  END IF;

  -- Confirma que nenhum module_key órfão escapou pra tabela nova
  SELECT COUNT(*) INTO v_orphan_refs
    FROM user_module_permissions ump
    LEFT JOIN modules m ON m.key = ump.module_key
   WHERE m.key IS NULL;
  IF v_orphan_refs > 0 THEN
    RAISE EXCEPTION 'Validação falhou: % perms apontam pra módulos inexistentes',
      v_orphan_refs;
  END IF;

  SELECT COUNT(*) INTO v_users_total FROM users;

  RAISE NOTICE '✓ Migration 019: % perms migradas para % usuários (backup em users_modules_backup_019)',
    v_actual, v_users_total;
END $$;

COMMIT;

-- =============================================================================
-- Pós-migration:
--   - users.modules TEXT[] CONTINUA preenchido. Backend ainda pode usar até
--     a Fase 2.10 (cleanup) deprecar formalmente.
--   - Snapshot em users_modules_backup_019 fica pra auditoria.
--     Após validar: DROP TABLE users_modules_backup_019;
-- =============================================================================
