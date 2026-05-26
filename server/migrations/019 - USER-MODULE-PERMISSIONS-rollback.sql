-- =============================================================================
-- Rollback Migration 019 — user_module_permissions
-- =============================================================================
--
-- Reverte a migration 019, voltando ao modelo binário em users.modules TEXT[].
--
-- Como a 019 não altera users.modules (apenas COPIA pra tabela nova), o
-- rollback é trivial: dropar a tabela nova + backup. users.modules continua
-- exatamente como estava.
--
-- IMPORTANTE: se Fase 2.1 (migration 020) já tiver rodado, este rollback
-- NÃO É SUFICIENTE — rode primeiro o rollback da 020 (ele restaura
-- user_module_permissions a partir de user_module_permissions_backup_042
-- ou equivalente). Só depois rode este rollback.
-- =============================================================================

BEGIN;

DROP INDEX IF EXISTS idx_user_module_permissions_user_id;
DROP INDEX IF EXISTS idx_user_module_permissions_module_key;
DROP TABLE IF EXISTS user_module_permissions;

DROP TABLE IF EXISTS users_modules_backup_019;

DO $$
BEGIN
  RAISE NOTICE '✓ Rollback 019: user_module_permissions removida. users.modules TEXT[] permanece intacto como única fonte de perms.';
END $$;

COMMIT;
