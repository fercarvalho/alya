-- 026 - TRANSACTION SOURCE
-- Rastreio de origem da transação: de onde ela veio.
-- Valores: 'manual' | 'import_xlsx' | 'extrato' | 'fatura' | 'nuvemshop'
--          | 'bling' | 'infinitepay'  (default 'manual').
-- Transações legadas ficam 'manual' (origem real desconhecida).

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);
