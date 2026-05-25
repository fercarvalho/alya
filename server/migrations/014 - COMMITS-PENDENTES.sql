-- =============================================================================
-- 014 - COMMITS-PENDENTES.sql
-- Fila de commits pendentes para o superadmin processar em carrossel +
-- estende versao_notificacoes para diferenciar release de aviso de manutenção.
--
-- Antes só rastreávamos `ultimo_commit_inserido` em rodape_configuracoes — se
-- houvesse N commits desde a última vez que o superadmin entrou, só o último
-- aparecia. Agora cada commit detectado pelo hook empilha aqui e o superadmin
-- decide um a um (manter / nova versão / ignorar).
-- =============================================================================

-- Fila de commits a processar
CREATE TABLE IF NOT EXISTS commits_pendentes (
    commit_hash   VARCHAR(50) PRIMARY KEY,
    mensagem      TEXT,
    data          VARCHAR(20),
    detectado_em  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commits_pendentes_detectado
    ON commits_pendentes (detectado_em);

-- Diferencia notificações: 'versao' (release) vs 'aviso' (commit sem nova versão)
ALTER TABLE versao_notificacoes ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'versao';
ALTER TABLE versao_notificacoes ADD COLUMN IF NOT EXISTS versao_referencia VARCHAR(50);

-- Backfill das notificações existentes (caso a migration 013 já tenha rodado)
UPDATE versao_notificacoes
   SET versao_referencia = versao
 WHERE versao_referencia IS NULL;

-- Migração one-shot: se houver `ultimo_commit_inserido` ainda não confirmado,
-- joga ele na fila para não perder na transição. Idempotente.
INSERT INTO commits_pendentes (commit_hash, mensagem, data, detectado_em)
SELECT
    ins.valor,
    COALESCE(msg.valor, ''),
    COALESCE(dt.valor, ''),
    COALESCE(ins.updated_at, NOW())
FROM rodape_configuracoes ins
LEFT JOIN rodape_configuracoes msg ON msg.chave = 'ultimo_commit_msg'
LEFT JOIN rodape_configuracoes dt  ON dt.chave  = 'ultimo_commit_data'
LEFT JOIN rodape_configuracoes cf  ON cf.chave  = 'ultimo_commit_confirmado'
WHERE ins.chave = 'ultimo_commit_inserido'
  AND ins.valor IS NOT NULL AND ins.valor <> ''
  AND (cf.valor IS NULL OR cf.valor <> ins.valor)
ON CONFLICT (commit_hash) DO NOTHING;
