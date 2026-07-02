-- ═══════════════════════════════════════════════════════════════════════════
-- Rollback da 032 - PM-REQUESTS.sql
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DROP TABLE IF EXISTS task_delegation_requests CASCADE;
DROP TABLE IF EXISTS task_uncomplete_requests CASCADE;
DROP TABLE IF EXISTS task_due_date_requests   CASCADE;

COMMIT;
