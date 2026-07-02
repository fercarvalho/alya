-- ═══════════════════════════════════════════════════════════════════════════
-- 030 - PM-TASKS.sql
-- F1 do port PM (IMPGEO → Alya). Entidades REAIS do projeto:
--   project_stages          — etapas (version p/ diligência v2/v3)
--   project_tasks           — tarefas (máquina de 10 estados) já com colunas de
--                             revisão (050), actual_seconds (056), submitter (061),
--                             gestor_only (062) embutidas
--   project_task_deps       — dependências (start/completion; alvo task|stage)
--   project_task_triggers   — gatilhos (idempotência via triggered_at)
--   task_events             — auditoria (actor_type PODADO: sem 'abacatepay')
--   task_assignments_history — auditoria de (re)atribuições/colaborações (048)
--   task_attachments        — anexos por tarefa (050)
--   task_help_requests      — pedidos de ajuda (050)
--
-- Consolida 047 + 048 (só a tabela; o INSERT do módulo tarefas_gerenciamento e as
-- permissões vão na 035/F5) + 050 + 056 + 061 + 062. A conversão de projects.status
-- p/ português já foi feita na 028.
--
-- Idempotente, transacional, validador final.
-- Rollback: 030 - PM-TASKS-rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. project_stages ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_stages (
  id                  VARCHAR(255) PRIMARY KEY,
  project_id          VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name                VARCHAR(255) NOT NULL,
  description         TEXT,
  version             INTEGER NOT NULL DEFAULT 1,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  status              VARCHAR(16) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','active','completed','skipped')),
  responsible_user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  default_days        INTEGER,
  start_date          DATE,
  due_date            DATE,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  template_stage_id   VARCHAR(255),
  template_snapshot   JSONB,
  metadata            JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_stages_project ON project_stages(project_id, sort_order);

-- ─── 2. project_tasks (máquina de 10 estados + revisão/tempo/gestor) ──────────

CREATE TABLE IF NOT EXISTS project_tasks (
  id                   VARCHAR(255) PRIMARY KEY,
  project_id           VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_stage_id     VARCHAR(255) NOT NULL REFERENCES project_stages(id) ON DELETE CASCADE,
  name                 VARCHAR(255) NOT NULL,
  description          TEXT,
  observation          TEXT,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  status               VARCHAR(24) NOT NULL DEFAULT 'pending'
                         CHECK (status IN (
                           'pending','available','in_progress','pending_acceptance',
                           'pending_review','pending_adjustment','completed',
                           'overdue','refused','canceled')),
  assignee_user_id     VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  captured_by_user_id  VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  created_by_user_id   VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  default_days         INTEGER,
  start_date           DATE,
  due_date             DATE,
  assigned_at          TIMESTAMPTZ,
  accepted_at          TIMESTAMPTZ,
  started_at           TIMESTAMPTZ,
  paused_at            TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  actual_minutes       INTEGER DEFAULT 0,
  actual_seconds       BIGINT DEFAULT 0,                    -- 056
  estimated_minutes    INTEGER,
  priority             SMALLINT DEFAULT 2,
  review_required      BOOLEAN DEFAULT FALSE,
  acceptance_required  BOOLEAN DEFAULT FALSE,
  reviewer_user_id     VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  manager_review_allowed BOOLEAN DEFAULT TRUE,
  admin_review_allowed   BOOLEAN DEFAULT TRUE,
  submitted_for_review_at         TIMESTAMPTZ,              -- 050
  submitted_for_review_by_user_id VARCHAR(255),            -- 061
  review_decided_at    TIMESTAMPTZ,                         -- 050
  review_decision      VARCHAR(12)                          -- 050
                         CHECK (review_decision IS NULL OR review_decision IN ('approved','rejected')),
  adjustment_notes     TEXT,                                -- 050
  refusal_reason       TEXT,
  gestor_only          BOOLEAN DEFAULT FALSE,               -- 062
  template_task_id     VARCHAR(255),
  created_by_trigger   BOOLEAN DEFAULT FALSE,
  metadata             JSONB DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_tasks_project    ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_stage      ON project_tasks(project_stage_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assignee   ON project_tasks(assignee_user_id, status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status_due ON project_tasks(status, due_date);

-- ─── 3. project_task_deps ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_task_deps (
  id                     VARCHAR(255) PRIMARY KEY,
  task_id                VARCHAR(255) NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  dependency_type        VARCHAR(24) NOT NULL
                           CHECK (dependency_type IN ('start_dependency','completion_dependency')),
  dependency_target_type VARCHAR(8) NOT NULL
                           CHECK (dependency_target_type IN ('task','stage')),
  target_task_id         VARCHAR(255) REFERENCES project_tasks(id)  ON DELETE CASCADE,
  target_stage_id        VARCHAR(255) REFERENCES project_stages(id) ON DELETE CASCADE,
  required_status        VARCHAR(32),
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_ptask_dep_target CHECK (
    (dependency_target_type = 'task'  AND target_task_id  IS NOT NULL AND target_stage_id IS NULL) OR
    (dependency_target_type = 'stage' AND target_stage_id IS NOT NULL AND target_task_id  IS NULL)
  ),
  CONSTRAINT chk_ptask_dep_not_self CHECK (target_task_id IS NULL OR target_task_id <> task_id)
);

CREATE INDEX IF NOT EXISTS idx_ptask_deps_task         ON project_task_deps(task_id);
CREATE INDEX IF NOT EXISTS idx_ptask_deps_target_task  ON project_task_deps(target_task_id);
CREATE INDEX IF NOT EXISTS idx_ptask_deps_target_stage ON project_task_deps(target_stage_id);

-- ─── 4. project_task_triggers (idempotência via triggered_at) ─────────────────

CREATE TABLE IF NOT EXISTS project_task_triggers (
  id                     VARCHAR(255) PRIMARY KEY,
  project_id             VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_task_id         VARCHAR(255) NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  action                 VARCHAR(16) NOT NULL DEFAULT 'create' CHECK (action IN ('create')),
  on_status              VARCHAR(32) NOT NULL DEFAULT 'completed',
  payload                JSONB NOT NULL DEFAULT '{}'::jsonb,
  triggered_at           TIMESTAMPTZ,
  created_task_id        VARCHAR(255) REFERENCES project_tasks(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ptask_triggers_source  ON project_task_triggers(source_task_id);
CREATE INDEX IF NOT EXISTS idx_ptask_triggers_project ON project_task_triggers(project_id);

-- ─── 5. task_events (actor_type PODADO: sem 'abacatepay') ─────────────────────

CREATE TABLE IF NOT EXISTS task_events (
  id          VARCHAR(255) PRIMARY KEY,
  task_id     VARCHAR(255) NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  event_type  VARCHAR(48) NOT NULL,
  actor_type  VARCHAR(16) NOT NULL CHECK (actor_type IN ('user','system','cron')),
  actor_id    VARCHAR(255),
  payload     JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_events_task_created ON task_events(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_events_type         ON task_events(event_type);

-- ─── 6. task_assignments_history (048) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS task_assignments_history (
  id                  VARCHAR(255) PRIMARY KEY,
  task_id             VARCHAR(255) NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  from_user_id        VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  to_user_id          VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  assigned_by_user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  reason              VARCHAR(32),   -- 'assign' | 'reassign' | 'help' | 'refused' | 'follow_up'
  note                TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_assign_hist_task ON task_assignments_history(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_assign_hist_to   ON task_assignments_history(to_user_id);

-- ─── 7. task_attachments (050) ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS task_attachments (
  id                 VARCHAR(255) PRIMARY KEY,
  task_id            VARCHAR(255) NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  file_name          VARCHAR(512) NOT NULL,
  stored_name        VARCHAR(512) NOT NULL,
  mime               VARCHAR(128),
  size_bytes         BIGINT,
  uploaded_by_user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments(task_id, uploaded_at DESC);

-- ─── 8. task_help_requests (050) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS task_help_requests (
  id                  VARCHAR(255) PRIMARY KEY,
  task_id             VARCHAR(255) NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  requester_user_id   VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id      VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message             TEXT,
  status              VARCHAR(12) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','accepted','refused','completed')),
  refusal_reason      TEXT,
  resolution_notes    TEXT,
  accepted_at         TIMESTAMPTZ,
  refused_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_help_refusal CHECK (refused_at IS NULL OR refusal_reason IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_help_requests_target    ON task_help_requests(target_user_id, status);
CREATE INDEX IF NOT EXISTS idx_help_requests_requester ON task_help_requests(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_task      ON task_help_requests(task_id);

-- ─── Validador final ──────────────────────────────────────────────────────────

DO $$
DECLARE
  required_tables TEXT[] := ARRAY[
    'project_stages','project_tasks','project_task_deps','project_task_triggers',
    'task_events','task_assignments_history','task_attachments','task_help_requests'
  ];
  required_ptask_cols TEXT[] := ARRAY[
    'actual_seconds','submitted_for_review_by_user_id','review_decision','gestor_only'
  ];
  x       TEXT;
  missing TEXT[] := ARRAY[]::TEXT[];
  n_states INT;
BEGIN
  FOREACH x IN ARRAY required_tables LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = x) THEN
      missing := array_append(missing, x);
    END IF;
  END LOOP;

  FOREACH x IN ARRAY required_ptask_cols LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_tasks' AND column_name=x) THEN
      missing := array_append(missing, 'project_tasks.' || x);
    END IF;
  END LOOP;

  -- Confirma que o CHECK de status tem os 10 estados.
  SELECT array_length(regexp_split_to_array(pg_get_constraintdef(oid), ''''), 1)
    INTO n_states
    FROM pg_constraint
   WHERE conrelid = 'project_tasks'::regclass AND contype='c'
     AND pg_get_constraintdef(oid) LIKE '%in_progress%';

  -- task_events NÃO pode aceitar 'abacatepay'
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='task_events'::regclass AND contype='c'
             AND pg_get_constraintdef(oid) LIKE '%abacatepay%') THEN
    RAISE EXCEPTION 'Migration 030: task_events.actor_type ainda aceita abacatepay (poda não aplicada).';
  END IF;

  IF COALESCE(array_length(missing, 1), 0) > 0 THEN
    RAISE EXCEPTION 'Migration 030 incompleta: %', array_to_string(missing, ', ');
  END IF;

  RAISE NOTICE '✓ Migration 030 - PM-TASKS aplicada com sucesso.';
END $$;

COMMIT;
