-- ═══════════════════════════════════════════════════════════════════════════
-- Rollback da 036 - NOTIFICATION-DEFAULTS-TABLE.sql
-- Remove a tabela de defaults. O backend volta a usar só o mapa estático
-- NOTIFICATION_DEFAULTS (que permanece no código como fallback).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DROP TABLE IF EXISTS notification_type_defaults;

COMMIT;
