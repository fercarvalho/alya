-- Rollback da 026 - SUBCATEGORIES
-- Remove o catálogo. NÃO afeta transactions.subcategory nem
-- transaction_rules.set_subcategory (texto livre permanece).

DROP INDEX IF EXISTS idx_subcategories_name;
DROP TABLE IF EXISTS subcategories;
