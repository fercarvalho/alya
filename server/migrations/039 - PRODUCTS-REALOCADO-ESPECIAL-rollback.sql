-- ═══════════════════════════════════════════════════════════════════════════
-- Rollback da 039 - PRODUCTS-REALOCADO-ESPECIAL.sql
--
-- Remove o módulo `products` do catálogo `modules` — o DELETE cascateia para
-- role_default_permissions e user_module_permissions (FKs ON DELETE CASCADE),
-- desfazendo permissões e concessões. A TABELA `products` NÃO é tocada
-- (permanece como storage da integração Nuvemshop).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DELETE FROM modules WHERE key = 'products' AND subsystem_key = 'especial';

COMMIT;
