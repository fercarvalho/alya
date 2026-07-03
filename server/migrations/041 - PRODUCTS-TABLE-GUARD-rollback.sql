-- ═══════════════════════════════════════════════════════════════════════════
-- Rollback da 041 - PRODUCTS-TABLE-GUARD.sql
--
-- NO-OP intencional: esta migration só GARANTE a existência da tabela `products`
-- (CREATE IF NOT EXISTS). Reverter NÃO deve dropar a tabela — ela é preexistente
-- (criada na 001) e guarda os produtos do sync/push da Nuvemshop. Um DROP aqui
-- destruiria dados. Nada a desfazer.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- (sem operação — a tabela products é preservada)
SELECT 1;

COMMIT;
