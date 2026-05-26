-- =============================================================================
-- Migration 022: roles dinâmicas (Fase 2.3 do alya)
-- =============================================================================
--
-- Espelha a migration 044 do impgeo.
--
-- Antes: users.role e role_default_permissions.role eram CHECK fixo a 5
-- valores hardcoded (superadmin, admin, manager, user, guest).
--
-- Agora: tabela `roles` é a fonte da verdade. As 5 atuais ficam marcadas
-- como is_system=true — não podem ser deletadas nem ter a key renomeada
-- (o código tem bypass específico pra superadmin/admin em vários lugares).
-- Labels e descrições delas continuam editáveis. Superadmin pode criar
-- roles novas via UI (Fase 2.7+); essas se comportam como user/manager
-- comum (gateadas só pela matriz granular).
--
-- users.role e role_default_permissions.role passam a ser FK em roles(key),
-- com ON UPDATE CASCADE (renames de keys de roles custom refletem em users)
-- e:
--   - users.role            ON DELETE RESTRICT (delete só passa se não
--                            houver usuário associado)
--   - role_default_permissions.role  ON DELETE CASCADE (defaults cascateiam)
--
-- Reversão: 022 - ROLES-DYNAMIC-rollback.sql.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Tabela roles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  key         VARCHAR(50)  PRIMARY KEY,
  label       VARCHAR(100) NOT NULL,
  description TEXT,
  is_system   BOOLEAN      NOT NULL DEFAULT FALSE,
  sort_order  INTEGER      NOT NULL DEFAULT 100,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (key ~ '^[a-z][a-z0-9_]*$')  -- snake_case lowercase
);

-- Seed: 5 roles do sistema (is_system=true)
INSERT INTO roles (key, label, description, is_system, sort_order) VALUES
  ('superadmin', 'Super Administrador', 'Controle total do sistema; gerencia funções, padrões e segurança.', TRUE, 10),
  ('admin',      'Administrador',       'Gerencia usuários e módulos; edita os 4 subsistemas operacionais.',  TRUE, 20),
  ('manager',    'Gerente',             'Intermediário entre Admin e Usuário; edita os 4 subsistemas.',       TRUE, 30),
  ('user',       'Usuário',             'Acesso padrão ao sistema.',                                          TRUE, 40),
  ('guest',      'Convidado',           'Acesso somente leitura.',                                            TRUE, 50)
ON CONFLICT (key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. users.role: trocar CHECK por FK em roles(key)
-- -----------------------------------------------------------------------------
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_fkey;
ALTER TABLE users
  ADD CONSTRAINT users_role_fkey
    FOREIGN KEY (role) REFERENCES roles(key)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- -----------------------------------------------------------------------------
-- 3. role_default_permissions.role: trocar CHECK por FK
-- -----------------------------------------------------------------------------
-- O CHECK foi criado in-line na 021 como "role_default_permissions_check"
-- (nome auto-gerado pelo PG quando CHECK aparece sem CONSTRAINT). Pra ser
-- tolerante a variações (alguns PGs nomeiam diferente), tentamos drop por
-- ambos os possíveis nomes.
ALTER TABLE role_default_permissions
  DROP CONSTRAINT IF EXISTS role_default_permissions_role_check;
ALTER TABLE role_default_permissions
  DROP CONSTRAINT IF EXISTS role_default_permissions_check;
ALTER TABLE role_default_permissions
  DROP CONSTRAINT IF EXISTS role_default_permissions_role_fkey;
ALTER TABLE role_default_permissions
  ADD CONSTRAINT role_default_permissions_role_fkey
    FOREIGN KEY (role) REFERENCES roles(key)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

-- -----------------------------------------------------------------------------
-- 4. Validação
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_roles_count INTEGER;
  v_orphan_users INTEGER;
  v_orphan_defaults INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_roles_count FROM roles;
  IF v_roles_count < 5 THEN
    RAISE EXCEPTION 'Esperado pelo menos 5 roles (sistema), tem %', v_roles_count;
  END IF;

  -- Confirma que nenhum user ficou com role inválida (a FK pegaria, mas
  -- explicitamos a checagem pra mensagem clara)
  SELECT COUNT(*) INTO v_orphan_users
    FROM users u LEFT JOIN roles r ON r.key = u.role
   WHERE r.key IS NULL;
  IF v_orphan_users > 0 THEN
    RAISE EXCEPTION '% usuários com role inexistente em roles', v_orphan_users;
  END IF;

  SELECT COUNT(*) INTO v_orphan_defaults
    FROM role_default_permissions rdp LEFT JOIN roles r ON r.key = rdp.role
   WHERE r.key IS NULL;
  IF v_orphan_defaults > 0 THEN
    RAISE EXCEPTION '% defaults com role inexistente em roles', v_orphan_defaults;
  END IF;

  RAISE NOTICE '✓ Migration 022: roles dinâmicas — % roles cadastradas (5 system + custom)', v_roles_count;
END $$;

COMMIT;
