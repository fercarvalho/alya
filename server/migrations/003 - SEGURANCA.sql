-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 003: Segurança
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Cria todas as tabelas de segurança e autenticação do sistema Alya.
-- Execute após 001 - SCHEMA.sql.
--
-- Tabelas criadas (nesta ordem):
--   1. audit_logs            — logs de auditoria de todas as operações
--   2. password_reset_tokens — tokens de recuperação de senha
--   3. user_invites          — convites de primeiro acesso
--   4. refresh_tokens        — tokens JWT de longa duração
--   5. clients (ALTER)       — adiciona campos criptografados (CPF, telefone, email, endereço)
--   6. active_sessions       — sessões ativas por dispositivo
--
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. AUDIT LOGS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    operation VARCHAR(100) NOT NULL,
    user_id VARCHAR(255),  -- Suporta UUID ou INTEGER
    username VARCHAR(255),
    ip_address VARCHAR(45), -- IPv6 suporta até 45 caracteres
    user_agent TEXT,
    details JSONB,
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation ON audit_logs(operation);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_details ON audit_logs USING gin(details);

COMMENT ON TABLE audit_logs IS 'Registros de auditoria de segurança do sistema';
COMMENT ON COLUMN audit_logs.operation IS 'Tipo de operação: login, logout, create, update, delete, etc.';
COMMENT ON COLUMN audit_logs.user_id IS 'ID do usuário que realizou a operação (UUID ou INT, NULL para operações anônimas)';
COMMENT ON COLUMN audit_logs.ip_address IS 'Endereço IP de origem da requisição';
COMMENT ON COLUMN audit_logs.details IS 'Detalhes adicionais da operação em formato JSON';
COMMENT ON COLUMN audit_logs.status IS 'Status da operação: success, failure, blocked';

-- Função de limpeza automática (política de retenção: 2 anos)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs() RETURNS void AS $$
BEGIN
    DELETE FROM audit_logs WHERE timestamp < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;

