-- ═══════════════════════════════════════════════════════════════════════════
-- Rollback da 031 - PM-POMODORO.sql
-- Remove tabelas, trigger e função de seed.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DROP TRIGGER IF EXISTS trg_seed_pomodoro_config ON users;
DROP FUNCTION IF EXISTS pm_seed_pomodoro_config();

DROP TABLE IF EXISTS pomodoro_overage_requests CASCADE;
DROP TABLE IF EXISTS task_idle_tracking        CASCADE;
DROP TABLE IF EXISTS pomodoro_daily_stats      CASCADE;
DROP TABLE IF EXISTS pomodoro_events           CASCADE;
DROP TABLE IF EXISTS user_pomodoro_config      CASCADE;
DROP TABLE IF EXISTS task_work_sessions        CASCADE;

COMMIT;
