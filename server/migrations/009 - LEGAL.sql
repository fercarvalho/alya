-- ============================================================
-- Migration 009 - LEGAL
-- Termos de Uso, Política de Privacidade, Cookies e Consentimentos
-- Conformidade com LGPD (Lei 13.709/2018)
-- ============================================================

-- Termos de Uso
CREATE TABLE IF NOT EXISTS termos_uso (
  id SERIAL PRIMARY KEY,
  conteudo TEXT NOT NULL DEFAULT '',
  versao INTEGER DEFAULT 1,
  updated_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Política de Privacidade
CREATE TABLE IF NOT EXISTS politica_privacidade (
  id SERIAL PRIMARY KEY,
  conteudo TEXT NOT NULL DEFAULT '',
  versao INTEGER DEFAULT 1,
  updated_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Configuração do Banner de Cookies
CREATE TABLE IF NOT EXISTS cookie_banner_config (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL DEFAULT 'Política de Cookies',
  texto TEXT NOT NULL DEFAULT '',
  texto_botao_aceitar VARCHAR(100) DEFAULT 'Aceitar Todos',
  texto_botao_rejeitar VARCHAR(100) DEFAULT 'Rejeitar Todos',
  texto_botao_personalizar VARCHAR(100) DEFAULT 'Personalizar',
  texto_descricao_gerenciamento TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categorias de Cookies
CREATE TABLE IF NOT EXISTS cookie_categorias (
  id SERIAL PRIMARY KEY,
  chave VARCHAR(100) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  obrigatorio BOOLEAN DEFAULT FALSE,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Consentimentos LGPD (vinculados ao usuário logado)
-- Armazena o consentimento do usuário para fins de auditoria e conformidade
CREATE TABLE IF NOT EXISTS cookie_consentimentos (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  preferencias JSONB NOT NULL,
  versao_termos INTEGER DEFAULT 1,
  versao_politica INTEGER DEFAULT 1,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);
CREATE INDEX IF NOT EXISTS idx_consentimentos_user ON cookie_consentimentos(user_id);

-- Permissões legais granulares por usuário admin
-- Estrutura: { "termos_uso": true, "politica_privacidade": false, "cookies": true }
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissoes_legais JSONB DEFAULT '{}';

-- Dados padrão para cookie_banner_config
INSERT INTO cookie_banner_config (titulo, texto, texto_botao_aceitar, texto_botao_rejeitar, texto_botao_personalizar, texto_descricao_gerenciamento)
SELECT
  'Política de Cookies e Privacidade',
  'Utilizamos cookies para melhorar sua experiência, analisar o uso do sistema e garantir segurança. Ao continuar, você concorda com nossa Política de Privacidade e Termos de Uso, em conformidade com a LGPD (Lei 13.709/2018).',
  'Aceitar Todos',
  'Rejeitar Todos',
  'Personalizar',
  'Escolha quais tipos de cookies você deseja aceitar. Os cookies necessários são sempre ativados, pois são essenciais para o funcionamento seguro do sistema.'
WHERE NOT EXISTS (SELECT 1 FROM cookie_banner_config LIMIT 1);

-- Categorias de cookies padrão
INSERT INTO cookie_categorias (chave, nome, descricao, ativo, obrigatorio, ordem)
SELECT 'necessary', 'Cookies Necessários', 'Essenciais para o funcionamento e segurança do sistema. Não podem ser desativados.', true, true, 1
WHERE NOT EXISTS (SELECT 1 FROM cookie_categorias WHERE chave = 'necessary');

INSERT INTO cookie_categorias (chave, nome, descricao, ativo, obrigatorio, ordem)
SELECT 'analytics', 'Cookies de Análise', 'Nos ajudam a entender como o sistema é utilizado, coletando informações de forma anônima para melhorar a experiência.', true, false, 2
WHERE NOT EXISTS (SELECT 1 FROM cookie_categorias WHERE chave = 'analytics');

INSERT INTO cookie_categorias (chave, nome, descricao, ativo, obrigatorio, ordem)
SELECT 'preferences', 'Cookies de Preferências', 'Permitem que o sistema lembre suas configurações, como tema (claro/escuro) e preferências de exibição.', true, false, 3
WHERE NOT EXISTS (SELECT 1 FROM cookie_categorias WHERE chave = 'preferences');
