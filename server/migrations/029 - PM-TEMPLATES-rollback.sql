-- ═══════════════════════════════════════════════════════════════════════════
-- Rollback da 029 - PM-TEMPLATES.sql
-- DROP na ordem inversa das FKs.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DROP TABLE IF EXISTS service_template_task_triggers CASCADE;
DROP TABLE IF EXISTS service_template_task_deps     CASCADE;
DROP TABLE IF EXISTS service_template_tasks         CASCADE;
DROP TABLE IF EXISTS service_template_stages        CASCADE;

COMMIT;
