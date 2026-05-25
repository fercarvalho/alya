-- =============================================================================
-- Rollback de 015 - TRANSACTION-RULES.sql
--
-- ATENÇÃO: apaga TODAS as regras criadas, candidatos, notificações e
-- permissões granulares. Reverte transações com type='Transferência entre
-- contas' / 'A confirmar' para o original_type, quando disponível.
-- =============================================================================

BEGIN;

-- 1. Reverter tipos novos para o original (quando possível)
UPDATE transactions
   SET type = original_type
 WHERE type IN ('Transferência entre contas', 'A confirmar')
   AND original_type IS NOT NULL;

-- 2-4. Drop tabelas dependentes
DROP TABLE IF EXISTS transaction_rule_candidates;
DROP TABLE IF EXISTS user_rule_permissions;
DROP TABLE IF EXISTS notifications;

-- 5. Remover FK applied_rule_id
ALTER TABLE transactions
    DROP CONSTRAINT IF EXISTS transactions_applied_rule_id_fkey;

-- 6. Drop transaction_rules
DROP TABLE IF EXISTS transaction_rules;

-- 7. Drop colunas extras de transactions
DROP INDEX IF EXISTS idx_transactions_applied_rule_id;
DROP INDEX IF EXISTS idx_transactions_needs_confirmation;
DROP INDEX IF EXISTS idx_transactions_hidden;
ALTER TABLE transactions
    DROP COLUMN IF EXISTS applied_rule_id,
    DROP COLUMN IF EXISTS original_type,
    DROP COLUMN IF EXISTS original_category,
    DROP COLUMN IF EXISTS original_subcategory,
    DROP COLUMN IF EXISTS subcategory,
    DROP COLUMN IF EXISTS needs_confirmation,
    DROP COLUMN IF EXISTS is_hidden;

DO $$ BEGIN RAISE NOTICE 'Rollback 015 concluído'; END $$;

COMMIT;
