-- ═══════════════════════════════════════════════════════════════════════════
-- 028 - PM-CORE.sql
-- F1 do port do subsistema Gerenciamento (PM) do IMPGEO → Alya.
-- Consolida (com PODA do TerraControl/PIX) as migrations 045 (projects/clients/
-- transactions/project_events), 046/054 (colunas de services) e 047 (status de
-- projects em português) do IMPGEO.
--
-- No Alya, `projects` e `services` NÃO existiam → criadas do zero (base + PM).
-- `clients` já existe (cifrada) → apenas estendida. `transactions` ganha project_id.
--
-- PODA aplicada: sem terracontrol_id/budget_id (projects), sem tc_user_id (clients),
-- source ∈ ('manual','imported'), project_events.actor_type ∈ ('user','system','cron'),
-- sem seção terracontrol. Endereço de clients permanece cifrado (address_encrypted) —
-- estruturação vem no backend (F2); nada de address JSONB aqui.
--
-- Idempotente, transacional, com validador final.
-- Rollback: 028 - PM-CORE-rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. services (base + template flags 046 + status 054) ─────────────────────

CREATE TABLE IF NOT EXISTS services (
  id                    VARCHAR(255) PRIMARY KEY,
  name                  VARCHAR(255) NOT NULL,
  description           TEXT,
  price                 DECIMAL(10,2),
  is_template_enabled   BOOLEAN  DEFAULT FALSE,
  is_system             BOOLEAN  DEFAULT FALSE,
  default_priority      SMALLINT DEFAULT 2,
  default_duration_days INTEGER,
  status                VARCHAR(16) DEFAULT 'ativo',
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_services_status') THEN
    ALTER TABLE services ADD CONSTRAINT chk_services_status CHECK (status IN ('ativo','inativo'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);

-- ─── 2. clients: estende (source, merge, first/last name) — SEM tc_user_id ────
-- cpf/cnpj já existem no Alya; endereço permanece cifrado (address_encrypted).

ALTER TABLE clients ADD COLUMN IF NOT EXISTS source                VARCHAR(16) DEFAULT 'manual';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS merged_into_client_id VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS first_name            VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_name             VARCHAR(255);

DO $$
BEGIN
  -- self-FK para merge de clientes
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_clients_merged_into') THEN
    ALTER TABLE clients
      ADD CONSTRAINT fk_clients_merged_into
      FOREIGN KEY (merged_into_client_id) REFERENCES clients(id) ON DELETE SET NULL;
  END IF;

  -- CHECK source (podado: sem 'terracontrol')
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_clients_source') THEN
    UPDATE clients SET source = 'manual'
      WHERE source IS NULL OR source NOT IN ('manual','imported');
    ALTER TABLE clients
      ADD CONSTRAINT chk_clients_source
      CHECK (source IN ('manual','imported'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clients_source ON clients(source);

-- ─── 3. projects (base + financeiro 045 podado + status pt 047) ───────────────

CREATE TABLE IF NOT EXISTS projects (
  id               VARCHAR(255) PRIMARY KEY,
  name             VARCHAR(255) NOT NULL,
  description      TEXT,
  client_id        VARCHAR(255) REFERENCES clients(id)  ON DELETE SET NULL,
  service_id       VARCHAR(255) REFERENCES services(id) ON DELETE SET NULL,
  source           VARCHAR(16)  DEFAULT 'manual',
  manager_user_id  VARCHAR(255) REFERENCES users(id)    ON DELETE SET NULL,
  status           VARCHAR(16)  DEFAULT 'ativo',
  priority         SMALLINT,
  start_date       DATE,
  due_date         DATE,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  canceled_at      TIMESTAMPTZ,
  total_cents      BIGINT  DEFAULT 0,
  paid_cents       BIGINT  DEFAULT 0,
  expenses_cents   BIGINT  DEFAULT 0,
  profit_cents     BIGINT GENERATED ALWAYS AS
                     (COALESCE(total_cents, 0) - COALESCE(expenses_cents, 0)) STORED,
  progress_pct     NUMERIC(5,2) DEFAULT 0,
  auto_finalize    BOOLEAN DEFAULT TRUE,
  metadata         JSONB DEFAULT '{}'::jsonb,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_projects_status') THEN
    ALTER TABLE projects ADD CONSTRAINT chk_projects_status
      CHECK (status IN ('ativo','inativo','pausado','concluido','cancelado'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_projects_source') THEN
    ALTER TABLE projects ADD CONSTRAINT chk_projects_source
      CHECK (source IN ('manual','imported'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_client_id       ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_service_id      ON projects(service_id);
CREATE INDEX IF NOT EXISTS idx_projects_manager_user_id ON projects(manager_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_due_date        ON projects(due_date);

-- ─── 4. transactions: project_id (link financeiro) ────────────────────────────

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS project_id VARCHAR(255);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_transactions_project_id') THEN
    ALTER TABLE transactions ADD CONSTRAINT fk_transactions_project_id
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_project_id ON transactions(project_id);

-- ─── 5. project_events (auditoria; actor_type podado: sem 'abacatepay') ───────

CREATE TABLE IF NOT EXISTS project_events (
  id          VARCHAR(255) PRIMARY KEY,
  project_id  VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  event_type  VARCHAR(64)  NOT NULL,
  actor_type  VARCHAR(16)  NOT NULL CHECK (actor_type IN ('user','system','cron')),
  actor_id    VARCHAR(255),
  payload     JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_events_project_id_created ON project_events(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_events_event_type         ON project_events(event_type);

-- ─── Validador final ──────────────────────────────────────────────────────────

DO $$
DECLARE
  expected_project_cols TEXT[] := ARRAY[
    'client_id','service_id','source','manager_user_id','priority','start_date',
    'due_date','started_at','completed_at','canceled_at','total_cents','paid_cents',
    'expenses_cents','profit_cents','progress_pct','auto_finalize','metadata'
  ];
  expected_clients_cols TEXT[] := ARRAY['source','merged_into_client_id','first_name','last_name'];
  c       TEXT;
  missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'services') THEN
    missing := array_append(missing, 'TABLE services');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
    missing := array_append(missing, 'TABLE projects');
  END IF;

  FOREACH c IN ARRAY expected_project_cols LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = c) THEN
      missing := array_append(missing, 'projects.' || c);
    END IF;
  END LOOP;

  FOREACH c IN ARRAY expected_clients_cols LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = c) THEN
      missing := array_append(missing, 'clients.' || c);
    END IF;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_events') THEN
    missing := array_append(missing, 'TABLE project_events');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'project_id') THEN
    missing := array_append(missing, 'transactions.project_id');
  END IF;

  -- Garante que a poda foi aplicada (colunas TerraControl NÃO devem existir).
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name IN ('terracontrol_id','budget_id')) THEN
    RAISE EXCEPTION 'Migration 028: coluna TerraControl indevida em projects (poda não aplicada).';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'tc_user_id') THEN
    RAISE EXCEPTION 'Migration 028: coluna tc_user_id indevida em clients (poda não aplicada).';
  END IF;

  IF COALESCE(array_length(missing, 1), 0) > 0 THEN
    RAISE EXCEPTION 'Migration 028 incompleta: %', array_to_string(missing, ', ');
  END IF;

  RAISE NOTICE '✓ Migration 028 - PM-CORE aplicada com sucesso.';
END $$;

COMMIT;
