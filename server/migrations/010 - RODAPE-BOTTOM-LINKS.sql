-- ============================================================
-- Migration 010: Links de Base do Rodapé
-- ============================================================

CREATE TABLE IF NOT EXISTS rodape_bottom_links (
    id VARCHAR(255) PRIMARY KEY,
    texto VARCHAR(255) NOT NULL,
    link TEXT DEFAULT '',
    ativo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rodape_bottom_links_ativo ON rodape_bottom_links(ativo);
CREATE INDEX IF NOT EXISTS idx_rodape_bottom_links_ordem ON rodape_bottom_links(ordem);

DROP TRIGGER IF EXISTS update_rodape_bottom_links_updated_at ON rodape_bottom_links;
CREATE TRIGGER update_rodape_bottom_links_updated_at
    BEFORE UPDATE ON rodape_bottom_links
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- Dados padrão: links de base do rodapé
-- ============================================================
INSERT INTO rodape_bottom_links (id, texto, link, ativo, ordem) VALUES
  ('bl-privacidade',   'Política de Privacidade',   '#politica-privacidade', true, 0),
  ('bl-cookies',       'Gerenciar Cookies',          '#gerenciar-cookies',    true, 1),
  ('bl-termos',        'Termos de Uso',              '#termos-uso',           true, 2),
  ('bl-consideracoes', 'Considerações importantes',  '',                      true, 3),
  ('bl-branding',      'Branding Kit',               '',                      true, 4),
  ('bl-contato',       'Contato',                    'https://wa.me/5511971039181?text=Oi%20Sofia%2C%20tudo%20bem%3F%20Vim%20pelo%20site%20da%20Alya%20e%20fiquei%20interessado%20pelo%20trabalho%20da%20Viver%20de%20PJ%20e%20gostaria%20de%20saber%20mais%20informa%C3%A7%C3%B5es', true, 5)
ON CONFLICT (id) DO NOTHING;
