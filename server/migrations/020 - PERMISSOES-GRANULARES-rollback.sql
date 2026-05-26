-- =============================================================================
-- Rollback Migration 020 — Permissões granulares
-- =============================================================================
--
-- Reverte para o estado pré-020:
--   1. Restaura user_module_permissions a partir de
--      user_module_permissions_backup_020 (TRUNCATE + reinsert).
--   2. Remove o CHECK ('view','edit') do access_level (volta a aceitar livre).
--   3. Remove role 'manager' do CHECK de users.role — SE nenhum usuário
--      estiver usando essa role. Se houver, aborta com mensagem clara
--      (admin precisa rebaixar/deletar os 'manager' antes).
--
-- PRÉ-REQUISITO: este rollback assume que user_module_permissions_backup_020
-- ainda existe. Se você já dropou esse backup, NÃO TEM como restaurar o
-- estado exato — você terá que rodar o rollback da 019 também e refazer.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_backup_exists  BOOLEAN;
  v_manager_count  INTEGER;
BEGIN
  -- Backup precisa existir
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_name = 'user_module_permissions_backup_020'
  ) INTO v_backup_exists;
  IF NOT v_backup_exists THEN
    RAISE EXCEPTION 'Rollback abortado: user_module_permissions_backup_020 não existe. Restaure de backups/ se possível.';
  END IF;

  -- Nenhum user pode estar com role='manager' pra remover do CHECK
  SELECT COUNT(*) INTO v_manager_count FROM users WHERE role = 'manager';
  IF v_manager_count > 0 THEN
    RAISE EXCEPTION 'Rollback abortado: % usuários com role=manager. Rebaixe-os antes (ex.: UPDATE users SET role=''user'' WHERE role=''manager'').',
      v_manager_count;
  END IF;
END $$;

-- 1. Restaurar perms
TRUNCATE TABLE user_module_permissions;
INSERT INTO user_module_permissions SELECT * FROM user_module_permissions_backup_020;

-- 2. Remover CHECK de access_level (volta ao estado livre que tinha em 019)
ALTER TABLE user_module_permissions
  DROP CONSTRAINT IF EXISTS user_module_permissions_access_level_check;

-- 3. Voltar CHECK de users.role pros 4 valores originais (sem manager)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role::text = ANY (ARRAY[
    'superadmin'::character varying,
    'admin'::character varying,
    'user'::character varying,
    'guest'::character varying
  ]::text[]));

-- 4. Dropar o backup (já foi consumido)
DROP TABLE user_module_permissions_backup_020;

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM user_module_permissions;
  RAISE NOTICE '✓ Rollback 020: user_module_permissions restaurada com % linhas; role manager removida; access_level CHECK removido.', v_count;
END $$;

COMMIT;