-- Para executar manualmente: SELECT cleanup_old_audit_logs();
-- Para agendar (requer pg_cron): SELECT cron.schedule('cleanup-audit-logs', '0 2 * * 0', 'SELECT cleanup_old_audit_logs();');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. PASSWORD RESET TOKENS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pwd_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_expires ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_user ON password_reset_tokens(user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. USER INVITES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_invites (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invite_token VARCHAR(500) NOT NULL UNIQUE,
    temp_password_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_user_invites_token ON user_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_user_invites_user_id ON user_invites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_invites_expires ON user_invites(expires_at);

COMMENT ON TABLE user_invites IS 'Convites para primeiro acesso de usuários - correção de segurança CRÍTICA';
COMMENT ON COLUMN user_invites.invite_token IS 'Token único UUID v4 para validação do convite';
COMMENT ON COLUMN user_invites.temp_password_hash IS 'Hash bcrypt da senha temporária enviada por email';
COMMENT ON COLUMN user_invites.expires_at IS 'Data de expiração do convite (padrão: 7 dias)';
COMMENT ON COLUMN user_invites.used IS 'Indica se o convite já foi utilizado';

CREATE OR REPLACE FUNCTION cleanup_expired_invites()
RETURNS void AS $$
BEGIN
    DELETE FROM user_invites
    WHERE expires_at < CURRENT_TIMESTAMP
    AND used = FALSE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_invite_used_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.used = TRUE AND OLD.used = FALSE THEN
        NEW.used_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_invite_used_at ON user_invites;
CREATE TRIGGER trigger_update_invite_used_at
    BEFORE UPDATE ON user_invites
    FOR EACH ROW
    EXECUTE FUNCTION update_invite_used_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. REFRESH TOKENS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(500) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    ip_address VARCHAR(45),
    user_agent TEXT,
    replaced_by_token VARCHAR(500),
    CONSTRAINT fk_user
        FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(revoked);

COMMENT ON TABLE refresh_tokens IS 'Tokens de longa duração para renovação de access tokens JWT';
COMMENT ON COLUMN refresh_tokens.token IS 'Hash do refresh token (SHA-256)';
COMMENT ON COLUMN refresh_tokens.user_id IS 'ID do usuário dono do token';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'Data de expiração do refresh token (padrão: 7 dias)';
COMMENT ON COLUMN refresh_tokens.revoked IS 'Token foi revogado (logout ou comprometimento)';
COMMENT ON COLUMN refresh_tokens.ip_address IS 'IP que criou o token (auditoria)';
COMMENT ON COLUMN refresh_tokens.user_agent IS 'User-Agent que criou o token (auditoria)';
COMMENT ON COLUMN refresh_tokens.replaced_by_token IS 'Token que substituiu este (rotação)';

-- Função de limpeza automática
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens() RETURNS void AS $$
BEGIN
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW()
       OR (revoked = TRUE AND revoked_at < NOW() - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql;

-- Para executar manualmente: SELECT cleanup_expired_refresh_tokens();
-- Para agendar (requer pg_cron): SELECT cron.schedule('cleanup-refresh-tokens', '0 3 * * *', 'SELECT cleanup_expired_refresh_tokens();');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. CAMPOS CRIPTOGRAFADOS (ALTER TABLE clients)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Adiciona campos criptografados AES-256-GCM para informações sensíveis dos clientes.
-- Formato: iv:authTag:encrypted
-- Os campos originais (cpf, phone, email, address) são mantidos para migração gradual.
-- Após validar, podem ser removidos manualmente.
--
-- Para migrar os dados existentes:
--   node "scripts/server/01 - ADMIN.js" --migrate-fields --dry-run
--   node "scripts/server/01 - ADMIN.js" --migrate-fields

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clients') THEN

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'cpf_encrypted') THEN
            ALTER TABLE clients ADD COLUMN cpf_encrypted TEXT;
            COMMENT ON COLUMN clients.cpf_encrypted IS 'CPF criptografado (AES-256-GCM)';
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'cpf_hash') THEN
            ALTER TABLE clients ADD COLUMN cpf_hash VARCHAR(64);
            COMMENT ON COLUMN clients.cpf_hash IS 'Hash SHA-256 do CPF para busca';
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'phone_encrypted') THEN
            ALTER TABLE clients ADD COLUMN phone_encrypted TEXT;
            COMMENT ON COLUMN clients.phone_encrypted IS 'Telefone criptografado (AES-256-GCM)';
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'email_encrypted') THEN
            ALTER TABLE clients ADD COLUMN email_encrypted TEXT;
            COMMENT ON COLUMN clients.email_encrypted IS 'Email criptografado (AES-256-GCM)';
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'email_hash') THEN
            ALTER TABLE clients ADD COLUMN email_hash VARCHAR(64);
            COMMENT ON COLUMN clients.email_hash IS 'Hash SHA-256 do email para busca';
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'address_encrypted') THEN
            ALTER TABLE clients ADD COLUMN address_encrypted TEXT;
            COMMENT ON COLUMN clients.address_encrypted IS 'Endereço criptografado (AES-256-GCM)';
        END IF;

        RAISE NOTICE '✅ Campos criptografados verificados na tabela clients';
    ELSE
        RAISE NOTICE '⚠️  Tabela clients não encontrada. Execute 001 - SCHEMA.sql primeiro.';
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clients') THEN
        IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'clients' AND indexname = 'idx_clients_cpf_hash') THEN
            CREATE INDEX idx_clients_cpf_hash ON clients(cpf_hash);
        END IF;
        IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'clients' AND indexname = 'idx_clients_email_hash') THEN
            CREATE INDEX idx_clients_email_hash ON clients(email_hash);
        END IF;
    END IF;
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. ACTIVE SESSIONS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS active_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL,
    refresh_token_id INTEGER,  -- NULL permitido para sessões de impersonação

    -- Informações do dispositivo
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    device_type VARCHAR(50),  -- desktop, mobile, tablet, unknown
    device_name VARCHAR(255), -- "Chrome 120 on Windows 10"
    browser VARCHAR(100),
    os VARCHAR(100),

    -- Geolocalização (via IP)
    country VARCHAR(100),
    city VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMP,
    revoked_reason VARCHAR(255),

    CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES users(username)
        ON DELETE CASCADE,

    CONSTRAINT fk_refresh_token
        FOREIGN KEY (refresh_token_id)
        REFERENCES refresh_tokens(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_refresh_token_id ON active_sessions(refresh_token_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_ip_address ON active_sessions(ip_address);
CREATE INDEX IF NOT EXISTS idx_active_sessions_is_active ON active_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_active_sessions_expires_at ON active_sessions(expires_at);

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    UPDATE active_sessions
    SET is_active = FALSE,
        revoked_at = CURRENT_TIMESTAMP,
        revoked_reason = 'Expirada automaticamente'
    WHERE is_active = TRUE
      AND expires_at < CURRENT_TIMESTAMP;

    RAISE NOTICE 'Sessões expiradas limpas: % registros', ROW_COUNT;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_last_activity ON active_sessions;
CREATE TRIGGER trigger_update_last_activity
BEFORE UPDATE ON active_sessions
FOR EACH ROW
EXECUTE FUNCTION update_last_activity();

-- Para executar limpeza manualmente: SELECT cleanup_expired_sessions();
-- Para agendar (requer pg_cron): SELECT cron.schedule('cleanup-expired-sessions', '*/15 * * * *', 'SELECT cleanup_expired_sessions()');
-- Alternativa cron do sistema: */15 * * * * psql -U seuusuario -d alya -h localhost -c "SELECT cleanup_expired_sessions()"

COMMIT;
