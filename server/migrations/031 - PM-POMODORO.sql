-- ═══════════════════════════════════════════════════════════════════════════
-- 031 - PM-POMODORO.sql
-- F1 do port PM (IMPGEO → Alya). Controle de tempo (Pomodoro) server-side:
--   task_work_sessions        — 1 linha por ciclo (CHECKs já no estado final: custom
--                               focus 057 + break acumulado 059 + credited_seconds 056)
--   pomodoro_events           — log atômico do ciclo
--   pomodoro_daily_stats      — acumulado diário (limite de 400min ativos)
--   user_pomodoro_config      — config por usuário (+ carryover/focus_since_break 059)
--   task_idle_tracking        — tempo ocioso na área de tarefas
--   pomodoro_overage_requests — aprovação de tempo extra acima do limite (058)
-- + função/trigger trg_seed_pomodoro_config (cria config ao inserir usuário).
--
-- Consolida 049 + 056 (credited_seconds) + 057 (CHECKs custom) + 058 + 059.
-- O INSERT do módulo pomodoro_gerenciamento e permissões vão na 035/F5.
--
-- Idempotente, transacional, validador final.
-- Rollback: 031 - PM-POMODORO-rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. task_work_sessions (CHECKs consolidados) ──────────────────────────────

CREATE TABLE IF NOT EXISTS task_work_sessions (
  id                    VARCHAR(255) PRIMARY KEY,
  user_id               VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id               VARCHAR(255) REFERENCES project_tasks(id) ON DELETE SET NULL,
  project_id            VARCHAR(255) REFERENCES projects(id) ON DELETE SET NULL,
  category              VARCHAR(16) CHECK (category IN ('study','meeting','planning','admin','other')),
  pomodoro_mode         VARCHAR(20) NOT NULL,
  planned_minutes       SMALLINT NOT NULL,
  break_planned_minutes SMALLINT NOT NULL,
  state                 VARCHAR(24) NOT NULL DEFAULT 'running'
                          CHECK (state IN ('running','paused','break','completed','aborted','daily_limit_reached')),
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pause_started_at      TIMESTAMPTZ,
  break_started_at      TIMESTAMPTZ,
  stopped_at            TIMESTAMPTZ,
  total_active_seconds  INTEGER DEFAULT 0,
  total_paused_seconds  INTEGER DEFAULT 0,
  total_break_seconds   INTEGER DEFAULT 0,
  credited_seconds      BIGINT  DEFAULT 0,                  -- 056
  skipped_break_count   SMALLINT DEFAULT 0,
  last_heartbeat        TIMESTAMPTZ DEFAULT NOW(),
  aborted_reason        VARCHAR(24) CHECK (aborted_reason IN ('manual','daily_limit','tab_closed_timeout','task_completed')),
  metadata              JSONB DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_tws_target  CHECK (task_id IS NOT NULL OR category IS NOT NULL),
  CONSTRAINT chk_tws_mode    CHECK (pomodoro_mode IN ('POMODORO_25_5','POMODORO_50_10','POMODORO_100_20','POMODORO_CUSTOM')),
  CONSTRAINT chk_tws_planned CHECK (planned_minutes BETWEEN 1 AND 240),
  CONSTRAINT chk_tws_break   CHECK (break_planned_minutes BETWEEN 1 AND 1000)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tws_active_per_user
  ON task_work_sessions(user_id)
  WHERE state IN ('running','paused','break');

CREATE INDEX IF NOT EXISTS idx_tws_user_started ON task_work_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_tws_task         ON task_work_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_tws_state        ON task_work_sessions(state);

-- ─── 2. pomodoro_events ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pomodoro_events (
  id              VARCHAR(255) PRIMARY KEY,
  user_id         VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_session_id VARCHAR(255) NOT NULL REFERENCES task_work_sessions(id) ON DELETE CASCADE,
  task_id         VARCHAR(255),
  event_type      VARCHAR(24) NOT NULL CHECK (event_type IN (
                    'STARTED','PAUSED','RESUMED','STOPPED','BREAK_STARTED',
                    'BREAK_SKIPPED','BREAK_COMPLETED','MODE_UPGRADED','DAILY_LIMIT_REACHED')),
  from_mode       VARCHAR(20),
  to_mode         VARCHAR(20),
  occurred_at     TIMESTAMPTZ DEFAULT NOW(),
  metadata        JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_pomo_events_session ON pomodoro_events(work_session_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_pomo_events_user    ON pomodoro_events(user_id, occurred_at DESC);

-- ─── 3. pomodoro_daily_stats ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pomodoro_daily_stats (
  user_id              VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day                  DATE NOT NULL,
  total_minutes_worked INTEGER DEFAULT 0,
  break_minutes        INTEGER DEFAULT 0,
  sessions_completed   INTEGER DEFAULT 0,
  sessions_aborted     INTEGER DEFAULT 0,
  skipped_breaks       INTEGER DEFAULT 0,
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, day)
);

-- ─── 4. user_pomodoro_config (+ carryover/focus_since_break 059) + trigger seed ─

CREATE TABLE IF NOT EXISTS user_pomodoro_config (
  user_id                   VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  daily_limit_minutes       SMALLINT DEFAULT 400,
  idle_alert_minutes        SMALLINT DEFAULT 5,
  sound_enabled             BOOLEAN DEFAULT TRUE,
  next_cycle_forced_minutes SMALLINT,
  carryover_break_minutes   SMALLINT NOT NULL DEFAULT 0,    -- 059
  focus_since_break_minutes SMALLINT NOT NULL DEFAULT 0,    -- 059
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Seed para usuários já existentes.
INSERT INTO user_pomodoro_config (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Trigger: cria config default ao inserir usuário novo.
CREATE OR REPLACE FUNCTION pm_seed_pomodoro_config() RETURNS trigger AS $$
BEGIN
  INSERT INTO user_pomodoro_config (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seed_pomodoro_config ON users;
CREATE TRIGGER trg_seed_pomodoro_config
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION pm_seed_pomodoro_config();

-- ─── 5. task_idle_tracking ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS task_idle_tracking (
  id                        VARCHAR(255) PRIMARY KEY,
  user_id                   VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opened_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_task_started_at     TIMESTAMPTZ,
  idle_before_start_seconds INTEGER,
  alert_shown_at            TIMESTAMPTZ,
  alert_dismissed_at        TIMESTAMPTZ,
  alert_action              VARCHAR(24),
  snoozed_until             TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idle_user_opened ON task_idle_tracking(user_id, opened_at DESC);

-- ─── 6. pomodoro_overage_requests (058) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS pomodoro_overage_requests (
  id                  VARCHAR(255) PRIMARY KEY,
  user_id             VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day                 DATE NOT NULL DEFAULT CURRENT_DATE,
  justification       TEXT,
  status              VARCHAR(12) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','rejected')),
  decided_by_user_id  VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  decided_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pomodoro_overage_user_day UNIQUE (user_id, day)
);

-- ─── Validador final ──────────────────────────────────────────────────────────

DO $$
DECLARE
  required_tables TEXT[] := ARRAY[
    'task_work_sessions','pomodoro_events','pomodoro_daily_stats',
    'user_pomodoro_config','task_idle_tracking','pomodoro_overage_requests'
  ];
  t TEXT; missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOREACH t IN ARRAY required_tables LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t) THEN
      missing := array_append(missing, t);
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_seed_pomodoro_config') THEN
    missing := array_append(missing, 'trigger trg_seed_pomodoro_config');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_pomodoro_config' AND column_name='carryover_break_minutes') THEN
    missing := array_append(missing, 'user_pomodoro_config.carryover_break_minutes');
  END IF;
  IF COALESCE(array_length(missing,1),0) > 0 THEN
    RAISE EXCEPTION 'Migration 031 incompleta: %', array_to_string(missing, ', ');
  END IF;
  RAISE NOTICE '✓ Migration 031 - PM-POMODORO aplicada com sucesso.';
END $$;

COMMIT;
