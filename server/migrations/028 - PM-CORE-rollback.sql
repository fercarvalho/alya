-- ═══════════════════════════════════════════════════════════════════════════
-- Rollback da 028 - PM-CORE.sql
-- Reverte na ordem inversa. ATENÇÃO: DROP TABLE projects/services descarta dados.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- 5. project_events
DROP TABLE IF EXISTS project_events;

-- 4. transactions.project_id
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS fk_transactions_project_id;
DROP INDEX IF EXISTS idx_transactions_project_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS project_id;

-- 3. projects (tabela inteira — criada por esta migration)
DROP TABLE IF EXISTS projects CASCADE;

-- 2. clients: remove só o que a 028 adicionou (mantém cpf/cnpj e o schema base)
ALTER TABLE clients DROP CONSTRAINT IF EXISTS chk_clients_source;
ALTER TABLE clients DROP CONSTRAINT IF EXISTS fk_clients_merged_into;
DROP INDEX IF EXISTS idx_clients_source;
ALTER TABLE clients DROP COLUMN IF EXISTS first_name;
ALTER TABLE clients DROP COLUMN IF EXISTS last_name;
ALTER TABLE clients DROP COLUMN IF EXISTS merged_into_client_id;
ALTER TABLE clients DROP COLUMN IF EXISTS source;

-- 1. services (tabela inteira — criada por esta migration)
DROP TABLE IF EXISTS services CASCADE;

COMMIT;
