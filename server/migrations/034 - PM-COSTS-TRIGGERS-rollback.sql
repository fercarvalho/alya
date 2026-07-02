-- ═══════════════════════════════════════════════════════════════════════════
-- Rollback da 034 - PM-COSTS-TRIGGERS.sql
-- Remove triggers, funções e views. Índices caem junto (DROP INDEX).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DROP INDEX IF EXISTS idx_project_tasks_review_queue;
DROP INDEX IF EXISTS idx_project_stages_snapshot_gin;
DROP INDEX IF EXISTS idx_projects_metadata_gin;
DROP INDEX IF EXISTS idx_projects_manager_status;
DROP INDEX IF EXISTS idx_project_tasks_due_active;

DROP VIEW IF EXISTS pm_overdue_summary_v;
DROP VIEW IF EXISTS pm_project_health_v;

DROP TRIGGER IF EXISTS trg_pm_tasks_progress ON project_tasks;
DROP TRIGGER IF EXISTS trg_pm_transactions_cost ON transactions;

DROP FUNCTION IF EXISTS pm_tasks_progress_trigger();
DROP FUNCTION IF EXISTS pm_project_progress_recalc(VARCHAR);
DROP FUNCTION IF EXISTS pm_transactions_cost_trigger();
DROP FUNCTION IF EXISTS pm_recalc_project_expenses(VARCHAR);

COMMIT;
