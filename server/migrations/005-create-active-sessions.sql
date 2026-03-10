-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 005: Tabela de Sessões Ativas
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Cria tabela para rastrear todas as sessões ativas dos usuários.
--
-- Funcionalidades:
--   - Ver dispositivos logados
--   - Revogar sessões remotamente
--   - Detectar acessos anômalos (novo device, novo país, etc.)
--   - Limitar sessões simultâneas
--
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- CRIAR TABELA active_sessions
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS active_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL,
    refresh_token_id INTEGER NOT NULL,

    -- Informações do dispositivo
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    device_type VARCHAR(50),  -- desktop, mobile, tablet, unknown
    device_name VARCHAR(255), -- "Chrome 120 on Windows 10"
    browser VARCHAR(100),     -- Chrome, Firefox, Safari, etc.
    os VARCHAR(100),          -- Windows, macOS, Linux, Android, iOS

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

    -- Foreign key
    CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES users(username)
        ON DELETE CASCADE,

    CONSTRAINT fk_refresh_token
        FOREIGN KEY (refresh_token_id)
        REFERENCES refresh_tokens(id)
        ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ÍNDICES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_active_sessions_user_id ON active_sessions(user_id);
CREATE INDEX idx_active_sessions_refresh_token_id ON active_sessions(refresh_token_id);
CREATE INDEX idx_active_sessions_ip_address ON active_sessions(ip_address);
CREATE INDEX idx_active_sessions_is_active ON active_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_active_sessions_expires_at ON active_sessions(expires_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNÇÃO: Limpar sessões expiradas automaticamente
-- ═══════════════════════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGER: Atualizar last_activity_at automaticamente
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_activity
BEFORE UPDATE ON active_sessions
FOR EACH ROW
EXECUTE FUNCTION update_last_activity();

-- ═══════════════════════════════════════════════════════════════════════════════
-- AGENDAR LIMPEZA AUTOMÁTICA (via pg_cron, se disponível)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Descomente se tiver pg_cron instalado:
-- SELECT cron.schedule('cleanup-expired-sessions', '*/15 * * * *', 'SELECT cleanup_expired_sessions()');

-- Alternativa: Criar job no cron do sistema:
-- */15 * * * * psql -U alya_user -d alya_db -c "SELECT cleanup_expired_sessions()"

-- ═══════════════════════════════════════════════════════════════════════════════
-- REGISTRAR MIGRAÇÃO
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO migrations (migration_name)
VALUES ('005-create-active-sessions')
ON CONFLICT (migration_name) DO NOTHING;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- NOTAS
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- 1. GEOLOCALIZAÇÃO:
--    Para popular country/city, use uma API como:
--    - ipapi.co (gratuita, 30K req/mês)
--    - ipinfo.io (gratuita, 50K req/mês)
--    - MaxMind GeoLite2 (local, gratuito)
--
-- 2. DEVICE DETECTION:
--    Use biblioteca como ua-parser-js para extrair info do user-agent
--
-- 3. LIMPAR SESSÕES ANTIGAS:
--    Execute periodicamente: SELECT cleanup_expired_sessions();
--    Ou configure cron job
--
-- 4. LIMITE DE SESSÕES:
--    Antes de criar nova sessão, verificar:
--    SELECT COUNT(*) FROM active_sessions
--    WHERE user_id = $1 AND is_active = TRUE;
--
--    Se >= limite, revogar sessão mais antiga ou retornar erro
--
-- 5. ROLLBACK:
--    DROP TABLE active_sessions CASCADE;
--    DROP FUNCTION cleanup_expired_sessions();
--    DROP FUNCTION update_last_activity();
--
-- ═══════════════════════════════════════════════════════════════════════════════
