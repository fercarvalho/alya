-- ═══════════════════════════════════════════════════════════════════════════
-- 032 - PM-REQUESTS.sql
-- F1 do port PM (IMPGEO → Alya). Filas de aprovação sobre tarefas:
--   task_due_date_requests   — negociação de prazo (status já com 'countered' e
--                              coluna decision_note — 060 + 067)
--   task_uncomplete_requests — reabertura (target já com 'pool' — 063 + 064)
--   task_delegation_requests — delegação manager→user com aprovação admin (066)
-- Padrão comum: 1 pendente por tarefa (UNIQUE parcial WHERE status='pending').
--
-- Idempotente, transacional, validador final.
-- Rollback: 032 - PM-REQUESTS-rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. task_due_date_requests (060 + 067) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS task_due_date_requests (
  id                   VARCHAR(255) PRIMARY KEY,
  task_id              VARCHAR(255) NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  project_id           VARCHAR(255) REFERENCES projects(id) ON DELETE CASCADE,
  requested_by_user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requester_role       VARCHAR(16),                 -- 'user' | 'manager'
  current_due_date     DATE,
  requested_due_date   DATE,
  justification        TEXT,
  status               VARCHAR(12) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','countered','approved','rejected')),
  decision_note        TEXT,                        -- 067
  decided_by_user_id   VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  decided_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_due_req_task_pending ON task_due_date_requests(task_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_due_req_pending ON task_due_date_requests(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_due_req_project ON task_due_date_requests(project_id);

-- ─── 2. task_uncomplete_requests (063 + 064) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS task_uncomplete_requests (
  id                         VARCHAR(255) PRIMARY KEY,
  task_id                    VARCHAR(255) NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  project_id                 VARCHAR(255) REFERENCES projects(id) ON DELETE CASCADE,
  requested_by_user_id       VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requester_role             VARCHAR(16),
  reason                     TEXT NOT NULL,
  target                     VARCHAR(12) NOT NULL DEFAULT 'original'
                               CHECK (target IN ('self','original','pool')),
  original_completer_user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  status                     VARCHAR(12) NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','approved','rejected')),
  decided_by_user_id         VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  decided_at                 TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_uncomplete_task_pending ON task_uncomplete_requests(task_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_uncomplete_pending ON task_uncomplete_requests(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_uncomplete_project ON task_uncomplete_requests(project_id);

-- ─── 3. task_delegation_requests (066) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS task_delegation_requests (
  id                   VARCHAR(255) PRIMARY KEY,
  task_id              VARCHAR(255) NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  project_id           VARCHAR(255) REFERENCES projects(id) ON DELETE CASCADE,
  requested_by_user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- o manager
  to_user_id           VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- usuário comum
  due_date             DATE,
  status               VARCHAR(12) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','approved','rejected')),
  decided_by_user_id   VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  decided_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_deleg_req_task_pending ON task_delegation_requests(task_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_deleg_req_pending ON task_delegation_requests(status) WHERE status = 'pending';

-- ─── Validador final ──────────────────────────────────────────────────────────

DO $$
DECLARE
  required_tables TEXT[] := ARRAY['task_due_date_requests','task_uncomplete_requests','task_delegation_requests'];
  t TEXT; missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOREACH t IN ARRAY required_tables LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t) THEN
      missing := array_append(missing, t);
    END IF;
  END LOOP;
  -- Confirma os deltas 067/064.
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='task_due_date_requests' AND column_name='decision_note') THEN
    missing := array_append(missing, 'task_due_date_requests.decision_note');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='task_uncomplete_requests'::regclass AND contype='c'
                 AND pg_get_constraintdef(oid) LIKE '%pool%') THEN
    missing := array_append(missing, 'task_uncomplete_requests target=pool');
  END IF;
  IF COALESCE(array_length(missing,1),0) > 0 THEN
    RAISE EXCEPTION 'Migration 032 incompleta: %', array_to_string(missing, ', ');
  END IF;
  RAISE NOTICE '✓ Migration 032 - PM-REQUESTS aplicada com sucesso.';
END $$;

COMMIT;
