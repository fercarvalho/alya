-- =============================================================================
-- Rollback Migration 024 — recria tabelas backup VAZIAS
-- =============================================================================
--
-- ATENÇÃO: este rollback NÃO restaura os dados dropados pela 024. Só
-- recria as 3 tabelas vazias com schema equivalente, pra evitar erro
-- "table does not exist" caso algum script velho ainda referencie.
--
-- Pra restaurar os dados, use o pg_dump físico em
-- backups/backup-pre-024-YYYY-MM-DD.sql (procedimento manual).
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS users_modules_backup_019 (
  user_id  VARCHAR(255),
  username VARCHAR(100),
  role     VARCHAR(20),
  modules  TEXT[]
);

CREATE TABLE IF NOT EXISTS user_module_permissions_backup_020 (
  id            VARCHAR(255),
  user_id       VARCHAR(255),
  module_key    VARCHAR(100),
  access_level  VARCHAR(20),
  created_at    TIMESTAMP,
  updated_at    TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users_modules_backup_023 (
  user_id  VARCHAR(255),
  username VARCHAR(100),
  role     VARCHAR(20),
  modules  TEXT[]
);

DO $$
BEGIN
  RAISE NOTICE '✓ Rollback 024: tabelas backup recriadas VAZIAS. Pra restaurar dados, restaure de backups/backup-pre-024-*.sql.';
END $$;

COMMIT;
