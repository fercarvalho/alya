-- Schema do roadmap do sistema para o projeto Alya
-- Execute com: psql -U seuusuario -d alya -h localhost -f "migrations/005 - ROADMAP.sql"

-- Tabela de itens do roadmap
CREATE TABLE IF NOT EXISTS roadmap_items (
    id VARCHAR(255) PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'backlog',
    prioridade VARCHAR(20) DEFAULT 'media',
    ordem INTEGER DEFAULT 0,
    data_inicio TIMESTAMP,
    depende_de VARCHAR(255) REFERENCES roadmap_items(id) ON DELETE SET NULL,
    tempo_acumulado INTEGER DEFAULT 0,
    em_andamento BOOLEAN DEFAULT FALSE,
    ultimo_inicio TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_roadmap_status ON roadmap_items(status);
CREATE INDEX IF NOT EXISTS idx_roadmap_ordem ON roadmap_items(ordem);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_roadmap_items_updated_at ON roadmap_items;
CREATE TRIGGER update_roadmap_items_updated_at BEFORE UPDATE ON roadmap_items
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
