-- ═══════════════════════════════════════════════════════════════════════════
-- 037 - BLING-GRANT-PERMISSIONS.sql
-- Correção de bug pré-existente (detectado pelo validador de sync points).
--
-- A migration "025 - BLING.sql" registrou o módulo `bling` e semeou os defaults
-- por papel em role_default_permissions (admin/superadmin = edit), mas NÃO
-- concedeu a permissão aos usuários existentes em user_module_permissions.
-- Resultado: só o superadmin (bypass) via o Bling; admins não.
--
-- Esta migration concede `bling` aos usuários existentes conforme o default do
-- papel de cada um (só quem tem entrada em role_default_permissions p/ bling —
-- hoje admin/superadmin = edit). Idempotente.
--
-- Rollback: 037 - BLING-GRANT-PERMISSIONS-rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

INSERT INTO user_module_permissions (id, user_id, module_key, access_level, created_at, updated_at)
SELECT CONCAT(u.id, '-bling'), u.id, 'bling', rdp.access_level, NOW(), NOW()
  FROM users u
  JOIN role_default_permissions rdp ON rdp.role = u.role AND rdp.module_key = 'bling'
 WHERE NOT EXISTS (
   SELECT 1 FROM user_module_permissions ump
    WHERE ump.user_id = u.id AND ump.module_key = 'bling'
 );

DO $$
DECLARE n_gestores INTEGER; n_com_bling INTEGER;
BEGIN
  SELECT COUNT(*) INTO n_gestores FROM users WHERE role IN ('admin','superadmin');
  SELECT COUNT(*) INTO n_com_bling FROM user_module_permissions WHERE module_key = 'bling';
  IF n_com_bling < n_gestores THEN
    RAISE EXCEPTION 'Migration 037: esperava >= % permissões de bling, encontrou %', n_gestores, n_com_bling;
  END IF;
  RAISE NOTICE '✓ Migration 037 - BLING-GRANT-PERMISSIONS: % usuário(s) com acesso ao Bling.', n_com_bling;
END $$;

COMMIT;
