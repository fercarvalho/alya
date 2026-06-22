-- =============================================================================
-- Migration 025: Integração Bling (ERP) — Fase 0 (fundação OAuth/JWT + dedup)
-- =============================================================================
--
-- Cria a base da integração com o ERP Bling (API v3), espelhando o padrão da
-- integração Nuvemshop (migration 004) adaptado ao schema atual (subsistemas da
-- migration 018, role_default_permissions da migration 021).
--
-- Conteúdo:
--   1. bling_config                  — config OAuth por usuário (tokens cifrados)
--   2. bling_sync_map                — mapeamento de IDs Bling↔Alya (idempotência/dedup)
--   3. transactions.source           — rastreabilidade da origem da transação
--   4. transaction_dedup_candidates  — duplicata-suspeita para o fluxo "A confirmar"
--   5. módulo 'bling' no menu (subsistema 'especial') + defaults de permissão
--
-- Notas:
--   - Tokens (access/refresh) são gravados CRIPTOGRAFADOS (AES-256-GCM) pelo app;
--     o banco guarda apenas o texto cifrado no formato iv:authTag:encrypted.
--   - Credenciais da aplicação (client_id/client_secret/redirect_uri) ficam no
--     .env, NUNCA no banco.
--   - Visibilidade do módulo: o superadmin vê por bypass; admins/usuários já
--     existentes recebem o módulo via UI de permissões (role_default_permissions
--     só é aplicado a usuários criados depois). Bling = subsistema 'especial'.
--
-- Idempotente (BEGIN/COMMIT). Reversão: 025 - BLING-rollback.sql
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Config OAuth por usuário (1 conta Bling por usuário)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bling_config (
  id                    SERIAL PRIMARY KEY,
  user_id               VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bling_company_id      VARCHAR(255),          -- companyId retornado pelo Bling
  access_token          TEXT NOT NULL,         -- criptografado AES-256-GCM (JWT)
  refresh_token         TEXT NOT NULL,         -- criptografado AES-256-GCM
  token_expires_at      TIMESTAMP NOT NULL,    -- expiração do access_token (~6h)
  refresh_expires_at    TIMESTAMP NOT NULL,    -- expiração do refresh_token (~30d)
  scopes                TEXT,                  -- escopos autorizados
  last_sync_receivables TIMESTAMP,             -- cursor do polling de contas a receber
  last_sync_payables    TIMESTAMP,             -- cursor do polling de contas a pagar
  last_sync_orders      TIMESTAMP,             -- cursor de pedidos
  connected_at          TIMESTAMP DEFAULT NOW(),
  is_active             BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id)
);

-- -----------------------------------------------------------------------------
-- 2. Mapeamento de IDs Bling↔Alya (idempotência + registro de dedup)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bling_sync_map (
  id            SERIAL PRIMARY KEY,
  user_id       VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL,  -- 'receivable','payable','order','product','contact','nfe','event'
  bling_id      VARCHAR(255) NOT NULL, -- ID do recurso no Bling
  local_id      VARCHAR(255),          -- ID local no Alya (transação/produto/cliente)
  source_ref    VARCHAR(255),          -- ref. de origem (ex: numeroLoja = pedido Nuvemshop)
  status        VARCHAR(30) DEFAULT 'synced',  -- 'synced' | 'skipped_dedup' | 'error'
  synced_at     TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, resource_type, bling_id)
);

-- -----------------------------------------------------------------------------
-- 3. Rastreabilidade de origem das transações
--    valores: 'manual' | 'bank_extract' | 'nuvemshop' | 'bling'
-- -----------------------------------------------------------------------------
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS source VARCHAR(30) NOT NULL DEFAULT 'manual';

-- -----------------------------------------------------------------------------
-- 4. Candidatos de duplicata-suspeita (extensão do "A confirmar" para dedup
--    binária: transação importada vs. transação já existente suspeita de ser a mesma)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaction_dedup_candidates (
  transaction_id         VARCHAR(255) NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  suspected_duplicate_of VARCHAR(255) NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  source                 VARCHAR(30) NOT NULL,   -- origem da transação importada (ex: 'bling')
  score                  DECIMAL(5,2),           -- similaridade 0–100 (heurística)
  created_at             TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (transaction_id, suspected_duplicate_of)
);

-- -----------------------------------------------------------------------------
-- 5. Índices
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bling_config_user_id        ON bling_config(user_id);
CREATE INDEX IF NOT EXISTS idx_bling_sync_map_user_resource ON bling_sync_map(user_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_bling_sync_map_bling_id      ON bling_sync_map(bling_id);
CREATE INDEX IF NOT EXISTS idx_bling_sync_map_source_ref    ON bling_sync_map(source_ref);
CREATE INDEX IF NOT EXISTS idx_transactions_source          ON transactions(source);
CREATE INDEX IF NOT EXISTS idx_transactions_value_date      ON transactions(value, date); -- acelera a heurística de dedup

-- -----------------------------------------------------------------------------
-- 6. Módulo 'bling' no menu (subsistema 'especial', após 'nuvemshop' = sort 1)
--    Padrão idempotente da migration 018 (gen_random_uuid + WHERE NOT EXISTS).
-- -----------------------------------------------------------------------------
INSERT INTO modules (id, name, key, icon, description, route, is_active, is_system, sort_order, subsystem_key, created_at, updated_at)
SELECT gen_random_uuid()::TEXT, 'Bling', 'bling', 'Package',
       'Integração com o ERP Bling (financeiro, pedidos, NF, cadastros)', 'bling',
       TRUE, FALSE, 2, 'especial', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
 WHERE NOT EXISTS (SELECT 1 FROM modules WHERE key = 'bling');

-- -----------------------------------------------------------------------------
-- 7. Defaults de permissão: superadmin/admin = edit.
--    (Demais roles liberadas manualmente via UI "Padrões de Função"/permissões.)
--    Coluna 'access_level' + CHECK role (schema da migration 021).
-- -----------------------------------------------------------------------------
INSERT INTO role_default_permissions (role, module_key, access_level)
VALUES ('superadmin', 'bling', 'edit'),
       ('admin',      'bling', 'edit')
ON CONFLICT (role, module_key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. Validação atômica
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_mod INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_mod FROM modules WHERE key = 'bling';
  IF v_mod <> 1 THEN
    RAISE EXCEPTION 'Módulo bling não foi registrado corretamente (encontrado %)', v_mod;
  END IF;
  RAISE NOTICE '✓ Migration 025: integração Bling — tabelas, source e módulo criados';
END $$;

COMMIT;
