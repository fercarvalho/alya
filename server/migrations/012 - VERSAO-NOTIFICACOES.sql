-- =============================================================================
-- 012 - VERSAO-NOTIFICACOES.sql
-- Tabela para rastrear quais usuários já viram a notificação de nova versão.
-- =============================================================================

-- Tabela de controle de visualização por usuário
CREATE TABLE IF NOT EXISTS versao_notificacoes_vistas (
    user_id     VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    versao      VARCHAR(50) NOT NULL,
    visto_em    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, versao)
);

-- Chaves de configuração da notificação em rodape_configuracoes
-- versao_notificada        → versão a notificar (ex: "2.1")
-- versao_notificada_roles  → JSON array de roles que devem ver (ex: '["admin","user","guest"]')
-- versao_notificada_texto  → texto resumido da novidade (mensagem do commit editada)
INSERT INTO rodape_configuracoes (chave, valor)
VALUES
  ('versao_notificada',       ''),
  ('versao_notificada_roles', '[]'),
  ('versao_notificada_texto', '')
ON CONFLICT (chave) DO NOTHING;
