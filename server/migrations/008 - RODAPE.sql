-- ============================================================
-- Migration 008: Sistema de Rodapé Dinâmico
-- ============================================================

-- Função update_updated_at_column já existe (criada em migrations anteriores)

-- Tabela de configurações gerais do rodapé (chave/valor)
CREATE TABLE IF NOT EXISTS rodape_configuracoes (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de colunas do rodapé
CREATE TABLE IF NOT EXISTS rodape_colunas (
    id VARCHAR(255) PRIMARY KEY,
    titulo VARCHAR(100) NOT NULL,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de links dentro das colunas
CREATE TABLE IF NOT EXISTS rodape_links (
    id VARCHAR(255) PRIMARY KEY,
    coluna_id VARCHAR(255) REFERENCES rodape_colunas(id) ON DELETE CASCADE,
    texto VARCHAR(255) NOT NULL,
    link TEXT DEFAULT '',
    eh_link BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_rodape_colunas_ordem ON rodape_colunas(ordem);
CREATE INDEX IF NOT EXISTS idx_rodape_links_coluna ON rodape_links(coluna_id);
CREATE INDEX IF NOT EXISTS idx_rodape_links_ordem ON rodape_links(coluna_id, ordem);

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_rodape_configuracoes_updated_at ON rodape_configuracoes;
CREATE TRIGGER update_rodape_configuracoes_updated_at
    BEFORE UPDATE ON rodape_configuracoes
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_rodape_colunas_updated_at ON rodape_colunas;
CREATE TRIGGER update_rodape_colunas_updated_at
    BEFORE UPDATE ON rodape_colunas
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_rodape_links_updated_at ON rodape_links;
CREATE TRIGGER update_rodape_links_updated_at
    BEFORE UPDATE ON rodape_links
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- Dados padrão: configurações globais da empresa
-- ============================================================
INSERT INTO rodape_configuracoes (chave, valor) VALUES
  ('empresa_nome',     'Viver de PJ'),
  ('empresa_tagline',  'Ecosistema de Empreendedorismo'),
  ('empresa_descricao','Sistema de Gestão Inteligente por Viver de PJ. A Viver de PJ é um ecosistema completo de gestão e educação para Empreendedores.'),
  ('empresa_autor',    'Autor: 41.748.511 Fernando Carvalho Gomes dos Santos.'),
  ('empresa_logo',     '/logo_rodape.png'),
  ('copyright',        'Viver de PJ. TODOS OS DIREITOS RESERVADOS')
ON CONFLICT (chave) DO NOTHING;

-- ============================================================
-- Dados padrão: coluna "Contato"
-- ============================================================
INSERT INTO rodape_colunas (id, titulo, ordem) VALUES
  ('col-contato', 'Contato', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO rodape_links (id, coluna_id, texto, link, eh_link, ordem) VALUES
  ('lnk-tel',  'col-contato', '(11) 97103-9181', 'https://wa.me/5511971039181?text=Oi%20Sofia%2C%20tudo%20bem%3F%20Vim%20pelo%20site%20da%20Alya%20e%20fiquei%20interessado%20pelo%20trabalho%20da%20Viver%20de%20PJ%20e%20gostaria%20de%20saber%20mais%20informa%C3%A7%C3%B5es', true, 0),
  ('lnk-email','col-contato', 'vem@viverdepj.com.br', 'mailto:vem@viverdepj.com.br', true, 1),
  ('lnk-site', 'col-contato', 'viverdepj.com.br', 'https://viverdepj.com.br', true, 2),
  ('lnk-loc',  'col-contato', 'São Paulo, SP', '', false, 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Dados padrão: coluna "Serviços"
-- ============================================================
INSERT INTO rodape_colunas (id, titulo, ordem) VALUES
  ('col-servicos', 'Serviços', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO rodape_links (id, coluna_id, texto, link, eh_link, ordem) VALUES
  ('lnk-s1',  'col-servicos', 'Consultoria Estratégica de Negócios', '', false, 0),
  ('lnk-s2',  'col-servicos', 'Sistema de Gestão',                   '', false, 1),
  ('lnk-s3',  'col-servicos', 'Sistema Financeiro',                  '', false, 2),
  ('lnk-s4',  'col-servicos', 'CRM',                                 '', false, 3),
  ('lnk-s5',  'col-servicos', 'IA Financeira',                       '', false, 4),
  ('lnk-s6',  'col-servicos', 'IA de Atendimento',                   '', false, 5),
  ('lnk-s7',  'col-servicos', 'IA para Negócios',                    '', false, 6),
  ('lnk-s8',  'col-servicos', 'Benefícios Corporativos',             '', false, 7),
  ('lnk-s9',  'col-servicos', 'Contabilidade para Empresas',         '', false, 8),
  ('lnk-s10', 'col-servicos', 'BPO Financeiro',                      '', false, 9)
ON CONFLICT (id) DO NOTHING;
