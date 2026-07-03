-- ═══════════════════════════════════════════════════════════════════════════
-- Rollback da 037 - BLING-GRANT-PERMISSIONS.sql
-- Remove as concessões de bling em user_module_permissions. O módulo, o manifest
-- e os role_default_permissions permanecem.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DELETE FROM user_module_permissions WHERE module_key = 'bling';

COMMIT;
