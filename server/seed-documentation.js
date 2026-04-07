/**
 * Seed: Manual Completo do Sistema Alya
 * Cria todas as seções e páginas de documentação no banco de dados.
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

async function createSection(title, order) {
  const sectionId = id();
  const ts = now();
  await pool.query(
    `INSERT INTO doc_sections (id, title, ordem, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $4)
     ON CONFLICT (id) DO NOTHING`,
    [sectionId, title, order, ts]
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
// CONTEÚDO DAS PÁGINAS
// ============================================================

const pages = {

  // ─────────────────────────────────────────────
  // SEÇÃO 1: Introdução ao Sistema Alya
  // ─────────────────────────────────────────────

  s1p1: `# O que é o Sistema Alya

> Nesta página você vai entender o propósito do Sistema Alya e ter uma visão geral de tudo que ele oferece.

## Visão Geral

O **Sistema Alya** é uma plataforma de gestão financeira e operacional desenvolvida para ajudar empresas a controlar receitas, despesas, estoque, clientes e projeções de forma centralizada e intuitiva.

Com o Alya você consegue:

- Lançar e acompanhar todas as **transações financeiras** da empresa
- Gerenciar o **catálogo de produtos** e controlar o estoque
- Manter uma **base de clientes** organizada
- Definir e acompanhar **metas de faturamento**
- Visualizar **relatórios** e o **DRE** (Demonstrativo de Resultado) automaticamente
- Fazer **projeções financeiras** com múltiplos cenários
- Integrar sua loja **Nuvemshop** para sincronizar pedidos e clientes
- Colaborar com a equipe usando o **Roadmap** de melhorias

## Módulos do Sistema

\`\`\`mermaid
graph TD
    A([🏠 Dashboard]) --> B([💰 Transações])
    A --> C([🎯 Metas])
    A --> D([📊 Relatórios])
    B --> D
    B --> E([📋 DRE])
    B --> A
    F([🛍️ Nuvemshop]) -->|importa pedidos| B
    F -->|importa clientes| G([👥 Clientes])
    H([📈 Projeção]) -->|define metas| C
    H --> A
    I([📦 Produtos]) --> B
    J([🗺️ Roadmap]) --- K([❓ FAQ])
    L([🔧 Admin]) --- J
    L --- M([📚 Documentação])
\`\`\`

## Para quem é o Sistema Alya?

| Perfil | O que usa no Alya |
|--------|------------------|
| **Gestor / Dono** | Dashboard, Metas, Projeção, DRE, Relatórios |
| **Operacional / Colaborador** | Transações, Produtos, Clientes |
| **Integração e-commerce** | Nuvemshop |
| **Administrador de TI** | Painel Admin, Segurança, Módulos |

> **💡 Dica:** Comece sempre pelo Dashboard para ter uma visão geral do estado financeiro da empresa antes de lançar novos dados.`,

  s1p2: `# Fluxo de Dados entre Módulos

> Entenda como os módulos do Sistema Alya se conectam e como os dados fluem de um para outro.

## Como os Dados se Movem

No Sistema Alya, os dados inseridos em um módulo alimentam automaticamente outros. Por isso, manter as informações sempre atualizadas é fundamental para que relatórios, metas e o dashboard reflitam a realidade do negócio.

\`\`\`mermaid
flowchart LR
    NS([🛍️ Nuvemshop])
    TX([💰 Transações])
    PR([📦 Produtos])
    CL([👥 Clientes])
    PJ([📈 Projeção])
    MT([🎯 Metas])
    DB([🏠 Dashboard])
    RL([📊 Relatórios])
    DR([📋 DRE])

    NS -->|pedidos viram transações| TX
    NS -->|sincroniza produtos| PR
    NS -->|sincroniza clientes| CL
    TX -->|dados reais| DB
    TX -->|dados reais| RL
    TX -->|dados reais| DR
    PJ -->|cenário Previsto| MT
    MT -->|comparativo| DB
    PJ -->|comparativo projetado| DB
\`\`\`

## Sequência Típica de Uso

1. **Cadastre a Projeção** antes de começar o período — ela define as metas e o comparativo do dashboard
2. **Lance Transações** regularmente (ou sincronize via Nuvemshop)
3. **Acompanhe o Dashboard** para ver receitas vs. metas em tempo real
4. **Consulte Relatórios e DRE** no encerramento do mês para análise completa

## Impacto de cada Módulo

| Módulo | Alimenta |
|--------|----------|
| Transações | Dashboard, Relatórios, DRE, Metas (comparativo real) |
| Projeção | Metas, Dashboard (comparativo projetado) |
| Nuvemshop | Transações, Produtos, Clientes |
| Produtos | Relatórios (top 5 produtos por receita) |

> **⚠️ Atenção:** Se as Transações não estiverem lançadas, o Dashboard e os Relatórios mostrarão valores zerados ou incompletos. Mantenha os lançamentos em dia.`,

  s1p3: `# Perfis de Usuário e Permissões

> Conheça os quatro perfis de acesso do Sistema Alya e entenda o que cada um pode fazer.

## Hierarquia de Perfis

\`\`\`mermaid
flowchart TD
    SA([🔴 Super Administrador]) --> AD([🟠 Administrador])
    AD --> US([🟢 Usuário])
    US --> GS([⚪ Visitante])

    SA -->|acesso total| T1[Todos os módulos\nGerenciar usuários\nGerenciar módulos\nSegurança\nImpersonar usuários]
    AD -->|acesso amplo| T2[Painel admin\nUsuários e FAQ\nRoadmap\nSem: Segurança avançada]
    US -->|acesso operacional| T3[Dashboard\nTransações\nProdutos\nClientes\nRelatórios · Metas · DRE]
    GS -->|somente leitura| T4[Dashboard\nMetas\nRelatórios\nDRE]
\`\`\`

## Tabela Completa de Permissões

| Funcionalidade | Visitante | Usuário | Admin | Super Admin |
|----------------|:---------:|:-------:|:-----:|:-----------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Metas | ✅ | ✅ | ✅ | ✅ |
| Relatórios | ✅ | ✅ | ✅ | ✅ |
| DRE | ✅ | ✅ | ✅ | ✅ |
| Transações (criar/editar) | ❌ | ✅ | ✅ | ✅ |
| Transações (excluir) | ❌ | ❌ | ✅ | ✅ |
| Produtos | ❌ | ✅ | ✅ | ✅ |
| Clientes | ❌ | ✅ | ✅ | ✅ |
| Projeção | ❌ | ✅ | ✅ | ✅ |
| Nuvemshop | ❌ | ✅ | ✅ | ✅ |
| FAQ (visualizar) | ✅ | ✅ | ✅ | ✅ |
| Roadmap (visualizar) | ❌ | ❌ | ✅ | ✅ |
| Roadmap (editar) | ❌ | ❌ | ✅ | ✅ |
| Painel Admin | ❌ | ❌ | ✅ | ✅ |
| Gerenciar Usuários | ❌ | ❌ | ✅ | ✅ |
| Gerenciar Módulos | ❌ | ❌ | ❌ | ✅ |
| Segurança (Sessões/Anomalias/Alertas) | ❌ | ❌ | ❌ | ✅ |
| Impersonar usuários | ❌ | ❌ | ❌ | ✅ |
| Documentação (visualizar) | ✅ | ✅ | ✅ | ✅ |
| Documentação (editar) | ❌ | ❌ | ✅ | ✅ |

## Como o Perfil é Definido

O perfil de cada usuário é atribuído pelo **Administrador ou Super Administrador** na tela de Gerenciamento de Usuários (Admin > Usuários). Além do perfil, o administrador também controla quais **módulos** cada usuário pode acessar individualmente.

> **🔒 Apenas administradores:** Para alterar o perfil de um usuário, acesse **Admin > Usuários**, clique no ícone de edição (✏️) ao lado do usuário e selecione o novo papel no campo "Função".`,

  s1p4: `# Glossário de Termos

> Definições simples dos principais termos financeiros e técnicos usados no Sistema Alya.

## Termos Financeiros

**Receita**
Qualquer entrada de dinheiro para a empresa — vendas, serviços, recebimentos. No Alya, são transações do tipo *Receita*.

**Despesa**
Qualquer saída de dinheiro da empresa — aluguel, fornecedores, salários, marketing. No Alya, são transações do tipo *Despesa*.

**Lucro (Resultado Líquido)**
Fórmula: **Lucro = Receitas − Despesas**. Quando positivo, a empresa está lucrando; quando negativo, está no prejuízo.

**Margem**
Percentual do lucro em relação à receita: **Margem = (Lucro ÷ Receita) × 100**. Indica a eficiência da operação.

**Ticket Médio**
Valor médio por pedido ou transação: **Ticket Médio = Receita Total ÷ Número de Pedidos**.

**DRE (Demonstrativo de Resultado do Exercício)**
Relatório contábil que apresenta receitas e despesas de forma hierárquica, mostrando o resultado final do período. Pense nele como o "extrato de saúde financeira" do negócio.

**Projeção Financeira**
Estimativa do que a empresa espera receber e gastar em períodos futuros, com base em dados históricos e percentuais de crescimento.

**Meta**
Valor alvo de faturamento (receita) para um determinado mês. No Alya, as metas são derivadas do cenário *Previsto* da Projeção.

## Termos dos Cenários de Projeção

| Cenário | Quando usar | Interpretação |
|---------|-------------|---------------|
| **Previsto** | Estimativa conservadora e realista | "O mínimo que esperamos faturar" |
| **Médio** | Estimativa moderada | "O resultado mais provável" |
| **Máximo** | Estimativa otimista | "O melhor cenário possível" |

## Override Manual

Quando você digita um valor diretamente em uma célula da Projeção, substituindo o cálculo automático, isso é chamado de **override manual**. A célula fica destacada em âmbar (laranja) para indicar que o valor foi inserido manualmente. Você pode desfazer o override clicando no botão **↺** que aparece na célula.

## Termos Técnicos

**Módulo**
Cada seção principal do sistema (Dashboard, Transações, Produtos etc.). Módulos podem ser ativados ou desativados pelo Super Administrador.

**Sincronização (Nuvemshop)**
Processo de importar dados da loja online para o Sistema Alya. Pode ser manual (clicando no botão de sync) ou automática via webhooks.

**Webhook**
Mecanismo de notificação automática: quando um pedido é criado na Nuvemshop, a plataforma envia uma mensagem imediata para o Sistema Alya, que registra o pedido sem intervenção manual.

**Impersonação**
Recurso exclusivo do Super Administrador que permite navegar no sistema "como se fosse" outro usuário, útil para diagnósticos e suporte.`,

  // ─────────────────────────────────────────────
  // SEÇÃO 2: Primeiros Passos
  // ─────────────────────────────────────────────

  s2p1: `# Fazendo Login

> Aprenda a acessar o Sistema Alya pela primeira vez e a recuperar sua senha caso necessário.

## Tela de Login

Acesse o Sistema Alya pelo endereço fornecido pelo seu administrador. Você verá a tela de login com dois campos:

- **Usuário:** seu nome de usuário (não é o e-mail)
- **Senha:** sua senha de acesso

Clique no ícone 👁️ ao lado do campo de senha para mostrar ou ocultar o que está digitando.

## Fluxo de Acesso

\`\`\`mermaid
flowchart TD
    A([Acessar o Sistema Alya]) --> B{Tem login e senha?}
    B -->|Sim| C[Digite usuário e senha]
    C --> D{Primeiro acesso?}
    D -->|Sim| E[Sistema exibe senha temporária gerada]
    E --> F[Copie a senha e clique em Continuar]
    F --> G([Sistema carregado ✅])
    D -->|Não| G
    B -->|Não| H[Clique em Esqueci minha senha]
    H --> I[Informe e-mail ou usuário]
    I --> J[Receba o link por e-mail]
    J --> K[Clique no link e defina nova senha]
    K --> C
\`\`\`

## Primeiro Acesso

Quando o administrador cria sua conta, o sistema gera uma **senha temporária** automaticamente. No primeiro login:

1. Digite seu usuário e a senha temporária fornecida
2. Um aviso aparece na tela com uma **nova senha gerada pelo sistema**
3. **Copie essa senha** clicando no botão de cópia (📋) — guarde-a em local seguro
4. Clique em **"Entendi, continuar"**
5. Você estará dentro do sistema. Recomendamos alterar a senha imediatamente em **Menu do Usuário > Alterar Senha**

## Recuperação de Senha

1. Na tela de login, clique em **"Esqueci minha senha"**
2. Informe seu **e-mail** ou **nome de usuário**
3. Clique em **"Enviar"**
4. Verifique seu e-mail — você receberá um link de redefinição
5. Clique no link e defina uma nova senha (mínimo 6 caracteres)

> **⚠️ Atenção:** O link de redefinição de senha expira após alguns minutos. Se não recebeu o e-mail, verifique a pasta de spam ou solicite ao administrador um reset manual.

> **💡 Dica:** Salve o endereço do Sistema Alya nos favoritos do navegador para acesso rápido.`,

  s2p2: `# Navegando pelo Sistema

> Conheça a interface do Sistema Alya e aprenda a se mover entre os módulos com eficiência.

## Estrutura da Interface

O sistema é dividido em três áreas principais:

\`\`\`
┌────────────────────────────────────────────────┐
│  CABEÇALHO  Logo · Busca · Menu do Usuário     │
├────────────────────────────────────────────────┤
│  NAVEGAÇÃO  Dashboard | Transações | Produtos… │
├────────────────────────────────────────────────┤
│                                                │
│              CONTEÚDO DO MÓDULO                │
│                                                │
└────────────────────────────────────────────────┘
\`\`\`

## Barra de Navegação

A barra de abas (logo abaixo do cabeçalho) exibe todos os módulos que você tem acesso. Clique em qualquer aba para ir diretamente àquele módulo.

- A aba ativa fica destacada em **gradiente âmbar/laranja**
- Em telas menores, a barra rola horizontalmente — arraste para ver todas as abas

## Módulos visíveis por perfil

Os módulos que aparecem na barra de navegação dependem do seu perfil e do que o administrador liberou para você. Se um módulo não aparece, é porque você não tem acesso a ele.

## Menu do Usuário

No canto superior direito, clique no seu nome ou avatar para abrir o menu:

| Opção | O que faz |
|-------|-----------|
| **Ver Perfil** | Exibe seus dados cadastrais (somente leitura) |
| **Alterar Username** | Muda seu nome de usuário |
| **Alterar Senha** | Troca sua senha atual |
| **Editar Perfil** | Edita nome, telefone, endereço e foto |

## Botão de Feedback

No canto inferior direito da tela há um botão **âmbar pulsante** (💬). Use-o para enviar sugestões, dúvidas ou reportar problemas diretamente aos administradores.

> **💡 Dica:** Você pode trocar de módulo a qualquer momento clicando em outra aba — seus dados não preenchidos em formulários abertos serão perdidos, então salve antes de sair.`,

  s2p3: `# Configurando seu Perfil

> Aprenda a personalizar suas informações pessoais e manter sua conta segura.

## Acessando as Configurações

Clique no seu **nome ou avatar** no canto superior direito da tela para abrir o menu do usuário. Todas as opções de perfil estão neste menu.

## Editando Dados Pessoais

1. Clique em **"Editar Perfil"**
2. O modal de edição abrirá com seus dados atuais
3. Preencha os campos que deseja alterar:
   - **Primeiro Nome** e **Sobrenome**
   - **Telefone** (com DDD)
   - **Endereço**
   - **Data de Nascimento** (opcional)
   - **CPF** (opcional)
4. Clique em **"Salvar"**

## Alterando a Foto de Perfil

Dentro do modal **"Editar Perfil"**, clique na área da foto/avatar para:

1. Selecionar uma imagem do seu computador (JPG, PNG, WebP — máximo 5 MB)
2. Recortar a imagem na proporção desejada
3. Confirmar o recorte
4. Salvar o perfil

Quando não há foto definida, o sistema exibe suas iniciais sobre fundo colorido.

## Alterando o Nome de Usuário

1. Clique em **"Alterar Username"**
2. Digite o novo nome de usuário desejado
3. Clique em **"Confirmar"**

> **⚠️ Atenção:** O nome de usuário é único no sistema. Se já existir outro usuário com o mesmo nome, a alteração será recusada.

## Alterando a Senha

1. Clique em **"Alterar Senha"**
2. Preencha os três campos:
   - **Senha Atual:** sua senha em uso agora
   - **Nova Senha:** mínimo 6 caracteres, deve ser diferente da atual
   - **Confirmar Nova Senha:** repita a nova senha
3. Clique no ícone 👁️ para revelar o que está digitando
4. Clique em **"Alterar Senha"**

> **💡 Dica de Segurança:** Use senhas com letras maiúsculas, minúsculas, números e símbolos. Evite datas de nascimento ou sequências como "123456".`,

  s2p4: `# Enviando Feedback

> Use o sistema de feedback para reportar problemas, sugerir melhorias ou tirar dúvidas com o time de administração.

## Como Enviar um Feedback

1. Clique no **botão âmbar pulsante** (💬) no canto inferior direito da tela
2. O modal de feedback abrirá
3. Selecione a **categoria** mais adequada:

| Categoria | Quando usar |
|-----------|-------------|
| **Dúvida** | Não entendeu como usar alguma funcionalidade |
| **Melhoria** | Quer sugerir uma mudança em algo que já existe |
| **Sugestão** | Quer propor uma funcionalidade nova |
| **Crítica** | Encontrou um erro ou algo que não funciona |

4. O campo **"Página"** é preenchido automaticamente com o módulo onde você está
5. Descreva o feedback no campo de texto (**mínimo 20 caracteres**)
6. Opcionalmente, adicione:
   - Uma **imagem** (captura de tela, por exemplo) — clique em "Anexar imagem"
   - Um **link de vídeo** (YouTube, Vimeo) — útil para demonstrar um problema
7. Clique em **"Enviar Feedback"**

## O que acontece depois?

\`\`\`mermaid
flowchart LR
    A([Você envia o feedback]) --> B[Admin recebe no\nPainel > Feedbacks]
    B --> C{Admin avalia}
    C -->|Responde| D[Você pode ver a\nresposta no FAQ]
    C -->|Aceita e implementa| E[Item vai para\no Roadmap]
    E --> F[Aparece em\nRoadmap > Doing]
\`\`\`

> **💡 Dica:** Seja específico na descrição. Em vez de "está errado", descreva: "Ao clicar em Exportar PDF na tela de Transações, a página fica em branco". Isso agiliza a resolução.`,

  // ─────────────────────────────────────────────
  // SEÇÃO 3: Dashboard
  // ─────────────────────────────────────────────

  s3p1: `# Visão Geral do Dashboard

> O Dashboard é a tela inicial do Sistema Alya e oferece uma visão consolidada da saúde financeira da empresa.

## O que é o Dashboard?

O Dashboard reúne automaticamente os dados de **Transações** e **Projeção** para exibir indicadores financeiros em tempo real. Ele responde perguntas como:

- *Estamos atingindo a meta de faturamento deste mês?*
- *As despesas estão dentro do projetado?*
- *Qual foi a evolução financeira nos últimos 12 meses?*

## Elementos da Tela

| Elemento | Descrição |
|----------|-----------|
| **Seletor de período** | Alterna entre visões Mensal, Trimestral e Anual |
| **Navegador de mês/trimestre** | Setas ‹ › para avançar ou recuar no tempo |
| **Gráficos de Pizza** | Receitas vs. Despesas por período |
| **Gráficos de Barras** | Meta vs. Real — Faturamento, Despesas e Resultado |
| **Gráfico de Linhas** | Evolução dos últimos 12 meses |
| **Despesas por Categoria** | Divisão das despesas em pizza por categoria |
| **Últimas Transações** | As 5 transações mais recentes |

## Origem dos Dados

\`\`\`mermaid
graph LR
    TX([Transações]) -->|receitas e despesas reais| DB([Dashboard])
    PJ([Projeção]) -->|metas e valores projetados| DB
    DB --> G1[Gráficos de comparativo]
    DB --> G2[Evolução 12 meses]
    DB --> G3[Últimas transações]
\`\`\`

> **💡 Dica:** Se o Dashboard estiver zerado, verifique se há Transações lançadas e se a Projeção foi configurada para o período atual.`,

  s3p2: `# Seleção de Período

> Aprenda a navegar entre meses, trimestres e anos no Dashboard para analisar diferentes períodos.

## Três Visões de Período

Na parte superior do Dashboard há três botões de período:

| Botão | O que mostra |
|-------|-------------|
| **Mensal** | Dados de um único mês — selecione o mês e ano desejado |
| **Trimestral** | Dados agrupados por trimestre (Q1 a Q4) |
| **Anual** | Dados do ano completo |

## Navegando entre Períodos

Depois de selecionar o tipo de período, use as **setas ‹ ›** para avançar ou recuar:

- Na visão **Mensal**: navega mês a mês
- Na visão **Trimestral**: navega trimestre a trimestre (3 meses)
- Na visão **Anual**: navega ano a ano

## Seletor de Mês (Visão Mensal)

Na visão Mensal você também pode clicar diretamente no **nome do mês** para abrir um calendário e ir direto para qualquer mês/ano sem precisar avançar um por um.

## Trimestres do Ano

| Trimestre | Meses |
|-----------|-------|
| **Q1** | Janeiro, Fevereiro, Março |
| **Q2** | Abril, Maio, Junho |
| **Q3** | Julho, Agosto, Setembro |
| **Q4** | Outubro, Novembro, Dezembro |

> **💡 Dica:** Para comparar o desempenho do trimestre atual com o anterior, selecione "Trimestral" e use a seta ‹ para ver o trimestre passado. Os gráficos se atualizam automaticamente.`,

  s3p3: `# Gráficos e Indicadores

> Entenda o que cada gráfico do Dashboard representa e como interpretá-lo.

## Gráficos de Pizza — Receitas vs. Despesas

Exibidos para o período selecionado (mensal, trimestral ou anual), mostram a proporção entre total de receitas e total de despesas em um único círculo.

- **Verde**: Receitas
- **Vermelho**: Despesas
- Passe o mouse sobre cada fatia para ver o valor exato

## Gráficos de Barras — Meta vs. Real

Três gráficos de barras lado a lado comparam o **valor projetado** com o **valor realizado**:

| Gráfico | Barra Azul | Barra Âmbar |
|---------|-----------|-------------|
| **Faturamento** | Meta de receita (Projeção) | Receita realizada (Transações) |
| **Despesas** | Despesa projetada | Despesa realizada |
| **Resultado** | Resultado projetado | Resultado realizado |

**Como interpretar:**
- Barra âmbar **maior** que a azul no Faturamento → você superou a meta 🎉
- Barra âmbar **maior** que a azul nas Despesas → você gastou mais do que planejado ⚠️

## Gráfico de Linhas — Evolução 12 Meses

Mostra a evolução mês a mês dos últimos 12 meses com três linhas:

- **Verde**: Receitas
- **Vermelho**: Despesas
- **Azul**: Saldo (Receitas − Despesas)

\`\`\`mermaid
graph LR
    TX([Transações\nreal]) -->|12 meses de dados| GL[Gráfico de Linhas]
    PJ([Projeção]) -->|valores projetados| GB[Gráficos de Barras]
\`\`\`

## Despesas por Categoria

Pizza mostrando a distribuição das despesas entre as categorias cadastradas. Útil para identificar onde a empresa mais gasta.

## Últimas Transações

Tabela com as 5 transações mais recentes, mostrando data, descrição, tipo e valor. Clique em **Transações** na barra de navegação para ver a lista completa.`,

  s3p4: `# Comparativo Meta vs. Real

> Aprenda a interpretar a diferença entre o que foi planejado (meta) e o que foi realizado (real) no Dashboard.

## O que é Meta e o que é Real?

- **Meta**: valor que você planejou atingir, definido na **Projeção Financeira** (cenário Previsto)
- **Real**: valor efetivamente registrado nas **Transações**

Se não houver Projeção configurada, os gráficos de comparativo estarão zerados no lado da meta.

## Lendo os Gráficos

### Faturamento (Receita)

| Situação | O que significa | Cor indicativa |
|----------|----------------|---------------|
| Real > Meta | Faturamento acima do esperado ✅ | Barra âmbar ultrapassa a azul |
| Real = Meta | Exatamente na meta | Barras iguais |
| Real < Meta | Faturamento abaixo da meta ⚠️ | Barra âmbar menor que a azul |

### Despesas

| Situação | O que significa |
|----------|----------------|
| Real > Projetado | Gastou mais do que planejou ⚠️ |
| Real < Projetado | Despesas sob controle ✅ |

### Resultado (Lucro)

| Situação | O que significa |
|----------|----------------|
| Real > Projetado | Resultado melhor que o esperado ✅ |
| Real < Projetado | Resultado abaixo da expectativa ⚠️ |

## Por que os valores do Dashboard podem ser diferentes do DRE?

O Dashboard usa os dados de Transações **do período selecionado**. O DRE também — mas o DRE permite filtros adicionais de ano/trimestre/mês e exibe uma estrutura hierárquica mais detalhada. Os valores devem ser equivalentes para o mesmo período.

> **💡 Dica:** Use o comparativo Meta vs. Real no Dashboard para decisões rápidas do dia a dia. Para análise profunda ao final do mês, use o DRE e os Relatórios.`,

  // ─────────────────────────────────────────────
  // SEÇÃO 4: Transações
  // ─────────────────────────────────────────────

  s4p1: `# Lançando uma Transação

> Aprenda a registrar receitas e despesas no Sistema Alya de forma correta e rápida.

## O que é uma Transação?

Uma **transação** é qualquer movimentação financeira da empresa — uma venda (receita), um pagamento a fornecedor (despesa), um salário, uma mensalidade de serviço, etc.

Cada transação alimenta automaticamente o Dashboard, os Relatórios e o DRE.

## Criando uma Nova Transação

1. Na barra de navegação, clique em **Transações**
2. Clique no botão **"+ Nova Transação"** (canto superior direito)
3. Preencha o formulário:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Data** | ✅ | Data em que a transação ocorreu |
| **Descrição** | ✅ | Texto descritivo (ex: "Venda produto X para João") |
| **Valor** | ✅ | Valor numérico, sem R$ (ex: 1500.00) |
| **Tipo** | ✅ | Receita ou Despesa |
| **Categoria** | ✅ | Categoria correspondente ao tipo selecionado |

4. Clique em **"Salvar"**

## Ciclo de Vida de uma Transação

\`\`\`mermaid
flowchart TD
    A([Criar transação]) --> B[Dados salvos no banco]
    B --> C[Dashboard atualizado]
    B --> D[Relatórios atualizados]
    B --> E[DRE atualizado]
    C & D & E --> F([Análise financeira em tempo real ✅])
    B --> G{Precisa corrigir?}
    G -->|Sim| H[Editar transação]
    G -->|Não mais| I[Excluir transação]
\`\`\`

> **💡 Dica:** Seja descritivo ao preencher o campo Descrição. Em vez de "Venda", escreva "Venda — Produto Camiseta M — Cliente Maria". Isso facilita a consulta posterior nos relatórios.

> **⚠️ Atenção:** Escolha corretamente o **Tipo** (Receita ou Despesa) — isso determina se o valor somará ou subtrairá nos indicadores financeiros.`,

  s4p2: `# Tipos e Categorias

> Conheça os tipos de transação e todas as categorias disponíveis no Sistema Alya.

## Tipos de Transação

| Tipo | Cor no sistema | Quando usar |
|------|:--------------:|-------------|
| **Receita** | 🟢 Verde | Entradas de dinheiro: vendas, serviços, recebimentos |
| **Despesa** | 🔴 Vermelho | Saídas de dinheiro: pagamentos, custos, investimentos |

## Categorias de Receita

| Categoria | Exemplos de uso |
|-----------|----------------|
| Vendas de Produtos | Produtos físicos vendidos |
| Prestação de Serviços | Consultoria, manutenção, instalação |
| Receitas Financeiras | Rendimentos de aplicações, juros recebidos |
| Outras Receitas | Reembolsos, dividendos, receitas diversas |

## Categorias de Despesa

| Categoria | Exemplos de uso |
|-----------|----------------|
| Pessoal e Salários | Folha de pagamento, encargos, benefícios |
| Aluguel e Infraestrutura | Aluguel, condomínio, água, luz, internet |
| Marketing e Publicidade | Anúncios, materiais gráficos, redes sociais |
| Fornecedores | Matéria-prima, mercadorias para revenda |
| Serviços Contratados | Contador, advogado, TI, limpeza |
| Impostos e Taxas | DAS, ISS, ICMS, taxas bancárias |
| Logística e Transporte | Frete, entrega, combustível |
| Equipamentos e TI | Computadores, softwares, equipamentos |
| Despesas Financeiras | Juros de empréstimo, tarifas bancárias |
| Outras Despesas | Despesas diversas não categorizadas |

> **💡 Dica:** Use sempre a categoria mais específica disponível. Um lançamento bem categorizado torna os relatórios por categoria muito mais úteis para tomada de decisão.

> **⚠️ Atenção:** As categorias disponíveis mudam conforme o tipo selecionado. Ao trocar de Receita para Despesa (ou vice-versa), o campo Categoria é resetado automaticamente.`,

  s4p3: `# Editando e Excluindo Transações

> Aprenda a corrigir uma transação existente e a remover registros desnecessários.

## Editando uma Transação

1. Na lista de transações, localize a transação que deseja corrigir
2. Clique no ícone de **lápis** (✏️) na coluna de ações
3. O modal de edição abre com os dados atuais preenchidos
4. Faça as correções necessárias
5. Clique em **"Salvar"**

## Excluindo uma Transação Individual

1. Localize a transação na lista
2. Clique no ícone de **lixeira** (🗑️) na coluna de ações
3. Confirme a exclusão no diálogo que aparece
4. A transação é removida permanentemente

## Excluindo Múltiplas Transações (em Massa)

1. Marque a **caixa de seleção** à esquerda de cada transação que deseja excluir
2. Para selecionar todas as transações visíveis, marque a caixa no cabeçalho da tabela
3. Uma barra de ações aparece na parte inferior da tela mostrando quantas transações estão selecionadas
4. Clique em **"Excluir selecionadas"**
5. Confirme a exclusão

> **⚠️ Atenção:** A exclusão é **permanente e irreversível**. Verifique com atenção antes de confirmar. Uma vez excluída, a transação não pode ser recuperada.

> **💡 Dica:** Use os filtros antes de selecionar para excluir em massa. Assim você garante que está selecionando apenas as transações corretas.`,

  s4p4: `# Filtros e Ordenação

> Aprenda a filtrar e ordenar a lista de transações para encontrar rapidamente o que precisa.

## Abrindo o Painel de Filtros

Clique no botão **"Filtros"** (ícone de funil) acima da lista de transações para expandir o painel de filtros.

## Filtros Disponíveis

| Filtro | Opções | Descrição |
|--------|--------|-----------|
| **Tipo** | Todos / Receita / Despesa | Mostra apenas o tipo selecionado |
| **Categoria** | Lista de categorias | Filtra por categoria específica (muda conforme o tipo) |
| **Data Início** | Calendário | Mostra transações a partir desta data |
| **Data Fim** | Calendário | Mostra transações até esta data |

Para limpar todos os filtros de uma vez, clique em **"Limpar Filtros"**.

## Ordenando a Tabela

Clique no cabeçalho de qualquer coluna para ordenar:

| Coluna | O que ordena |
|--------|-------------|
| **Data** | Por data (mais recente / mais antiga) |
| **Descrição** | Alfabética por descrição |
| **Tipo** | Receitas primeiro ou Despesas primeiro |
| **Categoria** | Alfabética por categoria |
| **Valor** | Maior para menor ou menor para maior |

Clique novamente na mesma coluna para inverter a ordem. Uma seta (↑ ou ↓) indica a direção atual.

## Dicas de Uso

**Para encontrar transações de um período:**
Defina Data Início e Data Fim no filtro. Ex: 01/04/2025 a 30/04/2025 para ver apenas abril.

**Para análise de uma categoria específica:**
Selecione o Tipo e depois a Categoria. Ex: Despesa > Marketing e Publicidade.

**Para encontrar uma transação específica:**
Ordene por Descrição (A→Z) e procure visualmente — ou use o filtro de período para reduzir a lista.`,

  s4p5: `# Importar do Excel

> Aprenda a importar transações em lote a partir de uma planilha Excel.

## Quando usar a Importação

A importação é ideal para:
- Migrar histórico de transações de outro sistema
- Lançar muitas transações de uma vez (ex: extrato bancário)
- Importar dados de planilhas que já usa no Excel

## Baixando o Modelo de Planilha

Antes de importar, **sempre use o modelo oficial**:

1. Clique em **"Importar/Exportar"** (botão acima da lista)
2. Selecione **"Baixar modelo"**
3. Abra o arquivo .xlsx baixado no Excel ou Google Sheets

## Preenchendo o Modelo

O modelo contém as seguintes colunas:

| Coluna | Formato | Exemplo |
|--------|---------|---------|
| **data** | DD/MM/AAAA | 15/03/2025 |
| **descricao** | Texto livre | Venda camiseta P azul |
| **valor** | Número decimal (ponto) | 89.90 |
| **tipo** | Receita ou Despesa | Receita |
| **categoria** | Nome exato da categoria | Vendas de Produtos |

> **⚠️ Atenção:** O nome da categoria deve ser **exatamente igual** ao que está no sistema (incluindo maiúsculas e acentos). Categorias não reconhecidas causarão erro na importação.

## Importando a Planilha

1. Clique em **"Importar/Exportar"**
2. Selecione **"Importar do Excel"**
3. Clique em **"Selecionar arquivo"** e escolha a planilha preenchida
4. O sistema processa o arquivo e exibe um resumo:
   - ✅ Registros importados com sucesso
   - ⚠️ Registros com erro (com descrição do problema)
5. Clique em **"Confirmar Importação"**

> **💡 Dica:** Importe em lotes de até 500 linhas para evitar lentidão. Arquivos muito grandes podem demorar para processar.`,

  s4p6: `# Exportar (Excel e PDF)

> Aprenda a exportar sua lista de transações para Excel ou PDF.

## Exportar para Excel

O Excel é ideal para análises adicionais, filtros avançados ou compartilhamento com outros sistemas.

1. Aplique os **filtros** desejados (período, tipo, categoria) — o Excel exportará os dados filtrados
2. Clique em **"Importar/Exportar"** > **"Exportar para Excel"**
3. Um arquivo .xlsx é baixado automaticamente
4. O arquivo contém todas as colunas: data, descrição, valor, tipo, categoria

## Exportar para PDF

O PDF é ideal para relatórios formais, impressão ou arquivamento.

1. Aplique os filtros desejados
2. Clique em **"Exportar PDF"**
3. O sistema gera o PDF com:
   - Cabeçalho com nome da empresa e período filtrado
   - Tabela com todas as transações visíveis
   - Totais de receitas, despesas e saldo ao final

> **💡 Dica:** Para gerar um relatório mensal de transações em PDF, defina o filtro de Data Início como o primeiro dia do mês e Data Fim como o último dia, depois clique em Exportar PDF.

## Diferença entre os Formatos

| | Excel (.xlsx) | PDF |
|-|:---:|:---:|
| Editável | ✅ | ❌ |
| Para análise adicional | ✅ | ❌ |
| Para impressão/arquivo formal | ❌ | ✅ |
| Inclui totalizadores | ❌ | ✅ |`,

};

// ============================================================
// Continua no próximo bloco (seções 5-16)
// ============================================================

const pages2 = {

  // ─────────────────────────────────────────────
  // SEÇÃO 5: Produtos
  // ─────────────────────────────────────────────

  s5p1: `# Cadastrando Produtos

> Aprenda a criar e manter o catálogo de produtos no Sistema Alya.

## Para que serve o Módulo de Produtos?

O módulo de Produtos permite registrar os itens que sua empresa vende, controlar estoque, acompanhar quantas unidades foram vendidas e calcular a margem de lucro por produto.

## Criando um Novo Produto

1. Clique em **Produtos** na barra de navegação
2. Clique em **"+ Novo Produto"**
3. Preencha o formulário:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Nome** | ✅ | Nome do produto (ex: "Camiseta Básica Preta P") |
| **Categoria** | ✅ | Grupo do produto (ex: "Vestuário", "Eletrônicos") |
| **Preço de Venda** | ✅ | Valor pelo qual você vende (R$) |
| **Preço de Custo** | ❌ | Quanto você paga pelo produto (R$) — usado no cálculo de margem |
| **Estoque** | ❌ | Quantidade atual em estoque |
| **Vendidos** | ❌ | Quantidade já vendida |

4. Clique em **"Salvar"**

## Dicas de Cadastro

- Use nomes descritivos incluindo variações (tamanho, cor, modelo)
- Preencha sempre o **Preço de Custo** para aproveitar o cálculo de margem
- Mantenha o **Estoque** atualizado para que a análise de disponibilidade seja precisa

> **💡 Dica:** Se você usa a integração Nuvemshop, os produtos da loja podem ser sincronizados automaticamente — sem necessidade de cadastro manual.`,

  s5p2: `# Controle de Estoque

> Entenda o sistema de cores de estoque e saiba como manter o controle atualizado.

## Indicadores de Estoque

O sistema usa um código de cores para indicar o nível de estoque de cada produto:

| Cor | Situação | Quantidade |
|-----|----------|:----------:|
| 🟢 **Verde** | Estoque saudável | Mais de 10 unidades |
| 🟡 **Amarelo** | Estoque baixo | 1 a 10 unidades |
| 🔴 **Vermelho** | Sem estoque | 0 unidades |

## Atualizando o Estoque

Para atualizar a quantidade em estoque:

1. Localize o produto na lista
2. Clique no ícone de **edição** (✏️)
3. Atualize o campo **"Estoque"** com a quantidade atual
4. Clique em **"Salvar"**

## Filtros de Estoque

Na lista de produtos você pode filtrar por situação de estoque:

1. Clique em **"Filtros"**
2. No campo **"Estoque"** selecione:
   - **Em estoque** — mostra produtos com estoque > 0
   - **Sem estoque** — mostra produtos com estoque = 0

> **💡 Dica:** Filtre por "Sem estoque" regularmente para identificar produtos que precisam de reposição. Você pode exportar essa lista para o fornecedor como pedido de compra.

> **⚠️ Atenção:** O sistema não desconta estoque automaticamente quando uma transação de venda é lançada. A atualização do estoque deve ser feita manualmente ou via sincronização Nuvemshop.`,

  s5p3: `# Análise de Margem

> Aprenda a usar o cálculo de margem de lucro por produto para tomar melhores decisões de preço.

## O que é Margem de Lucro?

A margem de lucro de um produto indica quanto da receita da venda sobra após cobrir o custo do produto.

**Fórmula:**
\`\`\`
Margem (R$) = Preço de Venda − Preço de Custo
Margem (%)  = (Margem R$ ÷ Preço de Venda) × 100
\`\`\`

**Exemplo:**
- Preço de Venda: R$ 120,00
- Preço de Custo: R$ 45,00
- **Margem: R$ 75,00 (62,5%)**

## Como Ver a Margem no Sistema

Na lista de produtos, as colunas **Preço** (verde) e **Custo** (âmbar) ficam lado a lado para fácil comparação visual.

Para calcular a margem no papel ou planilha, subtraia o custo do preço.

## Usando a Margem para Decisões

| Situação | O que fazer |
|----------|-------------|
| Margem abaixo de 20% | Revisar o preço de venda ou negociar melhor com fornecedor |
| Margem negativa (custo > preço) | Produto sendo vendido com prejuízo — ação urgente |
| Margem acima de 60% | Produto com excelente rentabilidade — priorizar vendas |

## Produtos sem Preço de Custo

Se o campo **Preço de Custo** estiver vazio, a margem não pode ser calculada. Use o filtro **"Com preço de custo"** para ver apenas os produtos onde a análise de margem está disponível.

> **💡 Dica:** Exporte a lista de produtos para Excel e adicione uma coluna de margem percentual usando a fórmula =(preço-custo)/preço para uma análise completa da rentabilidade do catálogo.`,

  s5p4: `# Filtros e Busca

> Aprenda a usar os filtros da tela de Produtos para encontrar e analisar itens específicos.

## Abrindo os Filtros

Clique no botão **"Filtros"** acima da lista de produtos para expandir o painel.

## Filtros Disponíveis

| Filtro | Tipo | Descrição |
|--------|------|-----------|
| **Categoria** | Campo de texto | Digite parte do nome da categoria para filtrar |
| **Estoque** | Dropdown | Todos / Em estoque (> 0) / Sem estoque (= 0) |
| **Vendidos** | Dropdown | Todos / Vendidos (> 0) / Não vendidos (= 0) |
| **Preço de Custo** | Dropdown | Todos / Com custo cadastrado / Sem custo |

## Combinando Filtros

Os filtros funcionam em conjunto. Exemplo:

- **Categoria**: "Vestuário" + **Sem estoque** → mostra apenas vestuário zerado no estoque

## Ordenando a Lista

Clique no cabeçalho de qualquer coluna para ordenar:

- **Nome** — alfabético
- **Categoria** — alfabético
- **Preço** — maior para menor ou menor para maior
- **Custo** — maior para menor ou menor para maior
- **Estoque** — maior para menor
- **Vendidos** — maior para menor

> **💡 Dica:** Ordene por "Vendidos" (decrescente) para ver os produtos mais populares no topo. Combine com o filtro de estoque para priorizar a reposição dos mais vendidos.`,

  s5p5: `# Importar e Exportar Produtos

> Aprenda a importar seu catálogo em lote e exportar a lista de produtos.

## Importar do Excel

Ideal para cadastrar muitos produtos de uma vez ou migrar de outro sistema.

**Baixando o modelo:**
1. Clique em **"Importar/Exportar"** > **"Baixar modelo"**
2. Abra o arquivo no Excel

**Preenchendo o modelo:**

| Coluna | Obrigatório | Formato | Exemplo |
|--------|:-----------:|---------|---------|
| **nome** | ✅ | Texto | Camiseta Básica Preta P |
| **categoria** | ✅ | Texto | Vestuário |
| **preco** | ✅ | Número (ponto) | 89.90 |
| **custo** | ❌ | Número (ponto) | 35.00 |
| **estoque** | ❌ | Número inteiro | 50 |
| **vendidos** | ❌ | Número inteiro | 12 |

**Importando:**
1. Clique em **"Importar/Exportar"** > **"Importar do Excel"**
2. Selecione o arquivo preenchido
3. Confirme a importação

## Exportar para Excel

1. Aplique os filtros desejados (opcional)
2. Clique em **"Importar/Exportar"** > **"Exportar para Excel"**
3. Arquivo .xlsx com toda a lista de produtos é baixado

## Exportar para PDF

1. Aplique os filtros desejados (opcional)
2. Clique em **"Exportar PDF"**
3. PDF com a lista formatada é baixado — inclui nome, categoria, preço, custo, estoque e vendidos

> **💡 Dica:** Exporte para PDF periodicamente como registro do inventário. Combine com o filtro "Sem estoque" para gerar uma lista de reposição.`,

  // ─────────────────────────────────────────────
  // SEÇÃO 6: Clientes
  // ─────────────────────────────────────────────

  s6p1: `# Cadastrando Clientes

> Aprenda a criar e manter uma base de clientes organizada no Sistema Alya.

## Para que serve o Módulo de Clientes?

O módulo de Clientes permite centralizar os dados de contato dos seus clientes (pessoa física ou jurídica), facilitando o relacionamento, o acompanhamento de vendas e a geração de relatórios por cliente.

## Criando um Novo Cliente

1. Clique em **Clientes** na barra de navegação
2. Clique em **"+ Novo Cliente"**
3. Preencha o formulário:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Nome** | ✅ | Nome completo (pessoa física) ou razão social (empresa) |
| **E-mail** | ✅ | Endereço de e-mail de contato |
| **Telefone** | ✅ | Número com DDD (ex: 11999998888) |
| **Endereço** | ✅ | Endereço completo |
| **Tipo de Documento** | ❌ | CPF (pessoa física) ou CNPJ (empresa) |
| **Número do Documento** | ❌ | CPF ou CNPJ sem pontuação |

4. Clique em **"Salvar"**

## Validação do Formulário

O sistema valida os dados em tempo real:
- Campos obrigatórios vazios ficam com **borda vermelha** e exibem uma mensagem de erro
- O formulário só é salvo quando todos os campos obrigatórios estão preenchidos corretamente

> **💡 Dica:** Mesmo que o cliente não tenha CPF/CNPJ disponível no momento, você pode cadastrá-lo com os campos de documento em branco e completar depois via edição.`,

  s6p2: `# CPF vs. CNPJ

> Entenda quando usar CPF e quando usar CNPJ no cadastro de clientes.

## Diferença entre CPF e CNPJ

| Documento | Para | Formato |
|-----------|------|---------|
| **CPF** | Pessoa física (consumidor individual) | 11 dígitos — ex: 123.456.789-00 |
| **CNPJ** | Pessoa jurídica (empresa, MEI) | 14 dígitos — ex: 12.345.678/0001-90 |

## Como Selecionar no Sistema

No formulário de cadastro de cliente:

1. Localize o campo **"Tipo de Documento"**
2. Selecione **CPF** ou **CNPJ** usando o toggle/botão
3. O campo de número se adapta ao formato selecionado
4. Preencha apenas os números, sem pontuação — o sistema aplica a máscara automaticamente

## Quando o Documento é Opcional

O CPF/CNPJ é um campo **opcional** no cadastro. Você pode deixá-lo em branco se:
- Não tiver a informação disponível no momento
- O cliente não quiser informar o documento
- Para clientes de varejo onde o documento não é necessário

## Na Lista de Clientes

A coluna **Nome** exibe o nome do cliente e, logo abaixo em texto menor, o CPF ou CNPJ quando cadastrado. Isso facilita a identificação visual na lista.

> **💡 Dica:** Para clientes B2B (empresas), sempre tente registrar o CNPJ — ele pode ser necessário para emissão de notas fiscais ou relatórios contábeis.`,

  s6p3: `# Busca e Filtros

> Aprenda a localizar clientes rapidamente usando a busca e os filtros disponíveis.

## Filtros Disponíveis

Clique em **"Filtros"** para abrir o painel:

| Filtro | Tipo | Como usar |
|--------|------|-----------|
| **Nome** | Campo de texto | Digite parte do nome — busca insensível a maiúsculas |
| **E-mail** | Campo de texto | Digite parte do e-mail |
| **Telefone** | Campo de texto | Digite parte do número |

Os filtros são aplicados **em tempo real** conforme você digita — não precisa pressionar Enter.

## Combinando Filtros

Você pode usar vários filtros simultaneamente. Ex:
- **Nome**: "Maria" + **E-mail**: "@gmail" → mostra apenas clientes chamados Maria com e-mail Gmail

## Limpando os Filtros

Clique em **"Limpar Filtros"** para remover todos os filtros e ver a lista completa.

## Ordenando a Lista

Clique no cabeçalho de qualquer coluna para ordenar:

| Coluna | Ordena por |
|--------|-----------|
| Nome | Ordem alfabética |
| E-mail | Ordem alfabética |
| Telefone | Ordem numérica |
| Endereço | Ordem alfabética |

> **💡 Dica:** Para encontrar rapidamente um cliente específico, use o filtro de **Nome** digitando as primeiras letras. Para encontrar todos os clientes de uma cidade, use o filtro de **Endereço** com o nome da cidade.`,

  s6p4: `# Importar e Exportar Clientes

> Aprenda a importar clientes em lote e exportar a base com estatísticas.

## Importar do Excel

**Baixando o modelo:**
1. Clique em **"Importar/Exportar"** > **"Baixar modelo"**
2. Abra o arquivo .xlsx no Excel

**Preenchendo o modelo:**

| Coluna | Obrigatório | Exemplo |
|--------|:-----------:|---------|
| **nome** | ✅ | Maria Souza |
| **email** | ✅ | maria@exemplo.com.br |
| **telefone** | ✅ | 11999998888 |
| **endereco** | ✅ | Rua das Flores, 123 — São Paulo/SP |
| **tipo_documento** | ❌ | CPF ou CNPJ |
| **documento** | ❌ | 12345678900 |

**Importando:**
1. Clique em **"Importar/Exportar"** > **"Importar do Excel"**
2. Selecione o arquivo preenchido
3. Confirme a importação

## Exportar para Excel

1. Aplique filtros se desejar exportar um subconjunto
2. Clique em **"Importar/Exportar"** > **"Exportar para Excel"**
3. Arquivo .xlsx com a lista de clientes é baixado

## Exportar para PDF (com Estatísticas)

O PDF de clientes é mais completo que o Excel:

1. Clique em **"Exportar PDF"**
2. O PDF inclui:
   - **Seção de estatísticas** (opcional):
     - Total de clientes
     - Clientes com CPF/CNPJ cadastrado
     - Cobertura de e-mail, telefone e endereço (%)
   - **Tabela completa** de clientes com todos os dados
   - Data e hora de geração do relatório

> **💡 Dica:** O relatório PDF com estatísticas é útil para apresentações ao time de vendas ou gestão, mostrando o tamanho e a qualidade da base de clientes.`,

};

const pages3 = {

  // ─────────────────────────────────────────────
  // SEÇÃO 7: Metas
  // ─────────────────────────────────────────────

  s7p1: `# O que são as Metas

> Entenda como as Metas funcionam no Sistema Alya e de onde vêm os valores exibidos.

## O que é uma Meta?

Uma **meta** é o valor de faturamento (receita) que a empresa espera atingir em determinado mês. No Sistema Alya, as metas são derivadas automaticamente da **Projeção Financeira** — especificamente do cenário **Previsto** (o mais conservador).

## De onde vêm os valores das Metas?

\`\`\`mermaid
flowchart LR
    PJ([📈 Projeção Financeira]) -->|cenário Previsto| MT([🎯 Metas])
    MT -->|comparativo| DB([🏠 Dashboard])
    TX([💰 Transações]) -->|realizado| DB
    DB -->|Faturamento Real vs Meta| GRAFICO([Gráfico Meta vs Real])
\`\`\`

1. Você configura a **Projeção Financeira** definindo valores esperados para cada mês
2. O cenário **Previsto** dessa projeção vira a **Meta mensal**
3. O Dashboard compara a meta com as transações reais de cada mês

## Se não houver Projeção configurada

Sem projeção, o módulo de Metas exibirá valores zerados e o Dashboard não terá comparativo de meta vs. real. Configure a Projeção antes de usar as Metas.

## O que o módulo de Metas exibe?

- **Nome e valor da meta** de cada mês
- **Total anual** somando todos os meses
- **Indicador visual** de status (atingida, abaixo, acima)
- Navegação mês a mês

> **💡 Dica:** Acesse o módulo **Projeção** primeiro para configurar os valores de cada mês. Depois, as Metas serão preenchidas automaticamente.`,

  s7p2: `# Acompanhamento Mensal

> Aprenda a navegar entre meses e interpretar os indicadores de performance das Metas.

## Navegando entre Meses

No topo da tela de Metas há um **seletor de mês** com setas para avançar ou recuar:

- Clique em **‹** para ir ao mês anterior
- Clique em **›** para ir ao próximo mês
- O mês selecionado é exibido em destaque no topo

## Lendo os Indicadores

| Indicador | O que significa |
|-----------|----------------|
| ✅ **Verde** | Meta atingida ou superada — receita real ≥ meta |
| ⚠️ **Amarelo** | Próximo da meta — receita entre 80% e 99% da meta |
| ❌ **Vermelho** | Abaixo da meta — receita real < 80% da meta |

## Visualização Anual

Abaixo do seletor de mês, o sistema exibe os **12 meses do ano** com seus respectivos valores e status. Isso permite uma visão rápida de quais meses foram fortes e quais precisam de atenção.

## Meta vs. Real no Dashboard

Para ver o gráfico comparativo de Meta vs. Real em detalhe, acesse o **Dashboard** e selecione o período mensal desejado. O gráfico de barras mostra a meta (azul) ao lado do realizado (âmbar).

> **💡 Dica:** Se a meta de um mês específico parecer incorreta, verifique a **Projeção Financeira** para esse mês e ajuste o cenário Previsto conforme necessário.`,

  s7p3: `# Exportar Metas (PDF)

> Aprenda a gerar e baixar o relatório de metas em PDF.

## Gerando o Relatório de Metas

1. Acesse o módulo **Metas**
2. Clique no botão **"Exportar PDF"** (canto superior direito)
3. O PDF é gerado e baixado automaticamente

## O que está incluído no PDF

- **Cabeçalho** com nome do sistema e data de geração
- **Tabela anual** com todos os 12 meses e seus valores de meta
- **Total anual** somado
- **Indicadores de status** para cada mês (quando há dados de transações disponíveis para comparação)

## Quando usar o Relatório de Metas

- Apresentar para o time as metas do período
- Documentar o planejamento financeiro
- Comparar trimestres em reuniões de resultados
- Arquivar como registro do planejamento

> **💡 Dica:** Gere o PDF de metas no início de cada mês ou trimestre para ter um documento de referência do que foi planejado. Isso facilita a análise ao final do período.`,

  // ─────────────────────────────────────────────
  // SEÇÃO 8: Relatórios
  // ─────────────────────────────────────────────

  s8p1: `# Tipos de Período

> Entenda as quatro visões de período disponíveis nos Relatórios e quando usar cada uma.

## Os Quatro Períodos

| Período | Granularidade | Melhor para |
|---------|--------------|-------------|
| **Semana** | 7 dias | Acompanhamento operacional semanal |
| **Mês** | ~30 dias | Análise mensal de desempenho |
| **Trimestre** | ~90 dias | Revisões trimestrais de resultado |
| **Ano** | ~365 dias | Visão estratégica anual |

## Selecionando o Período

Na parte superior dos Relatórios há quatro botões de período. Clique no desejado para alternar a visão. Um indicador deslizante mostra qual está selecionado.

## Navegando entre Períodos

Use as setas **‹ ›** ao lado do nome do período para avançar ou recuar:

- No modo **Semana**: avança 7 dias por vez
- No modo **Mês**: avança 1 mês por vez
- No modo **Trimestre**: avança 3 meses por vez
- No modo **Ano**: avança 1 ano por vez

## Comparativo com Período Anterior

Independentemente do período selecionado, o sistema sempre calcula automaticamente as variações em relação ao **período imediatamente anterior**. As variações aparecem como percentuais com indicadores visuais (↑ verde para crescimento, ↓ vermelho para queda).

> **💡 Dica:** Para análise de tendências de longo prazo, alterne entre mês e trimestre. Para monitoramento do dia a dia, use a visão semanal.`,

  s8p2: `# Indicadores Explicados

> Aprenda a ler e interpretar os quatro cards de indicadores do módulo de Relatórios.

## Os Quatro Cards de Resumo

### 💚 Receitas
- **O que mostra:** Total de receitas (entradas) no período selecionado
- **Variação:** Percentual de crescimento ou queda vs. período anterior
- ↑ Verde: receitas cresceram | ↓ Vermelho: receitas caíram

### 🔴 Despesas
- **O que mostra:** Total de despesas (saídas) no período selecionado
- **Variação:** Percentual de variação vs. período anterior
- ↓ Verde: despesas caíram (bom!) | ↑ Vermelho: despesas subiram

### 💰 Lucro
- **O que mostra:** Receitas − Despesas no período
- **Variação:** Percentual de variação do lucro vs. período anterior
- Verde quando positivo, vermelho quando negativo (prejuízo)

### % Margem
- **O que mostra:** Lucro ÷ Receitas × 100 — eficiência da operação
- **Interpretação:**
  - Acima de 30%: margem saudável ✅
  - Entre 10% e 30%: margem moderada ⚠️
  - Abaixo de 10%: margem baixa — atenção ❌

## Variações Percentuais

As variações são calculadas assim:

\`\`\`
Variação% = ((Valor Atual − Valor Anterior) ÷ Valor Anterior) × 100
\`\`\`

> **💡 Dica:** Foque no **Lucro** e na **Margem** como principais indicadores de saúde financeira. Receitas altas com despesas fora de controle resultam em margem baixa.`,

  s8p3: `# Gráficos de Categoria

> Entenda os gráficos de categorias e o ranking de produtos nos Relatórios.

## Gráfico: Receitas por Categoria

Pizza mostrando como as **receitas estão distribuídas** entre as categorias de receita. Cada fatia representa uma categoria (ex: Vendas de Produtos, Prestação de Serviços, etc.).

- Passe o mouse sobre cada fatia para ver o **valor exato** e o percentual
- Útil para saber qual fonte de receita é mais importante para o negócio

## Gráfico: Despesas por Categoria

Pizza mostrando como as **despesas estão distribuídas** entre as categorias de despesa. Cada fatia representa uma categoria (ex: Pessoal, Aluguel, Marketing, etc.).

- Passe o mouse sobre cada fatia para ver o valor exato
- Útil para identificar quais categorias consomem mais recursos

## Gráfico: Top 5 Produtos

Gráfico de barras listando os **5 produtos com maior receita** no período, com base na descrição das transações.

| Posição | O que mostra |
|---------|-------------|
| 1º | Produto que mais gerou receita no período |
| ... | ... |
| 5º | 5º maior gerador de receita |

## Gráfico de Evolução

Gráfico de linhas mostrando a evolução das receitas e despesas ao longo do período, quebrado por:
- **Semana**: evolução diária
- **Mês**: evolução semanal
- **Trimestre**: evolução mensal
- **Ano**: evolução mensal

> **💡 Dica:** Use as pizzas de categoria para identificar oportunidades. Se "Prestação de Serviços" representa 80% da receita mas "Vendas de Produtos" tem margem muito maior, pode ser hora de expandir as vendas.`,

  s8p4: `# Exportar Relatório PDF

> Aprenda a gerar e personalizar o relatório financeiro em PDF.

## Gerando o PDF

1. Acesse o módulo **Relatórios**
2. Clique em **"Exportar PDF"** (canto superior direito)
3. Um modal abre para você selecionar o **período customizado** do relatório:
   - **Data Início**: primeiro dia do período que quer incluir
   - **Data Fim**: último dia do período
4. Clique em **"Gerar PDF"**
5. O PDF é gerado e baixado automaticamente

## O que está incluído no PDF

- **Cabeçalho** com nome do sistema e período
- **Cards de resumo**: Receitas, Despesas, Lucro, Margem
- **Gráficos** (se exportados em formato compatível)
- **Comparativo** com o período anterior
- **Breakdown por categoria** (receitas e despesas)
- **Data e hora** de geração do relatório

## Dicas de Uso do Relatório

**Relatório mensal para gestão:**
- Data Início: primeiro dia do mês
- Data Fim: último dia do mês

**Relatório trimestral:**
- Data Início: 01/01 (ou início do trimestre)
- Data Fim: 31/03 (ou fim do trimestre)

**Relatório anual:**
- Data Início: 01/01/AAAA
- Data Fim: 31/12/AAAA

> **💡 Dica:** Gere e arquive o relatório mensal sempre no início do mês seguinte, quando todos os lançamentos do período já foram realizados. Isso cria um histórico organizado para análises futuras.`,

};

const pages4 = {

  // ─────────────────────────────────────────────
  // SEÇÃO 9: DRE
  // ─────────────────────────────────────────────

  s9p1: `# O que é o DRE

> Entenda o conceito do Demonstrativo de Resultado do Exercício de forma simples e prática.

## O DRE em uma frase

O **DRE (Demonstrativo de Resultado do Exercício)** é o "extrato de saúde financeira" da empresa — ele mostra, de forma organizada e hierárquica, quanto a empresa faturou, quanto gastou e qual foi o resultado final no período.

## Estrutura do DRE

\`\`\`mermaid
graph TD
    A[📋 DRE] --> B[RECEITAS OPERACIONAIS]
    A --> C[DESPESAS OPERACIONAIS]
    A --> D[RESULTADO LÍQUIDO]
    B --> B1[Vendas de Produtos]
    B --> B2[Prestação de Serviços]
    B --> B3[Outras Receitas]
    C --> C1[Pessoal e Salários]
    C --> C2[Aluguel e Infraestrutura]
    C --> C3[Marketing]
    C --> C4[...]
    D --> D1{Positivo?}
    D1 -->|Sim| D2[✅ Lucro]
    D1 -->|Não| D3[❌ Prejuízo]
\`\`\`

## Diferença entre DRE e Relatórios

| | Relatórios | DRE |
|-|-----------|-----|
| Visão | Por período com gráficos | Estrutura contábil hierárquica |
| Foco | Análise de tendência | Resultado final estruturado |
| Exportação | PDF com gráficos | PDF ou CSV/Excel |
| Comparativo | Período anterior | Período anterior com variação % |

## Para quem é o DRE?

O DRE é especialmente útil para:
- **Gestores** que precisam de uma visão financeira completa
- **Contadores** que precisam do demonstrativo para análise contábil
- **Investidores ou sócios** que avaliam a saúde do negócio

> **💡 Dica:** Se você nunca usou um DRE antes, pense nele como uma "conta corrente da empresa" — mostra o que entrou, o que saiu e o que sobrou (ou faltou) no período.`,

  s9p2: `# Lendo o Demonstrativo

> Aprenda a interpretar cada linha e seção do DRE no Sistema Alya.

## Navegando no DRE

No topo da tela do DRE há um painel de filtros:

| Filtro | Opções |
|--------|--------|
| **Período** | Mensal / Trimestral / Anual |
| **Mês** | Janeiro a Dezembro (apenas no modo Mensal) |
| **Ano** | Selecione o ano desejado |

Selecione o período desejado e o DRE é atualizado automaticamente.

## As Três Seções Principais

### 1. RECEITAS OPERACIONAIS (borda verde)
Lista todas as categorias de receita e seus valores no período. A última linha desta seção mostra o **Total de Receitas**.

### 2. DESPESAS OPERACIONAIS (borda vermelha)
Lista todas as categorias de despesa e seus valores. A última linha mostra o **Total de Despesas**.

### 3. RESULTADO LÍQUIDO (borda âmbar ou vermelha)
Calculado automaticamente: **Resultado = Receitas − Despesas**
- **Positivo (âmbar/verde)**: lucro no período ✅
- **Negativo (vermelho)**: prejuízo no período ❌

## Cards de Resumo (3 Cards no Topo)

| Card | O que mostra |
|------|-------------|
| **Total Receitas** | Soma de todas as receitas + % das despesas em relação às receitas |
| **Total Despesas** | Soma de todas as despesas + % em relação à receita |
| **Resultado Líquido** | Receitas − Despesas + margem líquida % |

> **💡 Dica:** A **margem líquida** (no card Resultado Líquido) é o indicador mais importante do DRE — ela mostra qual percentual da receita virou lucro. Uma margem líquida de 20% significa que, de cada R$ 100 faturados, R$ 20 sobraram.`,

  s9p3: `# Comparativo com Período Anterior

> Aprenda a usar o comparativo entre períodos para identificar tendências financeiras.

## Ativando o Comparativo

No DRE, há uma coluna adicional mostrando os valores do **período anterior** ao selecionado:

- **Mensal**: mostra o mês anterior (ex: se você está em Abril, mostra Março)
- **Trimestral**: mostra o trimestre anterior
- **Anual**: mostra o ano anterior

A coluna de comparação exibe também a **variação** (absoluta e percentual).

## Lendo as Variações

| Ícone | Cor | Significado |
|-------|-----|-------------|
| ↑ | Verde | Receitas cresceram ou Despesas diminuíram (positivo) |
| ↑ | Vermelho | Despesas cresceram (negativo) |
| ↓ | Verde | Despesas caíram (positivo) |
| ↓ | Vermelho | Receitas caíram (negativo) |

## Exemplos de Análise

**Receitas de Vendas: R$ 45.000 (atual) vs. R$ 38.000 (anterior) → +18,4%**
→ Bom sinal: vendas cresceram quase 20% em relação ao período anterior.

**Despesas de Pessoal: R$ 22.000 (atual) vs. R$ 18.000 (anterior) → +22,2%**
→ Atenção: despesas de pessoal cresceram mais do que as receitas.

**Resultado Líquido: R$ 8.000 (atual) vs. R$ 9.500 (anterior) → −15,8%**
→ Apesar de receitas maiores, as despesas cresceram mais, reduzindo o lucro.

## Label do Período Comparado

Logo acima da coluna de comparação aparece o texto **"Comparando com [período anterior]"** para deixar claro a qual período os valores de referência se referem.

> **💡 Dica:** Analise sempre as variações em conjunto. Uma queda isolada em uma categoria de receita pode não ser preocupante se as demais cresceram. O que importa é o **Resultado Líquido** final.`,

  s9p4: `# Exportar PDF e Excel/CSV

> Aprenda a exportar o DRE nos formatos disponíveis para análise e arquivamento.

## Exportar para PDF

1. Configure o DRE com o período desejado (Mensal/Trimestral/Anual + Mês/Ano)
2. Clique em **"Exportar PDF"**
3. O sistema usa o conteúdo visível na tela para gerar o PDF
4. O arquivo é baixado automaticamente

**O PDF inclui:**
- Cabeçalho com período e data de geração
- Os três cards de resumo (Receitas, Despesas, Resultado)
- Tabela hierárquica completa com todas as categorias
- Valores do período atual e anterior (se comparativo estiver ativo)
- Variações percentuais

> **⚠️ Atenção:** O PDF é gerado a partir da tela visível. Se a tela tiver muito conteúdo, pode ser gerado em múltiplas páginas automaticamente.

## Exportar para Excel/CSV

1. Configure o DRE com o período desejado
2. Clique em **"Exportar Excel"** (ou CSV)
3. Arquivo .csv é baixado com colunas estruturadas

**O CSV inclui:**
- Coluna de descrição (categoria)
- Valor do período atual
- Valor do período anterior
- Variação absoluta
- Variação percentual

**Vantagens do CSV vs. PDF:**
- CSV pode ser aberto no Excel para análise adicional, gráficos personalizados ou importação em outros sistemas
- PDF é melhor para relatórios formais e arquivamento

> **💡 Dica:** Para relatórios regulares de gestão, exporte em PDF. Para enviar ao contador ou fazer análises próprias, use o CSV/Excel.`,

  // ─────────────────────────────────────────────
  // SEÇÃO 10: Projeção Financeira
  // ─────────────────────────────────────────────

  s10p1: `# Conceito de Cenários

> Entenda os três cenários da Projeção Financeira e como usá-los estrategicamente.

## O que são Cenários?

A Projeção Financeira do Sistema Alya trabalha com **três cenários simultâneos**, permitindo que você planeje para diferentes situações de mercado.

\`\`\`mermaid
graph LR
    H([Dados Históricos]) --> G[Crescimento %]
    G --> P([Previsto])
    G --> M([Médio])
    G --> X([Máximo])

    P -->|cenário conservador| MT([Metas])
    M -->|cenário moderado| DB([Dashboard comparativo])
    X -->|cenário otimista| DB
\`\`\`

## Os Três Cenários

| Cenário | Também chamado | Quando usar |
|---------|---------------|-------------|
| **Previsto** | Mínimo / Conservador | Estimativa segura — "o pior resultado aceitável" |
| **Médio** | Moderado | Resultado mais provável em condições normais |
| **Máximo** | Otimista | Melhor cenário possível — se tudo der certo |

## Como os Cenários Afetam o Sistema

- **Cenário Previsto** → Vira as **Metas** mensais no módulo Metas
- **Todos os Cenários** → Usados nos gráficos comparativos do Dashboard

## Definindo os Percentuais de Crescimento

Para cada cenário, você define um **percentual de crescimento** aplicado sobre os dados do ano anterior:

- Ex: Previsto = +5%, Médio = +12%, Máximo = +25%
- O sistema calcula automaticamente os valores projetados para cada mês

> **💡 Dica:** Seja conservador no cenário Previsto — é ele que define suas metas. Um cenário Previsto otimista demais resultará em metas difíceis de bater e um dashboard sempre "vermelho".`,

  s10p2: `# Configurando a Projeção

> Aprenda a navegar pela tela de Projeção e a usar os dois modos de visualização.

## Acessando a Projeção

Clique em **Projeção** na barra de navegação. A tela carrega com todos os componentes da projeção.

## Dois Modos de Visualização

Na parte superior da tela há um toggle para alternar entre:

| Modo | Ícone | O que mostra |
|------|-------|-------------|
| **Gráfico** | 📊 | Cards com gráficos de linha, barras e pizza para cada componente |
| **Tabela** | 📋 | Dados numéricos editáveis mês a mês, com colunas por cenário |

**Modo Gráfico:** Ideal para apresentações e visão executiva — mostra tendências de forma visual.

**Modo Tabela:** Ideal para edição e análise detalhada — você vê e edita os valores de cada mês.

## Componentes da Projeção

A projeção é dividida em seções expansíveis:

1. **Crescimento** — Percentuais por cenário
2. **Fluxos de Receita** — Cada linha de receita da empresa
3. **Despesas Fixas** — Custos que não mudam com o volume
4. **Despesas Variáveis** — Custos proporcionais à receita/produção
5. **Investimentos** — Gastos de capital
6. **Marketing** — Investimento em aquisição de clientes

Clique em cada seção para expandi-la ou recolhê-la.

## Salvamento Automático

As alterações na Projeção são **salvas automaticamente** ao sair de um campo de edição. Não há botão de "Salvar" — o sistema registra cada mudança individualmente.

> **💡 Dica:** Comece sempre preenchendo os **Dados Históricos** (ano anterior) antes de definir os percentuais de crescimento. Os cálculos automáticos precisam de uma base histórica confiável.`,

  s10p3: `# Dados Históricos

> Entenda o papel dos dados históricos na Projeção e como inserir corretamente os valores do ano anterior.

## Por que os Dados Históricos importam?

Os dados históricos são a **base de cálculo** da projeção. O sistema aplica os percentuais de crescimento que você definir **sobre esses valores históricos** para projetar o futuro.

**Exemplo:**
- Receita Janeiro (ano anterior): R$ 50.000
- Crescimento Previsto: +10%
- Projeção Janeiro (ano atual) — Previsto: R$ **55.000**

## Onde inserir os Dados Históricos

1. Acesse a Projeção no modo **Tabela**
2. Expanda a seção de cada componente (Fluxos de Receita, Despesas, etc.)
3. Na primeira coluna de cada linha, há campos para inserir o valor do **ano anterior** para cada mês
4. Preencha os 12 meses com os valores realizados no ano anterior

## Campos de Dado Histórico

Os campos históricos são exibidos em cinza claro, diferenciando-se visualmente das colunas de projeção.

| Coluna | Descrição |
|--------|-----------|
| **Histórico** | Valor realizado no ano anterior (editável) |
| **Previsto** | Calculado: Histórico × (1 + % Previsto) |
| **Médio** | Calculado: Histórico × (1 + % Médio) |
| **Máximo** | Calculado: Histórico × (1 + % Máximo) |

## De onde tirar os dados históricos?

Use o **DRE** ou os **Relatórios** do ano anterior como fonte. Filtre por ano e exporte os totais por categoria para preencher os dados históricos com precisão.

> **⚠️ Atenção:** Dados históricos incorretos resultarão em projeções incorretas. Revise os números antes de usar o sistema de metas.`,

  s10p4: `# Percentuais de Crescimento

> Aprenda a definir os percentuais de crescimento para cada cenário da Projeção.

## O que são os Percentuais de Crescimento?

São os percentuais que o sistema aplica sobre os dados históricos para calcular os valores projetados. Cada cenário tem seu próprio percentual:

| Cenário | Exemplo | Resultado sobre R$ 100k |
|---------|---------|------------------------|
| **Previsto** | +5% | R$ 105.000 |
| **Médio** | +15% | R$ 115.000 |
| **Máximo** | +30% | R$ 130.000 |

## Onde Definir os Percentuais

1. Acesse a Projeção no modo **Tabela** ou **Gráfico**
2. Expanda a seção **"Crescimento"**
3. Para cada cenário há um campo de input de percentual
4. Digite o percentual desejado (sem o símbolo %)
5. O sistema recalcula automaticamente todos os valores projetados

## O gráfico de crescimento

No modo Gráfico, a seção de Crescimento exibe um gráfico de barras mostrando os três percentuais lado a lado — útil para visualizar a diferença entre os cenários.

## Como definir bons percentuais?

| Referência | O que considerar |
|------------|-----------------|
| Histórico recente | Qual foi o crescimento dos últimos 2-3 anos? |
| Mercado | O setor está crescendo ou retraindo? |
| Estratégia | Há ações planejadas para acelerar o crescimento? |
| Conservadorismo | O cenário Previsto deve ser realista, não otimista |

**Exemplos práticos:**
- Empresa estável no varejo: Previsto +3%, Médio +8%, Máximo +15%
- Startup em crescimento: Previsto +15%, Médio +30%, Máximo +60%

> **💡 Dica:** Revisite os percentuais a cada trimestre. Conforme o ano avança e os dados reais chegam, ajuste as projeções dos meses futuros para refletir a realidade atual.`,

  s10p5: `# Fluxos de Receita

> Aprenda a gerenciar as linhas de receita na Projeção Financeira.

## O que são Fluxos de Receita?

Fluxos de receita são as **fontes de renda** da empresa. Cada linha representa um tipo de receita diferente — ex: "Vendas Loja Física", "Vendas Online", "Consultoria", "Licenciamento".

## Visualizando os Fluxos

Na seção **"Fluxos de Receita"** da Projeção:

- Cada fluxo aparece como uma linha com 12 colunas (uma por mês)
- Cada coluna exibe três valores: Previsto / Médio / Máximo
- Os valores são calculados automaticamente a partir do histórico + crescimento

## Editando Valores (Override Manual)

Se quiser inserir um valor específico para um mês, ignorando o cálculo automático:

1. No modo **Tabela**, clique na célula desejada
2. Digite o valor manualmente
3. A célula fica destacada em **âmbar** indicando que tem um override
4. O ícone **↺** aparece na célula — clique para desfazer o override e voltar ao cálculo automático

## Totais e Subtotais

- Cada linha exibe o **total anual** à direita (soma dos 12 meses)
- A última linha da seção mostra o **Total de Receitas** para cada cenário
- Subtotais trimestrais são exibidos a cada 3 meses

## No modo Gráfico

Cada fluxo de receita tem seu próprio gráfico de linha mostrando a evolução mensal para os três cenários (Previsto/Médio/Máximo) em linhas separadas.

> **💡 Dica:** Mantenha os fluxos de receita alinhados com as categorias de receita das Transações. Isso facilita a comparação entre projetado e realizado.`,

  s10p6: `# Despesas e Investimentos

> Aprenda a projetar despesas fixas, variáveis e investimentos na Projeção Financeira.

## Tipos de Despesa na Projeção

| Tipo | Características | Exemplos |
|------|----------------|---------|
| **Fixas** | Valor constante independente do faturamento | Aluguel, salários, mensalidades |
| **Variáveis** | Mudam conforme o volume de vendas/produção | Comissões, frete, matéria-prima |
| **Investimentos** | Gastos de capital para crescimento | Equipamentos, reformas, sistemas |

## Editando Despesas

Para cada categoria de despesa:

1. Acesse o modo **Tabela**
2. Expanda a seção desejada (Despesas Fixas / Variáveis / Investimentos)
3. Clique em qualquer célula para editar o valor do mês
4. Para aplicar o mesmo valor a todos os 12 meses, edite o primeiro mês e use a funcionalidade de replicação (quando disponível)

## Overrides em Despesas

Assim como nas receitas, você pode inserir valores manuais nas células de despesa. Células com override ficam destacadas em âmbar.

## Impacto no Resultado

As despesas projetadas são subtraídas das receitas projetadas para calcular o **Resultado Projetado** de cada cenário. No Dashboard, você verá a comparação entre o resultado projetado e o resultado realizado (Transações).

## Dicas de Preenchimento

- **Despesas Fixas**: copie os valores históricos para todos os meses — elas raramente mudam
- **Despesas Variáveis**: calcule como percentual da receita projetada
- **Investimentos**: concentre nos meses em que os gastos serão realizados

> **💡 Dica:** Separe bem as despesas **operacionais** (recorrentes do dia a dia) dos **investimentos** (gastos únicos para crescimento). Misturá-los distorce a análise de rentabilidade operacional.`,

  s10p7: `# Marketing na Projeção

> Aprenda a planejar o investimento em marketing dentro da Projeção Financeira.

## A Seção de Marketing

A seção **Marketing** na Projeção permite detalhar os diferentes componentes do seu investimento em marketing — cada linha pode representar um canal, campanha ou tipo de ação.

**Exemplos de componentes:**
- Google Ads
- Instagram/Meta Ads
- Influenciadores
- Email Marketing
- SEO / Blog
- Eventos e feiras

## Como Usar

1. Acesse a Projeção no modo **Tabela**
2. Expanda a seção **"Marketing"**
3. Para cada componente, preencha os valores mês a mês (nos três cenários)
4. O total de marketing é consolidado e aparece no total de despesas

## No modo Gráfico

A seção de Marketing exibe um **gráfico empilhado** mostrando a composição do investimento em marketing ao longo dos 12 meses, com cada componente em uma cor diferente. Isso facilita visualizar como o mix de canais muda ao longo do ano.

## Relação com Receitas

Uma projeção saudável deve correlacionar investimento em marketing com crescimento de receita. Use os dados históricos para entender qual retorno cada R$ investido em marketing gerou.

> **💡 Dica:** Se sua empresa tem sazonalidade (ex: pico no Natal ou Dia das Mães), reflita isso na projeção de marketing — aumente o investimento nos meses de pico e reduza nos meses fracos.`,

  s10p8: `# Overrides Manuais

> Entenda o que são os overrides manuais, como aplicá-los e quando usá-los.

## O que é um Override Manual?

Um **override manual** é quando você substitui o valor calculado automaticamente pelo sistema (baseado em histórico + crescimento) por um valor que você mesmo digita diretamente.

Isso é útil quando você tem informação específica sobre um mês que o cálculo automático não captura — por exemplo, um contrato garantido, uma sazonalidade conhecida ou uma decisão estratégica.

## Identificando Células com Override

Células com override têm aparência visual diferente:

| Estado | Aparência | Significado |
|--------|-----------|-------------|
| Normal | Branco / cinza | Valor calculado automaticamente |
| Override | **Fundo âmbar** | Valor inserido manualmente |
| Com override | Ícone **↺** visível | Clique para desfazer o override |

## Aplicando um Override

1. No modo **Tabela**, localize a célula que deseja editar
2. Clique na célula e digite o novo valor
3. Pressione **Enter** ou clique fora da célula
4. A célula fica com fundo âmbar — o override foi aplicado ✅

## Desfazendo um Override

1. Localize a célula com o ícone **↺** (âmbar)
2. Clique no ícone **↺**
3. O valor retorna ao cálculo automático e a célula volta ao estado normal

## Dica importante: Tooltip informativo

Passe o mouse sobre qualquer célula para ver um tooltip indicando:
- Se o valor é **calculado automaticamente**: "Valor calculado automaticamente"
- Se há override: "Valor com override manual"

> **⚠️ Atenção:** Use overrides com parcimônia. Muitos overrides manuais podem mascarar tendências e dificultar a revisão da projeção. Prefira ajustar os percentuais de crescimento quando possível.`,

};

const pages5 = {

  // ─────────────────────────────────────────────
  // SEÇÃO 11: Nuvemshop
  // ─────────────────────────────────────────────

  s11p1: `# Conectando sua Loja Nuvemshop

> Passo a passo para conectar sua loja Nuvemshop ao Sistema Alya.

## Pré-requisitos

Para conectar sua loja você vai precisar de:
1. **Access Token** da API Nuvemshop
2. **Store ID** (ID da sua loja)

## Como obter as Credenciais

\`\`\`mermaid
flowchart TD
    A([Acesse sua conta Nuvemshop]) --> B[Vá em Configurações]
    B --> C[Clique em API ou Integrações]
    C --> D[Crie um novo acesso / app]
    D --> E[Copie o Access Token e o Store ID]
    E --> F([Use no Sistema Alya])
\`\`\`

1. Acesse o painel da Nuvemshop em **loja.nuvemshop.com.br**
2. Vá em **Configurações > Integrações > API Nuvemshop**
3. Gere ou copie o **Access Token**
4. Anote também o **Store ID** (número da loja, geralmente visível na URL do painel)

> **⚠️ Atenção:** O Access Token é uma credencial de segurança. Não compartilhe com terceiros.

## Conectando no Sistema Alya

1. Clique em **Nuvemshop** na barra de navegação
2. A tela de conexão aparece com dois campos:
   - **Access Token**: cole o token copiado da Nuvemshop
   - **Store ID**: insira o número da sua loja
3. Clique em **"Conectar loja"**
4. Aguarde a verificação (pode levar alguns segundos)
5. Se as credenciais estiverem corretas, o status muda para **Conectado** ✅

## Após Conectar

O sistema exibirá automaticamente:
- Nome da loja e link direto para o painel Nuvemshop
- Status dos webhooks (ativo/inativo)
- Data da última sincronização de pedidos, produtos e clientes`,

  s11p2: `# Sincronização de Dados

> Aprenda a sincronizar pedidos, produtos e clientes entre a Nuvemshop e o Sistema Alya.

## O que é sincronizado?

| Dado | O que é importado |
|------|------------------|
| **Pedidos** | Número, data, valor, status — viram Transações do tipo Receita |
| **Produtos** | Nome, preço, estoque — aparecem no módulo Produtos |
| **Clientes** | Nome, e-mail, telefone — aparecem no módulo Clientes |

## Sincronização Manual

Para acionar manualmente a sincronização:

1. Acesse **Nuvemshop** (certifique-se que a loja está conectada)
2. Clique em um dos três botões de sync:
   - **"Sincronizar Pedidos"** 🛒
   - **"Sincronizar Produtos"** 🛍️
   - **"Sincronizar Clientes"** 👥
3. Aguarde a mensagem de confirmação com o resumo da sincronização

## Resultado da Sincronização

Após cada sync, um resumo é exibido:
- ✅ **Importados**: novos registros criados
- 🔄 **Atualizados**: registros existentes atualizados
- ⏭️ **Ignorados**: registros sem alteração
- ❌ **Erros**: registros que falharam (com descrição)

## Fluxo completo

\`\`\`mermaid
sequenceDiagram
    participant U as Usuário
    participant A as Sistema Alya
    participant N as Nuvemshop API

    U->>A: Clica em Sincronizar Pedidos
    A->>N: GET /orders (desde último sync)
    N-->>A: Lista de pedidos
    A->>A: Cria/atualiza Transações
    A-->>U: Resumo: X importados, Y atualizados
\`\`\`

> **💡 Dica:** Sincronize pedidos **diariamente** para manter o Dashboard e os Relatórios atualizados com as vendas da loja online.`,

  s11p3: `# Entendendo o Saldo Pendente

> Aprenda a interpretar o cálculo de saldo pendente da Nuvemshop no Sistema Alya.

## O que é o Saldo Pendente?

O **Saldo Pendente** representa o valor que a Nuvemshop deve transferir para sua conta bancária — ou seja, as receitas das vendas online que ainda não foram sacadas.

**Fórmula:**
\`\`\`
Saldo Pendente = Faturamento Total − Total de Saques
\`\`\`

## Card de Saldo no Sistema

O módulo Nuvemshop exibe um card de saldo com:

| Campo | Descrição |
|-------|-----------|
| **Faturamento Total** | Soma de todos os pedidos importados |
| **Total de Saques** | Soma de todos os saques registrados |
| **Saldo Pendente** | Faturamento − Saques |

O saldo é exibido em **azul** quando positivo (Nuvemshop te deve) e em **vermelho** quando negativo (você sacou mais do que vendeu — provavelmente há pedidos não sincronizados).

## Por que o saldo pode estar incorreto?

Situações que causam divergência:

| Situação | Causa | Solução |
|----------|-------|---------|
| Saldo muito alto | Saques não registrados no sistema | Registre os saques (ver próxima página) |
| Saldo negativo | Pedidos não sincronizados | Execute a sincronização de pedidos |
| Saldo zerado sempre | Sem transações importadas | Verifique a conexão e sincronize |

> **💡 Dica:** Compare o saldo no Sistema Alya com o saldo exibido no painel da Nuvemshop regularmente. Se houver grande divergência, verifique se todos os pedidos foram sincronizados e todos os saques foram registrados.`,

  s11p4: `# Registrando Saques

> Aprenda a registrar os saques da Nuvemshop para manter o saldo pendente correto.

## Por que registrar saques manualmente?

A API da Nuvemshop não fornece automaticamente os dados de saque para o Sistema Alya. Por isso, cada vez que você recebe uma transferência da Nuvemshop, você precisa **registrar manualmente como uma despesa** no módulo de Transações.

## Como registrar um Saque

1. Acesse o módulo **Transações**
2. Clique em **"+ Nova Transação"**
3. Preencha:
   - **Data**: data do saque (transferência recebida)
   - **Descrição**: "Saque Nuvemshop" (use exatamente este nome para o sistema identificar)
   - **Valor**: valor do saque
   - **Tipo**: **Despesa**
   - **Categoria**: Outras Despesas (ou crie uma categoria "Saques Nuvemshop")
4. Clique em **"Salvar"**

O sistema identificará automaticamente a transação como saque e atualizará o saldo pendente.

## Atalho no módulo Nuvemshop

No card de saldo da tela Nuvemshop há um **link direto** que leva você para a tela de Transações com o formulário de nova transação pré-preenchido para facilitar o registro do saque.

## Verificação do Saldo

Após registrar o saque:
1. Volte para o módulo **Nuvemshop**
2. Confira se o **Saldo Pendente** diminuiu corretamente

> **⚠️ Atenção:** Registre os saques **na mesma data em que a transferência cai na sua conta** para manter a conciliação financeira correta.`,

  s11p5: `# Webhooks

> Entenda o que são os webhooks e como eles mantêm os dados da Nuvemshop atualizados automaticamente.

## O que é um Webhook?

Um **webhook** é um mecanismo de notificação automática. Quando um evento ocorre na Nuvemshop (ex: novo pedido criado), a plataforma envia automaticamente uma notificação para o Sistema Alya, que registra o evento **sem precisar de sincronização manual**.

\`\`\`mermaid
sequenceDiagram
    participant C as Cliente
    participant N as Nuvemshop
    participant A as Sistema Alya

    C->>N: Faz um pedido na loja
    N->>A: Webhook: novo pedido criado
    A->>A: Registra transação automaticamente
    Note over A: Sem intervenção do usuário
\`\`\`

## Verificando o Status dos Webhooks

Na tela de Nuvemshop (quando conectado), você verá um indicador de status:
- 🟢 **Webhooks ativos**: notificações automáticas funcionando
- 🔴 **Webhooks inativos**: sincronização automática não está funcionando

## Quando os Webhooks não Funcionam

Se os webhooks estiverem inativos:
- **Novos pedidos NÃO serão registrados automaticamente**
- Você precisará sincronizar manualmente com o botão "Sincronizar Pedidos"

**Como resolver:**
1. Desconecte a loja
2. Reconecte com as mesmas credenciais
3. O sistema tentará reativar os webhooks automaticamente

> **💡 Dica:** Mesmo com webhooks ativos, execute uma **sincronização manual semanal** como verificação de segurança para garantir que nenhum pedido foi perdido.`,

  s11p6: `# Desconectando a Loja

> Saiba o que acontece ao desconectar a integração com a Nuvemshop e como proceder.

## Quando Desconectar

Você pode querer desconectar a Nuvemshop nos seguintes casos:
- Trocar de loja ou store ID
- Revogar o token de acesso por segurança
- Parar temporariamente a integração

## Como Desconectar

1. Acesse o módulo **Nuvemshop**
2. Clique em **"Desconectar loja"** (botão na seção de status)
3. Confirme a desconexão no diálogo

## O que é Preservado após Desconectar?

| Dado | Preservado? |
|------|:-----------:|
| Pedidos já importados como Transações | ✅ Sim |
| Produtos já sincronizados | ✅ Sim |
| Clientes já sincronizados | ✅ Sim |
| Credenciais (Access Token / Store ID) | ❌ Removidas |
| Status de conexão | ❌ Resetado |

**Em resumo:** Tudo que já foi importado **permanece** no sistema. Apenas a conexão ativa e as credenciais são removidas.

## Reconectando

Para reconectar após desconectar:
1. Acesse **Nuvemshop**
2. A tela de conexão volta a aparecer
3. Insira novamente o Access Token e Store ID
4. Clique em "Conectar loja"

> **💡 Dica:** Antes de desconectar, execute uma última sincronização de todos os dados (pedidos, produtos e clientes) para garantir que nada ficou pendente.`,

  // ─────────────────────────────────────────────
  // SEÇÃO 12: FAQ
  // ─────────────────────────────────────────────

  s12p1: `# Usando o FAQ

> Aprenda a usar o FAQ para encontrar respostas rápidas sobre o Sistema Alya.

## O que é o FAQ?

O **FAQ (Perguntas Frequentes)** é uma seção com respostas às dúvidas mais comuns sobre o uso do Sistema Alya. É mantido pelos administradores e atualizado conforme novas dúvidas surgem.

## Acessando o FAQ

- **Dentro do sistema**: clique em **FAQ** na barra de navegação
- **Na tela de login**: o FAQ também aparece na parte inferior da tela de login, sem precisar estar autenticado

## Buscando uma Resposta

1. Acesse o FAQ
2. No campo de busca no topo, digite sua dúvida (palavras-chave)
3. As perguntas e respostas são filtradas em tempo real
4. Clique em uma pergunta para expandir e ver a resposta completa
5. Clique novamente para recolher

## Dicas de Busca

| Situação | O que digitar |
|----------|--------------|
| Dúvida sobre transações | "transação" ou "lançamento" |
| Problema com importação | "importar" ou "excel" |
| Dúvida sobre relatório | "relatório" ou "pdf" |
| Problema de acesso | "senha" ou "login" |

## Atalho para limpar a busca

Se a busca não retornou resultados e você quer voltar à lista completa, clique no botão **"Limpar busca"** (ícone X) que aparece ao lado do campo.

> **💡 Dica:** Se não encontrar sua resposta no FAQ, use o **botão de feedback** (💬) no canto inferior direito para enviar sua dúvida diretamente aos administradores.`,

  s12p2: `# Não encontrei minha resposta

> Saiba o que fazer quando sua dúvida não está no FAQ.

## Opções quando o FAQ não ajuda

### 1. Enviar um Feedback de Dúvida

É a forma mais direta de obter ajuda:

1. Clique no **botão âmbar** (💬) no canto inferior direito
2. Selecione a categoria **"Dúvida"**
3. Descreva sua dúvida com detalhes:
   - Qual módulo você estava usando?
   - O que você tentou fazer?
   - O que aconteceu (ou não aconteceu)?
4. Adicione uma captura de tela se ajudar a ilustrar o problema
5. Envie — o administrador receberá sua dúvida e poderá respondê-la

### 2. Consultar a Documentação

Além do FAQ, o Sistema Alya tem a seção de **Documentação** com guias completos sobre todos os módulos. Acesse via **Documentação** na barra de navegação.

### 3. Contato direto com o administrador

Se sua empresa tem um administrador do sistema, você pode entrar em contato diretamente por e-mail ou mensagem.

## Ciclo de Dúvida → Resposta

\`\`\`mermaid
flowchart LR
    D([❓ Dúvida]) --> F[Buscar no FAQ]
    F --> E{Encontrou?}
    E -->|Sim| R([✅ Respondido])
    E -->|Não| FB[Enviar Feedback\ncategoria Dúvida]
    FB --> ADM[Admin recebe\ne responde]
    ADM --> FAQ2[Dúvida pode virar\nnova entrada no FAQ]
    ADM --> R
\`\`\`

> **💡 Dica:** Seja específico ao descrever sua dúvida. Uma boa descrição recebe uma resposta mais rápida e mais útil.`,

  // ─────────────────────────────────────────────
  // SEÇÃO 13: Roadmap
  // ─────────────────────────────────────────────

  s13p1: `# Lendo o Roadmap

> Entenda o que é o Roadmap do Sistema Alya e como interpretar o quadro kanban.

## O que é o Roadmap?

O **Roadmap** é uma visão pública do que está sendo desenvolvido e planejado para o Sistema Alya. Ele mostra o progresso das melhorias, correções e novas funcionalidades de forma transparente para toda a equipe.

## Estrutura: Quadro Kanban

O Roadmap é organizado em colunas — cada uma representa uma fase do desenvolvimento:

\`\`\`mermaid
graph LR
    A([📋 Backlog]) --> B([⚡ Doing])
    B --> C([🧪 Em Testes])
    C --> D([🔵 Em Beta])
    D --> E([✅ Lançado])
    E -.-> F([📦 Done])
\`\`\`

| Coluna | Ícone | O que significa |
|--------|-------|----------------|
| **Backlog** | 📋 | Planejado, ainda não começou |
| **Doing** | ⚡ | Em desenvolvimento ativo |
| **Em Testes** | 🧪 | Desenvolvido, sendo testado |
| **Em Beta** | 🔵 | Disponível para teste por usuários selecionados |
| **Lançado** | ✅ | Disponível para todos os usuários |
| **Done** | 📦 | Concluído e arquivado |

## Informações de cada Card

Cada item do Roadmap exibe:
- **Título** da funcionalidade ou melhoria
- **Descrição** (expandível ao clicar)
- **Prioridade**: Baixa (🟢) / Média (🟡) / Alta (🔴)
- **Data de início** (se definida)
- **Quem criou** o item
- **Dependências** (se o item depende de outro)`,

  s13p2: `# Status e Prioridades

> Aprenda o significado de cada status e prioridade no Roadmap do Sistema Alya.

## Status Detalhados

### 📋 Backlog
Item identificado e planejado, mas ainda aguardando início. Pode ser uma sugestão de usuário aceita, uma correção identificada ou uma funcionalidade futura.

### ⚡ Doing
Item em desenvolvimento ativo — alguém está trabalhando nele agora. O campo **"Tempo Acumulado"** mostra quantas horas foram dedicadas até o momento.

### 🧪 Em Testes
Desenvolvimento concluído, passando por testes internos de qualidade. Ainda pode voltar para Doing se bugs forem encontrados.

### 🔵 Em Beta
Disponível em ambiente de produção para um grupo restrito de usuários. Feedback deste estágio é muito valioso.

### ✅ Lançado
Funcionalidade disponível para todos os usuários. Se você não vê a funcionalidade descrita, pode ser necessário atualizar a página ou o cache do navegador.

### 📦 Done
Item completamente finalizado e arquivado. Representa o histórico de tudo que já foi entregue.

## Prioridades

| Prioridade | Badge | Quando usar |
|------------|-------|-------------|
| **Baixa** | 🟢 Verde | Melhorias desejáveis, sem urgência |
| **Média** | 🟡 Âmbar | Importante, planejado para breve |
| **Alta** | 🔴 Vermelho | Urgente, impacta operação ou muitos usuários |

## Dependências entre Itens

Um item pode **depender de outro** — isso significa que ele não pode começar até que o item do qual depende seja concluído. Quando há dependência, ela aparece no card como referência ao item bloqueante.`,

  s13p3: `# Gerenciando itens do Roadmap

> **(Administradores e Super Administradores)** — Aprenda a criar, editar e mover itens no Roadmap.

> 🔒 **Apenas administradores** podem criar, editar e excluir itens do Roadmap.

## Criando um Novo Item

1. Acesse **Roadmap** na barra de navegação
2. Clique em **"+ Adicionar Tarefa"**
3. Preencha o formulário:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Título** | ✅ | Nome da funcionalidade ou melhoria |
| **Descrição** | ❌ | Detalhes do que será implementado |
| **Status** | ✅ | Fase inicial (geralmente Backlog) |
| **Prioridade** | ✅ | Baixa / Média / Alta |
| **Data de Início** | ❌ | Quando o desenvolvimento começará |
| **Depende de** | ❌ | Selecione um item bloqueante se houver |

4. Clique em **"Salvar"**

## Editando um Item

1. Clique no card do item
2. Clique no ícone de **edição** (✏️)
3. Altere os campos desejados
4. Clique em **"Salvar"**

## Movendo entre Colunas (Drag & Drop)

1. Clique e segure no card que deseja mover
2. Arraste para a coluna de destino
3. Solte o card — o status é atualizado automaticamente

## Excluindo um Item

1. Clique no card do item
2. Clique no ícone de **lixeira** (🗑️)
3. Confirme a exclusão

## Vinculando um Feedback ao Roadmap

No **Admin > Feedbacks**, ao aceitar um feedback, você pode vincular diretamente a um item do Roadmap existente ou criar um novo item automaticamente.`,

};

const pages6 = {

  // ─────────────────────────────────────────────
  // SEÇÃO 14: Administração
  // ─────────────────────────────────────────────

  s14p1: `# Visão Geral do Painel Admin

> **(Administradores)** — Conheça o Painel Administrativo e o que cada aba oferece.

> 🔒 **Apenas administradores e super administradores** têm acesso ao Painel Admin.

## Acessando o Painel Admin

Clique em **Admin** na barra de navegação. Se você não vê esta aba, sua conta não tem permissão de administrador.

## Abas do Painel Admin

| Aba | Quem acessa | Para que serve |
|-----|:-----------:|----------------|
| **Usuários** | Admin + Superadmin | Gerenciar contas de usuários |
| **Módulos** | Superadmin apenas | Ativar/desativar/reordenar módulos |
| **Atividades** | Admin + Superadmin | Ver log de ações do sistema |
| **Estatísticas** | Admin + Superadmin | KPIs e métricas do sistema |
| **FAQ** | Admin + Superadmin | Gerenciar perguntas frequentes |
| **Feedbacks** | Admin + Superadmin | Visualizar e responder feedbacks |
| **Documentação** | Admin + Superadmin | Criar e editar páginas de documentação |

## Diferença Admin vs. Superadmin no Painel

| Funcionalidade | Admin | Superadmin |
|----------------|:-----:|:----------:|
| Todas as abas acima | ✅ | ✅ |
| Aba **Módulos** | ❌ | ✅ |
| Impersonar usuários | ❌ | ✅ |
| Módulos de Segurança | ❌ | ✅ |

> **💡 Dica:** O Painel Admin é o centro de controle do sistema. Acesse-o periodicamente para verificar as estatísticas, revisar feedbacks pendentes e manter o FAQ atualizado.`,

  s14p2: `# Gerenciando Usuários

> **(Administradores)** — Aprenda a listar, buscar e filtrar usuários no Painel Admin.

> 🔒 **Apenas administradores** têm acesso à gestão de usuários.

## Acessando a Gestão de Usuários

No Painel Admin, clique na aba **"Usuários"**.

## Visualizando a Lista

A lista exibe todos os usuários cadastrados com:
- Avatar / iniciais
- Nome de usuário e nome completo
- E-mail
- Função (papel)
- Status (ativo/inativo)
- Última data de acesso
- Ações disponíveis

## Buscando Usuários

No campo de busca no topo da lista, você pode buscar por:
- **Nome de usuário** (username)
- **Nome completo** (primeiro nome ou sobrenome)
- **E-mail**
- **Telefone**

A busca é em tempo real — os resultados aparecem conforme você digita.

## Filtrando por Função e Status

| Filtro | Opções |
|--------|--------|
| **Função** | Todos / Superadmin / Admin / Usuário / Visitante |
| **Status** | Todos / Ativo / Inativo |

Use os filtros em combinação para encontrar usuários específicos. Ex: filtrar "Admin + Ativos" para ver todos os administradores ativos.

## Ações disponíveis por usuário

| Ícone | Ação |
|-------|------|
| ✏️ | Editar dados e permissões |
| 🗑️ | Excluir usuário (confirmação necessária) |
| 🔑 | Redefinir senha (força novo primeiro acesso) |
| 👤 | Impersonar usuário *(superadmin apenas)* |`,

  s14p3: `# Criando e Convidando Usuários

> **(Administradores)** — Aprenda as duas formas de criar novos usuários no sistema.

> 🔒 **Apenas administradores** podem criar novos usuários.

## Dois Modos de Criação

### Criação Simples
Cria o usuário rapidamente com dados básicos.

1. Na aba **Usuários**, clique em **"+ Novo Usuário"**
2. Selecione **Criação Simples**
3. Preencha:
   - **Username** (obrigatório e único)
   - **E-mail** (obrigatório)
   - **Função** (Admin / Usuário / Visitante)
4. Clique em **"Criar"**

### Criação Completa
Cria o usuário com todos os dados do perfil já preenchidos.

1. Selecione **Criação Completa**
2. Preencha todos os campos disponíveis (nome, telefone, cargo, etc.)
3. Clique em **"Criar"**

## Fluxo de Convite

\`\`\`mermaid
flowchart TD
    A([Admin cria usuário]) --> B[Sistema gera senha temporária]
    B --> C[Modal exibe:\nUsername\nEmail\nFunção\nLink de acesso\nSenha temporária]
    C --> D[Admin compartilha credenciais\ncom o novo usuário]
    D --> E([Usuário faz primeiro login])
    E --> F[Sistema exibe nova senha gerada]
    F --> G([Usuário acessa o sistema ✅])
\`\`\`

## O Convite

Após criar o usuário, um modal exibe:
- **Username** criado
- **E-mail** cadastrado
- **Link de acesso** ao sistema
- **Senha temporária** para o primeiro acesso

Compartilhe essas informações com o novo usuário por e-mail ou mensagem.

> **💡 Dica:** Para simplificar o processo, copie todas as informações do modal e envie em uma única mensagem para o novo usuário.`,

  s14p4: `# Editando Perfil e Permissões

> **(Administradores)** — Aprenda a alterar a função, módulos e dados de um usuário.

> 🔒 **Apenas administradores** podem editar perfis de outros usuários.

## Abrindo a Edição

1. Na lista de usuários, localize o usuário
2. Clique no ícone de **edição** (✏️)
3. O modal de edição abre com todos os dados atuais

## Dados Editáveis

| Campo | Descrição |
|-------|-----------|
| Username | Nome de usuário (único no sistema) |
| E-mail | E-mail de contato e recuperação de senha |
| Primeiro Nome | Nome de exibição |
| Sobrenome | Sobrenome |
| Telefone | Número com DDD |
| Cargo / Posição | Cargo na empresa |
| Função (Papel) | Admin / Usuário / Visitante |
| Status | Ativo / Inativo |

## Alterando a Função (Papel)

Ao alterar a **Função** de um usuário:

- Os **módulos do usuário são atualizados automaticamente** para os módulos padrão da nova função
- **Atenção:** Isso sobrescreve qualquer configuração personalizada de módulos

## Gerenciando Módulos Individualmente

Abaixo dos dados básicos há uma seção de **Módulos**:
- Cada módulo ativo do sistema aparece com um checkbox
- Marque/desmarque para liberar ou restringir o acesso
- Clique em **"Salvar"** para aplicar

> **⚠️ Atenção:** Ao salvar com a função alterada, os módulos são redefinidos para o padrão da nova função. Se precisar de configuração personalizada, primeiro salve a função, depois abra novamente e ajuste os módulos.`,

  s14p5: `# Redefinir Senha de Usuário

> **(Administradores)** — Aprenda a redefinir a senha de um usuário individual ou de todos os usuários.

> 🔒 **Apenas administradores** podem redefinir senhas de usuários.

## Redefinir Senha Individual

Útil quando um usuário esqueceu a senha e não consegue usar o fluxo de "Esqueci minha senha".

1. Na lista de usuários, localize o usuário
2. Clique no ícone de **chave** (🔑) ao lado do usuário
3. Confirme a redefinição
4. O sistema redefine o acesso: o usuário precisará fazer o **primeiro acesso** novamente com uma nova senha temporária

**Após a redefinição:**
- O usuário recebe uma nova senha temporária
- No próximo login, será exibida a senha temporária gerada
- O usuário deve copiá-la e alterar depois

## Redefinir Senhas de Todos os Usuários

> **⚠️ Use com extremo cuidado — afeta TODOS os usuários do sistema.**

Útil em situações de vazamento de credenciais ou auditoria de segurança.

1. Na aba Usuários, clique em **"Redefinir todas as senhas"**
2. Um aviso grande é exibido com a lista de usuários afetados
3. Confirme digitando o código de segurança solicitado
4. O sistema redefine o acesso de todos os usuários

**O que acontece:**
- Todos os usuários são deslogados imediatamente
- Todos precisarão fazer o primeiro acesso novamente
- Os administradores também são afetados (incluindo quem executou a ação)

> **💡 Dica:** Após uma redefinição em massa, comunique imediatamente todos os usuários para que saibam que precisarão refazer o login com nova senha temporária.`,

  s14p6: `# Impersonar Usuário

> **(Super Administradores)** — Aprenda a usar o recurso de impersonação para suporte e diagnóstico.

> 🔒 **Apenas super administradores** podem impersonar usuários.

## O que é Impersonação?

Impersonar um usuário permite navegar no sistema **exatamente como aquele usuário vê** — com os mesmos módulos, dados e permissões. É útil para:

- Diagnosticar problemas reportados por um usuário específico
- Verificar se as permissões estão configuradas corretamente
- Dar suporte sem precisar pedir que o usuário compartilhe a tela

## Como Impersonar

1. No Painel Admin > Usuários, localize o usuário
2. Clique no ícone de **avatar/pessoa** (👤) ao lado do usuário
3. O sistema troca automaticamente para a sessão do usuário selecionado

## Banner de Impersonação

Enquanto estiver impersonando, um **banner âmbar** aparece no topo de todas as telas:

> *"Você está visualizando o sistema como **[Nome do Usuário]** (@username · função)"*

Com um botão **"Voltar para minha conta"** para encerrar a impersonação.

## Voltando para sua Conta

1. Clique em **"Voltar para minha conta"** no banner âmbar, **OU**
2. Acesse o Menu do Usuário > "Encerrar impersonação"

Sua sessão original é restaurada completamente.

> **⚠️ Atenção:** Durante a impersonação, você **não pode realizar ações destrutivas** em nome do usuário. O recurso é somente para visualização e diagnóstico. Qualquer ação realizada durante a impersonação é registrada no log de atividades como "superadmin impersonando [usuário]".`,

  s14p7: `# Gerenciando Módulos

> **(Super Administradores)** — Aprenda a ativar, desativar, reordenar e criar módulos no sistema.

> 🔒 **Apenas super administradores** têm acesso à aba Módulos.

## Acessando o Gerenciamento de Módulos

No Painel Admin, clique na aba **"Módulos"**.

## Lista de Módulos

Cada módulo é exibido com:
- **Ícone e nome** do módulo
- **Chave** (key) técnica do módulo
- **Status**: Ativo 🟢 ou Inativo 🔴
- **Tipo**: Sistema (🛡️ não pode ser excluído) ou Personalizado

## Ativando/Desativando um Módulo

Clique no toggle de **Ativo/Inativo** ao lado do módulo. Um módulo inativo:
- **Desaparece da barra de navegação** de todos os usuários
- **Não pode ser acessado** por ninguém (mesmo superadmins)
- O módulo **"Admin"** não pode ser desativado (protegido)

## Reordenando Módulos

1. Clique e segure o ícone de **arraste** (⠿) ao lado do módulo
2. Arraste para a posição desejada
3. Solte — a nova ordem é salva automaticamente
4. A barra de navegação dos usuários refletirá a nova ordem

## Criando um Módulo Personalizado

1. Clique em **"+ Novo Módulo"**
2. Preencha:
   - **Nome**: como aparecerá na barra de navegação
   - **Chave**: identificador único (sem espaços, ex: "meu-modulo")
   - **Ícone**: nome do ícone do Lucide React
   - **Descrição**: para que serve o módulo
3. Clique em **"Criar"**

> **⚠️ Atenção:** Módulos do sistema (marcados com 🛡️) não podem ser excluídos — apenas desativados. Apenas módulos personalizados podem ser excluídos.`,

  s14p8: `# Gerenciando o FAQ

> **(Administradores)** — Aprenda a criar, editar e organizar as perguntas do FAQ.

> 🔒 **Apenas administradores** podem gerenciar o FAQ.

## Acessando o Gerenciamento de FAQ

No Painel Admin, clique na aba **"FAQ"**.

## Criando uma Nova Pergunta

1. Clique em **"+ Adicionar Pergunta"**
2. Preencha:
   - **Pergunta**: o texto da dúvida (ex: "Como exportar transações para Excel?")
   - **Resposta**: a resposta completa e clara
3. Clique em **"Salvar"**

A pergunta é criada como **ativa** por padrão (visível para usuários).

## Editando uma Pergunta

1. Clique no ícone de **edição** (✏️) ao lado da pergunta
2. Modifique a pergunta e/ou resposta
3. Clique em **"Salvar"**

## Ativando/Desativando uma Pergunta

Clique no ícone de **olho** (👁️ / 🙈) para alternar a visibilidade:
- **Ativo** 👁️: pergunta visível para todos os usuários
- **Inativo** 🙈: pergunta oculta (mas mantida no banco para uso futuro)

## Excluindo uma Pergunta

1. Clique no ícone de **lixeira** (🗑️)
2. Confirme a exclusão

> **⚠️ Atenção:** A exclusão é permanente. Se a pergunta pode ser útil no futuro, prefira desativá-la.

## Reordenando Perguntas

Arraste as perguntas pela alça de arrastar (⠿) para reordenar. A ordem definida aqui é a mesma que os usuários verão no FAQ.

> **💡 Dica:** Coloque as perguntas mais frequentes no topo. Revise o FAQ mensalmente e desative perguntas que não fazem mais sentido.`,

  s14p9: `# Gerenciando Feedbacks

> **(Administradores)** — Aprenda a visualizar, responder e aceitar feedbacks dos usuários.

> 🔒 **Apenas administradores** podem gerenciar feedbacks.

## Acessando os Feedbacks

No Painel Admin, clique na aba **"Feedbacks"**.

## Lista de Feedbacks

Cada feedback exibe:
- **Categoria** (cor): 🔵 Dúvida / 🟢 Melhoria / 🟡 Sugestão / 🔴 Crítica
- **Status**: Pendente (⏳) / Respondido (✉️) / Aceito (✅)
- **Usuário**: quem enviou (nome e e-mail)
- **Trecho** da descrição
- **Data** de envio

## Filtrando Feedbacks

| Filtro | Opções |
|--------|--------|
| **Categoria** | Todos / Dúvida / Melhoria / Sugestão / Crítica |
| **Status** | Todos / Pendente / Respondido / Aceito |

## Respondendo um Feedback

1. Clique no feedback para abrir os detalhes
2. Visualize o conteúdo completo, imagem e link de vídeo (se houver)
3. No campo **"Resposta"**, escreva sua resposta
4. Clique em **"Marcar como Respondido"**

O feedback muda para status "Respondido".

## Aceitando e Vinculando ao Roadmap

Se o feedback representa uma melhoria que será implementada:

1. Clique em **"Aceitar"**
2. Opcionalmente, selecione um item do Roadmap para vincular
3. Ou clique em **"Criar item no Roadmap"** para criar um novo card automaticamente

\`\`\`mermaid
flowchart LR
    F([Feedback]) --> P[Pendente]
    P --> R[Respondido]
    P --> A[Aceito]
    A --> RM[Roadmap item criado/vinculado]
\`\`\``,

  s14p10: `# Log de Atividades

> **(Administradores)** — Aprenda a usar o log de atividades para auditar ações no sistema.

> 🔒 **Apenas administradores** têm acesso ao log de atividades.

## O que é o Log de Atividades?

É um registro completo e cronológico de **todas as ações realizadas** no Sistema Alya — quem fez o quê, quando e em qual módulo.

## Acessando o Log

No Painel Admin, clique na aba **"Atividades"**.

## O que é registrado?

| Tipo de ação | Exemplos |
|-------------|---------|
| **Criar** | Novo usuário criado, nova transação lançada |
| **Atualizar** | Produto editado, usuário com permissão alterada |
| **Excluir** | Transação removida, cliente deletado |
| **Login** | Usuário fez login, usuário foi deslogado |
| **Impersonação** | Superadmin impersonou usuário X |

## Filtrando o Log

| Filtro | Como usar |
|--------|-----------|
| **Usuário** | Busque por nome de usuário |
| **Tipo de ação** | Criar / Atualizar / Excluir / Login |
| **Módulo** | Transações / Produtos / Clientes / Usuários / etc. |
| **Período** | Data início e data fim |

## Lendo o Diff (Antes e Depois)

Ao clicar em uma ação do tipo **Atualizar**, o log expande mostrando uma tabela com:

- **Campo**: qual campo foi alterado
- **Antes** (vermelho): valor anterior
- **Depois** (verde): novo valor

Isso permite identificar exatamente o que foi alterado em cada operação.

> **💡 Dica:** Use o log para auditoria quando houver suspeita de alterações incorretas. Filtre por usuário + período para ver todas as ações de uma pessoa em um intervalo de tempo.`,

  s14p11: `# Estatísticas do Sistema

> **(Administradores)** — Aprenda a usar o painel de estatísticas para monitorar o uso do sistema.

> 🔒 **Apenas administradores** têm acesso às estatísticas.

## Acessando as Estatísticas

No Painel Admin, clique na aba **"Estatísticas"**.

## Cards de KPIs

| KPI | O que mostra |
|-----|-------------|
| **Total de usuários** | Ativos, inativos e por função |
| **Logins** | Total e nos últimos 30 dias |
| **Ações** | Total de ações registradas e nos últimos 30 dias |
| **Transações** | Quantidade total de transações |
| **Produtos** | Quantidade de produtos cadastrados |
| **Clientes** | Quantidade de clientes na base |
| **Módulos ativos** | Quantos módulos estão ativados |

## Gráficos Disponíveis

| Gráfico | Tipo | O que mostra |
|---------|------|-------------|
| Usuários por função | Pizza | Distribuição de superadmin/admin/user/guest |
| Módulos mais usados | Barras | Quais módulos recebem mais acessos |
| Usuários mais ativos | Barras | Top usuários por número de ações |
| Timeline de atividade | Linhas | Evolução de ações ao longo do tempo |

## Selecionando o Período

Acima dos gráficos há botões de período:
- **7 dias** — última semana
- **30 dias** — último mês (padrão)
- **90 dias** — último trimestre
- **Personalizado** — defina início e fim

> **💡 Dica:** Use a visualização de 30 dias para monitoramento mensal. Combine com o filtro de módulos para identificar quais áreas do sistema precisam de mais treinamento ou documentação.`,

  s14p12: `# Gerenciando a Documentação

> **(Administradores)** — Aprenda a criar seções, páginas e usar o editor split-view de documentação.

> 🔒 **Apenas administradores** podem editar a documentação.

## Acessando o Editor de Documentação

No Painel Admin, clique na aba **"Documentação"**.

## Estrutura: Seções e Páginas

A documentação é organizada em **Seções** (categorias) que contêm **Páginas** (conteúdo):

\`\`\`
Seção: Primeiros Passos
├── Página: Fazendo login
├── Página: Navegando pelo sistema
└── Página: Configurando seu perfil
\`\`\`

## Criando uma Seção

1. Clique no botão **"+"** no topo da barra lateral esquerda
2. Digite o nome da seção
3. Pressione Enter ou clique em **"Criar"**

## Criando uma Página

1. Passe o mouse sobre o nome da seção
2. Clique no ícone **"+"** que aparece ao lado
3. Digite o título da página
4. Pressione Enter ou clique em **"Criar"**

## O Editor Split-View

Ao selecionar uma página para editar, a tela divide-se em dois painéis:

| Painel esquerdo | Painel direito |
|----------------|----------------|
| Editor Markdown | Preview renderizado |

**Modos de visualização** (botões no toolbar):
- **Editor**: somente o editor — para foco na escrita
- **Split**: editor + preview lado a lado (padrão)
- **Preview**: somente o preview — para revisar

## Escrevendo com Mermaid

Para inserir um diagrama, use blocos de código com a linguagem \`mermaid\`:

\`\`\`mermaid
flowchart LR
  A --> B --> C
\`\`\`

O diagrama aparece renderizado no preview em tempo real.

## Salvando

Clique em **"Salvar"** no toolbar quando terminar. O botão fica ativo apenas quando há alterações não salvas (indicador "● não salvo").`,

  s14p13: `# Checklist de Configuração Inicial

> **(Administradores)** — Guia passo a passo para configurar o Sistema Alya do zero.

> 🔒 **Apenas super administradores** podem executar todos os passos deste checklist.

## Sequência Recomendada

\`\`\`mermaid
flowchart TD
    A([1. Login inicial como superadmin]) --> B[2. Alterar senha\ndo superadmin]
    B --> C[3. Verificar módulos\nativos e ativar os necessários]
    C --> D[4. Criar usuários\nda equipe]
    D --> E[5. Definir permissões\npor usuário]
    E --> F[6. Configurar\na Projeção Financeira]
    F --> G[7. Lançar transações\nhist\u00f3ricas ou importar]
    G --> H[8. Conectar Nuvemshop\nse aplicável]
    H --> I[9. Popular o FAQ\ncom dúvidas comuns]
    I --> J([Sistema pronto para uso ✅])
\`\`\`

## Checklist Detalhado

### ☐ 1. Primeiro Login
- [ ] Acesse o sistema com o usuário \`admin\` e senha fornecida
- [ ] Copie a senha temporária gerada no primeiro login
- [ ] Acesse Menu do Usuário > Alterar Senha e defina uma senha segura

### ☐ 2. Módulos
- [ ] Acesse Admin > Módulos
- [ ] Ative apenas os módulos que sua empresa vai usar
- [ ] Reordene as abas na ordem que faz mais sentido para sua operação

### ☐ 3. Usuários
- [ ] Crie as contas para todos os colaboradores que usarão o sistema
- [ ] Atribua a função correta a cada usuário (Usuário, Admin, etc.)
- [ ] Ajuste os módulos visíveis por usuário conforme necessário
- [ ] Compartilhe as credenciais de acesso com cada colaborador

### ☐ 4. Projeção Financeira
- [ ] Acesse Projeção e insira os dados históricos do ano anterior
- [ ] Defina os percentuais de crescimento para cada cenário
- [ ] Verifique se as Metas foram geradas corretamente

### ☐ 5. Transações Históricas
- [ ] Baixe o modelo Excel em Transações > Importar/Exportar
- [ ] Preencha com o histórico de transações
- [ ] Importe o arquivo

### ☐ 6. Nuvemshop (se aplicável)
- [ ] Obtenha Access Token e Store ID na Nuvemshop
- [ ] Conecte a loja em Admin > Nuvemshop
- [ ] Execute a primeira sincronização completa (pedidos, produtos, clientes)

### ☐ 7. FAQ
- [ ] Acesse Admin > FAQ
- [ ] Adicione as 5-10 perguntas mais comuns da sua equipe sobre o sistema`,

  // ─────────────────────────────────────────────
  // SEÇÃO 15: Segurança
  // ─────────────────────────────────────────────

  s15p1: `# Sessões Ativas

> **(Super Administradores)** — Aprenda a monitorar e gerenciar as sessões ativas do sistema.

> 🔒 **Apenas super administradores** têm acesso ao módulo de Sessões Ativas.

## O que são Sessões Ativas?

Cada vez que um usuário faz login, uma **sessão** é criada. Uma sessão ativa representa um usuário conectado ao sistema a partir de um dispositivo específico. O módulo de Sessões Ativas permite visualizar e encerrar essas conexões.

## Informações de cada Sessão

| Campo | Descrição |
|-------|-----------|
| **Dispositivo** | Tipo (📱 mobile / 💻 desktop) e nome do dispositivo |
| **Navegador** | Chrome, Firefox, Safari, etc. |
| **Sistema Operacional** | Windows, macOS, Android, iOS |
| **IP** | Endereço IP de origem |
| **Localização** | País e cidade (quando disponível) |
| **Último acesso** | Quando a sessão foi usada pela última vez |
| **Data de criação** | Quando o login foi feito |
| **Expiração** | Quando a sessão expira automaticamente |

## Revogando uma Sessão

Para encerrar uma sessão específica:

1. Localize a sessão na lista
2. Clique no botão **"Encerrar sessão"** (ícone de X)
3. Confirme a ação
4. O dispositivo associado é desconectado imediatamente

## Encerrando Todas as Sessões

Para desconectar todos os dispositivos de uma vez:

1. Clique em **"Encerrar todas as outras sessões"**
2. Confirme — todas as sessões (exceto a sua atual) são encerradas

> **💡 Dica:** Use a revogação de sessões quando suspeitar que as credenciais de um usuário foram comprometidas. Encerre a sessão suspeita e oriente o usuário a redefinir a senha imediatamente.`,

  s15p2: `# Painel de Anomalias

> **(Super Administradores)** — Aprenda a usar o painel de detecção de anomalias de segurança.

> 🔒 **Apenas super administradores** têm acesso ao Painel de Anomalias.

## O que são Anomalias?

Anomalias são **comportamentos incomuns detectados automaticamente** pelo sistema — padrões que fogem do comportamento habitual de um usuário e podem indicar uma ameaça de segurança.

## Tipos de Anomalia Detectados

\`\`\`mermaid
graph TD
    A([Anomalia Detectada]) --> B[new_country\nLogin de novo país]
    A --> C[unusual_time\nLogin em horário incomum]
    A --> D[high_request_rate\nMuitas requisições em curto tempo]
    A --> E[multiple_ips\nMúltiplos IPs no mesmo período]
    A --> F[token_reuse\nReutilização suspeita de token]
    A --> G[brute_force\nVárias tentativas de senha]
    A --> H[device_change\nDispositivo novo não reconhecido]

    B & C & D & E & F & G & H --> S([Score de Anomalia])
    S --> BAIXO[0-30: Normal]
    S --> MEDIO[31-60: Atenção]
    S --> ALTO[61-100: Alto Risco]
\`\`\`

## Lendo o Painel

**Cards de resumo:**
- Total de anomalias no período
- Usuários afetados
- Score médio de anomalia
- Tipos mais frequentes

**Lista de anomalias recentes:**
- Tipo de anomalia e score
- Usuário afetado
- IP e data/hora
- Descrição do evento

## Perfil Baseline do Usuário

Clique em um usuário na lista para ver seu **perfil de comportamento normal** (baseline):
- Países habituais de acesso
- Horários típicos de login
- Velocidade média de requisições
- IPs mais usados

O baseline é o que o sistema usa como referência para detectar desvios.

## Selecionando o Período

Use os botões de período (7, 30, 90 dias) para ajustar a janela de análise.`,

  s15p3: `# Alertas de Segurança

> **(Super Administradores)** — Aprenda a monitorar e interpretar os alertas de segurança do sistema.

> 🔒 **Apenas super administradores** têm acesso aos Alertas de Segurança.

## O que são Alertas de Segurança?

Enquanto o Painel de Anomalias monitora padrões de comportamento, os **Alertas de Segurança** registram **eventos específicos** de risco — tentativas de ataque, acessos suspeitos e violações de segurança.

## Níveis de Severidade

| Nível | Cor | Exemplos |
|-------|-----|---------|
| **CRÍTICO** | 🔴 Vermelho | Tentativa de roubo de token, ataque SQL injection, brute force detectado |
| **ALTO** | 🟠 Laranja | Tentativa de XSS, login de país novo |
| **MÉDIO** | 🟡 Amarelo | Múltiplos IPs detectados, múltiplos dispositivos |
| **BAIXO** | 🟢 Verde | Login falhado suspeito |

## Tipos de Alerta

| Alerta | Severidade | Descrição |
|--------|:----------:|-----------|
| token_theft_detected | 🔴 CRÍTICO | Possível roubo de token de autenticação |
| sql_injection_attempt | 🔴 CRÍTICO | Tentativa de injeção SQL na aplicação |
| brute_force_detected | 🔴 CRÍTICO | Múltiplas tentativas de senha por força bruta |
| xss_attempt | 🟠 ALTO | Tentativa de Cross-Site Scripting |
| new_country_login | 🟠 ALTO | Login de país nunca usado antes |
| multiple_ips_detected | 🟡 MÉDIO | Mesmo usuário acessando de vários IPs |
| login_failed_suspicious | 🟢 BAIXO | Padrão suspeito em tentativas de login |

## Usando os Filtros

| Filtro | Opções |
|--------|--------|
| **Tipo** | Dropdown com todos os tipos de alerta |
| **Período** | 7 / 30 / 90 dias |

## O que fazer ao receber um Alerta Crítico

1. **Identifique o usuário** afetado
2. **Revogue as sessões** do usuário (Sessões Ativas)
3. **Force a redefinição de senha** (Admin > Usuários > Redefinir senha)
4. **Investigue o IP** de origem (Sessões Ativas)
5. **Monitore** o usuário nas próximas 24h

> **💡 Dica:** Configure uma rotina de revisão dos alertas de segurança ao menos uma vez por semana. Alertas críticos merecem atenção imediata.`,

  // ─────────────────────────────────────────────
  // SEÇÃO 16: Apêndices
  // ─────────────────────────────────────────────

  s16p1: `# Glossário de Termos Financeiros

> Referência rápida com definições simples dos principais termos financeiros usados no Sistema Alya.

## A

**Ativo**
Recurso que a empresa possui e que tem valor econômico — dinheiro em caixa, estoque, equipamentos.

## B — C

**Capital de Giro**
Recursos necessários para manter as operações do dia a dia — pagar fornecedores, salários e despesas correntes enquanto aguarda recebimento das vendas.

**CNPJ**
Cadastro Nacional da Pessoa Jurídica — número de identificação de empresas no Brasil (14 dígitos).

**CPF**
Cadastro de Pessoas Físicas — número de identificação de pessoas físicas no Brasil (11 dígitos).

## D — E

**DRE**
Demonstrativo de Resultado do Exercício — relatório contábil que resume receitas, despesas e lucro de um período.

**Despesa Fixa**
Custo que não varia com o volume de vendas/produção — aluguel, salário fixo, mensalidade de software.

**Despesa Variável**
Custo que muda conforme o volume de atividade — comissões, frete, matéria-prima.

## F — L

**Faturamento**
Valor total das vendas realizadas em um período (antes de descontar despesas). Sinônimo de "Receita Bruta" no contexto do Alya.

**Lucro / Resultado Líquido**
Faturamento − Despesas. Quando positivo = lucro; quando negativo = prejuízo.

## M — P

**Margem de Contribuição**
Receita de um produto − Custo variável desse produto. Indica quanto cada produto contribui para cobrir os custos fixos.

**Margem Líquida (%)**
(Lucro ÷ Receita) × 100. Percentual da receita que virou lucro.

**Override Manual**
No contexto da Projeção: valor inserido manualmente substituindo o cálculo automático. Células com override ficam destacadas em âmbar.

**Projeção Financeira**
Estimativa de receitas e despesas futuras com base em dados históricos e hipóteses de crescimento.

## R — T

**Receita**
Entrada de dinheiro por vendas, serviços ou outras fontes operacionais.

**ROI (Retorno sobre Investimento)**
(Lucro do Investimento ÷ Custo do Investimento) × 100. Indica quanto um investimento rendeu.

**Ticket Médio**
Receita Total ÷ Número de Pedidos (ou Transações de receita). Valor médio por venda.

## Cenários da Projeção

| Termo | Sinônimo | Quando usar |
|-------|---------|-------------|
| **Previsto** | Mínimo / Conservador | Meta conservadora realista |
| **Médio** | Moderado | Resultado mais provável |
| **Máximo** | Otimista | Melhor cenário possível |`,

  s16p2: `# Referência de Ícones do Sistema

> Tabela completa mapeando os ícones usados no Sistema Alya às suas funções.

## Ícones de Ação

| Ícone | Nome | Função | Onde aparece |
|-------|------|--------|--------------|
| ✏️ | Editar | Abrir formulário de edição | Listas de transações, produtos, clientes, usuários |
| 🗑️ | Excluir | Deletar o item (pede confirmação) | Listas de transações, produtos, clientes, usuários |
| ➕ | Adicionar | Criar novo item | Botões "Nova Transação", "Novo Produto", etc. |
| 💾 | Salvar | Gravar as alterações | Editor de documentação, formulários |
| 👁️ | Mostrar/Ocultar | Alternar visibilidade de senha ou item | Campo de senha, FAQ admin |
| 📋 | Copiar | Copiar para a área de transferência | Primeiro acesso, criação de usuário |
| 🔑 | Redefinir senha | Forçar redefinição de acesso do usuário | Lista de usuários no admin |
| 👤 | Impersonar | Navegar como outro usuário | Lista de usuários (superadmin) |
| ⠿ | Arrastar | Reordenar item por drag-and-drop | FAQ admin, Módulos admin |
| ↺ | Desfazer override | Remover valor manual e voltar ao cálculo | Cells da Projeção |

## Ícones de Status

| Ícone | Significado | Contexto |
|-------|-------------|----------|
| 🟢 Verde | Saudável / Atingido / Ativo | Estoque, metas, status de módulo |
| 🟡 Amarelo | Atenção / Próximo do limite | Estoque baixo, meta quase atingida |
| 🔴 Vermelho | Problema / Abaixo da meta / Inativo | Sem estoque, meta não atingida, alerta crítico |
| 🛡️ Escudo | Módulo do sistema (protegido) | Lista de módulos no admin |
| ↑ Verde | Crescimento positivo | Variações em relatórios e DRE |
| ↑ Vermelho | Crescimento de despesa (negativo) | Variações em relatórios e DRE |
| ↓ Verde | Queda de despesa (positivo) | Variações em relatórios e DRE |
| ↓ Vermelho | Queda de receita (negativo) | Variações em relatórios e DRE |

## Ícones dos Módulos na Navegação

| Módulo | Ícone |
|--------|-------|
| Dashboard | 🏠 |
| Transações | 💰 |
| Produtos | 📦 |
| Clientes | 👥 |
| Metas | 🎯 |
| Relatórios | 📊 |
| DRE | 📋 |
| Projeção | 📈 |
| Nuvemshop | 🛍️ |
| FAQ | ❓ |
| Roadmap | 🗺️ |
| Admin | 🛡️ |
| Documentação | 📚 |`,

  s16p3: `# Troubleshooting

> Soluções para os problemas mais comuns encontrados no Sistema Alya.

## Problemas de Login

### "Usuário ou senha incorretos"
- Verifique se está usando o **username** (não o e-mail) no campo Usuário
- Verifique se o Caps Lock está desativado
- Use o link **"Esqueci minha senha"** para redefinir

### "Minha sessão expirou"
- Sessions expiram por inatividade — faça login novamente
- Se a expiração for muito frequente, contate o administrador

### "Não consigo fazer login nem com o email de recuperação"
- Contate o administrador para reset manual de senha (Admin > Usuários > 🔑)

---

## Problemas no Dashboard

### "Dashboard está zerado / sem dados"
- ✅ Verifique se há **Transações** lançadas no período selecionado
- ✅ Verifique se a **Projeção** está configurada para o mesmo período
- ✅ Confirme o período selecionado (mensal/trimestral/anual) e o mês/ano

### "Os gráficos Meta vs. Real não aparecem"
- A Projeção precisa estar configurada. Acesse **Projeção** e verifique se os dados foram salvos.

---

## Problemas com Nuvemshop

### "Sincronização falhou"
- Verifique se o **Access Token** ainda é válido (pode ter expirado ou sido revogado)
- Desconecte e reconecte a loja com um novo token
- Verifique se a loja Nuvemshop está ativa

### "Saldo pendente está incorreto"
- Execute a **sincronização de pedidos** para garantir que todos os pedidos estão importados
- Registre todos os **saques** como despesas "Saque Nuvemshop" em Transações

### "Webhooks inativos"
- Desconecte e reconecte a loja — isso força a reativação dos webhooks

---

## Problemas com Importação Excel

### "Importação falhou com erro de categoria"
- Verifique se o nome da categoria na planilha é **exatamente igual** ao do sistema (incluindo acentos e maiúsculas)
- Baixe um novo modelo para confirmar os nomes corretos

### "Importação importou dados duplicados"
- O sistema não detecta duplicatas automaticamente
- Use os filtros de período e exclua em massa os registros duplicados

---

## Problemas de Performance

### "O sistema está lento"
- Tente recarregar a página (F5)
- Limpe o cache do navegador (Ctrl+Shift+Delete)
- Se persistir, contate o administrador do sistema

---

> **💡 Dica:** Se o problema não está listado aqui, use o **botão de Feedback** (💬) com a categoria "Crítica" e descreva detalhadamente o que está acontecendo. Inclua uma captura de tela sempre que possível.`,

  s16p4: `# Atalhos e Dicas de Uso

> Dicas avançadas, atalhos e truques para usar o Sistema Alya com mais eficiência.

## Atalhos de Teclado

| Tecla | Ação | Contexto |
|-------|------|---------|
| **ESC** | Fechar modal aberto | Qualquer modal do sistema |
| **Enter** | Confirmar / Salvar | Formulários modais simples |
| **Tab** | Próximo campo | Formulários |

## Seleção em Massa

Para excluir, exportar ou processar muitos registros de uma vez:

1. Use os **filtros primeiro** para mostrar apenas os registros relevantes
2. Marque a **caixa no cabeçalho da tabela** para selecionar todos visíveis
3. Execute a ação (excluir, exportar)

> **Exemplo prático:** Para excluir todas as transações de um mês específico que foram lançadas incorretamente: filtre por Data Início + Data Fim do mês → marque todos → exclua em massa.

## Dicas por Módulo

### Dashboard
- Use **visão Trimestral** para reuniões de resultado com gestores — é a granularidade mais estratégica
- O gráfico de **Evolução 12 meses** é o melhor para apresentações — mostra tendências de forma clara

### Transações
- **Nunca use "Teste"** na descrição — quando exportar relatórios meses depois, você não vai lembrar o que era
- Sempre que lançar uma transação Nuvemshop **manualmente**, confira depois se o saldo pendente está correto

### Projeção
- **Preencha o Histórico primeiro** antes de definir os crescimentos — os números fazem mais sentido
- Para verificar se sua projeção faz sentido: o **cenário Previsto** deve ser atingível em um mês normal, sem nenhum esforço extra

### Relatórios
- Gere o relatório mensal sempre no **dia 1 ou 2 do mês seguinte** — quando todos os lançamentos do mês já foram realizados
- Use **"Exportar PDF"** para registros formais e **"Exportar Excel"** para análises adicionais

### Admin
- Revise os **feedbacks pendentes** pelo menos uma vez por semana
- Mantenha o **FAQ atualizado** — cada dúvida respondida no FAQ economiza tempo de todos

## Navegação Rápida

O sistema inclui um sistema de **navegação por evento**. Alguns links dentro dos módulos (ex: no Nuvemshop, o link para Transações) levam você diretamente para outro módulo sem precisar clicar na barra de navegação.`,

};

// ============================================================
// SCRIPT PRINCIPAL
// ============================================================

async function main() {
  console.log('🚀 Iniciando seed do manual de documentação...\n');

  // ─── Seção 1: Introdução
  console.log('📁 Criando Seção 1: Introdução ao Sistema Alya...');
  const s1 = await createSection('Introdução ao Sistema Alya', 0);
  await createPage(s1, 'O que é o Sistema Alya', pages.s1p1, 0);
  await createPage(s1, 'Fluxo de dados entre módulos', pages.s1p2, 1);
  await createPage(s1, 'Perfis de usuário e permissões', pages.s1p3, 2);
  await createPage(s1, 'Glossário de termos', pages.s1p4, 3);
  console.log('  ✅ Seção 1 criada (4 páginas)\n');

  // ─── Seção 2: Primeiros Passos
  console.log('📁 Criando Seção 2: Primeiros Passos...');
  const s2 = await createSection('Primeiros Passos', 1);
  await createPage(s2, 'Fazendo login', pages.s2p1, 0);
  await createPage(s2, 'Navegando pelo sistema', pages.s2p2, 1);
  await createPage(s2, 'Configurando seu perfil', pages.s2p3, 2);
  await createPage(s2, 'Enviando feedback', pages.s2p4, 3);
  console.log('  ✅ Seção 2 criada (4 páginas)\n');

  // ─── Seção 3: Dashboard
  console.log('📁 Criando Seção 3: Dashboard...');
  const s3 = await createSection('Dashboard', 2);
  await createPage(s3, 'Visão geral do Dashboard', pages.s3p1, 0);
  await createPage(s3, 'Seleção de período', pages.s3p2, 1);
  await createPage(s3, 'Gráficos e indicadores', pages.s3p3, 2);
  await createPage(s3, 'Comparativo Meta vs. Real', pages.s3p4, 3);
  console.log('  ✅ Seção 3 criada (4 páginas)\n');

  // ─── Seção 4: Transações
  console.log('📁 Criando Seção 4: Transações...');
  const s4 = await createSection('Transações', 3);
  await createPage(s4, 'Lançando uma transação', pages.s4p1, 0);
  await createPage(s4, 'Tipos e categorias', pages.s4p2, 1);
  await createPage(s4, 'Editando e excluindo', pages.s4p3, 2);
  await createPage(s4, 'Filtros e ordenação', pages.s4p4, 3);
  await createPage(s4, 'Importar do Excel', pages.s4p5, 4);
  await createPage(s4, 'Exportar (Excel e PDF)', pages.s4p6, 5);
  console.log('  ✅ Seção 4 criada (6 páginas)\n');

  // ─── Seção 5: Produtos
  console.log('📁 Criando Seção 5: Produtos...');
  const s5 = await createSection('Produtos', 4);
  await createPage(s5, 'Cadastrando produtos', pages2.s5p1, 0);
  await createPage(s5, 'Controle de estoque', pages2.s5p2, 1);
  await createPage(s5, 'Análise de margem', pages2.s5p3, 2);
  await createPage(s5, 'Filtros e busca', pages2.s5p4, 3);
  await createPage(s5, 'Importar e exportar', pages2.s5p5, 4);
  console.log('  ✅ Seção 5 criada (5 páginas)\n');

  // ─── Seção 6: Clientes
  console.log('📁 Criando Seção 6: Clientes...');
  const s6 = await createSection('Clientes', 5);
  await createPage(s6, 'Cadastrando clientes', pages2.s6p1, 0);
  await createPage(s6, 'CPF vs. CNPJ', pages2.s6p2, 1);
  await createPage(s6, 'Busca e filtros', pages2.s6p3, 2);
  await createPage(s6, 'Importar e exportar', pages2.s6p4, 3);
  console.log('  ✅ Seção 6 criada (4 páginas)\n');

  // ─── Seção 7: Metas
  console.log('📁 Criando Seção 7: Metas...');
  const s7 = await createSection('Metas', 6);
  await createPage(s7, 'O que são as Metas', pages3.s7p1, 0);
  await createPage(s7, 'Acompanhamento mensal', pages3.s7p2, 1);
  await createPage(s7, 'Exportar Metas (PDF)', pages3.s7p3, 2);
  console.log('  ✅ Seção 7 criada (3 páginas)\n');

  // ─── Seção 8: Relatórios
  console.log('📁 Criando Seção 8: Relatórios...');
  const s8 = await createSection('Relatórios', 7);
  await createPage(s8, 'Tipos de período', pages3.s8p1, 0);
  await createPage(s8, 'Indicadores explicados', pages3.s8p2, 1);
  await createPage(s8, 'Gráficos de categoria', pages3.s8p3, 2);
  await createPage(s8, 'Exportar relatório PDF', pages3.s8p4, 3);
  console.log('  ✅ Seção 8 criada (4 páginas)\n');

  // ─── Seção 9: DRE
  console.log('📁 Criando Seção 9: DRE...');
  const s9 = await createSection('DRE — Demonstrativo de Resultado', 8);
  await createPage(s9, 'O que é o DRE', pages4.s9p1, 0);
  await createPage(s9, 'Lendo o demonstrativo', pages4.s9p2, 1);
  await createPage(s9, 'Comparativo com período anterior', pages4.s9p3, 2);
  await createPage(s9, 'Exportar PDF e Excel/CSV', pages4.s9p4, 3);
  console.log('  ✅ Seção 9 criada (4 páginas)\n');

  // ─── Seção 10: Projeção
  console.log('📁 Criando Seção 10: Projeção Financeira...');
  const s10 = await createSection('Projeção Financeira', 9);
  await createPage(s10, 'Conceito de cenários', pages4.s10p1, 0);
  await createPage(s10, 'Configurando a projeção', pages4.s10p2, 1);
  await createPage(s10, 'Dados históricos', pages4.s10p3, 2);
  await createPage(s10, 'Percentuais de crescimento', pages4.s10p4, 3);
  await createPage(s10, 'Fluxos de receita', pages4.s10p5, 4);
  await createPage(s10, 'Despesas e investimentos', pages4.s10p6, 5);
  await createPage(s10, 'Marketing na projeção', pages4.s10p7, 6);
  await createPage(s10, 'Overrides manuais', pages4.s10p8, 7);
  console.log('  ✅ Seção 10 criada (8 páginas)\n');

  // ─── Seção 11: Nuvemshop
  console.log('📁 Criando Seção 11: Nuvemshop...');
  const s11 = await createSection('Nuvemshop', 10);
  await createPage(s11, 'Conectando sua loja', pages5.s11p1, 0);
  await createPage(s11, 'Sincronização de dados', pages5.s11p2, 1);
  await createPage(s11, 'Entendendo o saldo pendente', pages5.s11p3, 2);
  await createPage(s11, 'Registrando saques', pages5.s11p4, 3);
  await createPage(s11, 'Webhooks', pages5.s11p5, 4);
  await createPage(s11, 'Desconectando a loja', pages5.s11p6, 5);
  console.log('  ✅ Seção 11 criada (6 páginas)\n');

  // ─── Seção 12: FAQ
  console.log('📁 Criando Seção 12: FAQ...');
  const s12 = await createSection('FAQ', 11);
  await createPage(s12, 'Usando o FAQ', pages5.s12p1, 0);
  await createPage(s12, 'Não encontrei minha resposta', pages5.s12p2, 1);
  console.log('  ✅ Seção 12 criada (2 páginas)\n');

  // ─── Seção 13: Roadmap
  console.log('📁 Criando Seção 13: Roadmap...');
  const s13 = await createSection('Roadmap', 12);
  await createPage(s13, 'Lendo o Roadmap', pages5.s13p1, 0);
  await createPage(s13, 'Status e prioridades', pages5.s13p2, 1);
  await createPage(s13, 'Gerenciando itens do Roadmap', pages5.s13p3, 2);
  console.log('  ✅ Seção 13 criada (3 páginas)\n');

  // ─── Seção 14: Administração
  console.log('📁 Criando Seção 14: Administração...');
  const s14 = await createSection('Administração', 13);
  await createPage(s14, 'Visão geral do Painel Admin', pages6.s14p1, 0);
  await createPage(s14, 'Gerenciando usuários', pages6.s14p2, 1);
  await createPage(s14, 'Criando e convidando usuários', pages6.s14p3, 2);
  await createPage(s14, 'Editando perfil e permissões', pages6.s14p4, 3);
  await createPage(s14, 'Redefinir senha de usuário', pages6.s14p5, 4);
  await createPage(s14, 'Impersonar usuário', pages6.s14p6, 5);
  await createPage(s14, 'Gerenciando módulos', pages6.s14p7, 6);
  await createPage(s14, 'Gerenciando o FAQ', pages6.s14p8, 7);
  await createPage(s14, 'Gerenciando feedbacks', pages6.s14p9, 8);
  await createPage(s14, 'Log de atividades', pages6.s14p10, 9);
  await createPage(s14, 'Estatísticas do sistema', pages6.s14p11, 10);
  await createPage(s14, 'Gerenciando a documentação', pages6.s14p12, 11);
  await createPage(s14, 'Checklist de configuração inicial', pages6.s14p13, 12);
  console.log('  ✅ Seção 14 criada (13 páginas)\n');

  // ─── Seção 15: Segurança
  console.log('📁 Criando Seção 15: Segurança...');
  const s15 = await createSection('Segurança', 14);
  await createPage(s15, 'Sessões ativas', pages6.s15p1, 0);
  await createPage(s15, 'Painel de anomalias', pages6.s15p2, 1);
  await createPage(s15, 'Alertas de segurança', pages6.s15p3, 2);
  console.log('  ✅ Seção 15 criada (3 páginas)\n');

  // ─── Seção 16: Apêndices
  console.log('📁 Criando Seção 16: Apêndices...');
  const s16 = await createSection('Apêndices', 15);
  await createPage(s16, 'Glossário de termos financeiros', pages6.s16p1, 0);
  await createPage(s16, 'Referência de ícones do sistema', pages6.s16p2, 1);
  await createPage(s16, 'Troubleshooting', pages6.s16p3, 2);
  await createPage(s16, 'Atalhos e dicas de uso', pages6.s16p4, 3);
  console.log('  ✅ Seção 16 criada (4 páginas)\n');

  // ─── Resumo final
  console.log('═══════════════════════════════════════════');
  console.log('✅ Seed concluído com sucesso!');
  console.log('');
  console.log('📊 Resumo:');
  console.log('   16 seções criadas');
  console.log('   77 páginas criadas');
  console.log('   Manual completo do Sistema Alya disponível em Documentação');
  console.log('═══════════════════════════════════════════');

  await pool.end();
}

main().catch(err => {
  console.error('❌ Erro durante o seed:', err.message);
  process.exit(1);
});
