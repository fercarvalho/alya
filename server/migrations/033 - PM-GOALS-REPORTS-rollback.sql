-- ═══════════════════════════════════════════════════════════════════════════
-- Rollback da 033 - PM-GOALS-REPORTS.sql
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DROP TABLE IF EXISTS pm_report_jobs CASCADE;
DROP TABLE IF EXISTS pm_goals       CASCADE;

ALTER TABLE users DROP COLUMN IF EXISTS pm_report_frequencies;
ALTER TABLE users DROP COLUMN IF EXISTS pm_email_reports;

COMMIT;
