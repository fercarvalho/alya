-- ═══════════════════════════════════════════════════════════════════════════
-- Rollback da 030 - PM-TASKS.sql
-- DROP na ordem inversa das FKs (filhas antes das pais).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DROP TABLE IF EXISTS task_help_requests       CASCADE;
DROP TABLE IF EXISTS task_attachments         CASCADE;
DROP TABLE IF EXISTS task_assignments_history CASCADE;
DROP TABLE IF EXISTS task_events              CASCADE;
DROP TABLE IF EXISTS project_task_triggers    CASCADE;
DROP TABLE IF EXISTS project_task_deps        CASCADE;
DROP TABLE IF EXISTS project_tasks            CASCADE;
DROP TABLE IF EXISTS project_stages           CASCADE;

COMMIT;
