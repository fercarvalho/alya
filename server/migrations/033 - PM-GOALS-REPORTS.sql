-- ═══════════════════════════════════════════════════════════════════════════
-- 033 - PM-GOALS-REPORTS.sql
-- F1 do port PM (IMPGEO → Alya). Metas operacionais e relatórios por e-mail:
--   pm_goals        — KPI com métrica/alvo/escopo/janela (065)
--   users           — + pm_email_reports / pm_report_frequencies (051)
--   pm_report_jobs  — idempotência de envio de relatório por e-mail (051)
--
-- Idempotente, transacional, validador final.
-- Rollback: 033 - PM-GOALS-REPORTS-rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. pm_goals (065) ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pm_goals (
  id                  VARCHAR(255) PRIMARY KEY,
  title               VARCHAR(255),
  metric              VARCHAR(24) NOT NULL
                        CHECK (metric IN ('tasks_completed','on_time_pct','projects_completed','focus_minutes')),
  target              NUMERIC(12,2) NOT NULL,
  scope               VARCHAR(12) NOT NULL
                        CHECK (scope IN ('self','user','team','global')),
  target_user_id      VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,  -- NULL p/ global
  period              VARCHAR(12) NOT NULL CHECK (period IN ('week','month','quarter')),
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  created_by_user_id  VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_goals_target  ON pm_goals(target_user_id);
CREATE INDEX IF NOT EXISTS idx_pm_goals_creator ON pm_goals(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_pm_goals_scope   ON pm_goals(scope);

-- ─── 2. users: preferências de relatório por e-mail (051) ─────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS pm_email_reports      BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pm_report_frequencies JSONB   DEFAULT '[]'::jsonb;

-- ─── 3. pm_report_jobs (051) ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pm_report_jobs (
  id            VARCHAR(255) PRIMARY KEY,
  user_id       VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  frequency     VARCHAR(12) NOT NULL CHECK (frequency IN ('daily','weekly','monthly','quarterly','yearly')),
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  sent_at       TIMESTAMPTZ DEFAULT NOW(),
  status        VARCHAR(12) DEFAULT 'sent' CHECK (status IN ('sent','error','skipped')),
  error         TEXT,
  CONSTRAINT uq_pm_report_jobs UNIQUE (user_id, frequency, period_start)
);

CREATE INDEX IF NOT EXISTS idx_pm_report_jobs_user ON pm_report_jobs(user_id, frequency, period_start DESC);

-- ─── Validador final ──────────────────────────────────────────────────────────

DO $$
DECLARE missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='pm_goals') THEN
    missing := array_append(missing, 'pm_goals');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='pm_report_jobs') THEN
    missing := array_append(missing, 'pm_report_jobs');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='pm_email_reports') THEN
    missing := array_append(missing, 'users.pm_email_reports');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='pm_report_frequencies') THEN
    missing := array_append(missing, 'users.pm_report_frequencies');
  END IF;
  IF COALESCE(array_length(missing,1),0) > 0 THEN
    RAISE EXCEPTION 'Migration 033 incompleta: %', array_to_string(missing, ', ');
  END IF;
  RAISE NOTICE '✓ Migration 033 - PM-GOALS-REPORTS aplicada com sucesso.';
END $$;

COMMIT;
