-- Tabela de Refresh Tokens - Fase 3 de Segurança
-- Esta tabela gerencia tokens de longa duração para renovação de access tokens

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

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(revoked);

-- Comentários para documentação
COMMENT ON TABLE refresh_tokens IS 'Tokens de longa duração para renovação de access tokens JWT';
COMMENT ON COLUMN refresh_tokens.token IS 'Hash do refresh token (SHA-256)';
COMMENT ON COLUMN refresh_tokens.user_id IS 'ID do usuário dono do token';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'Data de expiração do refresh token (padrão: 7 dias)';
COMMENT ON COLUMN refresh_tokens.revoked IS 'Token foi revogado (logout ou comprometimento)';
COMMENT ON COLUMN refresh_tokens.ip_address IS 'IP que criou o token (auditoria)';
COMMENT ON COLUMN refresh_tokens.user_agent IS 'User-Agent que criou o token (auditoria)';
COMMENT ON COLUMN refresh_tokens.replaced_by_token IS 'Token que substituiu este (rotação)';

-- Função para limpar tokens expirados (executar via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens() RETURNS void AS $$
BEGIN
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW()
       OR (revoked = TRUE AND revoked_at < NOW() - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql;

-- Para executar a limpeza manualmente:
-- SELECT cleanup_expired_refresh_tokens();

-- Para agendar a limpeza automática (requer pg_cron extension):
-- SELECT cron.schedule('cleanup-refresh-tokens', '0 3 * * *', 'SELECT cleanup_expired_refresh_tokens();');
