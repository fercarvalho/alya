-- Migration: Adicionar tabela de convites de usuário
-- Descrição: Sistema de convites seguros para primeiro acesso
-- Data: 2026-03-01
-- Autor: Sistema Alya - Correção de Segurança

-- ===== Tabela de Convites de Usuário =====
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_invites_token ON user_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_user_invites_user_id ON user_invites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_invites_expires ON user_invites(expires_at);

-- Comentários para documentação
COMMENT ON TABLE user_invites IS 'Convites para primeiro acesso de usuários - correção de segurança CRÍTICA';
COMMENT ON COLUMN user_invites.invite_token IS 'Token único UUID v4 para validação do convite';
COMMENT ON COLUMN user_invites.temp_password_hash IS 'Hash bcrypt da senha temporária enviada por email';
COMMENT ON COLUMN user_invites.expires_at IS 'Data de expiração do convite (padrão: 7 dias)';
COMMENT ON COLUMN user_invites.used IS 'Indica se o convite já foi utilizado';

-- Função para limpar convites expirados automaticamente
CREATE OR REPLACE FUNCTION cleanup_expired_invites()
RETURNS void AS $$
BEGIN
    DELETE FROM user_invites
    WHERE expires_at < CURRENT_TIMESTAMP
    AND used = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar used_at automaticamente
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
