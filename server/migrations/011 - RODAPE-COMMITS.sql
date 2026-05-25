-- =============================================================================
-- 011 - RODAPE-COMMITS.sql
-- Inicializa as chaves de controle de commits pendentes no rodapé.
-- Garante que usuários existentes não vejam o modal de confirmação de commit
-- ao fazer login pela primeira vez após essa atualização.
-- =============================================================================

-- Insere as chaves de controle somente se não existirem
INSERT INTO rodape_configuracoes (chave, valor)
VALUES
  ('ultimo_commit_inserido',  ''),
  ('ultimo_commit_confirmado', '')
ON CONFLICT (chave) DO NOTHING;

-- Sincroniza ambas as chaves com o mesmo valor vazio,
-- garantindo que não haja diff (pendente = false) até o próximo commit real.
-- Se já existia um valor em ultimo_commit_inserido, sincroniza confirmado com ele.
UPDATE rodape_configuracoes AS conf
SET valor = (
  SELECT valor FROM rodape_configuracoes WHERE chave = 'ultimo_commit_inserido'
), updated_at = NOW()
WHERE conf.chave = 'ultimo_commit_confirmado'
  AND conf.valor = '';
