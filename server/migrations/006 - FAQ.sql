-- ============================================================
-- Migration 006: Sistema de FAQ
-- ============================================================

-- Tabela de perguntas frequentes
CREATE TABLE IF NOT EXISTS faq (
    id VARCHAR(255) PRIMARY KEY,
    pergunta VARCHAR(500) NOT NULL,
    resposta TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_faq_ativo ON faq(ativo);
CREATE INDEX IF NOT EXISTS idx_faq_ordem ON faq(ordem);

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_faq_updated_at ON faq;
CREATE TRIGGER update_faq_updated_at
    BEFORE UPDATE ON faq
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Adicionar módulo FAQ na tabela modules (para ambientes já existentes)
-- Para ambientes novos, o _ensurePgDefaults no database-pg.js cuida disso
INSERT INTO modules (id, name, key, icon, description, is_active, is_system, created_at, updated_at)
VALUES (
    gen_random_uuid()::text,
    'FAQ',
    'faq',
    'HelpCircle',
    'Perguntas Frequentes',
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

-- Adicionar 'faq' no array de módulos de todos os usuários ativos
UPDATE users
SET modules = array_append(modules, 'faq')
WHERE 'faq' != ALL(modules)
  AND is_active = true;

-- ============================================================
-- Perguntas iniciais do FAQ
-- ============================================================
INSERT INTO faq (id, pergunta, resposta, ativo, ordem) VALUES

(gen_random_uuid()::text,
 'Como faço para recuperar minha senha?',
 'Na tela de login, clique em "Esqueci minha senha". Informe o e-mail cadastrado na sua conta e você receberá um link para criar uma nova senha. O link expira em 1 hora.',
 true, 0),

(gen_random_uuid()::text,
 'Como cadastrar uma nova transação?',
 'Acesse o módulo "Transações" no menu superior e clique no botão "+ Nova Transação". Preencha o tipo (Receita ou Despesa), a descrição, o valor, a categoria e a data. Clique em "Salvar" para confirmar.',
 true, 1),

(gen_random_uuid()::text,
 'Como filtrar e buscar transações?',
 'No módulo "Transações" você pode filtrar pelo tipo (Receita/Despesa), pela categoria e por intervalo de datas. Utilize os campos de filtro no topo da lista para combinar os critérios desejados.',
 true, 2),

(gen_random_uuid()::text,
 'Como exportar os dados para PDF?',
 'A maioria dos módulos (Transações, Produtos, Relatórios) possui um botão de exportação. Clique no ícone de download ou no botão "Exportar PDF" para gerar o arquivo com os dados exibidos na tela.',
 true, 3),

(gen_random_uuid()::text,
 'O que é o Dashboard e o que ele exibe?',
 'O Dashboard é a tela inicial do sistema. Ele exibe um resumo da saúde financeira do mês selecionado: total de receitas, despesas, saldo e comparação com as metas definidas. Use o seletor de mês para visualizar outros períodos.',
 true, 4),

(gen_random_uuid()::text,
 'Como funciona o módulo de Metas?',
 'O módulo de Metas permite acompanhar o desempenho financeiro em relação às metas de faturamento definidas. As metas são integradas ao módulo de Projeção e exibem visualmente o quanto foi atingido em cada mês.',
 true, 5),

(gen_random_uuid()::text,
 'O que é o DRE e como utilizá-lo?',
 'O DRE (Demonstrativo de Resultado do Exercício) consolida receitas, despesas e lucro em um único relatório estruturado. Acesse o módulo "DRE" para visualizar o resultado financeiro por período e analisar a lucratividade do negócio.',
 true, 6),

(gen_random_uuid()::text,
 'Como funciona o módulo de Relatórios?',
 'O módulo de Relatórios apresenta análises financeiras com diferentes granularidades: semanal, mensal, trimestral e anual. Você pode comparar o período atual com o anterior e visualizar o detalhamento por categoria de receitas e despesas.',
 true, 7),

(gen_random_uuid()::text,
 'Como cadastrar e gerenciar produtos?',
 'Acesse o módulo "Produtos" e clique em "+ Novo Produto". Preencha nome, categoria, preço, custo e estoque. Você pode filtrar produtos por categoria ou situação de estoque, além de editar e excluir registros existentes.',
 true, 8),

(gen_random_uuid()::text,
 'Como atualizar meu perfil e alterar minha senha?',
 'Clique no seu avatar ou nome no canto superior direito da tela para abrir o menu do usuário. A partir daí você pode editar suas informações pessoais, alterar sua senha e fazer upload de uma foto de perfil.',
 true, 9);
