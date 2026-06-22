-- =============================================================================
-- Rollback da Migration 025: Integração Bling (ERP) — Fase 0
-- =============================================================================
--
-- Desfaz a migration 025. Remove o módulo e seus defaults de permissão, as
-- tabelas da integração e a coluna transactions.source.
--
-- ⚠️ ATENÇÃO: descarta toda a configuração de conexão (tokens) e o mapeamento de
-- sincronização do Bling. Faça backup antes:
--   pg_dump $DATABASE_URL_ALYA > backups/backup-pre-025-rollback-$(date +%F).sql
--
-- Idempotente (BEGIN/COMMIT).
-- =============================================================================

BEGIN;

-- Defaults de permissão do módulo (a FK ON DELETE CASCADE também removeria, mas
-- explicitamos por clareza e para o caso de a ordem mudar).
DELETE FROM role_default_permissions WHERE module_key = 'bling';

-- Permissões granulares já atribuídas a usuários (se houver).
DELETE FROM user_module_permissions WHERE module_key = 'bling';

-- Módulo do menu.
DELETE FROM modules WHERE key = 'bling';

-- Tabelas da integração (ordem: dependentes primeiro).
DROP TABLE IF EXISTS transaction_dedup_candidates;
DROP TABLE IF EXISTS bling_sync_map;
DROP TABLE IF EXISTS bling_config;

-- Coluna de origem das transações + índices criados pela 025.
DROP INDEX IF EXISTS idx_transactions_value_date;
ALTER TABLE transactions DROP COLUMN IF EXISTS source; -- remove também idx_transactions_source

COMMIT;
