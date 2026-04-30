/**
 * Seed: Manual do Usuário — Sistema Alya
 * Conteúdo orientado ao uso do sistema, sem detalhes técnicos.
 * Uso: node server/seed-documentation.js
 */

require('dotenv').config({ path: __dirname + '/.env' });
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'alya',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

function id() { return uuidv4(); }
function now() { return new Date().toISOString(); }

async function createSection(title, order, visibility = 'todos') {
  const sectionId = id();
  const ts = now();
  await pool.query(
    `INSERT INTO doc_sections (id, title, ordem, visibility, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $5)
     ON CONFLICT (id) DO NOTHING`,
    [sectionId, title, order, visibility, ts]
  );
  return sectionId;
}

async function createPage(sectionId, title, content, order) {
  const pageId = id();
  const ts = now();
  await pool.query(
    `INSERT INTO doc_pages (id, section_id, title, content, ordem, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     ON CONFLICT (id) DO NOTHING`,
    [pageId, sectionId, title, content, order, ts]
  );
  return pageId;
}

// ============================================================
// SEÇÃO 1: Primeiros Passos  (visibility: todos)
// ============================================================

const s1 = {

  p1: `# Bem-vindo ao Sistema Alya

> O Sistema Alya é a plataforma de gestão financeira da sua empresa. Neste manual você aprende a usar cada funcionalidade de forma prática e objetiva.

## O que você pode fazer no Alya

- **Registrar receitas e despesas** com categorias, datas e descrições
- **Acompanhar produtos e clientes** da sua empresa
- **Definir metas financeiras** e monitorar o progresso em tempo real
- **Visualizar o DRE** (Demonstrativo de Resultado do Exercício) automaticamente
- **Gerar relatórios** por período, categoria e tipo de transação
- **Fazer projeções financeiras** com diferentes cenários
- **Integrar sua loja Nuvemshop** para importar pedidos e clientes automaticamente

## Como este manual está organizado

O manual é dividido em seções por tema. Use o índice lateral (ou o botão **Índice** no celular) para navegar entre as seções e páginas.

> **💡 Dica:** Se você está acessando o Alya pela primeira vez, comece pela próxima página — **Como fazer login** — e siga a ordem das seções.`,

  p2: `# Como Fazer Login

## Acessando o sistema

1. Abra o Sistema Alya no seu navegador (o endereço é fornecido pelo administrador)
2. Na tela de login, informe seu **e-mail** e **senha**
3. Clique em **Entrar**

## Primeiro acesso

Se é seu primeiro acesso, o administrador deve ter criado sua conta e enviado uma senha provisória. Ao entrar pela primeira vez:

1. Use a senha enviada pelo administrador
2. Vá em **Meu Perfil** (ícone de usuário no canto superior direito)
3. Troque sua senha por uma de sua preferência

> **⚠️ Importante:** Use uma senha forte, com letras maiúsculas, minúsculas, números e símbolos. Nunca compartilhe sua senha com outras pessoas.

## Esqueci minha senha

Se você esqueceu sua senha, entre em contato com o administrador do sistema para que ele redefina sua senha de acesso.

## Saindo do sistema

Para sair com segurança, clique no seu nome ou avatar no canto superior direito e selecione **Sair**. Isso encerra sua sessão imediatamente.`,

  p3: `# Navegando pelo Sistema

## A barra de navegação

No topo da tela você encontra a **barra de navegação** com todos os módulos disponíveis. Clique em qualquer ícone para acessar o módulo correspondente.

Os módulos disponíveis dependem das permissões configuradas pelo administrador. Se você não vê um módulo, ele pode estar desativado para o seu perfil.

## Estrutura geral de cada tela

Cada módulo segue uma estrutura parecida:

| Área | Função |
|------|--------|
| **Cabeçalho** | Título do módulo e ações principais (botão Novo, filtros etc.) |
| **Área central** | Tabelas, gráficos ou formulários com os dados |
| **Rodapé** | Informações do sistema, versão e links úteis |

## Usando filtros e buscas

A maioria dos módulos tem uma barra de busca e/ou filtros de período. Basta digitar o que procura ou selecionar o período desejado para que os dados sejam filtrados automaticamente.

## Navegação em dispositivos móveis

No celular, a barra de módulos fica na parte inferior da tela. O botão **Índice** (que aparece ao rolar para baixo nesta tela de documentação) permite navegar entre seções sem precisar voltar ao topo.

> **💡 Dica:** Em telas pequenas, algumas tabelas podem ser roladas horizontalmente. Deslize para o lado para ver todas as colunas.`,

  p4: `# Trocando o Tema (Claro / Escuro)

## Como trocar o tema

O Sistema Alya oferece dois temas visuais: **claro** (padrão) e **escuro**. Para trocar:

1. Localize o ícone de **sol** ☀️ ou **lua** 🌙 na barra de navegação
2. Clique nele para alternar entre os temas

A preferência é salva automaticamente e mantida mesmo depois que você sair e entrar novamente.

## Tema claro

Fundo branco com detalhes em âmbar. Recomendado para ambientes bem iluminados e uso diurno.

## Tema escuro

Fundo escuro com detalhes em âmbar. Recomendado para ambientes com pouca luz e uso noturno, pois reduz o cansaço visual.

> **💡 Dica:** Você também pode trocar o tema dentro de **Meu Perfil**, na opção de preferências visuais.`,
};

// ============================================================
// SEÇÃO 2: Dashboard  (visibility: usuarios)
// ============================================================

const s2 = {

  p1: `# Visão Geral do Dashboard

> O Dashboard é a tela inicial do Alya. Ele concentra os principais indicadores financeiros em um só lugar para que você tenha uma visão rápida da saúde do negócio.

## O que você encontra no Dashboard

- **Cards de resumo** com receita, despesa e saldo do período
- **Gráfico de evolução** de receitas e despesas ao longo do tempo
- **Comparativo** com o período anterior
- **Indicadores de metas** com o progresso atual

## Por que começar pelo Dashboard?

Antes de lançar novos dados, olhar o Dashboard ajuda a:

- Identificar se o mês está no azul ou no vermelho
- Ver se as metas estão sendo atingidas
- Detectar variações incomuns rapidamente

> **💡 Dica:** Se os cards mostrarem valores zerados ou desatualizados, verifique se as transações do período foram lançadas corretamente no módulo de **Transações**.`,

  p2: `# Cards de Resumo Financeiro

## Os três cards principais

No topo do Dashboard você encontra três cards com os totais do período selecionado:

| Card | O que mostra |
|------|-------------|
| **Receita** | Soma de todas as entradas de dinheiro no período |
| **Despesa** | Soma de todas as saídas de dinheiro no período |
| **Saldo** | Receita menos Despesa. Verde = positivo, Vermelho = negativo |

## Indicadores de variação

Abaixo de cada valor você verá uma seta indicando se o número subiu ou caiu em relação ao período anterior:

- 🟢 **Seta para cima** = crescimento em relação ao período anterior
- 🔴 **Seta para baixo** = queda em relação ao período anterior

## Outros cards disponíveis

Dependendo dos módulos ativos, o Dashboard pode exibir também:

- **Número de clientes** ativos
- **Número de transações** no período
- **Progresso da meta** de faturamento

> **💡 Dica:** Passe o mouse sobre os cards para ver detalhes adicionais ou clique neles para ir direto ao módulo relacionado.`,

  p3: `# Selecionando o Período

## Como filtrar por período

No canto superior do Dashboard (e da maioria dos módulos) há um seletor de período. As opções comuns são:

- **Hoje** — somente o dia atual
- **Esta semana** — de segunda-feira até hoje
- **Este mês** — do dia 1 até hoje
- **Mês anterior** — o mês passado completo
- **Este ano** — de janeiro até hoje
- **Período personalizado** — escolha datas de início e fim manualmente

## Impacto do período selecionado

A seleção de período afeta **todos os cards, gráficos e tabelas** exibidos na tela. Sempre verifique qual período está selecionado antes de interpretar os dados.

## Dica de uso

Use **Mês anterior** para comparar com o mês corrente e entender se o negócio está crescendo ou retraindo.

> **💡 Dica:** Em datas próximas ao fechamento do mês (dia 28–31), prefira usar "Este mês" para capturar todas as transações antes do fechamento.`,

  p4: `# Gráficos do Dashboard

## Gráfico de evolução

O gráfico principal mostra a evolução de **receitas** e **despesas** ao longo do período selecionado. As linhas ou barras ajudam a visualizar:

- Meses com maior faturamento
- Períodos de gasto elevado
- Tendência de crescimento ou queda

## Como ler o gráfico

- O **eixo vertical (Y)** mostra os valores em reais (R$)
- O **eixo horizontal (X)** mostra as datas ou meses
- Passe o mouse sobre qualquer ponto para ver o valor exato

## Gráfico de categorias

Alguns dashboards mostram um gráfico de pizza ou barras com a **distribuição por categoria** de despesa, ajudando a identificar onde o dinheiro está sendo gasto.

> **💡 Dica:** Se o gráfico aparecer vazio, certifique-se de que existem transações lançadas no período selecionado.`,
};

