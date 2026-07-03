-- ═══════════════════════════════════════════════════════════════════════════
-- 041 - PRODUCTS-TABLE-GUARD.sql
-- Blinda a EXISTÊNCIA da tabela `products` de forma idempotente.
--
-- Contexto: no histórico do port, a migration 038 chegou a conter um
-- `DROP TABLE products` (removido depois, quando decidimos preservar a tabela
-- como storage do sync/push da Nuvemshop). Dependendo de qual versão da 038
-- tenha rodado num ambiente, a tabela podia ter sido dropada (no dev local ela
-- foi dropada e recriada manualmente, fora de migration).
--
-- Esta migration torna a existência da tabela GARANTIDA pelas migrations —
-- reproduzível do zero e segura na VPS — sem depender do estado anterior nem
-- de qualquer passo manual. É idempotente: se a tabela já existe (caso normal),
-- não faz nada e não toca em dados. Schema idêntico ao de `001 - SCHEMA.sql`.
--
-- Rollback: 041 - PRODUCTS-TABLE-GUARD-rollback.sql (NO-OP — nunca dropa a
-- tabela, para não destruir dados/preexistência).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(15, 2) DEFAULT 0,
    cost DECIMAL(15, 2) DEFAULT 0,
    stock INTEGER DEFAULT 0,
    sold INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- ── Validação ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'products'
  ) THEN
    RAISE EXCEPTION 'Migration 041: tabela products deveria existir após o guard';
  END IF;
  RAISE NOTICE '✓ Migration 041: existência da tabela products garantida (idempotente).';
END $$;

COMMIT;
