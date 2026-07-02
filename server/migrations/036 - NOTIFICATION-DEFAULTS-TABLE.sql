-- ═══════════════════════════════════════════════════════════════════════════
-- 036 - NOTIFICATION-DEFAULTS-TABLE.sql
-- Melhoria #12/doc-12: move os defaults de notificação (push/email por tipo) do
-- mapa estático NOTIFICATION_DEFAULTS (database-pg.js) para uma TABELA editável,
-- permitindo mudar defaults sem editar código. O mapa estático segue como
-- fallback (rede de segurança) no backend.
--
-- Seed = espelho do NOTIFICATION_DEFAULTS atual (transaction_confirm_needed,
-- _meta:foreground e os 22 pm_*). Operacionais imediatos = só push; aprovações
-- e decisões = push + email.
--
-- Idempotente, transacional, validador final.
-- Rollback: 036 - NOTIFICATION-DEFAULTS-TABLE-rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS notification_type_defaults (
  notification_type VARCHAR(64) PRIMARY KEY,
  push  BOOLEAN NOT NULL DEFAULT FALSE,
  email BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO notification_type_defaults (notification_type, push, email) VALUES
  ('transaction_confirm_needed',    TRUE,  FALSE),
  ('_meta:foreground',              FALSE, FALSE),
  ('pm_task_assigned',              TRUE,  FALSE),
  ('pm_task_accepted',              TRUE,  FALSE),
  ('pm_task_refused',               TRUE,  FALSE),
  ('pm_task_overdue',               TRUE,  FALSE),
  ('pm_review_requested',           TRUE,  FALSE),
  ('pm_review_decided',             TRUE,  FALSE),
  ('pm_help_requested',             TRUE,  FALSE),
  ('pm_help_accepted',              TRUE,  FALSE),
  ('pm_help_refused',               TRUE,  TRUE),
  ('pm_project_completed',          TRUE,  FALSE),
  ('pm_pomodoro_overage_requested', TRUE,  TRUE),
  ('pm_pomodoro_overage_decided',   TRUE,  TRUE),
  ('pm_due_date_requested',         TRUE,  TRUE),
  ('pm_due_date_proposed',          TRUE,  TRUE),
  ('pm_due_date_decided',           TRUE,  TRUE),
  ('pm_task_uncompleted',           TRUE,  TRUE),
  ('pm_uncomplete_requested',       TRUE,  TRUE),
  ('pm_uncomplete_decided',         TRUE,  TRUE),
  ('pm_uncomplete_self_notice',     TRUE,  TRUE),
  ('pm_review_followup',            TRUE,  TRUE),
  ('pm_delegation_requested',       TRUE,  TRUE),
  ('pm_delegation_decided',         TRUE,  TRUE)
ON CONFLICT (notification_type) DO NOTHING;

DO $$
DECLARE n INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_type_defaults') THEN
    RAISE EXCEPTION 'Migration 036: tabela notification_type_defaults ausente';
  END IF;
  SELECT COUNT(*) INTO n FROM notification_type_defaults;
  IF n < 24 THEN
    RAISE EXCEPTION 'Migration 036: seed incompleto (% linhas, esperado >= 24)', n;
  END IF;
  RAISE NOTICE '✓ Migration 036 - NOTIFICATION-DEFAULTS-TABLE: % defaults semeados.', n;
END $$;

COMMIT;
