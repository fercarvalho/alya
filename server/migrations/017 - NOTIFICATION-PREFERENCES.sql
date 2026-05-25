-- =============================================================================
-- 017 - NOTIFICATION-PREFERENCES.sql
-- Preferências granulares de notificação (push + email) por tipo de evento.
--
-- Portado do impgeo (migration 037). Tabela junction (user × type × channel)
-- → enabled, escalável: novos tipos ou canais novos não exigem migration —
-- só inserts via UI.
--
-- Defaults sensatos NÃO ficam no schema (pra não precisar de migration a cada
-- novo tipo). Ficam no helper getNotificationPreference em database-pg.js:
-- se não houver linha pra (user, type, channel), devolve o default do mapa.
-- Quando o user toca o toggle, escreve uma linha explícita.
--
-- Linhas especiais com notification_type='_meta:*' guardam toggles de meta
-- (ex: '_meta:foreground' = "mostrar push OS-level com app aberto").
--
-- IDEMPOTENTE. Rollback em `017 - NOTIFICATION-PREFERENCES-rollback.sql`.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS notification_preferences (
    id                  VARCHAR(255) PRIMARY KEY,
    user_id             VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type   VARCHAR(64)  NOT NULL,
    channel             VARCHAR(16)  NOT NULL,
    enabled             BOOLEAN      NOT NULL,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT notification_preferences_channel_check
        CHECK (channel IN ('push', 'email')),
    CONSTRAINT notification_preferences_unique_pref
        UNIQUE (user_id, notification_type, channel)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id
    ON notification_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_lookup
    ON notification_preferences(user_id, notification_type, channel);

COMMIT;
