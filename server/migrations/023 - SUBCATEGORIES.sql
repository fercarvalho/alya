-- 023 - SUBCATEGORIES
-- Catálogo central de subcategorias. Antes, "subcategoria" no alya só existia
-- como texto livre em transactions.subcategory e transaction_rules.set_subcategory.
-- Esta tabela passa a ser a fonte única, usada pelo modal de transação, pelo
-- modal de Regras (select) e pelo modal de Gerenciar Subcategorias.
--
-- A coluna subcategory em transactions continua sendo texto livre (sem FK):
-- excluir do catálogo NÃO apaga o valor de transações já cadastradas.

CREATE TABLE IF NOT EXISTS subcategories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subcategories_name ON subcategories(name);

-- Backfill: popula o catálogo com os valores de subcategoria já em uso
-- (transações + regras), pra tela não nascer vazia.
INSERT INTO subcategories (name)
SELECT DISTINCT TRIM(subcategory)
FROM transactions
WHERE subcategory IS NOT NULL AND TRIM(subcategory) <> ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO subcategories (name)
SELECT DISTINCT TRIM(set_subcategory)
FROM transaction_rules
WHERE set_subcategory IS NOT NULL AND TRIM(set_subcategory) <> ''
ON CONFLICT (name) DO NOTHING;
