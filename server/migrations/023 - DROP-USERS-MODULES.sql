-- =============================================================================
-- Migration 023: DROP users.modules TEXT[] (Fase 2.10 do alya)
-- =============================================================================
--
-- Remove a coluna `users.modules` (array de keys de módulo com qualquer
-- acesso — modelo binário pré-Fase 2).
--
-- Desde a Fase 2.4a, `user_module_permissions` é a SOURCE OF TRUTH pra
-- autorização granular. A coluna `users.modules` continuava sendo
-- mantida em sincronia por DUAL-WRITE em setUserPermissions /
-- migrateUsersToRole só pra compat com código não migrado. No commit
-- desta fase (2.10), os dual-writes foram removidos do backend e
-- nenhum lugar do frontend lê de user.modules mais.
--
-- IMPORTANTE: o código que remove os dual-writes precisa estar deployado
-- ANTES desta migration rodar. Senão, o backend velho ainda tentaria
-- escrever em users.modules e quebraria com "column does not exist".
--
-- Ordem de deploy:
--   1. git pull + npm install + pm2 restart alya-api    (código novo já não usa)
--   2. Validar (criar user, editar perms, trocar role)
--   3. psql ... -f '023 - DROP-USERS-MODULES.sql'        (drop final)
--
-- Reversão: 023 - DROP-USERS-MODULES-rollback.sql (recria a coluna e
-- popula a partir de user_module_permissions).
-- =============================================================================

BEGIN;

-- Snapshot defensivo: salva estado atual de users.modules antes do DROP,
-- pra rollback poder restaurar exatamente o que tinha. Idempotente:
-- só cria se não existir.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'users_modules_backup_023'
  ) THEN
    EXECUTE 'CREATE TABLE users_modules_backup_023 AS SELECT id AS user_id, username, role, modules FROM users WHERE modules IS NOT NULL';
    RAISE NOTICE '  → backup users_modules_backup_023 criado (% linhas)',
      (SELECT COUNT(*) FROM users_modules_backup_023);
  ELSE
    RAISE NOTICE '  → backup users_modules_backup_023 já existe; preservando';
  END IF;
END $$;

-- DROP da coluna
ALTER TABLE users DROP COLUMN IF EXISTS modules;

DO $$
DECLARE
  v_col_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'users' AND column_name = 'modules'
  ) INTO v_col_exists;
  IF v_col_exists THEN
    RAISE EXCEPTION 'Validação falhou: coluna users.modules ainda existe';
  END IF;
  RAISE NOTICE '✓ Migration 023: coluna users.modules removida. Backup em users_modules_backup_023.';
END $$;

COMMIT;

-- =============================================================================
-- Pós-migration:
--   - Snapshot em users_modules_backup_023 (mantido pra auditoria/rollback).
--     Após confirmar tudo OK, pode dropar: DROP TABLE users_modules_backup_023;
--   - parseUser no backend já tolera a ausência (toCamelCase só pega
--     campos que existem); user.modules vira undefined silenciosamente.
-- =============================================================================
