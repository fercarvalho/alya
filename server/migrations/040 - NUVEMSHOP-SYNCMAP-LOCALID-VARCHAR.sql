-- ═══════════════════════════════════════════════════════════════════════════
-- 040 - NUVEMSHOP-SYNCMAP-LOCALID-VARCHAR.sql
-- Corrige um bug latente da tabela `nuvemshop_sync_map` (migration 004).
--
-- A coluna `local_id` foi criada como INTEGER, mas os ids das entidades locais
-- (products/transactions/clients) são VARCHAR alfanuméricos (ex: 'mpm8roaa9f1...').
-- Resultado: `saveSyncMap(userId, type, nuvemshopId, localId)` sempre falhava com
-- "invalid input syntax for integer" — erro engolido pelo try/catch dos syncs.
-- A tabela tem 0 linhas (o mapeamento nunca gravou), confirmando o bug.
--
-- Consequência prática (pré-039): todo sync Nuvemshop→Alya re-importava tudo a
-- cada execução (getSyncMap nunca encontrava o par → duplicava). Este ALTER
-- conserta o pull existente E habilita o push (Alya→Nuvemshop), que precisa
-- gravar o mapa reverso local_id(VARCHAR) ↔ nuvemshop_id.
--
-- Seguro: a tabela está vazia, então o cast INTEGER→VARCHAR não afeta dados.
-- Rollback: 040 - ...-rollback.sql (volta a INTEGER — só válido com a tabela vazia).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE nuvemshop_sync_map
  ALTER COLUMN local_id TYPE VARCHAR(255) USING local_id::VARCHAR;

-- ── Validação ──────────────────────────────────────────────────────────────
DO $$
DECLARE v_type TEXT;
BEGIN
  SELECT data_type INTO v_type FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'nuvemshop_sync_map' AND column_name = 'local_id';
  IF v_type <> 'character varying' THEN
    RAISE EXCEPTION 'Migration 040: local_id deveria ser character varying, é %', v_type;
  END IF;
  RAISE NOTICE '✓ Migration 040: nuvemshop_sync_map.local_id agora é VARCHAR (sync map habilitado).';
END $$;

COMMIT;
