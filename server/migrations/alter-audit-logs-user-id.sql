-- Alterar user_id de INTEGER para VARCHAR para suportar UUIDs
-- Executar este script se a tabela já existe

-- Remover o índice antigo
DROP INDEX IF EXISTS idx_audit_logs_user_id;

-- Alterar o tipo da coluna
ALTER TABLE audit_logs
ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::VARCHAR;

-- Recriar o índice
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);

-- Atualizar comentário
COMMENT ON COLUMN audit_logs.user_id IS 'ID do usuário que realizou a operação (UUID ou INT, NULL para operações anônimas)';