// ============================================================
// SEÇÃO 3: Transações  (visibility: usuarios)
// ============================================================

const s3 = {

  p1: `# O que são Transações

> Transações são o coração do Sistema Alya. Todo dinheiro que entra ou sai da empresa deve ser registrado aqui.

## Tipos de transação

| Tipo | Quando usar |
|------|-------------|
| **Receita** | Toda vez que dinheiro entra na empresa: venda, prestação de serviço, recebimento de parcela etc. |
| **Despesa** | Toda vez que dinheiro sai da empresa: fornecedor, aluguel, salário, conta de luz etc. |

## Por que registrar todas as transações?

O Alya só consegue gerar relatórios, DRE e projeções precisos se todas as movimentações financeiras estiverem registradas. Quanto mais completo o registro, mais confiável é a visão do negócio.

## Acesso ao módulo

Clique no ícone **Transações** (💰) na barra de navegação.`,

  p2: `# Registrando uma Nova Transação

## Passo a passo

1. No módulo de Transações, clique no botão **+ Nova Transação**
2. Preencha os campos do formulário:

| Campo | O que preencher |
|-------|----------------|
| **Tipo** | Receita ou Despesa |
| **Valor** | O valor em reais (use ponto ou vírgula para centavos) |
| **Data** | A data em que ocorreu (ou ocorrerá) a transação |
| **Categoria** | Classifique a transação (ex.: Vendas, Aluguel, Salários) |
| **Descrição** | Um texto livre para identificar a transação |
| **Cliente** *(opcional)* | Vincule a transação a um cliente cadastrado |
| **Produto** *(opcional)* | Vincule a transação a um produto do catálogo |

3. Clique em **Salvar**

## Dicas ao preencher

- Use **categorias consistentes** — isso impacta diretamente a qualidade dos relatórios
- A **data** deve ser a data real do evento, não a data em que você está lançando
- Se a transação for recorrente (ex.: aluguel mensal), considere usar o recurso de **repetição** se disponível

> **⚠️ Atenção:** Após salvar, a transação afeta imediatamente os totais do Dashboard, DRE e Relatórios.`,

  p3: `# Visualizando e Filtrando Transações

## A lista de transações

Ao acessar o módulo de Transações, você verá uma lista com todas as transações do período selecionado. As colunas mostram:

- **Data** — quando ocorreu
- **Descrição** — o texto que você informou
- **Categoria** — a classificação
- **Tipo** — Receita (verde) ou Despesa (vermelho)
- **Valor** — o montante em reais

## Filtrando as transações

Use os filtros disponíveis para encontrar exatamente o que precisa:

- **Período** — selecione o intervalo de datas
- **Tipo** — mostrar só receitas, só despesas ou ambas
- **Categoria** — filtrar por uma categoria específica
- **Busca por texto** — pesquise pela descrição ou cliente

## Ordenando a lista

Clique no cabeçalho de qualquer coluna para ordenar a lista por aquele campo. Clique novamente para inverter a ordem.

> **💡 Dica:** Para ver todas as transações de um determinado cliente, use o filtro de busca com o nome do cliente.`,

  p4: `# Editando e Excluindo Transações

## Editando uma transação

1. Na lista de transações, localize a transação que deseja editar
2. Clique no ícone de **lápis** ✏️ (ou no menu de ações) na linha correspondente
3. Altere os campos necessários no formulário
4. Clique em **Salvar**

## Excluindo uma transação

1. Localize a transação na lista
2. Clique no ícone de **lixeira** 🗑️
3. Confirme a exclusão na janela de confirmação

> **⚠️ Atenção:** A exclusão de uma transação é **irreversível**. Os totais do Dashboard e relatórios serão atualizados imediatamente.

## Quando editar vs. excluir

- **Edite** quando houver um erro de valor, data ou categoria, mas a transação realmente aconteceu
- **Exclua** apenas quando a transação foi registrada por engano e não aconteceu de fato`,

  p5: `# Categorias de Transação

## O que são categorias?

Categorias são rótulos que você atribui a cada transação para classificar e organizar as movimentações financeiras. Elas são fundamentais para gerar relatórios úteis e um DRE preciso.

## Exemplos de categorias comuns

**Receitas:**
- Vendas de produtos
- Prestação de serviços
- Receitas financeiras
- Outras receitas

**Despesas:**
- Fornecedores
- Salários e encargos
- Aluguel
- Marketing e publicidade
- Contas de consumo (luz, água, internet)
- Impostos e taxas
- Outras despesas

## Boas práticas

- Seja consistente: use sempre o mesmo nome para a mesma categoria
- Não crie categorias demais — isso dificulta a análise
- Evite categorias genéricas como "Outros" para a maioria das transações; guarde-as para casos realmente excepcionais

> **💡 Dica:** As categorias criadas aqui aparecem automaticamente nos filtros de Relatórios e nas seções do DRE.`,
};

// ============================================================
// SEÇÃO 4: Produtos  (visibility: usuarios)
// ============================================================

