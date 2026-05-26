-- =============================================================================
-- Rollback Migration 022 — roles dinâmicas
-- =============================================================================
--
-- Reverte: drop dos FKs, recria CHECKs de 5 valores hardcoded, dropa
-- a tabela `roles`.
--
-- PRÉ-REQUISITO: se existirem roles custom (is_system=false) no banco com
-- usuários associados, o rollback ABORTA — porque restabelecer o CHECK
-- com só 5 valores invalidaria esses usuários. Admin precisa:
--   1. Identificar: SELECT * FROM roles WHERE is_system = FALSE;
--   2. Rebaixar/migrar os usuários afetados (ex.: UPDATE users SET role='user'
--      WHERE role IN (lista));
--   3. Tentar o rollback de novo.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_custom_in_use INTEGER;
BEGIN
  -- Quantos users usam role custom (não-sistema)?
  SELECT COUNT(*) INTO v_custom_in_use
    FROM users u
    JOIN roles r ON r.key = u.role
   WHERE r.is_system = FALSE;
  IF v_custom_in_use > 0 THEN
    RAISE EXCEPTION 'Rollback abortado: % usuário(s) com role custom (não-sistema). Rebaixe-os antes (UPDATE users SET role=''user'' WHERE role IN (SELECT key FROM roles WHERE is_system=FALSE)).',
      v_custom_in_use;
  END IF;
END $$;

-- 1. Drop dos FKs
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_fkey;
ALTER TABLE role_default_permissions
  DROP CONSTRAINT IF EXISTS role_default_permissions_role_fkey;

-- 2. Recriar CHECKs hardcoded
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role::text = ANY (ARRAY[
    'superadmin'::character varying,
    'admin'::character varying,
    'manager'::character varying,
    'user'::character varying,
    'guest'::character varying
  ]::text[]));

ALTER TABLE role_default_permissions
  ADD CONSTRAINT role_default_permissions_role_check
    CHECK (role IN ('superadmin', 'admin', 'manager', 'user', 'guest'));

-- 3. Dropar índice e tabela roles
DROP INDEX IF EXISTS idx_users_role;
DROP TABLE IF EXISTS roles;

DO $$
BEGIN
  RAISE NOTICE '✓ Rollback 022: tabela roles dropada; users.role e role_default_permissions.role voltam a CHECK fixo.';
END $$;

COMMIT;
