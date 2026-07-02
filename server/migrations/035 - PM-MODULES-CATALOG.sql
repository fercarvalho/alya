-- ═══════════════════════════════════════════════════════════════════════════
-- 035 - PM-MODULES-CATALOG.sql
-- F1 do port PM (IMPGEO → Alya). Sync point 3: registra no catálogo `modules`
-- os 5 módulos novos do subsistema gerenciamento (projects, services,
-- tarefas_gerenciamento, pomodoro_gerenciamento, relatorios_tarefas_gerenciamento)
-- e reordena o subsistema conforme o doc 07:
--   1 dashboard_gerenciamento · 2 metas · 3 projecao · 4 relatorios · 5 projects
--   6 services · 7 clients · 8 tarefas · 9 pomodoro · 10 relatorios_tarefas
--
-- IMPORTANTE: aqui NÃO se concede permissão a usuários nem se semeia
-- role_default_permissions — isso é da F5. Módulos ficam registrados (visíveis a
-- superadmin/admin por bypass; UI real só na F3). `products` é movido para o fim
-- (será removido na F5).
--
-- Idempotente, transacional, validador final.
-- Rollback: 035 - PM-MODULES-CATALOG-rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Insere os 5 módulos novos (padrão 025-BLING) ──────────────────────────

INSERT INTO modules (id, name, key, icon, description, route, is_active, is_system, sort_order, subsystem_key, created_at, updated_at)
SELECT gen_random_uuid()::TEXT, 'Projetos', 'projects', 'FolderKanban',
       'Projetos: etapas, tarefas, prazos e financeiro', 'projects',
       TRUE, TRUE, 5, 'gerenciamento', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
 WHERE NOT EXISTS (SELECT 1 FROM modules WHERE key = 'projects');

INSERT INTO modules (id, name, key, icon, description, route, is_active, is_system, sort_order, subsystem_key, created_at, updated_at)
SELECT gen_random_uuid()::TEXT, 'Serviços', 'services', 'Layers',
       'Catálogo de serviços e templates de projeto', 'services',
       TRUE, TRUE, 6, 'gerenciamento', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
 WHERE NOT EXISTS (SELECT 1 FROM modules WHERE key = 'services');

INSERT INTO modules (id, name, key, icon, description, route, is_active, is_system, sort_order, subsystem_key, created_at, updated_at)
SELECT gen_random_uuid()::TEXT, 'Tarefas', 'tarefas_gerenciamento', 'ListTodo',
       'Execução e acompanhamento de tarefas dos projetos', 'tarefas_gerenciamento',
       TRUE, TRUE, 8, 'gerenciamento', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
 WHERE NOT EXISTS (SELECT 1 FROM modules WHERE key = 'tarefas_gerenciamento');

INSERT INTO modules (id, name, key, icon, description, route, is_active, is_system, sort_order, subsystem_key, created_at, updated_at)
SELECT gen_random_uuid()::TEXT, 'Pomodoro', 'pomodoro_gerenciamento', 'Timer',
       'Controle de tempo (Pomodoro) e estatísticas pessoais', 'pomodoro_gerenciamento',
       TRUE, TRUE, 9, 'gerenciamento', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
 WHERE NOT EXISTS (SELECT 1 FROM modules WHERE key = 'pomodoro_gerenciamento');

INSERT INTO modules (id, name, key, icon, description, route, is_active, is_system, sort_order, subsystem_key, created_at, updated_at)
SELECT gen_random_uuid()::TEXT, 'Relatórios de Tarefas', 'relatorios_tarefas_gerenciamento', 'BarChart3',
       'Relatórios administrativos de produtividade e custos dos projetos', 'relatorios_tarefas_gerenciamento',
       TRUE, TRUE, 10, 'gerenciamento', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
 WHERE NOT EXISTS (SELECT 1 FROM modules WHERE key = 'relatorios_tarefas_gerenciamento');

-- ─── 2. Reordena o subsistema gerenciamento (doc 07) ──────────────────────────

UPDATE modules SET sort_order = 1,  subsystem_key = 'gerenciamento' WHERE key = 'dashboard_gerenciamento';
UPDATE modules SET sort_order = 2,  subsystem_key = 'gerenciamento' WHERE key = 'metas_gerenciamento';
UPDATE modules SET sort_order = 3,  subsystem_key = 'gerenciamento' WHERE key = 'projecao_gerenciamento';
UPDATE modules SET sort_order = 4,  subsystem_key = 'gerenciamento' WHERE key = 'relatorios_gerenciamento';
UPDATE modules SET sort_order = 5,  subsystem_key = 'gerenciamento' WHERE key = 'projects';
UPDATE modules SET sort_order = 6,  subsystem_key = 'gerenciamento' WHERE key = 'services';
UPDATE modules SET sort_order = 7,  subsystem_key = 'gerenciamento' WHERE key = 'clients';
UPDATE modules SET sort_order = 8,  subsystem_key = 'gerenciamento' WHERE key = 'tarefas_gerenciamento';
UPDATE modules SET sort_order = 9,  subsystem_key = 'gerenciamento' WHERE key = 'pomodoro_gerenciamento';
UPDATE modules SET sort_order = 10, subsystem_key = 'gerenciamento' WHERE key = 'relatorios_tarefas_gerenciamento';

-- products sai do subsistema na UI (manifest) já na F1; a remoção do módulo/tabela
-- é da F5. Move para o fim para não colidir na ordenação.
UPDATE modules SET sort_order = 99 WHERE key = 'products';

-- ─── Validador final ──────────────────────────────────────────────────────────

DO $$
DECLARE
  expected_keys TEXT[] := ARRAY[
    'dashboard_gerenciamento','metas_gerenciamento','projecao_gerenciamento',
    'relatorios_gerenciamento','projects','services','clients',
    'tarefas_gerenciamento','pomodoro_gerenciamento','relatorios_tarefas_gerenciamento'
  ];
  k TEXT; missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOREACH k IN ARRAY expected_keys LOOP
    IF NOT EXISTS (SELECT 1 FROM modules WHERE key = k AND subsystem_key = 'gerenciamento' AND is_active = TRUE) THEN
      missing := array_append(missing, k);
    END IF;
  END LOOP;
  IF COALESCE(array_length(missing,1),0) > 0 THEN
    RAISE EXCEPTION 'Migration 035 incompleta (módulos ausentes/mal registrados): %', array_to_string(missing, ', ');
  END IF;
  RAISE NOTICE '✓ Migration 035 - PM-MODULES-CATALOG: 10 módulos do gerenciamento registrados.';
END $$;

COMMIT;
