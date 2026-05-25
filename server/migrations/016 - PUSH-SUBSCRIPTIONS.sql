-- =============================================================================
-- 016 - PUSH-SUBSCRIPTIONS.sql
-- Subscriptions de Web Push (canal OS-level via PWA).
--
-- Portado do projeto irmão impgeo (migrations 035 + 036), CONSOLIDADO numa
-- única tabela já que o Alya é single-origin (sem split tc-public/tc-admin).
-- Aqui o `app_id` do impgeo é dispensável — todo push do Alya é do mesmo
-- domínio. Se um dia houver split (ex: admin separado), adiciona em migration
-- futura.
--
-- Cada linha = (user × dispositivo). Um user pode ter N subscriptions
-- ativas (desktop + celular instalado como PWA + tablet, etc).
--
-- Campos:
--   - endpoint       : URL única do push service (FCM / Mozilla / WebKit).
--                      Chave natural — UNIQUE garante idempotência: mesmo
--                      device re-subscribendo apenas atualiza last_seen_at.
--   - p256dh / auth  : chaves de criptografia da subscription (vêm do browser).
--   - user_agent     : pra UI listar "iPhone Safari", "Chrome Windows", etc.
--   - last_seen_at   : atualizado a cada send bem-sucedido + a cada subscribe
--                      do mesmo endpoint. Permite limpeza de subs zumbis.
--   - failed_count   : incrementado em erros transitórios; ao chegar em 5
--                      a sub é removida (configurável no push-dispatcher).
--
-- Em erros 410/404 do push service, a sub é removida IMEDIATAMENTE
-- (subscription expirada, não tem retry possível).
--
-- IDEMPOTENTE. Rollback em `016 - PUSH-SUBSCRIPTIONS-rollback.sql`.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id                  VARCHAR(255) PRIMARY KEY,
    user_id             VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint            TEXT         NOT NULL UNIQUE,
    p256dh              TEXT         NOT NULL,
    auth                TEXT         NOT NULL,
    user_agent          TEXT,
    failed_count        INTEGER      NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_seen_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
    ON push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_last_seen
    ON push_subscriptions(last_seen_at DESC);

COMMIT;
