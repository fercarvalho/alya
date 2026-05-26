-- =============================================================================
-- Rollback Migration 021 — role_default_permissions
-- =============================================================================
--
-- Reverte: dropa a tabela inteira (e o índice). user_module_permissions e
-- users.role ficam intocados — esta migration nunca os tocou.
--
-- PRÉ-REQUISITO: se a Fase 2.3 (migration 022 — roles dinâmicas) já tiver
-- rodado, ela adiciona um FK de role_default_permissions.role para
-- roles(key). O DROP TABLE abaixo derruba esse FK junto, então o rollback
-- continua válido. Mas o rollback da 022 deve ser rodado antes pra ficar
-- alinhado com o resto do schema.
-- =============================================================================

BEGIN;

DROP INDEX IF EXISTS idx_role_default_permissions_role;
DROP TABLE IF EXISTS role_default_permissions;

DO $$
BEGIN
  RAISE NOTICE '✓ Rollback 021: role_default_permissions removida.';
END $$;

COMMIT;