const s4 = {

  p1: `# Gerenciando Produtos

> O módulo de Produtos permite manter um catálogo com todos os itens que sua empresa vende ou utiliza. Produtos cadastrados podem ser vinculados às transações, facilitando o controle de receita por item.

## Acessando o módulo

Clique no ícone **Produtos** (📦) na barra de navegação.

## O que você vê na tela

A lista de produtos mostra:

- **Nome** do produto
- **Código** / SKU (se cadastrado)
- **Preço de venda**
- **Estoque** atual (se o controle de estoque estiver ativo)
- **Status** — ativo ou inativo`,

  p2: `# Adicionando um Novo Produto

## Passo a passo

1. No módulo de Produtos, clique em **+ Novo Produto**
2. Preencha as informações:

| Campo | Descrição |
|-------|-----------|
| **Nome** | Nome do produto como aparece na venda |
| **Código / SKU** | Código interno de identificação *(opcional)* |
| **Preço de venda** | Valor pelo qual o produto é vendido |
| **Custo** | Custo de aquisição ou produção *(opcional)* |
| **Descrição** | Detalhes adicionais sobre o produto *(opcional)* |
| **Estoque atual** | Quantidade em estoque no momento do cadastro |

3. Clique em **Salvar**

## Vinculando produtos a transações

Ao lançar uma **transação de receita**, você pode vincular um produto no campo "Produto". Isso permite rastrear o faturamento por item e ajuda na análise de quais produtos geram mais receita.`,

  p3: `# Editando e Desativando Produtos

## Editando um produto

1. Na lista de produtos, clique no ícone de **lápis** ✏️ ao lado do produto
2. Atualize as informações necessárias
3. Clique em **Salvar**

## Desativando um produto

Em vez de excluir um produto que não é mais vendido (para manter o histórico de transações), você pode **desativá-lo**:

1. Abra o produto para edição
2. Altere o **Status** para "Inativo"
3. Salve

Produtos inativos não aparecem nas listas de seleção ao criar transações, mas continuam aparecendo no histórico de lançamentos anteriores.

## Excluindo um produto

A exclusão definitiva só é recomendada para produtos cadastrados por engano que ainda não possuem transações vinculadas. Se o produto já foi utilizado em transações, prefira desativá-lo.

> **⚠️ Atenção:** Excluir um produto que possui transações vinculadas pode afetar relatórios históricos.`,
};

// ============================================================
// SEÇÃO 5: Clientes  (visibility: usuarios)
// ============================================================

const s5 = {

  p1: `# Gerenciando Clientes

> O módulo de Clientes mantém uma base de dados com informações dos seus compradores. Clientes cadastrados podem ser vinculados a transações, facilitando a análise de receita por cliente.

## Acessando o módulo

Clique no ícone **Clientes** (👥) na barra de navegação.

## O que você vê na tela

A lista de clientes exibe:

- **Nome** do cliente
- **E-mail**
- **Telefone**
- **Origem** — se foi importado da Nuvemshop ou cadastrado manualmente
- **Data de cadastro**`,

  p2: `# Adicionando um Novo Cliente

## Passo a passo

1. No módulo de Clientes, clique em **+ Novo Cliente**
2. Preencha as informações:

| Campo | Descrição |
|-------|-----------|
| **Nome** | Nome completo ou razão social |
| **E-mail** | Endereço de e-mail para contato |
| **Telefone** | Número com DDD |
| **Documento** | CPF ou CNPJ *(opcional)* |
| **Endereço** | Logradouro, cidade e estado *(opcional)* |
| **Observações** | Anotações internas sobre o cliente *(opcional)* |

3. Clique em **Salvar**

## Clientes importados da Nuvemshop

Se você tem a integração com a Nuvemshop ativa, os clientes que realizaram compras na sua loja são **importados automaticamente**. Não é necessário cadastrá-los manualmente.`,

  p3: `# Buscando e Filtrando Clientes

## Busca por nome ou e-mail

Use a barra de busca no topo da lista para encontrar um cliente pelo nome ou e-mail. A busca é instantânea enquanto você digita.

## Filtrando por origem

Você pode filtrar para ver:

- **Todos os clientes**
- Apenas clientes **cadastrados manualmente**
- Apenas clientes **importados da Nuvemshop**

## Visualizando o histórico de um cliente

Clique no nome de qualquer cliente para abrir o perfil completo, onde você pode ver:

- Dados de contato
- Histórico de transações vinculadas a ele
- Total comprado no período

> **💡 Dica:** Vincule clientes às transações de receita para poder analisar quais clientes geram mais faturamento.`,

  p4: `# Editando e Excluindo Clientes

## Editando um cliente

1. Clique no ícone de **lápis** ✏️ ao lado do cliente
2. Atualize as informações
3. Clique em **Salvar**

## Excluindo um cliente

1. Clique no ícone de **lixeira** 🗑️ ao lado do cliente
2. Confirme a exclusão

> **⚠️ Atenção:** Se o cliente tiver transações vinculadas, a exclusão pode remover a associação dessas transações com o cliente. O histórico financeiro permanece, mas sem o vínculo com o nome do cliente.

## Mesclando duplicatas

Se um cliente foi cadastrado mais de uma vez (manualmente e via Nuvemshop, por exemplo), entre em contato com o administrador para realizar a mesclagem dos registros.`,
};

// ============================================================
// SEÇÃO 6: Metas  (visibility: usuarios)
// ============================================================

const s6 = {

  p1: `# Entendendo as Metas

> O módulo de Metas permite definir objetivos financeiros para a empresa (como uma meta de faturamento mensal) e acompanhar o progresso em tempo real conforme as transações são lançadas.

## Para que servem as metas?

- Motivar a equipe com um objetivo claro e visível
- Acompanhar em tempo real se o faturamento está no caminho certo
- Comparar meses ou períodos diferentes

## Como o progresso é calculado?

O sistema soma automaticamente todas as **transações de receita** do período da meta e compara com o valor-alvo. Você não precisa atualizar o progresso manualmente.

## Acessando o módulo

Clique no ícone **Metas** (🎯) na barra de navegação.`,

  p2: `# Criando uma Nova Meta

## Passo a passo

1. No módulo de Metas, clique em **+ Nova Meta**
2. Preencha as informações:

| Campo | Descrição |
|-------|-----------|
| **Título** | Nome da meta (ex.: "Faturamento — Outubro 2025") |
| **Valor-alvo** | O valor em reais que você quer atingir |
| **Período início** | Data de início da meta |
| **Período fim** | Data de encerramento da meta |
| **Descrição** *(opcional)* | Contexto ou observações sobre a meta |

3. Clique em **Salvar**

A meta passa a aparecer na lista e o progresso é calculado automaticamente.

> **💡 Dica:** Crie metas mensais para acompanhar o desempenho mês a mês. O Dashboard mostrará a meta ativa do mês atual.`,

  p3: `# Acompanhando o Progresso das Metas

## Barra de progresso

Cada meta exibe uma **barra de progresso** colorida:

- 🟢 **Verde** — meta atingida ou próxima de ser atingida (acima de 80%)
- 🟡 **Amarelo** — progresso moderado (entre 50% e 80%)
- 🔴 **Vermelho** — progresso baixo (abaixo de 50%)

## Informações exibidas

Para cada meta você vê:

- **Valor atingido** até o momento
- **Valor restante** para completar a meta
- **Percentual** de conclusão
- **Dias restantes** até o fim do período

## Meta no Dashboard

A meta do mês atual aparece automaticamente como um card no Dashboard, permitindo acompanhar o progresso sem precisar entrar no módulo de Metas.

> **💡 Dica:** Metas já encerradas ficam marcadas como "Concluída" (se atingiu o valor) ou "Não atingida" (se terminou o período abaixo da meta).`,
};

// ============================================================
// SEÇÃO 7: DRE  (visibility: usuarios)
// ============================================================

