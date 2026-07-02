-- ═══════════════════════════════════════════════════════════════════════════
-- 029 - PM-TEMPLATES.sql
-- F1 do port PM (IMPGEO → Alya). Estrutura declarativa de TEMPLATE por serviço:
--   service_template_stages        — etapas padrão (first/normal/last)
--   service_template_tasks         — tarefas padrão por etapa (+ gestor_only, 062)
--   service_template_task_deps     — dependências (start/completion; alvo task|stage)
--   service_template_task_triggers — gatilhos que CRIAM tarefa nova
--
-- Consolida a 046 do IMPGEO. PODA: o seed do serviço de sistema
-- `svc_terracontrol_default` (serviço + 5 stages + 5 tasks + dep) NÃO é portado.
-- As flags de template em `services` já vieram na 028.
--
-- Idempotente, transacional, validador final.
-- Rollback: 029 - PM-TEMPLATES-rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. service_template_stages ───────────────────────────────────────────────
-- stage_type: 'first' (sempre 1ª), 'last' (sempre última), 'normal' (posição livre).

CREATE TABLE IF NOT EXISTS service_template_stages (
  id                    VARCHAR(255) PRIMARY KEY,
  service_id            VARCHAR(255) NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  name                  VARCHAR(255) NOT NULL,
  description           TEXT,
  version               INTEGER  NOT NULL DEFAULT 1,
  sort_order            INTEGER  NOT NULL DEFAULT 0,
  stage_type            VARCHAR(16) NOT NULL DEFAULT 'normal'
                          CHECK (stage_type IN ('first','normal','last')),
  default_duration_days INTEGER,
  default_assignee_role VARCHAR(16) CHECK (default_assignee_role IN ('admin','manager','user')),
  is_active             BOOLEAN DEFAULT TRUE,
  metadata              JSONB DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_stpl_stage_order UNIQUE (service_id, version, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_stpl_stages_service ON service_template_stages(service_id, version, sort_order);

-- ─── 2. service_template_tasks (+ gestor_only, 062) ───────────────────────────

CREATE TABLE IF NOT EXISTS service_template_tasks (
  id                     VARCHAR(255) PRIMARY KEY,
  template_stage_id      VARCHAR(255) NOT NULL REFERENCES service_template_stages(id) ON DELETE CASCADE,
  service_id             VARCHAR(255) NOT NULL REFERENCES services(id) ON DELETE CASCADE, -- denormalizado p/ query
  name                   VARCHAR(255) NOT NULL,
  description            TEXT,
  observation            TEXT,
  sort_order             INTEGER NOT NULL DEFAULT 0,
  default_days           INTEGER,
  default_assignee_role  VARCHAR(16) CHECK (default_assignee_role IN ('admin','manager','user')),
  default_estimated_minutes INTEGER,
  default_priority       SMALLINT DEFAULT 2,
  requires_acceptance    BOOLEAN DEFAULT FALSE,
  requires_attachment    BOOLEAN DEFAULT FALSE,
  requires_review        BOOLEAN DEFAULT FALSE,
  review_type            VARCHAR(24),
  reviewer_default_role  VARCHAR(16) CHECK (reviewer_default_role IN ('admin','manager','user')),
  manager_review_allowed BOOLEAN DEFAULT TRUE,
  admin_review_allowed   BOOLEAN DEFAULT TRUE,
  gestor_only            BOOLEAN DEFAULT FALSE,
  is_active              BOOLEAN DEFAULT TRUE,
  metadata               JSONB DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stpl_tasks_stage   ON service_template_tasks(template_stage_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_stpl_tasks_service ON service_template_tasks(service_id);

-- ─── 3. service_template_task_deps ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS service_template_task_deps (
  id                     VARCHAR(255) PRIMARY KEY,
  task_id                VARCHAR(255) NOT NULL REFERENCES service_template_tasks(id) ON DELETE CASCADE,
  dependency_type        VARCHAR(24)  NOT NULL
                           CHECK (dependency_type IN ('start_dependency','completion_dependency')),
  dependency_target_type VARCHAR(8)   NOT NULL
                           CHECK (dependency_target_type IN ('task','stage')),
  target_task_id         VARCHAR(255) REFERENCES service_template_tasks(id)  ON DELETE CASCADE,
  target_stage_id        VARCHAR(255) REFERENCES service_template_stages(id) ON DELETE CASCADE,
  required_status        VARCHAR(32),
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_stpl_dep_target CHECK (
    (dependency_target_type = 'task'  AND target_task_id  IS NOT NULL AND target_stage_id IS NULL) OR
    (dependency_target_type = 'stage' AND target_stage_id IS NOT NULL AND target_task_id  IS NULL)
  ),
  CONSTRAINT chk_stpl_dep_not_self CHECK (target_task_id IS NULL OR target_task_id <> task_id)
);

CREATE INDEX IF NOT EXISTS idx_stpl_deps_task         ON service_template_task_deps(task_id);
CREATE INDEX IF NOT EXISTS idx_stpl_deps_target_task  ON service_template_task_deps(target_task_id);
CREATE INDEX IF NOT EXISTS idx_stpl_deps_target_stage ON service_template_task_deps(target_stage_id);

-- ─── 4. service_template_task_triggers ────────────────────────────────────────
-- payload JSONB: { name, description, default_assignee_role, default_estimated_minutes,
--                  requires_review, default_days, target_stage_id?, sort_order? }

CREATE TABLE IF NOT EXISTS service_template_task_triggers (
  id                      VARCHAR(255) PRIMARY KEY,
  service_id              VARCHAR(255) NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  source_template_task_id VARCHAR(255) NOT NULL REFERENCES service_template_tasks(id) ON DELETE CASCADE,
  action                  VARCHAR(16) NOT NULL DEFAULT 'create' CHECK (action IN ('create')),
  on_status               VARCHAR(32) NOT NULL DEFAULT 'completed',
  payload                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active               BOOLEAN DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stpl_triggers_source  ON service_template_task_triggers(source_template_task_id);
CREATE INDEX IF NOT EXISTS idx_stpl_triggers_service ON service_template_task_triggers(service_id);

-- ─── Validador final ──────────────────────────────────────────────────────────

DO $$
DECLARE
  required_tables TEXT[] := ARRAY[
    'service_template_stages','service_template_tasks',
    'service_template_task_deps','service_template_task_triggers'
  ];
  t       TEXT;
  missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOREACH t IN ARRAY required_tables LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t) THEN
      missing := array_append(missing, t);
    END IF;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_template_tasks' AND column_name='gestor_only') THEN
    missing := array_append(missing, 'service_template_tasks.gestor_only');
  END IF;

  IF COALESCE(array_length(missing, 1), 0) > 0 THEN
    RAISE EXCEPTION 'Migration 029 incompleta: %', array_to_string(missing, ', ');
  END IF;

  RAISE NOTICE '✓ Migration 029 - PM-TEMPLATES aplicada com sucesso.';
END $$;

COMMIT;
