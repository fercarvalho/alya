-- =============================================================================
-- Migration 020: Permissões granulares (Fase 2.1 do alya)
-- =============================================================================
--
-- Espelha a migration 042 do impgeo, adaptada ao schema do alya
-- (tabela `modules` em vez de `modules_catalog`, coluna `key` em vez de
-- `module_key`, módulos admin em camelCase: activeSessions, anomalies,
-- securityAlerts).
--
-- Objetivo:
--   1. Adicionar role 'manager' (intermediário admin↔user)
--   2. Restringir access_level a 'view' / 'edit' (anteriormente livre)
--   3. Backup defensivo de user_module_permissions antes do reset
--   4. Reset + aplicação dos defaults por role × subsistema:
--
--   ┌─────────────┬──────────┬──────────┬──────────┬───────────────┬──────────┐
--   │ role        │ admin    │ gestao   │ financ.  │ gerenciamento │ especial │
--   ├─────────────┼──────────┼──────────┼──────────┼───────────────┼──────────┤
--   │ superadmin  │ edit ALL │ edit ALL │ edit ALL │ edit ALL      │ edit ALL │
--   │ admin       │ edit ¹   │ edit ALL │ edit ALL │ edit ALL      │ edit ALL │
--   │ manager     │   —      │ edit ALL │ edit ALL │ edit ALL      │ edit ALL │
--   │ user        │   —      │ view ²   │ view ALL │ edit ALL      │ edit ALL │
--   │ guest       │   —      │ view ³   │ view ALL │ view ALL      │ view ALL │
--   └─────────────┴──────────┴──────────┴──────────┴───────────────┴──────────┘
--   ¹ admin: edit em 'admin' (UserManagement) apenas; SEM acesso a
--     'activeSessions', 'anomalies', 'securityAlerts' (exclusivos do superadmin).
--   ² user/gestao: view em faq + documentacao + roadmap (subsistema inteiro).
--   ³ guest/gestao: view em faq + documentacao (sem roadmap).
--
-- IMPACTO IMPORTANTE NESTE BANCO:
--   - guest hoje tem 6 perms; após este reset terá ~17 (financeiro+gerenc+
--     especial inteiros + faq + documentacao).
--   - user hoje tem 9 perms; após terá ~17 (view financeiro+2 gestao +
--     edit gerenciamento + especial).
--   - admins (3) têm 11-13 perms; após terão ~17 (admin + 4 subsistemas).
--   - superadmin terá 20 (todos os módulos ativos).
--
-- users.modules TEXT[] continua intacto e desincronizado pela duração das
-- Fases 2.x; só vira deprecado na 2.10.
--
-- Reversão: 020 - PERMISSOES-GRANULARES-rollback.sql (restaura snapshot do
-- backup criado abaixo e remove role 'manager' do CHECK se nenhum user usa).
-- Em caso de erro durante a transação, ROLLBACK automático.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Backup de user_module_permissions (preserva o snapshot original em
--    re-execuções; só cria se ainda não existir)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_name = 'user_module_permissions_backup_020'
  ) THEN
    EXECUTE 'CREATE TABLE user_module_permissions_backup_020 AS SELECT * FROM user_module_permissions';
    RAISE NOTICE '  → backup user_module_permissions_backup_020 criado (% linhas)',
      (SELECT COUNT(*) FROM user_module_permissions_backup_020);
  ELSE
    RAISE NOTICE '  → backup user_module_permissions_backup_020 já existe; preservando snapshot original';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Aceitar role 'manager'
-- -----------------------------------------------------------------------------
-- Tabela users tem o CHECK definido em runtime (não na migration 001 - SCHEMA);
-- vamos garantir o constraint name e recriar com os 5 valores.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role::text = ANY (ARRAY[
    'superadmin'::character varying,
    'admin'::character varying,
    'manager'::character varying,
    'user'::character varying,
    'guest'::character varying
  ]::text[]));

-- -----------------------------------------------------------------------------
-- 3. access_level: só 'view' / 'edit'
-- -----------------------------------------------------------------------------
-- Normaliza qualquer 'write' legado (Fase 1 do alya não tinha esses valores,
-- mas defendemos por segurança caso algo tenha sido inserido manualmente).
UPDATE user_module_permissions SET access_level = 'edit'
  WHERE access_level = 'write';

ALTER TABLE user_module_permissions
  DROP CONSTRAINT IF EXISTS user_module_permissions_access_level_check;
ALTER TABLE user_module_permissions
  ADD CONSTRAINT user_module_permissions_access_level_check
    CHECK (access_level IN ('view', 'edit'));

-- -----------------------------------------------------------------------------
-- 4. Reset + aplicação dos defaults por role
-- -----------------------------------------------------------------------------
TRUNCATE TABLE user_module_permissions;

-- 4a. superadmin → edit em TODOS os módulos
INSERT INTO user_module_permissions (id, user_id, module_key, access_level, created_at, updated_at)
SELECT CONCAT(u.id, '-', m.key), u.id, m.key, 'edit',
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM users u
  CROSS JOIN modules m
 WHERE u.role = 'superadmin'
   AND m.is_active = TRUE;

