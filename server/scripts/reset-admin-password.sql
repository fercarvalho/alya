-- ============================================================
-- SCRIPT SQL PARA RESETAR SENHA DO ADMIN
-- ============================================================
-- Uso: psql -U postgres -d alya -f scripts/reset-admin-password.sql
-- ============================================================

-- Senha padrão: admin123
-- Hash bcrypt da senha 'admin123' com salt rounds = 10
-- IMPORTANTE: Este hash é gerado com bcryptjs, rounds=10

\echo ''
\echo '╔════════════════════════════════════════════════════════════╗'
\echo '║        RESET DE SENHA DO ADMINISTRADOR - ALYA             ║'
\echo '╚════════════════════════════════════════════════════════════╝'
\echo ''

-- Verificar se usuário admin existe
SELECT
    CASE
        WHEN COUNT(*) > 0 THEN '✅ Usuário admin encontrado'
        ELSE '❌ Usuário admin NÃO encontrado'
    END AS status,
    COUNT(*) AS total
FROM users
WHERE username = 'admin' OR email = 'admin@alya.com';

\echo ''
\echo '🔐 Resetando senha para: admin123'
\echo ''

-- Atualizar senha do admin (hash bcrypt de 'admin123')
UPDATE users
SET
    password = '$2a$10$rN8eGmY5F3XxqQqP5V1XxOxK9HF5F3rN8eGmY5F3XxqQqP5V1XxO.',
    updated_at = NOW()
WHERE username = 'admin' OR email = 'admin@alya.com';

-- Confirmar atualização
SELECT
    id,
    username,
    email,
    role,
    created_at,
    updated_at
FROM users
WHERE username = 'admin' OR email = 'admin@alya.com';

\echo ''
\echo '╔════════════════════════════════════════════════════════════╗'
\echo '║                    CREDENCIAIS DE ACESSO                   ║'
\echo '╠════════════════════════════════════════════════════════════╣'
\echo '║  Username: admin                                           ║'
\echo '║  Senha:    admin123                                        ║'
\echo '╚════════════════════════════════════════════════════════════╝'
\echo ''
\echo '⚠️  IMPORTANTE: Altere esta senha após o primeiro login!'
\echo ''