const s7 = {

  p1: `# O que é o DRE

> O DRE (Demonstrativo de Resultado do Exercício) é um relatório que resume todas as receitas e despesas de um período, mostrando se a empresa teve **lucro** ou **prejuízo**.

## Por que o DRE é importante?

O DRE é a principal ferramenta para entender a **saúde financeira** da empresa. Ele responde perguntas como:

- A empresa está lucrando?
- Quais categorias de despesa consomem mais?
- A receita cresceu em relação ao período anterior?

## Como o DRE é gerado?

O DRE no Alya é **gerado automaticamente** a partir das transações lançadas. Não é necessário preencher nada — basta manter as transações atualizadas.

## Acessando o módulo

Clique no ícone **DRE** (📋) na barra de navegação.`,

  p2: `# Lendo o Demonstrativo

## Estrutura do DRE

O demonstrativo é organizado em blocos:

| Bloco | O que contém |
|-------|-------------|
| **Receita Bruta** | Soma de todas as entradas do período |
| **Deduções** | Devoluções, descontos e impostos sobre receita *(se aplicável)* |
| **Receita Líquida** | Receita Bruta menos Deduções |
| **Custo dos Produtos/Serviços** | Custos diretamente ligados à venda |
| **Lucro Bruto** | Receita Líquida menos Custos |
| **Despesas Operacionais** | Gastos do dia a dia (administrativo, marketing, salários etc.) |
| **Resultado Operacional** | Lucro Bruto menos Despesas Operacionais |
| **Resultado Líquido** | Resultado final do período |

## Cores no DRE

- 🟢 **Verde** — valores positivos (lucro, receita)
- 🔴 **Vermelho** — valores negativos (prejuízo, despesa)

> **💡 Dica:** Se o **Resultado Líquido** estiver em vermelho, a empresa gastou mais do que recebeu no período. Isso não significa necessariamente um problema — investi­mentos pontuais podem causar isso — mas deve ser analisado com atenção.`,

  p3: `# Selecionando o Período e Comparativos

## Escolhendo o período do DRE

No topo do módulo, use o seletor de período para ver o DRE de:

- Um mês específico
- Um trimestre
- Um semestre
- Um ano completo
- Um período personalizado

## Comparativo com período anterior

O DRE exibe uma coluna de comparativo mostrando a **variação** em relação ao período anterior. Isso facilita identificar se as receitas cresceram e se as despesas estão sob controle.

- **▲ (seta para cima)** = aumento em relação ao período anterior
- **▼ (seta para baixo)** = redução em relação ao período anterior

## Analisando por categoria

Clique em qualquer linha do DRE para expandir e ver as **transações individuais** que compõem aquele valor. Isso é útil para rastrear uma despesa específica ou conferir o que compõe a receita.`,

  p4: `# Exportando o DRE

## Formatos disponíveis

O DRE pode ser exportado nos seguintes formatos:

- **PDF** — ideal para compartilhar com sócios, investidores ou contador
- **Excel / CSV** — ideal para importar em planilhas e fazer análises adicionais

## Como exportar

1. Selecione o período desejado
2. Clique no botão **Exportar** no canto superior direito
3. Escolha o formato (PDF ou Excel)
4. O arquivo será baixado automaticamente para o seu computador

## Dicas para compartilhar o DRE

- O **PDF** preserva a formatação e é mais adequado para apresentações
- O **Excel/CSV** é mais útil se você precisa editar os dados ou cruzar com outras planilhas

> **💡 Dica:** Guarde os PDFs mensais do DRE em uma pasta organizada por ano. Isso facilita a prestação de contas e a análise histórica.`,
};

// ============================================================
// SEÇÃO 8: Relatórios  (visibility: usuarios)
// ============================================================

const s8 = {

  p1: `# Visão Geral dos Relatórios

> O módulo de Relatórios permite gerar análises detalhadas das movimentações financeiras com diferentes filtros e agrupamentos.

## Para que serve?

Enquanto o DRE mostra o resultado consolidado, os **Relatórios** permitem:

- Ver transações detalhadas com todos os campos
- Filtrar por categoria, tipo, cliente ou produto
- Agrupar os dados de diferentes formas
- Exportar listas para Excel

## Acessando o módulo

Clique no ícone **Relatórios** (📊) na barra de navegação.

## Tipos de relatório disponíveis

| Relatório | O que mostra |
|-----------|-------------|
| **Transações** | Lista detalhada de todas as movimentações do período |
| **Por categoria** | Totais agrupados por categoria de receita ou despesa |
| **Por cliente** | Faturamento agrupado por cliente |
| **Por produto** | Receita agrupada por produto vendido |
| **Fluxo de caixa** | Entradas e saídas organizadas cronologicamente |`,

  p2: `# Gerando e Filtrando Relatórios

## Passo a passo

1. Acesse o módulo de **Relatórios**
2. Selecione o **tipo de relatório** que deseja gerar
3. Defina o **período** (datas de início e fim)
4. Aplique filtros adicionais se necessário:
   - **Tipo**: Receitas, Despesas ou Ambos
   - **Categoria**: uma ou mais categorias específicas
   - **Cliente**: filtra transações de um cliente
   - **Produto**: filtra transações de um produto
5. Clique em **Gerar Relatório**

## Lendo os resultados

Os resultados aparecem em tabela com totalizadores ao final. Você pode:

- **Ordenar** as colunas clicando no cabeçalho
- **Expandir** linhas para ver detalhes adicionais
- **Exportar** o resultado para Excel ou PDF

> **💡 Dica:** Use o relatório "Por categoria" para identificar as principais fontes de receita e os maiores centros de custo da empresa.`,

  p3: `# Exportando Relatórios

## Como exportar

1. Gere o relatório com os filtros desejados
2. Clique em **Exportar** no canto superior direito da tabela
3. Escolha o formato:
   - **PDF** — formatado para impressão e apresentação
   - **Excel / CSV** — para edição e análise em planilhas

## Dicas de exportação

- Sempre confira os filtros aplicados antes de exportar — eles aparecem no cabeçalho do arquivo exportado
- Relatórios em Excel podem ser importados diretamente em softwares de contabilidade

## Compartilhando com o contador

Se você usa o Alya para gestão financeira e tem um contador externo, exporte mensalmente:

1. **DRE do mês** em PDF
2. **Relatório de transações** do mês em Excel

Esses dois documentos contêm todas as informações necessárias para a contabilidade.`,
};

// ============================================================
// SEÇÃO 9: Projeção Financeira  (visibility: usuarios)
// ============================================================

