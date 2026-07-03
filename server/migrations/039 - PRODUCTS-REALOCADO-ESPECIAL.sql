-- ═══════════════════════════════════════════════════════════════════════════
-- 039 - PRODUCTS-REALOCADO-ESPECIAL.sql
-- Reintroduz o módulo `products` (Produtos), agora no subsistema `especial`
-- (ao lado de Nuvemshop e Bling), depois de removê-lo do Gerenciamento na 038.
--
-- Motivo: o módulo é necessário (ver/gerenciar produtos no Alya) e tem afinidade
-- com as integrações de e-commerce — produtos vem da Nuvemshop (syncProducts) e,
-- no futuro, voltará para ela (push). Não pertence ao PM (projetos/tarefas).
--
-- A tabela `products` já existe (preservada na 038); aqui só registramos o
-- MÓDULO no catálogo + permissões. Espelha a 025 (Bling) e a 037 (concessão).
--
-- Permissões: produtos é catálogo (não integração sensível como Nuvemshop/Bling,
-- que são admin-only). Semeamos como o módulo tinha antes no Gerenciamento:
--   superadmin/admin/manager/user = edit ; guest = view.
--
-- Idempotente (WHERE NOT EXISTS / ON CONFLICT DO NOTHING / NOT EXISTS).
-- Rollback: 039 - PRODUCTS-REALOCADO-ESPECIAL-rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── (1) Registrar o módulo no catálogo, no subsistema 'especial' ───────────
INSERT INTO modules (id, name, key, icon, description, route, is_active, is_system, sort_order, subsystem_key, created_at, updated_at)
SELECT gen_random_uuid()::TEXT, 'Produtos', 'products', 'Package',
       'Catálogo de produtos (integração Nuvemshop)', 'products',
       TRUE, FALSE, 3, 'especial', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
 WHERE NOT EXISTS (SELECT 1 FROM modules WHERE key = 'products');

-- ── (2) role_default_permissions (espelha o que products tinha) ────────────
INSERT INTO role_default_permissions (role, module_key, access_level)
VALUES ('superadmin', 'products', 'edit'),
       ('admin',      'products', 'edit'),
       ('manager',    'products', 'edit'),
       ('user',       'products', 'edit'),
       ('guest',      'products', 'view')
ON CONFLICT (role, module_key) DO NOTHING;

-- ── (3) Conceder aos usuários existentes conforme o default do papel ───────
INSERT INTO user_module_permissions (id, user_id, module_key, access_level, created_at, updated_at)
SELECT CONCAT(u.id, '-products'), u.id, 'products', rdp.access_level, NOW(), NOW()
  FROM users u
  JOIN role_default_permissions rdp ON rdp.role = u.role AND rdp.module_key = 'products'
 WHERE NOT EXISTS (
   SELECT 1 FROM user_module_permissions ump
    WHERE ump.user_id = u.id AND ump.module_key = 'products'
 );

-- ── Validação ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_mod    INTEGER;
  v_rdp    INTEGER;
  v_grant  INTEGER;
  v_users  INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_mod FROM modules
   WHERE key = 'products' AND subsystem_key = 'especial' AND is_active = TRUE;
  IF v_mod <> 1 THEN
    RAISE EXCEPTION 'Migration 039: módulo products não registrado no especial (encontrou %)', v_mod;
  END IF;

  SELECT COUNT(*) INTO v_rdp FROM role_default_permissions WHERE module_key = 'products';
  IF v_rdp <> 5 THEN
    RAISE EXCEPTION 'Migration 039: esperava 5 role_defaults de products, encontrou %', v_rdp;
  END IF;

  -- Todo usuário cujo papel tem default de products deve ter recebido a concessão.
  SELECT COUNT(*) INTO v_users FROM users u
   WHERE EXISTS (SELECT 1 FROM role_default_permissions rdp
                  WHERE rdp.role = u.role AND rdp.module_key = 'products');
  SELECT COUNT(*) INTO v_grant FROM user_module_permissions WHERE module_key = 'products';
  IF v_grant < v_users THEN
    RAISE EXCEPTION 'Migration 039: esperava >= % concessões de products, encontrou %', v_users, v_grant;
  END IF;

  RAISE NOTICE '✓ Migration 039: módulo products no especial (sort 3); % role_defaults; % concessões a usuários.',
    v_rdp, v_grant;
END $$;

COMMIT;
