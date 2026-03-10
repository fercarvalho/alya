-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 004: Adicionar Campos Criptografados
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Adiciona campos criptografados para informações sensíveis dos clientes.
-- Mantém campos originais temporariamente para migração gradual.
--
-- Campos sensíveis:
--   - CPF
--   - Telefone
--   - Email
--   - Endereço
--
-- Formato dos dados criptografados: iv:authTag:encrypted (AES-256-GCM)
--
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ADICIONAR CAMPOS CRIPTOGRAFADOS (se tabela clients existir)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Verificar se tabela clients existe (ajustar para sua estrutura)
DO $$
BEGIN
    -- Adicionar campos criptografados apenas se tabela existir
    IF EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'clients'
    ) THEN
        -- CPF criptografado
        IF NOT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'clients' AND column_name = 'cpf_encrypted'
        ) THEN
            ALTER TABLE clients ADD COLUMN cpf_encrypted TEXT;
            COMMENT ON COLUMN clients.cpf_encrypted IS 'CPF criptografado (AES-256-GCM)';
        END IF;

        -- Hash do CPF para busca/indexação (sem expor dados)
        IF NOT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'clients' AND column_name = 'cpf_hash'
        ) THEN
            ALTER TABLE clients ADD COLUMN cpf_hash VARCHAR(64);
            COMMENT ON COLUMN clients.cpf_hash IS 'Hash SHA-256 do CPF para busca';
        END IF;

        -- Telefone criptografado
        IF NOT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'clients' AND column_name = 'phone_encrypted'
        ) THEN
            ALTER TABLE clients ADD COLUMN phone_encrypted TEXT;
            COMMENT ON COLUMN clients.phone_encrypted IS 'Telefone criptografado (AES-256-GCM)';
        END IF;

        -- Email criptografado (opcional, se quiser criptografar)
        IF NOT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'clients' AND column_name = 'email_encrypted'
        ) THEN
            ALTER TABLE clients ADD COLUMN email_encrypted TEXT;
            COMMENT ON COLUMN clients.email_encrypted IS 'Email criptografado (AES-256-GCM)';
        END IF;

        -- Hash do email para busca
        IF NOT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'clients' AND column_name = 'email_hash'
        ) THEN
            ALTER TABLE clients ADD COLUMN email_hash VARCHAR(64);
            COMMENT ON COLUMN clients.email_hash IS 'Hash SHA-256 do email para busca';
        END IF;

        -- Endereço criptografado
        IF NOT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'clients' AND column_name = 'address_encrypted'
        ) THEN
            ALTER TABLE clients ADD COLUMN address_encrypted TEXT;
            COMMENT ON COLUMN clients.address_encrypted IS 'Endereço criptografado (AES-256-GCM)';
        END IF;

        RAISE NOTICE '✅ Campos criptografados adicionados à tabela clients';
    ELSE
        RAISE NOTICE '⚠️  Tabela clients não existe, ajuste conforme sua estrutura';
    END IF;
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ÍNDICES PARA BUSCA (usando hashes)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clients') THEN
        -- Índice no hash do CPF
        IF NOT EXISTS (
            SELECT FROM pg_indexes
            WHERE tablename = 'clients' AND indexname = 'idx_clients_cpf_hash'
        ) THEN
            CREATE INDEX idx_clients_cpf_hash ON clients(cpf_hash);
            RAISE NOTICE '✅ Índice criado: idx_clients_cpf_hash';
        END IF;

        -- Índice no hash do email
        IF NOT EXISTS (
            SELECT FROM pg_indexes
            WHERE tablename = 'clients' AND indexname = 'idx_clients_email_hash'
        ) THEN
            CREATE INDEX idx_clients_email_hash ON clients(email_hash);
            RAISE NOTICE '✅ Índice criado: idx_clients_email_hash';
        END IF;
    END IF;
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- METADATA
-- ═══════════════════════════════════════════════════════════════════════════════

-- Registrar migração
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'migrations') THEN
        CREATE TABLE migrations (
            id SERIAL PRIMARY KEY,
            migration_name VARCHAR(255) UNIQUE NOT NULL,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    END IF;

    INSERT INTO migrations (migration_name)
    VALUES ('004-add-encrypted-fields')
    ON CONFLICT (migration_name) DO NOTHING;
END
$$;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- NOTAS IMPORTANTES
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- 1. MIGRAÇÃO DE DADOS:
--    Esta migration adiciona NOVOS campos. Os dados antigos NÃO são migrados automaticamente.
--    Use o script de migração: node server/scripts/migrate-encrypted-fields.js
--
-- 2. CAMPOS ANTIGOS:
--    Os campos originais (cpf, phone, email, address) são MANTIDOS temporariamente.
--    Após validar que tudo funciona, você pode removê-los manualmente.
--
-- 3. BUSCA:
--    Para buscar por CPF/email:
--      - Calcule o hash do valor buscado: hash = crypto.createHash('sha256').update(cpf).digest('hex')
--      - Busque por: WHERE cpf_hash = hash
--      - NÃO é possível buscar por LIKE/partial match em campos criptografados
--
-- 4. PERFORMANCE:
--    - Índices em hashes são eficientes para busca exata
--    - Criptografia/descriptografia adiciona ~1-2ms por operação
--    - Use caching quando possível
--
-- 5. ROLLBACK:
--    Para reverter esta migration:
--      ALTER TABLE clients DROP COLUMN cpf_encrypted;
--      ALTER TABLE clients DROP COLUMN cpf_hash;
--      ALTER TABLE clients DROP COLUMN phone_encrypted;
--      ALTER TABLE clients DROP COLUMN email_encrypted;
--      ALTER TABLE clients DROP COLUMN email_hash;
--      ALTER TABLE clients DROP COLUMN address_encrypted;
--
-- ═══════════════════════════════════════════════════════════════════════════════