const s9 = {

  p1: `# Entendendo a Projeção Financeira

> A Projeção Financeira permite simular como o faturamento e os custos da empresa devem evoluir ao longo dos próximos meses, com base em diferentes cenários de crescimento.

## Para que serve?

- Planejar o crescimento para o próximo ano
- Simular diferentes cenários (otimista, realista, conservador)
- Identificar antecipadamente meses com risco de déficit
- Embasar decisões de investimento

## Como a projeção funciona?

A projeção parte dos **dados históricos** de transações já lançadas no sistema e aplica os **percentuais de crescimento** que você define para cada mês ou categoria.

## Acessando o módulo

Clique no ícone **Projeção** (📈) na barra de navegação.`,

  p2: `# Configurando a Projeção

## Definindo o período

1. No módulo de Projeção, selecione o **ano** ou **período** que deseja projetar
2. O sistema carregará automaticamente os dados históricos do período anterior equivalente

## Definindo percentuais de crescimento

Para cada categoria de receita e despesa, você pode definir:

- **Percentual de crescimento** — quanto espera que esse valor aumente (ex.: +10%)
- **Percentual de redução** — quanto espera que esse valor diminua (ex.: -5%)
- **Valor fixo** — para despesas que não variam (ex.: aluguel de R$ 3.000/mês)

## Cenários

Você pode salvar diferentes configurações como **cenários**:

| Cenário | Quando usar |
|---------|-------------|
| **Conservador** | Crescimento baixo, mais cautela |
| **Realista** | Expectativa mais provável |
| **Otimista** | Melhor caso possível |

> **💡 Dica:** Comece pelo cenário realista com base em tendências dos últimos 3–6 meses. Use os outros cenários para planejar riscos e oportunidades.`,

  p3: `# Interpretando os Resultados da Projeção

## O gráfico de projeção

O resultado da projeção é exibido em um gráfico de barras ou linhas mostrando:

- **Receita projetada** por mês
- **Despesa projetada** por mês
- **Resultado projetado** (lucro ou prejuízo esperado)

## Tabela de projeção mensal

Abaixo do gráfico, uma tabela detalha mês a mês:

| Coluna | O que significa |
|--------|----------------|
| **Mês** | O mês projetado |
| **Receita** | Faturamento esperado |
| **Despesa** | Custos esperados |
| **Resultado** | Diferença (lucro/prejuízo esperado) |
| **Acumulado** | Saldo acumulado desde o início do período |

## O que fazer com os resultados?

- Meses com resultado negativo projetado indicam necessidade de **reserva financeira** ou **redução de custos**
- Meses com resultado muito positivo são boas oportunidades para **investimento ou antecipação de pagamentos**

> **⚠️ Importante:** A projeção é uma estimativa baseada em dados históricos e percentuais que você definiu. Atualize os percentuais regularmente conforme o cenário do negócio muda.`,
};

// ============================================================
// SEÇÃO 10: Nuvemshop  (visibility: usuarios)
// ============================================================

const s10 = {

  p1: `# Integração com a Nuvemshop

> Se você possui uma loja virtual na Nuvemshop, o Sistema Alya pode se integrar a ela para importar pedidos como transações e sincronizar clientes automaticamente.

## O que é sincronizado?

| Dado | O que acontece no Alya |
|------|----------------------|
| **Pedidos pagos** | Importados como transações de receita |
| **Clientes** | Importados para a base de clientes |
| **Saldo pendente** | Exibido separadamente até a liquidação |

## Pré-requisito

Você precisa ter uma **conta ativa na Nuvemshop** e acesso às configurações da loja para obter as credenciais de integração (chave de API).

## Acessando a integração

Clique no ícone **Nuvemshop** (🛍️) na barra de navegação.`,

  p2: `# Conectando sua Loja

## Passo a passo

1. Acesse o módulo **Nuvemshop** no Alya
2. Clique em **Conectar Loja**
3. Informe o **User ID** e a **Access Token** da sua loja Nuvemshop

   > Para encontrar essas informações, acesse o painel da sua loja Nuvemshop em **Configurações → Aplicativos → Credenciais de API**.

4. Clique em **Salvar e Conectar**
5. O sistema validará as credenciais e iniciará a primeira sincronização

## Primeira sincronização

Na primeira conexão, o Alya importará os **pedidos dos últimos 30 dias**. Pedidos mais antigos não são importados automaticamente (consulte o administrador se precisar de um histórico maior).

> **💡 Dica:** Após conectar, os novos pedidos são sincronizados automaticamente via webhook — você não precisa fazer nada para que os pedidos futuros apareçam no Alya.`,

  p3: `# Entendendo o Saldo Pendente

## O que é o saldo pendente?

O **saldo pendente** representa o valor de pedidos pagos pelos clientes na Nuvemshop que ainda **não foram transferidos** para a conta bancária da empresa.

Isso acontece porque a Nuvemshop retém os valores por alguns dias antes de liberar o pagamento.

## Como aparece no Alya

No módulo Nuvemshop, você verá:

- **Saldo disponível** — já liberado e pronto para saque
- **Saldo retido** — ainda em processamento
- **Total pendente** — soma dos dois

## Registrando um saque

Quando a Nuvemshop libera o dinheiro e você o transfere para a conta bancária:

1. No módulo Nuvemshop, clique em **Registrar Saque**
2. Informe o **valor** e a **data** do saque
3. O sistema criará automaticamente uma transação de receita referente ao saque

> **⚠️ Atenção:** Não registre os pedidos da Nuvemshop como receita duas vezes — os pedidos já são importados como transações. Use o "Registrar Saque" apenas para controle de fluxo de caixa.`,

  p4: `# Sincronização e Desconexão

## Sincronização automática

Após conectar a loja, os novos pedidos são enviados ao Alya em tempo real via **webhook**. Você não precisa fazer nada manualmente.

## Sincronização manual

Se perceber que algum pedido não foi importado, use o botão **Sincronizar Agora** no módulo Nuvemshop para forçar uma sincronização dos últimos pedidos.

## Verificando o status da integração

Na tela principal do módulo você verá:

- ✅ **Conectado** — a integração está funcionando normalmente
- ⚠️ **Erro de conexão** — as credenciais podem ter expirado ou sido alteradas

Se aparecer erro, tente reconectar informando as credenciais novamente.

## Desconectando a loja

1. No módulo Nuvemshop, clique em **Configurações**
2. Clique em **Desconectar Loja**
3. Confirme a ação

> **⚠️ Atenção:** Desconectar a loja **não** apaga as transações e clientes já importados. Apenas interrompe a sincronização futura.`,
};

// ============================================================
// SEÇÃO 11: Meu Perfil  (visibility: usuarios)
// ============================================================

const s11 = {

  p1: `# Seu Perfil de Usuário

> Em "Meu Perfil" você pode atualizar seus dados pessoais, alterar a senha de acesso e definir preferências visuais.

## Acessando o perfil

Clique no seu **nome** ou **avatar** no canto superior direito da tela e selecione **Meu Perfil**.

## O que você pode fazer aqui

- Atualizar **nome** e **e-mail**
- Alterar a **senha de acesso**
- Trocar o **tema** (claro ou escuro)
- Ver informações sobre sua **conta e permissões**`,

  p2: `# Atualizando seus Dados

## Alterando nome e e-mail

1. Acesse **Meu Perfil**
2. Clique em **Editar Perfil** ou diretamente no campo que deseja alterar
3. Atualize as informações
4. Clique em **Salvar**

> **⚠️ Atenção:** Se você alterar o e-mail, precisará usar o novo endereço no próximo login.

## Alterando a senha

1. Na tela de perfil, clique em **Alterar Senha**
2. Informe a **senha atual**
3. Informe a **nova senha**
4. Confirme a nova senha digitando-a novamente
5. Clique em **Salvar**

**Requisitos para a nova senha:**
- Mínimo de 8 caracteres
- Pelo menos uma letra maiúscula
- Pelo menos um número
- Recomendado: incluir um símbolo especial (!, @, #, etc.)

> **💡 Dica:** Troque sua senha periodicamente e nunca anote-a em locais visíveis ou a compartilhe com outras pessoas.`,

  p3: `# Preferências Visuais e Informações da Conta

## Tema claro / escuro

No seu perfil, você pode definir a preferência de tema:

1. Localize a opção **Tema**
2. Selecione **Claro** ou **Escuro**
3. A mudança é aplicada imediatamente e salva para os próximos acessos

Você também pode trocar o tema a qualquer momento pelo ícone ☀️/🌙 na barra de navegação.

## Informações da conta

Na parte inferior do perfil, você encontra informações somente leitura:

| Campo | O que mostra |
|-------|-------------|
| **Perfil de acesso** | Seu nível de permissão (ex.: Usuário, Admin) |
| **Membro desde** | Data de criação da sua conta |
| **Último acesso** | Data e hora do acesso mais recente |
| **Módulos disponíveis** | Quais módulos estão liberados para o seu perfil |

> **💡 Dica:** Se você precisar de acesso a um módulo que não aparece na sua barra de navegação, solicite ao administrador do sistema.`,
};

