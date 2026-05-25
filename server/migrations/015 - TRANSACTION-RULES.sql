-- =============================================================================
-- 015 - TRANSACTION-RULES.sql
-- Sistema de regras automáticas para classificação de transações
-- + notificações in-app persistentes para conflitos.
--
-- Portado do projeto irmão impgeo (migrations 018→021), consolidado num só
-- arquivo já que aqui é a primeira vez que a estrutura entra.
--
-- Cria:
--   - transactions: colunas extras de rastreamento de regra (applied_rule_id,
--     original_type/category/subcategory, needs_confirmation, is_hidden)
--   - transaction_rules: definição das regras (condições + ações)
--   - transaction_rule_candidates: candidatos quando 2+ regras dão match
--   - notifications: sistema in-app genérico (uso inicial: pending confirm)
--   - user_rule_permissions: permissões granulares para usuários não-admin
--
-- Tudo em transação. Rollback disponível em
--   `015 - TRANSACTION-RULES-rollback.sql`.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Colunas extras em transactions
-- -----------------------------------------------------------------------------
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS applied_rule_id       VARCHAR(255),
    ADD COLUMN IF NOT EXISTS original_type         VARCHAR(50),
    ADD COLUMN IF NOT EXISTS original_category     VARCHAR(100),
    ADD COLUMN IF NOT EXISTS original_subcategory  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS subcategory           VARCHAR(100),
    ADD COLUMN IF NOT EXISTS needs_confirmation    BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_hidden             BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_transactions_applied_rule_id
    ON transactions(applied_rule_id);
CREATE INDEX IF NOT EXISTS idx_transactions_needs_confirmation
    ON transactions(needs_confirmation) WHERE needs_confirmation = TRUE;
CREATE INDEX IF NOT EXISTS idx_transactions_hidden
    ON transactions(is_hidden) WHERE is_hidden = TRUE;

-- -----------------------------------------------------------------------------
-- 2. transaction_rules — definição das regras
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaction_rules (
    id                   VARCHAR(255) PRIMARY KEY,
    name                 VARCHAR(255) NOT NULL,
    description_contains TEXT         NOT NULL,
    -- Ação tipo: mudar `type` da transação. Quando NULL, não muda.
    action_type          VARCHAR(50)  NOT NULL DEFAULT 'change_type'
                         CHECK (action_type IN ('change_type')),
    action_value         VARCHAR(100),
    set_category         VARCHAR(100),
    set_subcategory      VARCHAR(100),
    hide_transaction     BOOLEAN      NOT NULL DEFAULT FALSE,
    -- Condições opcionais
    min_value            DECIMAL(15, 2),
    max_value            DECIMAL(15, 2),
    match_type           VARCHAR(50),
    -- Estado
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order           INTEGER      NOT NULL DEFAULT 0,
    created_by           VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Pelo menos uma ação definida
    CONSTRAINT transaction_rules_at_least_one_action_check CHECK (
        action_value IS NOT NULL
        OR set_category IS NOT NULL
        OR set_subcategory IS NOT NULL
        OR hide_transaction = TRUE
    ),
    -- Coerência: se min e max definidos, min <= max
    CONSTRAINT transaction_rules_value_range_check CHECK (
        min_value IS NULL OR max_value IS NULL OR min_value <= max_value
    )
);

CREATE INDEX IF NOT EXISTS idx_transaction_rules_active
    ON transaction_rules(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_transaction_rules_sort_order
    ON transaction_rules(sort_order);

-- FK de applied_rule_id agora que a tabela existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'transactions'
          AND constraint_name = 'transactions_applied_rule_id_fkey'
    ) THEN
        ALTER TABLE transactions
            ADD CONSTRAINT transactions_applied_rule_id_fkey
            FOREIGN KEY (applied_rule_id) REFERENCES transaction_rules(id) ON DELETE SET NULL;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. transaction_rule_candidates — match em múltiplas regras → pendente
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaction_rule_candidates (
    transaction_id VARCHAR(255) NOT NULL REFERENCES transactions(id)      ON DELETE CASCADE,
    rule_id        VARCHAR(255) NOT NULL REFERENCES transaction_rules(id) ON DELETE CASCADE,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (transaction_id, rule_id)
);

CREATE INDEX IF NOT EXISTS idx_transaction_rule_candidates_tx
    ON transaction_rule_candidates(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_rule_candidates_rule
    ON transaction_rule_candidates(rule_id);

-- -----------------------------------------------------------------------------
-- 4. notifications — sistema in-app genérico
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id                  VARCHAR(255) PRIMARY KEY,
    user_id             VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type   VARCHAR(50)  NOT NULL,
    title               VARCHAR(255) NOT NULL,
    message             TEXT,
    related_entity_type VARCHAR(50),
    related_entity_id   VARCHAR(255),
    is_read             BOOLEAN      NOT NULL DEFAULT FALSE,
    read_at             TIMESTAMPTZ,
    cleared             BOOLEAN      NOT NULL DEFAULT FALSE,
    cleared_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_cleared
    ON notifications(user_id, cleared) WHERE cleared = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_entity
    ON notifications(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
    ON notifications(created_at DESC);

-- -----------------------------------------------------------------------------
-- 5. user_rule_permissions — permissões granulares
-- Admins/superadmins têm bypass no backend (não precisam de linha aqui).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_rule_permissions (
    user_id    VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    can_create BOOLEAN      NOT NULL DEFAULT FALSE,
    can_edit   BOOLEAN      NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN      NOT NULL DEFAULT FALSE,
    granted_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_rule_permissions_granted_by
    ON user_rule_permissions(granted_by);

-- -----------------------------------------------------------------------------
-- Validações finais
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    ok BOOLEAN;
BEGIN
    SELECT
        EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name='transactions' AND column_name='applied_rule_id')
        AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name='transactions' AND column_name='is_hidden')
        AND EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_name='transaction_rules')
        AND EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_name='transaction_rule_candidates')
        AND EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_name='notifications')
        AND EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_name='user_rule_permissions')
    INTO ok;

    IF NOT ok THEN
        RAISE EXCEPTION 'Migração 015: estrutura incompleta';
    END IF;

    RAISE NOTICE 'Migração 015 concluída: 4 tabelas novas + 7 colunas extras em transactions';
END $$;

COMMIT;
