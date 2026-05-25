-- ============================================================
-- Migration 007: Sistema de Feedback
-- ============================================================

CREATE TABLE IF NOT EXISTS feedbacks (
    id VARCHAR(255) PRIMARY KEY,
    usuario_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    categoria VARCHAR(20) NOT NULL CHECK (categoria IN ('duvida', 'melhoria', 'sugestao', 'critica')),
    descricao TEXT NOT NULL,
    imagem_base64 TEXT,
    link_video VARCHAR(500),
    pagina VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'respondido', 'aceito')),
    resposta TEXT,
    roadmap_item_id VARCHAR(255) REFERENCES roadmap_items(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_categoria ON feedbacks(categoria);
CREATE INDEX IF NOT EXISTS idx_feedbacks_usuario ON feedbacks(usuario_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created ON feedbacks(created_at DESC);

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_feedbacks_updated_at ON feedbacks;
CREATE TRIGGER update_feedbacks_updated_at
    BEFORE UPDATE ON feedbacks
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