// ============================================================
// SEÇÃO 12: FAQ e Suporte  (visibility: todos)
// ============================================================

const s12 = {

  p1: `# Usando o FAQ

> O FAQ (Perguntas Frequentes) concentra as dúvidas mais comuns sobre o uso do sistema em um formato de perguntas e respostas.

## Acessando o FAQ

Clique no ícone **FAQ** (❓) na barra de navegação.

## Como navegar pelo FAQ

As perguntas são organizadas por categorias. Você pode:

- Navegar pelas categorias para encontrar o tema da sua dúvida
- Usar a **busca** para procurar por palavras-chave
- Clicar em uma pergunta para expandir a resposta

## Se não encontrar a resposta

Caso sua dúvida não esteja no FAQ, você pode:

1. Enviar um **feedback** (veja a próxima seção)
2. Entrar em contato com o administrador do sistema
3. Consultar esta **Documentação** para detalhes mais aprofundados`,

  p2: `# Enviando Feedback

> O Feedback é o canal para você comunicar problemas, sugerir melhorias ou enviar qualquer mensagem para a equipe responsável pelo sistema.

## Como enviar um feedback

1. Clique no ícone **Feedback** (💬) na barra de navegação
2. Selecione o **tipo** de feedback:
   - 🐛 **Bug** — algo não está funcionando corretamente
   - 💡 **Sugestão** — uma ideia de melhoria
   - 💬 **Elogio / Comentário geral**
3. Descreva detalhadamente o problema ou sugestão
4. Clique em **Enviar**

## Dicas para um bom feedback de bug

- Descreva **o que você estava fazendo** quando o problema ocorreu
- Mencione **o que esperava acontecer** e **o que aconteceu de fato**
- Se possível, informe em qual módulo e em qual tela o problema apareceu

> **💡 Dica:** Feedbacks bem descritos são resolvidos muito mais rapidamente. Quanto mais detalhes, melhor!`,

  p3: `# Versão do Sistema e Rodapé

## Verificando a versão

No **rodapé** da tela (parte inferior) você encontra informações sobre a versão atual do sistema Alya que está sendo executada.

Isso é útil quando você entra em contato com suporte, pois a equipe técnica pode precisar saber a versão exata para diagnosticar problemas.

## Informações do rodapé

O rodapé do sistema exibe:

- **Nome do sistema** e versão
- **Links úteis** (se configurados pelo administrador)
- **Informações da empresa** (se configuradas)

## Por que a versão importa?

Novas versões do sistema trazem correções de bugs e funcionalidades novas. Se você reportar um problema, mencione sempre a versão exibida no rodapé.`,
};

// ============================================================
// SEÇÃO 13: Roadmap  (visibility: todos)
// ============================================================

const s13 = {

  p1: `# O que é o Roadmap

> O Roadmap mostra as funcionalidades e melhorias planejadas para o Sistema Alya, organizadas por status e prioridade.

## Por que consultar o Roadmap?

- Saber o que está sendo desenvolvido
- Verificar se uma funcionalidade que você precisa já está planejada
- Acompanhar o progresso de melhorias prometidas

## Acessando o Roadmap

Clique no ícone **Roadmap** (🗺️) na barra de navegação.`,

  p2: `# Lendo o Roadmap

## Status dos itens

Cada item do Roadmap tem um status que indica em que etapa ele está:

| Status | Significado |
|--------|-------------|
| 💡 **Planejado** | A funcionalidade está no plano, mas o desenvolvimento ainda não começou |
| 🔧 **Em desenvolvimento** | Está sendo construído agora |
| 🧪 **Em testes** | Desenvolvido, sendo validado antes de lançar |
| ✅ **Concluído** | Já disponível no sistema |

## Prioridades

Os itens também podem ter uma prioridade indicada:

- 🔴 **Alta** — urgente ou muito importante
- 🟡 **Média** — relevante mas não urgente
- 🟢 **Baixa** — desejável, será feito quando possível

## Sugerindo funcionalidades

Se você tem uma ideia de melhoria que não está no Roadmap, envie um **Feedback** com o tipo "Sugestão". A equipe avalia sugestões periodicamente para incluir no planejamento.

> **💡 Dica:** Funcionalidades com muitos votos ou pedidos recorrentes tendem a subir de prioridade. Use o Feedback para reforçar uma demanda que já está no Roadmap.`,
};

// ============================================================
// SEÇÃO 14: Administração  (visibility: admins)
// ============================================================

