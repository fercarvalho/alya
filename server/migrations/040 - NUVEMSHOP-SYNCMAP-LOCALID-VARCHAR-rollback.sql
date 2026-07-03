-- ═══════════════════════════════════════════════════════════════════════════
-- Rollback da 040 - NUVEMSHOP-SYNCMAP-LOCALID-VARCHAR.sql
--
-- Volta `local_id` para INTEGER. ATENÇÃO: só é seguro se a tabela estiver vazia
-- ou se todos os local_id forem numéricos — ids alfanuméricos (o caso real do
-- Alya) NÃO convertem para INTEGER e o ALTER falhará. Preferir restaurar via
-- backup backup-pre-040-*.sql se houver dados.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE nuvemshop_sync_map
  ALTER COLUMN local_id TYPE INTEGER USING local_id::INTEGER;

COMMIT;
