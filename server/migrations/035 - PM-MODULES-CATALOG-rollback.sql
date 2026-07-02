-- ═══════════════════════════════════════════════════════════════════════════
-- Rollback da 035 - PM-MODULES-CATALOG.sql
-- Remove os 5 módulos novos do catálogo. Os sort_order dos módulos pré-existentes
-- NÃO são restaurados (cosmético; a 018 já os havia ordenado). products volta a
-- um sort_order dentro da faixa.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DELETE FROM modules WHERE key IN (
  'projects','services','tarefas_gerenciamento',
  'pomodoro_gerenciamento','relatorios_tarefas_gerenciamento'
);

UPDATE modules SET sort_order = 5 WHERE key = 'products';

COMMIT;
