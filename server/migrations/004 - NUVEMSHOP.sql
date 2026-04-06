-- Migration 004: Integração Nuvemshop
-- Criado em: 2026-04-06
-- Descrição: Tabelas para integração com a plataforma Nuvemshop

-- Configuração da integração por usuário
CREATE TABLE IF NOT EXISTS nuvemshop_config (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,          -- criptografado AES-256-GCM
  store_name VARCHAR(255),
  store_url VARCHAR(500),
  webhook_token VARCHAR(255),          -- secret para validar webhooks recebidos (HMAC-SHA256)
  webhook_id_orders INTEGER,           -- ID do webhook registrado na Nuvemshop (order/paid + order/cancelled)
  webhook_id_products INTEGER,         -- ID do webhook de produtos
  webhook_id_customers INTEGER,        -- ID do webhook de clientes
  last_sync_orders TIMESTAMP,
  last_sync_products TIMESTAMP,
  last_sync_customers TIMESTAMP,
  connected_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id)
);

-- Mapeamento entre IDs da Nuvemshop e IDs locais do ALYA
CREATE TABLE IF NOT EXISTS nuvemshop_sync_map (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL,  -- 'order', 'product', 'customer'
  nuvemshop_id BIGINT NOT NULL,
  local_id INTEGER NOT NULL,
  synced_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, resource_type, nuvemshop_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_nuvemshop_config_user_id ON nuvemshop_config(user_id);
CREATE INDEX IF NOT EXISTS idx_nuvemshop_sync_map_user_resource ON nuvemshop_sync_map(user_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_nuvemshop_sync_map_nuvemshop_id ON nuvemshop_sync_map(nuvemshop_id);

-- Módulo Nuvemshop no menu lateral
INSERT INTO modules (id, name, key, icon, is_active, is_system)
VALUES ('mjx45q94nuvemshop1', 'Nuvemshop', 'nuvemshop', 'ShoppingBag', true, false)
ON CONFLICT (key) DO NOTHING;
