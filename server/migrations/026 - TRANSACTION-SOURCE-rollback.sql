-- Rollback da 026 - TRANSACTION SOURCE
DROP INDEX IF EXISTS idx_transactions_source;
ALTER TABLE transactions DROP COLUMN IF EXISTS source;
