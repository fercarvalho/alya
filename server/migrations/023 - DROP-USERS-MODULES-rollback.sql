-- =============================================================================
-- Rollback Migration 023 — recria users.modules e popula
-- =============================================================================
--
-- Recria a coluna `users.modules TEXT[]` que a 023 dropou e popula:
--   1. Se users_modules_backup_023 existir → restaura exatamente o estado
--      pré-drop (mais fiel — preserva ordem original, modules de users
--      deletados pós-023 ficam de fora naturalmente).
--   2. Senão → reconstrói a partir de user_module_permissions
--      (array de keys com qualquer acesso, sem distinção view/edit).
--
-- IMPORTANTE: depois deste rollback, o código backend desta fase NÃO vai
-- repopular users.modules em mudanças subsequentes (dual-write foi
-- removido). Pra ter o dual-write de volta, reverta TAMBÉM o commit
-- correspondente da Fase 2.10. Sem isso, users.modules vai dessincronizar
-- silenciosamente a cada mudança em user_module_permissions.
-- =============================================================================

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS modules TEXT[];

DO $$
DECLARE
  v_has_backup BOOLEAN;
  v_users_restored INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'users_modules_backup_023'
  ) INTO v_has_backup;

  IF v_has_backup THEN
    UPDATE users u
       SET modules = b.modules
      FROM users_modules_backup_023 b
     WHERE u.id = b.user_id;
    GET DIAGNOSTICS v_users_restored = ROW_COUNT;
    RAISE NOTICE '  → modules restaurado pra % usuários a partir do backup', v_users_restored;
  ELSE
    -- Fallback: derivar de user_module_permissions
    UPDATE users u
       SET modules = COALESCE(
         (SELECT array_agg(ump.module_key ORDER BY ump.module_key)
            FROM user_module_permissions ump
           WHERE ump.user_id = u.id),
         ARRAY[]::TEXT[]
       );
    GET DIAGNOSTICS v_users_restored = ROW_COUNT;
    RAISE NOTICE '  → modules derivado de user_module_permissions pra % usuários', v_users_restored;
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '✓ Rollback 023: users.modules restaurada. AVISO: dual-write não vai mais sincronizar — reverta também o commit fase 2.10 do código pra evitar drift.';
END $$;

COMMIT;