const s14 = {

  p1: `# Visão Geral do Painel Administrativo

> Esta seção é visível somente para administradores do sistema.

## Acessando o painel admin

Na barra de navegação, clique em **Admin** (🔧). O painel se divide em abas:

- **Usuários** — gerenciar contas de acesso
- **Módulos** — ativar/desativar funcionalidades
- **FAQ** — gerenciar as perguntas frequentes
- **Feedback** — visualizar e responder feedbacks
- **Logs** — auditoria de atividades
- **Estatísticas** — visão geral do uso do sistema
- **Documentação** — editar este manual
- **Roadmap** — gerenciar os itens do roadmap

> **⚠️ Atenção:** Ações no painel admin afetam todos os usuários. Use com cautela e certeza.`,

  p2: `# Gerenciando Usuários

## Visualizando usuários

Na aba **Usuários**, você vê todos os usuários cadastrados com:

- Nome e e-mail
- Perfil de acesso (Admin ou Usuário)
- Status (ativo ou inativo)
- Data do último acesso

## Criando um novo usuário

1. Clique em **+ Novo Usuário**
2. Preencha nome, e-mail e defina um perfil de acesso
3. Defina uma senha provisória
4. Clique em **Salvar**

O usuário receberá as credenciais e deverá trocar a senha no primeiro acesso.

## Editando um usuário

Clique no ícone de lápis ✏️ ao lado do usuário para:

- Atualizar nome e e-mail
- Alterar o perfil de acesso
- Redefinir a senha
- Ativar ou desativar a conta

## Desativando uma conta

Em vez de excluir um usuário que não acessa mais o sistema, prefira **desativar** a conta. Isso preserva o histórico de atividades vinculado àquele usuário.`,

  p3: `# Gerenciando Módulos

## O que são módulos?

Cada funcionalidade do Sistema Alya (Transações, Clientes, Metas etc.) é um **módulo** que pode ser ativado ou desativado por usuário ou globalmente.

## Ativando e desativando módulos

1. Na aba **Módulos**, você vê a lista de módulos disponíveis
2. Use o toggle (chave) ao lado de cada módulo para ativar ou desativar
3. A mudança tem efeito imediato para todos os usuários

## Controle por usuário

Alguns módulos podem ser liberados individualmente por usuário:

1. Vá à aba **Usuários** e abra o perfil do usuário
2. Na seção de módulos, ative ou desative cada módulo individualmente

Isso permite que diferentes membros da equipe tenham acesso apenas ao que precisam.

> **💡 Dica:** Desativar módulos que não são usados deixa a interface mais limpa e reduz a chance de lançamentos incorretos.`,

  p4: `# Gerenciando o FAQ

## Adicionando uma pergunta ao FAQ

1. Na aba **FAQ** do painel admin, clique em **+ Nova Pergunta**
2. Preencha:
   - **Categoria** — agrupe perguntas relacionadas
   - **Pergunta** — o texto da dúvida
   - **Resposta** — a resposta completa (suporta formatação em markdown)
3. Clique em **Salvar**

## Editando e reordenando

- Clique no lápis ✏️ para editar uma pergunta existente
- Arraste as perguntas para reordenar dentro da mesma categoria

## Boas práticas para o FAQ

- Escreva perguntas na **perspectiva do usuário** ("Como faço para...?", "Por que...?")
- Mantenha as respostas **objetivas e diretas**
- Agrupe perguntas relacionadas na mesma categoria
- Revise o FAQ periodicamente para remover perguntas desatualizadas`,

  p5: `# Gerenciando Feedbacks

## Visualizando feedbacks

Na aba **Feedback**, você vê todos os feedbacks enviados pelos usuários com:

- Tipo (Bug, Sugestão, Comentário)
- Descrição
- Usuário que enviou
- Data de envio
- Status (Novo, Em análise, Resolvido, Arquivado)

## Respondendo a um feedback

1. Clique no feedback para abrir os detalhes
2. Escreva uma resposta no campo de resposta
3. Atualize o **status** conforme apropriado
4. Clique em **Salvar**

## Gerenciando o status

| Status | Quando usar |
|--------|-------------|
| **Novo** | Recém recebido, ainda não analisado |
| **Em análise** | Sendo investigado ou considerado |
| **Resolvido** | Bug corrigido ou sugestão implementada |
| **Arquivado** | Não será resolvido ou é inválido |

> **💡 Dica:** Responder aos feedbacks mostra à equipe que as sugestões são levadas a sério e incentiva mais contribuições.`,

  p6: `# Log de Atividades

## O que é o log de atividades?

O log registra **todas as ações relevantes** realizadas no sistema, como:

- Criação, edição e exclusão de transações
- Login e logout de usuários
- Alterações de perfil e senha
- Modificações no painel admin

## Consultando o log

1. Acesse a aba **Logs** no painel admin
2. Use os filtros de **data**, **usuário** ou **tipo de ação** para encontrar eventos específicos
3. Clique em um evento para ver os detalhes completos

## Para que serve o log?

- **Auditoria** — verificar quem fez o quê e quando
- **Investigação** — rastrear a origem de um dado incorreto
- **Segurança** — identificar acessos suspeitos

> **⚠️ Atenção:** O log é somente leitura — não é possível deletar ou editar entradas do histórico. Isso garante a integridade da trilha de auditoria.`,

  p7: `# Gerenciando a Documentação

## Editando este manual

O conteúdo que você está lendo agora é editável diretamente pelo painel admin:

1. No painel admin, clique na aba **Documentação**
2. Você verá a estrutura de **seções** e **páginas** no painel lateral
3. Clique em uma página para editar o conteúdo no editor à direita
4. O conteúdo suporta formatação **Markdown** (negrito, itálico, listas, tabelas etc.)
5. Clique em **Salvar** para publicar as alterações

## Criando novas seções e páginas

- Clique em **+ Nova Seção** para adicionar uma seção ao índice
- Dentro de uma seção, clique em **+ Nova Página** para adicionar uma página
- Arraste seções e páginas para reordenar o índice

## Controle de visibilidade

Cada seção pode ter uma visibilidade:

| Visibilidade | Quem pode ver |
|--------------|--------------|
| **Todos** | Qualquer pessoa, mesmo sem login |
| **Usuários** | Apenas usuários autenticados |
| **Admins** | Apenas administradores |

> **💡 Dica:** Seções com conteúdo sensível ou operacional devem ser marcadas como "Admins". Informações gerais de uso podem ser "Todos".`,

  p8: `# Checklist de Configuração Inicial

> Use este checklist ao configurar o Sistema Alya em um novo ambiente ou para novos usuários.

## Para o administrador

- [ ] Criar as contas de usuário para toda a equipe
- [ ] Definir os perfis de acesso (Admin / Usuário)
- [ ] Ativar apenas os módulos que a empresa vai utilizar
- [ ] Criar as categorias de transação adequadas ao negócio
- [ ] Configurar a integração com a Nuvemshop (se aplicável)
- [ ] Popular o FAQ com as dúvidas mais frequentes da equipe
- [ ] Revisar e personalizar a documentação

## Para cada novo usuário

- [ ] Fazer login com as credenciais fornecidas pelo admin
- [ ] Trocar a senha no primeiro acesso
- [ ] Definir a preferência de tema (claro ou escuro)
- [ ] Explorar o Dashboard e verificar se os módulos estão acessíveis
- [ ] Ler as seções da documentação relevantes ao seu dia a dia

## Dicas para uma boa implantação

- Comece **lançando as transações dos últimos 3 meses** antes de análises
- Cadastre os **clientes e produtos** mais importantes primeiro
- Defina a **meta do mês corrente** para o Dashboard já mostrar progresso
- Agende uma revisão mensal do DRE com a equipe`,
};

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  Seed — Manual do Usuário — Sistema Alya  ');
  console.log('═══════════════════════════════════════════');
  console.log('');

  // ─── Seção 1: Primeiros Passos
  console.log('📁 Criando Seção 1: Primeiros Passos...');
  const sec1 = await createSection('Primeiros Passos', 0, 'todos');
  await createPage(sec1, 'Bem-vindo ao Sistema Alya', s1.p1, 0);
  await createPage(sec1, 'Como fazer login', s1.p2, 1);
  await createPage(sec1, 'Navegando pelo sistema', s1.p3, 2);
  await createPage(sec1, 'Trocando o tema (claro / escuro)', s1.p4, 3);
  console.log('  ✅ Seção 1 criada (4 páginas)\n');

  // ─── Seção 2: Dashboard
  console.log('📁 Criando Seção 2: Dashboard...');
  const sec2 = await createSection('Dashboard', 1, 'usuarios');
  await createPage(sec2, 'Visão geral do Dashboard', s2.p1, 0);
  await createPage(sec2, 'Cards de resumo financeiro', s2.p2, 1);
  await createPage(sec2, 'Selecionando o período', s2.p3, 2);
  await createPage(sec2, 'Gráficos do Dashboard', s2.p4, 3);
  console.log('  ✅ Seção 2 criada (4 páginas)\n');

  // ─── Seção 3: Transações
  console.log('📁 Criando Seção 3: Transações...');
  const sec3 = await createSection('Transações', 2, 'usuarios');
  await createPage(sec3, 'O que são transações', s3.p1, 0);
  await createPage(sec3, 'Registrando uma nova transação', s3.p2, 1);
  await createPage(sec3, 'Visualizando e filtrando transações', s3.p3, 2);
  await createPage(sec3, 'Editando e excluindo transações', s3.p4, 3);
  await createPage(sec3, 'Categorias de transação', s3.p5, 4);
  console.log('  ✅ Seção 3 criada (5 páginas)\n');

  // ─── Seção 4: Produtos
  console.log('📁 Criando Seção 4: Produtos...');
  const sec4 = await createSection('Produtos', 3, 'usuarios');
  await createPage(sec4, 'Gerenciando produtos', s4.p1, 0);
  await createPage(sec4, 'Adicionando um novo produto', s4.p2, 1);
  await createPage(sec4, 'Editando e desativando produtos', s4.p3, 2);
  console.log('  ✅ Seção 4 criada (3 páginas)\n');

  // ─── Seção 5: Clientes
  console.log('📁 Criando Seção 5: Clientes...');
  const sec5 = await createSection('Clientes', 4, 'usuarios');
  await createPage(sec5, 'Gerenciando clientes', s5.p1, 0);
  await createPage(sec5, 'Adicionando um novo cliente', s5.p2, 1);
  await createPage(sec5, 'Buscando e filtrando clientes', s5.p3, 2);
  await createPage(sec5, 'Editando e excluindo clientes', s5.p4, 3);
  console.log('  ✅ Seção 5 criada (4 páginas)\n');

  // ─── Seção 6: Metas
  console.log('📁 Criando Seção 6: Metas...');
  const sec6 = await createSection('Metas', 5, 'usuarios');
  await createPage(sec6, 'Entendendo as metas', s6.p1, 0);
  await createPage(sec6, 'Criando uma nova meta', s6.p2, 1);
  await createPage(sec6, 'Acompanhando o progresso das metas', s6.p3, 2);
  console.log('  ✅ Seção 6 criada (3 páginas)\n');

  // ─── Seção 7: DRE
  console.log('📁 Criando Seção 7: DRE...');
  const sec7 = await createSection('DRE — Demonstrativo de Resultado', 6, 'usuarios');
  await createPage(sec7, 'O que é o DRE', s7.p1, 0);
  await createPage(sec7, 'Lendo o demonstrativo', s7.p2, 1);
  await createPage(sec7, 'Selecionando o período e comparativos', s7.p3, 2);
  await createPage(sec7, 'Exportando o DRE', s7.p4, 3);
  console.log('  ✅ Seção 7 criada (4 páginas)\n');

  // ─── Seção 8: Relatórios
  console.log('📁 Criando Seção 8: Relatórios...');
  const sec8 = await createSection('Relatórios', 7, 'usuarios');
  await createPage(sec8, 'Visão geral dos relatórios', s8.p1, 0);
  await createPage(sec8, 'Gerando e filtrando relatórios', s8.p2, 1);
  await createPage(sec8, 'Exportando relatórios', s8.p3, 2);
  console.log('  ✅ Seção 8 criada (3 páginas)\n');

  // ─── Seção 9: Projeção
  console.log('📁 Criando Seção 9: Projeção Financeira...');
  const sec9 = await createSection('Projeção Financeira', 8, 'usuarios');
  await createPage(sec9, 'Entendendo a projeção financeira', s9.p1, 0);
  await createPage(sec9, 'Configurando a projeção', s9.p2, 1);
  await createPage(sec9, 'Interpretando os resultados', s9.p3, 2);
  console.log('  ✅ Seção 9 criada (3 páginas)\n');

  // ─── Seção 10: Nuvemshop
  console.log('📁 Criando Seção 10: Nuvemshop...');
  const sec10 = await createSection('Nuvemshop', 9, 'usuarios');
  await createPage(sec10, 'Integração com a Nuvemshop', s10.p1, 0);
  await createPage(sec10, 'Conectando sua loja', s10.p2, 1);
  await createPage(sec10, 'Entendendo o saldo pendente', s10.p3, 2);
  await createPage(sec10, 'Sincronização e desconexão', s10.p4, 3);
  console.log('  ✅ Seção 10 criada (4 páginas)\n');

  // ─── Seção 11: Meu Perfil
  console.log('📁 Criando Seção 11: Meu Perfil...');
  const sec11 = await createSection('Meu Perfil', 10, 'usuarios');
  await createPage(sec11, 'Seu perfil de usuário', s11.p1, 0);
  await createPage(sec11, 'Atualizando seus dados e senha', s11.p2, 1);
  await createPage(sec11, 'Preferências visuais e informações da conta', s11.p3, 2);
  console.log('  ✅ Seção 11 criada (3 páginas)\n');

  // ─── Seção 12: FAQ e Suporte
  console.log('📁 Criando Seção 12: FAQ e Suporte...');
  const sec12 = await createSection('FAQ e Suporte', 11, 'todos');
  await createPage(sec12, 'Usando o FAQ', s12.p1, 0);
  await createPage(sec12, 'Enviando feedback', s12.p2, 1);
  await createPage(sec12, 'Versão do sistema e rodapé', s12.p3, 2);
  console.log('  ✅ Seção 12 criada (3 páginas)\n');

  // ─── Seção 13: Roadmap
  console.log('📁 Criando Seção 13: Roadmap...');
  const sec13 = await createSection('Roadmap', 12, 'todos');
  await createPage(sec13, 'O que é o Roadmap', s13.p1, 0);
  await createPage(sec13, 'Lendo o Roadmap', s13.p2, 1);
  console.log('  ✅ Seção 13 criada (2 páginas)\n');

  // ─── Seção 14: Administração (somente admins)
  console.log('📁 Criando Seção 14: Administração (admins)...');
  const sec14 = await createSection('Administração', 13, 'admins');
  await createPage(sec14, 'Visão geral do painel administrativo', s14.p1, 0);
  await createPage(sec14, 'Gerenciando usuários', s14.p2, 1);
  await createPage(sec14, 'Gerenciando módulos', s14.p3, 2);
  await createPage(sec14, 'Gerenciando o FAQ', s14.p4, 3);
  await createPage(sec14, 'Gerenciando feedbacks', s14.p5, 4);
  await createPage(sec14, 'Log de atividades', s14.p6, 5);
  await createPage(sec14, 'Gerenciando a documentação', s14.p7, 6);
  await createPage(sec14, 'Checklist de configuração inicial', s14.p8, 7);
  console.log('  ✅ Seção 14 criada (8 páginas)\n');

  // ─── Resumo final
  console.log('═══════════════════════════════════════════');
  console.log('✅ Seed concluído com sucesso!');
  console.log('');
  console.log('📊 Resumo:');
  console.log('   14 seções criadas');
  console.log('   51 páginas criadas');
  console.log('');
  console.log('🔒 Visibilidade:');
  console.log('   todos    → Primeiros Passos, FAQ e Suporte, Roadmap');
  console.log('   usuarios → Dashboard, Transações, Produtos, Clientes,');
  console.log('              Metas, DRE, Relatórios, Projeção, Nuvemshop,');
  console.log('              Meu Perfil');
  console.log('   admins   → Administração');
  console.log('═══════════════════════════════════════════');

  await pool.end();
}

main().catch(err => {
  console.error('❌ Erro durante o seed:', err.message);
  process.exit(1);
});