-- 4b. admin → edit em 'admin' (UserManagement) apenas;
--     activeSessions/anomalies/securityAlerts ficam exclusivos do superadmin.
--     Demais subsistemas: edit em tudo.
INSERT INTO user_module_permissions (id, user_id, module_key, access_level, created_at, updated_at)
SELECT CONCAT(u.id, '-', m.key), u.id, m.key, 'edit',
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM users u
  CROSS JOIN modules m
 WHERE u.role = 'admin'
   AND m.is_active = TRUE
   AND (
        (m.subsystem_key = 'admin' AND m.key = 'admin')
     OR  m.subsystem_key IN ('gestao', 'financeiro', 'gerenciamento', 'especial')
   );

-- 4c. manager → sem acesso ao subsistema admin; edit em todos os outros
INSERT INTO user_module_permissions (id, user_id, module_key, access_level, created_at, updated_at)
SELECT CONCAT(u.id, '-', m.key), u.id, m.key, 'edit',
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM users u
  CROSS JOIN modules m
 WHERE u.role = 'manager'
   AND m.is_active = TRUE
   AND m.subsystem_key IN ('gestao', 'financeiro', 'gerenciamento', 'especial');

-- 4d. user → view em gestao + financeiro; edit em gerenciamento + especial
INSERT INTO user_module_permissions (id, user_id, module_key, access_level, created_at, updated_at)
SELECT CONCAT(u.id, '-', m.key), u.id, m.key,
       CASE
         WHEN m.subsystem_key IN ('gerenciamento', 'especial') THEN 'edit'
         WHEN m.subsystem_key IN ('gestao', 'financeiro')      THEN 'view'
       END,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM users u
  CROSS JOIN modules m
 WHERE u.role = 'user'
   AND m.is_active = TRUE
   AND m.subsystem_key IN ('gestao', 'financeiro', 'gerenciamento', 'especial');

-- 4e. guest → view em quase tudo; gestao limitado a faq + documentacao
INSERT INTO user_module_permissions (id, user_id, module_key, access_level, created_at, updated_at)
SELECT CONCAT(u.id, '-', m.key), u.id, m.key, 'view',
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM users u
  CROSS JOIN modules m
 WHERE u.role = 'guest'
   AND m.is_active = TRUE
   AND (
        (m.subsystem_key = 'gestao' AND m.key IN ('faq', 'documentacao'))
     OR  m.subsystem_key IN ('financeiro', 'gerenciamento', 'especial')
   );

-- -----------------------------------------------------------------------------
-- 5. Validação atômica
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_total_perms       INTEGER;
  v_invalid_levels    INTEGER;
  v_invalid_roles     INTEGER;
  v_orphan_modules    INTEGER;
  v_superadmin_count  INTEGER;
  v_superadmin_perms  INTEGER;
  v_total_modules     INTEGER;
BEGIN
  -- access_level só pode ser 'view' / 'edit'
  SELECT COUNT(*) INTO v_invalid_levels
    FROM user_module_permissions
   WHERE access_level NOT IN ('view', 'edit');
  IF v_invalid_levels > 0 THEN
    RAISE EXCEPTION 'Validação falhou: % registros com access_level inválido', v_invalid_levels;
  END IF;

  -- role só pode ser superadmin/admin/manager/user/guest
  SELECT COUNT(*) INTO v_invalid_roles
    FROM users
   WHERE role NOT IN ('superadmin', 'admin', 'manager', 'user', 'guest');
  IF v_invalid_roles > 0 THEN
    RAISE EXCEPTION 'Validação falhou: % usuários com role inválida', v_invalid_roles;
  END IF;

  -- Nenhum module_key órfão (FK já garante, mas validamos pra mensagem clara)
  SELECT COUNT(*) INTO v_orphan_modules
    FROM user_module_permissions ump
    LEFT JOIN modules m ON m.key = ump.module_key
   WHERE m.key IS NULL;
  IF v_orphan_modules > 0 THEN
    RAISE EXCEPTION 'Validação falhou: % permissões apontam pra módulos inexistentes', v_orphan_modules;
  END IF;

  -- Superadmin deve ter acesso a TODOS os módulos ativos
  SELECT COUNT(*) INTO v_superadmin_count FROM users WHERE role = 'superadmin';
  SELECT COUNT(*) INTO v_total_modules    FROM modules WHERE is_active = TRUE;
  SELECT COUNT(*) INTO v_superadmin_perms
    FROM user_module_permissions ump
    JOIN users u ON u.id = ump.user_id
   WHERE u.role = 'superadmin' AND ump.access_level = 'edit';

  IF v_superadmin_count > 0 AND v_superadmin_perms <> v_superadmin_count * v_total_modules THEN
    RAISE EXCEPTION 'Validação falhou: superadmins têm % perms, esperado %',
      v_superadmin_perms, (v_superadmin_count * v_total_modules);
  END IF;

  -- Total de perms > 0 (defensivo)
  SELECT COUNT(*) INTO v_total_perms FROM user_module_permissions;
  IF v_total_perms = 0 THEN
    RAISE EXCEPTION 'Validação falhou: nenhuma permissão inserida (esperado > 0)';
  END IF;

  RAISE NOTICE '✓ Migration 020: % permissões aplicadas, % módulos ativos, % usuários',
    v_total_perms, v_total_modules, (SELECT COUNT(*) FROM users);
END $$;

COMMIT;

-- =============================================================================
-- Pós-migration:
--   - Snapshot pré-reset em user_module_permissions_backup_020 (auditoria
--     e rollback). Após validar: DROP TABLE user_module_permissions_backup_020;
--   - users.modules TEXT[] permanece intocado; ele está desincronizado da
--     fonte da verdade (user_module_permissions) até a Fase 2.10 deprecar.
-- =============================================================================
