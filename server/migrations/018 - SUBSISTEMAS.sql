-- =============================================================================
-- Migration 018: SUBSISTEMAS (Fase 1.0 do alya)
-- =============================================================================
--
-- Replica a arquitetura de subsistemas do impgeo (migration 016) adaptada ao
-- schema do alya:
--   - Tabela é `modules` (não `modules_catalog`)
--   - Colunas são name/key/icon/route (não module_name/module_key/icon_name/route_path)
--
-- Mudanças:
--   1. CREATE TABLE subsystems (5 subsistemas iniciais)
--   2. Garante coluna modules.sort_order (já existe via ALTER on-the-fly no
--      runtime; aqui formalizamos com NOT NULL DEFAULT 0)
--   3. ALTER TABLE modules ADD COLUMN subsystem_key (NOT NULL ao final)
--   4. INSERT/UPDATE para garantir os 19 módulos do catálogo final:
--      a) 14 atuais — UPDATE subsystem_key conforme mapping
--      b) 4 novos do subsistema gerenciamento (placeholders)
--      c) 1 documentacao (já criado em runtime em algumas instâncias)
--   5. sort_order vira ordem DENTRO do subsistema (1..N por subsistema)
--
-- Mapping final (20 módulos × 5 subsistemas):
--   admin         (4): admin, activeSessions, anomalies, securityAlerts
--   gestao        (3): roadmap, faq, documentacao
--   financeiro    (6): dashboard, transactions, reports, metas, dre, projecao
--   gerenciamento (6): products, clients, dashboard_gerenciamento,
--                       metas_gerenciamento, projecao_gerenciamento,
--                       relatorios_gerenciamento
--   especial      (1): nuvemshop (integração externa)
--
-- Tudo em transação. Em caso de erro, rollback automático.
-- Para reverter manualmente após COMMIT: 018 - SUBSISTEMAS-rollback.sql
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Tabela subsystems
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subsystems (
    subsystem_key   VARCHAR(50)  PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    icon_name       VARCHAR(50),
    subdomain_slug  VARCHAR(50)  NOT NULL UNIQUE,
    sort_order      INTEGER      NOT NULL DEFAULT 0,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO subsystems (subsystem_key, name, description, icon_name, subdomain_slug, sort_order)
VALUES
  ('admin',         'Admin',          'Administração do sistema, sessões, anomalias e alertas de segurança',  'ShieldCheck', 'admin',         1),
  ('gestao',        'Gestão',         'Roadmap do produto, documentação e perguntas frequentes',              'BookOpen',    'gestao',        2),
  ('financeiro',    'Financeiro',     'Dashboard, transações, relatórios, metas, projeção e DRE',             'DollarSign',  'financeiro',    3),
  ('gerenciamento', 'Gerenciamento',  'Produtos, clientes e indicadores operacionais',                        'Workflow',    'gerenciamento', 4),
  ('especial',      'Módulos Extras', 'Módulos especiais que não pertencem aos demais subsistemas',           'Sparkles',    'especial',      5)
ON CONFLICT (subsystem_key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Garante modules.sort_order (formaliza o ALTER on-the-fly do runtime)
-- -----------------------------------------------------------------------------
ALTER TABLE modules ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- -----------------------------------------------------------------------------
-- 3. Adiciona modules.subsystem_key (inicialmente nullable; ao final, NOT NULL)
-- -----------------------------------------------------------------------------
ALTER TABLE modules ADD COLUMN IF NOT EXISTS subsystem_key VARCHAR(50);

-- -----------------------------------------------------------------------------
-- 4. INSERT dos módulos que faltam (4 novos do gerenciamento + documentacao)
--    + UPDATE associando cada um ao subsistema.
-- -----------------------------------------------------------------------------

-- 4a. documentacao (já criado em runtime em alguns ambientes; idempotente)
INSERT INTO modules (id, name, key, icon, description, is_active, is_system, sort_order, subsystem_key, created_at, updated_at)
SELECT gen_random_uuid()::TEXT, 'Documentação', 'documentacao', 'BookOpen',
       'Manual e guias do sistema', TRUE, TRUE, 0, 'gestao',
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
 WHERE NOT EXISTS (SELECT 1 FROM modules WHERE key = 'documentacao');

-- 4b. 4 módulos novos do subsistema gerenciamento
INSERT INTO modules (id, name, key, icon, description, route, is_active, is_system, sort_order, subsystem_key, created_at, updated_at)
SELECT gen_random_uuid()::TEXT, 'Dashboard',  'dashboard_gerenciamento',  'BarChart3', 'Resumo do gerenciamento (produtos, clientes, operações)', 'dashboard_gerenciamento', TRUE, TRUE, 0, 'gerenciamento', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
 WHERE NOT EXISTS (SELECT 1 FROM modules WHERE key = 'dashboard_gerenciamento');

INSERT INTO modules (id, name, key, icon, description, route, is_active, is_system, sort_order, subsystem_key, created_at, updated_at)
SELECT gen_random_uuid()::TEXT, 'Metas',      'metas_gerenciamento',      'Target',    'Metas operacionais do gerenciamento',                    'metas_gerenciamento',     TRUE, TRUE, 0, 'gerenciamento', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
 WHERE NOT EXISTS (SELECT 1 FROM modules WHERE key = 'metas_gerenciamento');

INSERT INTO modules (id, name, key, icon, description, route, is_active, is_system, sort_order, subsystem_key, created_at, updated_at)
SELECT gen_random_uuid()::TEXT, 'Projeção',   'projecao_gerenciamento',   'LineChart', 'Projeções e definição de metas operacionais',            'projecao_gerenciamento',  TRUE, TRUE, 0, 'gerenciamento', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
 WHERE NOT EXISTS (SELECT 1 FROM modules WHERE key = 'projecao_gerenciamento');

INSERT INTO modules (id, name, key, icon, description, route, is_active, is_system, sort_order, subsystem_key, created_at, updated_at)
SELECT gen_random_uuid()::TEXT, 'Relatórios', 'relatorios_gerenciamento', 'FileText',  'Relatórios operacionais do gerenciamento',               'relatorios_gerenciamento',TRUE, TRUE, 0, 'gerenciamento', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
 WHERE NOT EXISTS (SELECT 1 FROM modules WHERE key = 'relatorios_gerenciamento');

-- 4c. UPDATE subsystem_key dos 14 existentes (idempotente — só associa quem
--     ainda não tem subsistema; assim re-rodar não pisa em ajustes manuais)
UPDATE modules SET subsystem_key = 'admin'         WHERE key IN ('admin', 'activeSessions', 'anomalies', 'securityAlerts') AND subsystem_key IS NULL;
UPDATE modules SET subsystem_key = 'gestao'        WHERE key IN ('roadmap', 'faq', 'documentacao')                          AND subsystem_key IS NULL;
UPDATE modules SET subsystem_key = 'financeiro'    WHERE key IN ('dashboard', 'transactions', 'reports', 'metas', 'dre', 'projecao') AND subsystem_key IS NULL;
UPDATE modules SET subsystem_key = 'gerenciamento' WHERE key IN ('products', 'clients')                                     AND subsystem_key IS NULL;
UPDATE modules SET subsystem_key = 'especial'      WHERE key = 'nuvemshop'                                                  AND subsystem_key IS NULL;

-- -----------------------------------------------------------------------------
-- 5. Reordena sort_order dentro de cada subsistema (1..N na ordem do manifesto)
-- -----------------------------------------------------------------------------
WITH ordered AS (
  SELECT key,
         ROW_NUMBER() OVER (PARTITION BY subsystem_key ORDER BY pos.ord) AS new_order
    FROM modules
    JOIN (
      VALUES
        -- admin
        ('admin', 1), ('activeSessions', 2), ('anomalies', 3), ('securityAlerts', 4),
        -- gestao
        ('roadmap', 1), ('documentacao', 2), ('faq', 3),
        -- financeiro
        ('dashboard', 1), ('metas', 2), ('reports', 3), ('projecao', 4), ('transactions', 5), ('dre', 6),
        -- gerenciamento
        ('dashboard_gerenciamento', 1), ('metas_gerenciamento', 2), ('projecao_gerenciamento', 3),
        ('relatorios_gerenciamento', 4), ('products', 5), ('clients', 6),
        -- especial
        ('nuvemshop', 1)
    ) AS pos(mod_key, ord) ON pos.mod_key = modules.key
)
UPDATE modules SET sort_order = ordered.new_order
  FROM ordered
 WHERE modules.key = ordered.key;

-- -----------------------------------------------------------------------------
-- 6. FK + NOT NULL + índice
-- -----------------------------------------------------------------------------
ALTER TABLE modules ALTER COLUMN subsystem_key SET NOT NULL;

ALTER TABLE modules DROP CONSTRAINT IF EXISTS modules_subsystem_key_fkey;
ALTER TABLE modules
  ADD CONSTRAINT modules_subsystem_key_fkey
    FOREIGN KEY (subsystem_key) REFERENCES subsystems(subsystem_key)
    ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS idx_modules_subsystem_key ON modules(subsystem_key);

-- -----------------------------------------------------------------------------
-- 7. Validação atômica
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_total_subs    INTEGER;
  v_total_mods    INTEGER;
  v_orphan_mods   INTEGER;
  v_mods_per_sub  RECORD;
BEGIN
  SELECT COUNT(*) INTO v_total_subs FROM subsystems;
  IF v_total_subs < 5 THEN
    RAISE EXCEPTION 'Esperado 5 subsistemas, encontrado %', v_total_subs;
  END IF;

  SELECT COUNT(*) INTO v_orphan_mods FROM modules WHERE subsystem_key IS NULL;
  IF v_orphan_mods > 0 THEN
    RAISE EXCEPTION '% módulos sem subsystem_key', v_orphan_mods;
  END IF;

  SELECT COUNT(*) INTO v_total_mods FROM modules WHERE is_active = TRUE;
  IF v_total_mods < 20 THEN
    RAISE EXCEPTION 'Esperado >= 20 módulos ativos, encontrado %', v_total_mods;
  END IF;

  FOR v_mods_per_sub IN
    SELECT s.subsystem_key, COUNT(m.id) AS n
      FROM subsystems s LEFT JOIN modules m ON m.subsystem_key = s.subsystem_key
     GROUP BY s.subsystem_key
  LOOP
    RAISE NOTICE '  • %: % módulos', v_mods_per_sub.subsystem_key, v_mods_per_sub.n;
  END LOOP;

  RAISE NOTICE '✓ Migration 018: % subsistemas, % módulos no catálogo', v_total_subs, v_total_mods;
END $$;

COMMIT;
