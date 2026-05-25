-- Rollback Migration 018: descarta subsystems e a coluna subsystem_key.
-- Mantém os 4 módulos novos do gerenciamento e o documentacao (não dá pra
-- saber se foram criados pela 018 ou em runtime antes). Se quiser apagá-los
-- manualmente: DELETE FROM modules WHERE key IN
--   ('dashboard_gerenciamento','metas_gerenciamento','projecao_gerenciamento',
--    'relatorios_gerenciamento','documentacao');

BEGIN;

ALTER TABLE modules DROP CONSTRAINT IF EXISTS modules_subsystem_key_fkey;
DROP INDEX IF EXISTS idx_modules_subsystem_key;
ALTER TABLE modules DROP COLUMN IF EXISTS subsystem_key;
DROP TABLE IF EXISTS subsystems;

COMMIT;
