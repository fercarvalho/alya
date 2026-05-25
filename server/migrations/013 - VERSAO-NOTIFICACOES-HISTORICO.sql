-- =============================================================================
-- 013 - VERSAO-NOTIFICACOES-HISTORICO.sql
-- Histórico de notificações de versão. Antes só a última versão era guardada
-- (em 3 chaves de rodape_configuracoes), o que fazia o usuário perder versões
-- intermediárias quando não entrava no sistema entre lançamentos. Agora cada
-- lançamento vira uma linha aqui e o modal exibe todas as pendentes em
-- carrossel.
-- =============================================================================

CREATE TABLE IF NOT EXISTS versao_notificacoes (
    versao     VARCHAR(50) PRIMARY KEY,
    texto      TEXT,
    roles      TEXT,
    criado_em  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_versao_notificacoes_criado
    ON versao_notificacoes (criado_em);

-- Migração one-shot: traz a notificação atual (se houver) das chaves antigas
-- para o histórico. Idempotente: pode rodar várias vezes sem efeito colateral.
INSERT INTO versao_notificacoes (versao, texto, roles, criado_em)
SELECT
    v.valor,
    COALESCE(t.valor, ''),
    COALESCE(r.valor, '[]'),
    COALESCE(v.updated_at, NOW())
FROM rodape_configuracoes v
LEFT JOIN rodape_configuracoes t ON t.chave = 'versao_notificada_texto'
LEFT JOIN rodape_configuracoes r ON r.chave = 'versao_notificada_roles'
WHERE v.chave = 'versao_notificada' AND v.valor IS NOT NULL AND v.valor <> ''
ON CONFLICT (versao) DO NOTHING;
