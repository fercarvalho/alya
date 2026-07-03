-- ═══════════════════════════════════════════════════════════════════════════
-- Rollback da 038 - PM-PERMISSIONS-AND-REMOVE-PRODUCTS.sql
--
-- Remove as concessões e os defaults dos 5 módulos PM novos.
-- NÃO recria o módulo `products` no catálogo (removido na 038) — se necessário,
-- restaurar a partir do backup backups/backup-pre-038-*.sql. A tabela `products`
-- não foi tocada pela 038 (preservada p/ a integração Nuvemshop).
-- Os 5 módulos permanecem registrados em `modules` (foram criados na 035).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DELETE FROM user_module_permissions
 WHERE module_key IN ('projects','services','tarefas_gerenciamento',
                      'pomodoro_gerenciamento','relatorios_tarefas_gerenciamento');

DELETE FROM role_default_permissions
 WHERE module_key IN ('projects','services','tarefas_gerenciamento',
                      'pomodoro_gerenciamento','relatorios_tarefas_gerenciamento');

COMMIT;
