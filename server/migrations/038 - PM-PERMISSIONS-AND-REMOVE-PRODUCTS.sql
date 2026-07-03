-- ═══════════════════════════════════════════════════════════════════════════
-- 038 - PM-PERMISSIONS-AND-REMOVE-PRODUCTS.sql
-- Fase F5 do port do Gerenciamento (PM).
--
-- Fecha três pontas:
--   (1) Semeia os defaults por papel (role_default_permissions) dos 5 módulos
--       PM registrados na 035 sem permissões: projects, services,
--       tarefas_gerenciamento, pomodoro_gerenciamento,
--       relatorios_tarefas_gerenciamento.
--   (2) Concede essas permissões aos usuários já existentes
--       (user_module_permissions), espelhando o padrão da 037.
--   (3) Remove o MÓDULO `products` do catálogo (substituído pelo PM; já saiu do
--       menu na F1) — o DELETE em `modules` cascateia para role_default_permissions
--       e user_module_permissions (FKs ON DELETE CASCADE).
--       NÃO dropa a tabela `products`: ela permanece como storage da integração
--       Nuvemshop (syncProducts em routes/nuvemshop.js grava nela via
--       db.saveProduct/updateProduct). Removemos só a face de usuário (módulo,
--       UI, rotas CRUD manuais e import/export).
--
-- Matriz dos 5 novos (espelha os módulos antigos de gerenciamento; doc 07):
--   projects / services / tarefas / pomodoro : superadmin,admin,manager,user = edit ; guest = view
--   relatorios_tarefas_gerenciamento          : superadmin,admin,manager = edit  (SEM user/guest — override doc 07)
--
-- Idempotente (ON CONFLICT DO NOTHING + NOT EXISTS + IF EXISTS).
-- Rollback: 038 - PM-PERMISSIONS-AND-REMOVE-PRODUCTS-rollback.sql
--           (remove as permissões dos 5 novos; NÃO recria products — restaurar via backup se preciso).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── (1) role_default_permissions dos 5 módulos novos ───────────────────────
INSERT INTO role_default_permissions (role, module_key, access_level)
VALUES
  -- projects
  ('superadmin', 'projects', 'edit'),
  ('admin',      'projects', 'edit'),
  ('manager',    'projects', 'edit'),
  ('user',       'projects', 'edit'),
  ('guest',      'projects', 'view'),
  -- services
  ('superadmin', 'services', 'edit'),
  ('admin',      'services', 'edit'),
  ('manager',    'services', 'edit'),
  ('user',       'services', 'edit'),
  ('guest',      'services', 'view'),
  -- tarefas_gerenciamento
  ('superadmin', 'tarefas_gerenciamento', 'edit'),
  ('admin',      'tarefas_gerenciamento', 'edit'),
  ('manager',    'tarefas_gerenciamento', 'edit'),
  ('user',       'tarefas_gerenciamento', 'edit'),
  ('guest',      'tarefas_gerenciamento', 'view'),
  -- pomodoro_gerenciamento
  ('superadmin', 'pomodoro_gerenciamento', 'edit'),
  ('admin',      'pomodoro_gerenciamento', 'edit'),
  ('manager',    'pomodoro_gerenciamento', 'edit'),
  ('user',       'pomodoro_gerenciamento', 'edit'),
  ('guest',      'pomodoro_gerenciamento', 'view'),
  -- relatorios_tarefas_gerenciamento — SÓ gestão (sem user/guest)
  ('superadmin', 'relatorios_tarefas_gerenciamento', 'edit'),
  ('admin',      'relatorios_tarefas_gerenciamento', 'edit'),
  ('manager',    'relatorios_tarefas_gerenciamento', 'edit')
ON CONFLICT (role, module_key) DO NOTHING;

-- ── (2) Conceder aos usuários existentes conforme o default do papel ───────
-- Cada usuário recebe os módulos que o seu papel tem em role_default_permissions.
-- Um 'user'/'guest' NÃO recebe relatorios_tarefas (não há default p/ esses papéis).
INSERT INTO user_module_permissions (id, user_id, module_key, access_level, created_at, updated_at)
SELECT CONCAT(u.id, '-', rdp.module_key), u.id, rdp.module_key, rdp.access_level, NOW(), NOW()
  FROM users u
  JOIN role_default_permissions rdp ON rdp.role = u.role
 WHERE rdp.module_key IN (
         'projects', 'services', 'tarefas_gerenciamento',
         'pomodoro_gerenciamento', 'relatorios_tarefas_gerenciamento'
       )
   AND NOT EXISTS (
     SELECT 1 FROM user_module_permissions ump
      WHERE ump.user_id = u.id AND ump.module_key = rdp.module_key
   );

-- ── (3) Remover o módulo products do catálogo (cascateia perms) ────────────
-- A tabela `products` é preservada (storage da integração Nuvemshop).
DELETE FROM modules WHERE key = 'products';

-- ── Validação ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_new_rdp   INTEGER;
  v_relt_user INTEGER;
  v_prod_mod  INTEGER;
  v_granted   INTEGER;
BEGIN
  -- 5 novos módulos: superadmin/admin/manager (=15) + user/guest nos 4 (=8) = 23 defaults.
  SELECT COUNT(*) INTO v_new_rdp
    FROM role_default_permissions
   WHERE module_key IN ('projects','services','tarefas_gerenciamento',
                        'pomodoro_gerenciamento','relatorios_tarefas_gerenciamento');
  IF v_new_rdp <> 23 THEN
    RAISE EXCEPTION 'Migration 038: esperava 23 role_defaults dos 5 novos, encontrou %', v_new_rdp;
  END IF;

  -- relatorios_tarefas NÃO pode ter default p/ user/guest.
  SELECT COUNT(*) INTO v_relt_user
    FROM role_default_permissions
   WHERE module_key = 'relatorios_tarefas_gerenciamento' AND role IN ('user','guest');
  IF v_relt_user <> 0 THEN
    RAISE EXCEPTION 'Migration 038: relatorios_tarefas não deveria ter default p/ user/guest, tem %', v_relt_user;
  END IF;

  -- products fora do catálogo (a tabela permanece — storage Nuvemshop).
  SELECT COUNT(*) INTO v_prod_mod FROM modules WHERE key = 'products';
  IF v_prod_mod <> 0 THEN
    RAISE EXCEPTION 'Migration 038: módulo products ainda existe em modules';
  END IF;

  SELECT COUNT(*) INTO v_granted
    FROM user_module_permissions
   WHERE module_key IN ('projects','services','tarefas_gerenciamento',
                        'pomodoro_gerenciamento','relatorios_tarefas_gerenciamento');

  RAISE NOTICE '✓ Migration 038: % role_defaults novos, % concessões a usuários, módulo products removido do catálogo (tabela preservada p/ Nuvemshop).',
    v_new_rdp, v_granted;
END $$;

COMMIT;
