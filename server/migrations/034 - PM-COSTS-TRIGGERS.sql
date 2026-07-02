-- ═══════════════════════════════════════════════════════════════════════════
-- 034 - PM-COSTS-TRIGGERS.sql
-- F1 do port PM (IMPGEO → Alya). Coração da integração financeira:
--   pm_recalc_project_expenses() + trigger em transactions (custo automático)
--   pm_project_progress_recalc() + trigger em project_tasks (progresso automático)
--   views pm_project_health_v, pm_overdue_summary_v
--   backfill inicial + índices de performance (053)
--
-- Porta a 052 (+ 053) VERBATIM: o transactions do Alya já é value DECIMAL(15,2)
-- em reais com type='Despesa', idêntico ao IMPGEO. O registro do módulo
-- relatorios_tarefas_gerenciamento vai na 035/F5.
--
-- Idempotente, transacional, validador final.
-- Rollback: 034 - PM-COSTS-TRIGGERS-rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Custo do projeto = soma das despesas vinculadas (em centavos) ─────────

CREATE OR REPLACE FUNCTION pm_recalc_project_expenses(p_project_id VARCHAR) RETURNS void AS $$
BEGIN
  IF p_project_id IS NULL THEN RETURN; END IF;
  UPDATE projects
     SET expenses_cents = COALESCE((
           SELECT ROUND(SUM(value) * 100)::BIGINT
             FROM transactions
            WHERE project_id = p_project_id AND type = 'Despesa'
         ), 0),
         updated_at = NOW()
   WHERE id = p_project_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pm_transactions_cost_trigger() RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM pm_recalc_project_expenses(NEW.project_id);
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM pm_recalc_project_expenses(NEW.project_id);
    IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
      PERFORM pm_recalc_project_expenses(OLD.project_id);
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM pm_recalc_project_expenses(OLD.project_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pm_transactions_cost ON transactions;
CREATE TRIGGER trg_pm_transactions_cost
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION pm_transactions_cost_trigger();

-- ─── 2. Progresso do projeto = % de tarefas concluídas ────────────────────────

CREATE OR REPLACE FUNCTION pm_project_progress_recalc(p_project_id VARCHAR) RETURNS void AS $$
DECLARE total INT; done INT;
BEGIN
  IF p_project_id IS NULL THEN RETURN; END IF;
  SELECT COUNT(*) FILTER (WHERE status NOT IN ('canceled','refused')),
         COUNT(*) FILTER (WHERE status = 'completed')
    INTO total, done
    FROM project_tasks WHERE project_id = p_project_id;
  UPDATE projects
     SET progress_pct = CASE WHEN COALESCE(total,0) = 0 THEN 0 ELSE ROUND((done::numeric / total) * 100, 2) END,
         updated_at = NOW()
   WHERE id = p_project_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pm_tasks_progress_trigger() RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM pm_project_progress_recalc(OLD.project_id);
  ELSE
    PERFORM pm_project_progress_recalc(NEW.project_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pm_tasks_progress ON project_tasks;
CREATE TRIGGER trg_pm_tasks_progress
  AFTER INSERT OR UPDATE OF status OR DELETE ON project_tasks
  FOR EACH ROW EXECUTE FUNCTION pm_tasks_progress_trigger();

-- ─── 3. Views de apoio ────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW pm_project_health_v AS
SELECT p.id AS project_id, p.name, p.status, p.progress_pct,
       p.total_cents, p.expenses_cents, p.profit_cents,
       (p.due_date - CURRENT_DATE) AS days_to_deadline,
       CASE WHEN p.total_cents > 0 THEN ROUND((p.expenses_cents::numeric / p.total_cents) * 100, 1) ELSE NULL END AS expense_ratio_pct,
       (SELECT COUNT(*) FROM project_tasks t WHERE t.project_id = p.id) AS task_count,
       (SELECT COUNT(*) FROM project_tasks t WHERE t.project_id = p.id AND t.status = 'overdue') AS overdue_count
  FROM projects p;

CREATE OR REPLACE VIEW pm_overdue_summary_v AS
SELECT t.assignee_user_id AS user_id,
       COUNT(*) AS overdue_tasks,
       MIN(t.due_date) AS oldest_due
  FROM project_tasks t
 WHERE t.status = 'overdue'
 GROUP BY t.assignee_user_id;

-- ─── 4. Recalc inicial (backfill) ─────────────────────────────────────────────

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM projects LOOP
    PERFORM pm_recalc_project_expenses(r.id);
    PERFORM pm_project_progress_recalc(r.id);
  END LOOP;
END $$;

-- ─── 5. Índices de performance (053) ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_project_tasks_due_active
  ON project_tasks(due_date)
  WHERE status NOT IN ('completed','canceled');

CREATE INDEX IF NOT EXISTS idx_projects_manager_status
  ON projects(manager_user_id, status);

CREATE INDEX IF NOT EXISTS idx_projects_metadata_gin
  ON projects USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_project_stages_snapshot_gin
  ON project_stages USING GIN (template_snapshot);

CREATE INDEX IF NOT EXISTS idx_project_tasks_review_queue
  ON project_tasks(submitted_for_review_at)
  WHERE status = 'pending_review';

-- ─── Validador final ──────────────────────────────────────────────────────────

DO $$
DECLARE missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_pm_transactions_cost') THEN missing := array_append(missing, 'trigger custo'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_pm_tasks_progress')     THEN missing := array_append(missing, 'trigger progresso'); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name='pm_project_health_v')  THEN missing := array_append(missing, 'view health'); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name='pm_overdue_summary_v') THEN missing := array_append(missing, 'view overdue'); END IF;
  IF COALESCE(array_length(missing,1),0) > 0 THEN
    RAISE EXCEPTION 'Migration 034 incompleta: %', array_to_string(missing, ', ');
  END IF;
  RAISE NOTICE '✓ Migration 034 - PM-COSTS-TRIGGERS aplicada com sucesso.';
END $$;

COMMIT;
