-- =============================================================================
-- Rollback de 016 - PUSH-SUBSCRIPTIONS.sql
-- Remove a tabela push_subscriptions e seus índices.
-- =============================================================================

BEGIN;
DROP INDEX IF EXISTS idx_push_subscriptions_last_seen;
DROP INDEX IF EXISTS idx_push_subscriptions_user_id;
DROP TABLE IF EXISTS push_subscriptions;
COMMIT;
