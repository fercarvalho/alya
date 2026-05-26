-- =============================================================================
-- Migration 024: DROP backup tables da Fase 2 (auditoria pós-cleanup)
-- =============================================================================
--
-- As 3 backup tables foram criadas durante as migrations da Fase 2 como
-- snapshots defensivos antes de mudanças destrutivas:
--
--   users_modules_backup_019           — pré-migração TEXT[] → user_module_permissions
--   user_module_permissions_backup_020 — pré-reset+reseed por role × subsistema
--   users_modules_backup_023           — pré-DROP da coluna users.modules
--
-- Já cumpriram a função (Fase 2 está em prod, estável, validada via
-- auditoria). Backups físicos ainda existem em backups/backup-pre-*.sql
-- caso precise reverter.
--
-- Sem rollback funcional: backups dropados não voltam. O rollback abaixo
-- apenas recria as tabelas vazias com o schema correto, pra atalho de
-- "tentei dropar mas mudei de ideia"; pra dados reais, restaure de
-- backups/backup-pre-024-*.sql.
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS users_modules_backup_019;
DROP TABLE IF EXISTS user_module_permissions_backup_020;
DROP TABLE IF EXISTS users_modules_backup_023;

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 024: 3 backup tables da Fase 2 dropadas (users_modules_backup_019, user_module_permissions_backup_020, users_modules_backup_023). Backups físicos em backups/ permanecem.';
END $$;

COMMIT;
