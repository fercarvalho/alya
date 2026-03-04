-- Tabela de Logs de Auditoria - Fase 2 de Segurança
-- Esta tabela registra todas as operações críticas do sistema

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

-- Índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation ON audit_logs(operation);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Índice GIN para busca rápida em JSONB
CREATE INDEX IF NOT EXISTS idx_audit_logs_details ON audit_logs USING gin(details);

-- Comentários para documentação
COMMENT ON TABLE audit_logs IS 'Registros de auditoria de segurança do sistema';
COMMENT ON COLUMN audit_logs.operation IS 'Tipo de operação: login, logout, create, update, delete, etc.';
COMMENT ON COLUMN audit_logs.user_id IS 'ID do usuário que realizou a operação (UUID ou INT, NULL para operações anônimas)';
COMMENT ON COLUMN audit_logs.ip_address IS 'Endereço IP de origem da requisição';
COMMENT ON COLUMN audit_logs.details IS 'Detalhes adicionais da operação em formato JSON';
COMMENT ON COLUMN audit_logs.status IS 'Status da operação: success, failure, blocked';

-- Política de retenção: manter logs por 2 anos
-- Criar função para limpeza automática de logs antigos
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs() RETURNS void AS $$
BEGIN
    DELETE FROM audit_logs WHERE timestamp < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;

-- Para executar a limpeza manualmente:
-- SELECT cleanup_old_audit_logs();

-- Para agendar a limpeza automática (requer pg_cron extension):
-- SELECT cron.schedule('cleanup-audit-logs', '0 2 * * 0', 'SELECT cleanup_old_audit_logs();');
