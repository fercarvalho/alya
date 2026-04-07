const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, BorderStyle, WidthType, ShadingType,
  VerticalAlign
} = require('docx');
const fs = require('fs');

const BLACK  = '000000';
const GRAY   = '666666';
const LGRAY  = 'CCCCCC';

function h(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 28, font: 'Arial', color: BLACK })],
    spacing: { before: 480, after: 160 },
  });
}

function question(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, font: 'Arial', color: BLACK })],
    spacing: { before: 280, after: 80 },
  });
}

function answer(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, font: 'Arial', color: BLACK })],
    spacing: { before: 0, after: 60 },
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    children: [new TextRun({ text, size: 22, font: 'Arial', color: BLACK })],
    spacing: { before: 0, after: 40 },
  });
}

function empty() {
  return new Paragraph({ children: [new TextRun('')], spacing: { before: 0, after: 0 } });
}

function subQ(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, italics: true, size: 22, font: 'Arial', color: GRAY })],
    spacing: { before: 160, after: 60 },
  });
}

function mappingTable() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: LGRAY };
  const borders = { top: border, bottom: border, left: border, right: border };
  const hShade = { fill: 'D0D0D0', type: ShadingType.CLEAR };
  const oShade = { fill: 'F5F5F5', type: ShadingType.CLEAR };

  function hCell(text) {
    return new TableCell({
      borders, shading: hShade,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      width: { size: 3120, type: WidthType.DXA },
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, font: 'Arial' })] })],
    });
  }
  function dCell(text, shade = false) {
    return new TableCell({
      borders, shading: shade ? oShade : undefined,
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      width: { size: 3120, type: WidthType.DXA },
      children: [new Paragraph({ children: [new TextRun({ text, size: 18, font: 'Arial' })] })],
    });
  }

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3120, 3120, 3120],
    rows: [
      new TableRow({ children: [hCell('Recurso'), hCell('Campo Nuvemshop'), hCell('Campo ALYA')] }),
      new TableRow({ children: [dCell('Pedido', true), dCell('number', true), dCell('Número do pedido', true)] }),
      new TableRow({ children: [dCell(''), dCell('total'), dCell('Valor da transação')] }),
      new TableRow({ children: [dCell('', true), dCell('payment_status', true), dCell('Status (paid/authorized)', true)] }),
      new TableRow({ children: [dCell(''), dCell('payment_details.method'), dCell('Forma de pagamento')] }),
      new TableRow({ children: [dCell('', true), dCell('created_at', true), dCell('Data da transação', true)] }),
      new TableRow({ children: [dCell('Produto'), dCell('name.pt'), dCell('Nome do produto')] }),
      new TableRow({ children: [dCell('', true), dCell('variants[0].price', true), dCell('Preço de venda', true)] }),
      new TableRow({ children: [dCell(''), dCell('variants[0].stock'), dCell('Estoque')] }),
      new TableRow({ children: [dCell('', true), dCell('variants[0].cost', true), dCell('Preço de custo', true)] }),
      new TableRow({ children: [dCell('Cliente'), dCell('name'), dCell('Nome do cliente')] }),
      new TableRow({ children: [dCell('', true), dCell('email', true), dCell('E-mail (criptografado)', true)] }),
      new TableRow({ children: [dCell(''), dCell('phone'), dCell('Telefone (criptografado)')] }),
    ],
  });
}

const doc = new Document({
  numbering: {
    config: [{
      reference: 'bullets',
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    }],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    children: [

      new Paragraph({
        children: [new TextRun({ text: 'ALYA — Sistema de Gestão Financeira', bold: true, size: 36, font: 'Arial' })],
        spacing: { before: 0, after: 80 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Perguntas Frequentes (FAQs)', size: 28, font: 'Arial', color: GRAY })],
        spacing: { before: 0, after: 80 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Last Update: 07/04/2025', size: 20, font: 'Arial', color: GRAY })],
        spacing: { before: 0, after: 480 },
      }),

      // 1. GERAIS
      h('1. Gerais'),

      question('1.1. Qual o tipo de aplicativo de gestão? Para que serve o aplicativo?'),
      answer('O ALYA é um aplicativo de gestão financeira do tipo SaaS (Software as a Service), acessado pelo navegador sem instalação local. Serve para que lojistas Nuvemshop controlem seu fluxo de caixa, receitas, despesas, produtos, clientes e saldo de e-commerce em um único lugar — com sincronização automática de pedidos pagos, produtos e clientes diretamente da Nuvemshop.'),

      question('1.2. Qual(is) o(s) principal(is) problema(s) do lojista que o aplicativo resolve e como?'),
      bullet('Falta de controle financeiro: pedidos pagos na Nuvemshop viram automaticamente lançamentos de receita no ALYA, eliminando digitação manual.'),
      bullet('Fluxo de caixa invisível: dashboard consolidado com receitas do e-commerce, despesas, saldo e projeções em tempo real.'),
      bullet('Estoque desatualizado: sincronização de produtos e estoques entre Nuvemshop e ALYA via webhooks automáticos.'),
      bullet('Clientes sem cadastro financeiro: clientes da loja são importados com dados protegidos por criptografia AES-256-GCM, em conformidade com a LGPD.'),
      bullet('Saques sem rastreamento: o lojista registra retiradas do saldo Nuvemshop como despesas, mantendo o caixa sempre fechado.'),

      question('1.3. Qual o perfil de lojista recomendado para esse aplicativo? Existem requisitos específicos de perfil de negócio?'),
      answer('Micro e pequenos lojistas que vendem pela Nuvemshop e não possuem sistema financeiro formalizado — especialmente quem hoje usa planilhas para controlar as finanças. Ideal para lojas de nicho (moda, cosméticos, artesanato, alimentos, velas) com volume de até algumas centenas de pedidos por mês. Não há requisitos mínimos de faturamento ou plano Nuvemshop.'),

      question('1.4. Onde funciona o aplicativo? (cidades, estados, regiões, países)'),
      answer('Disponível exclusivamente no Brasil, com interface, suporte e documentação em português brasileiro.'),

      question('1.5. Quem desenvolveu o aplicativo? Quais são os principais canais de suporte, quais dias/horários de atendimento e SLA?'),

      subQ('Quem desenvolveu o aplicativo?'),
      answer('O ALYA foi desenvolvido pela Viver de PJ, empresa brasileira especializada em ferramentas de gestão para pequenos empreendedores.'),

      subQ('POC Level 1:'),
      bullet('Canal: e-mail vem@viverdepj.com.br | Central de ajuda: https://alya.sistemas.viverdepj.com.br/api/support'),
      bullet('Dias e horários: segunda a sexta, 9h–18h (horário de Brasília)'),
      bullet('SLA: resposta em até 1 dia útil'),

      subQ('POC Level 2:'),
      bullet('Canal: vem@viverdepj.com.br (assunto: "Escalação Técnica")'),
      bullet('Dias e horários: segunda a sexta, 9h–18h'),
      bullet('SLA: resposta em até 2 dias úteis'),

      subQ('POC Comercial:'),
      bullet('Canal: vem@viverdepj.com.br'),
      bullet('Dias e horários: segunda a sexta, 9h–18h'),
      bullet('SLA: resposta em até 1 dia útil'),

      subQ('POC Técnico:'),
      bullet('Canal: vem@viverdepj.com.br (assunto: "Suporte Técnico Nuvemshop")'),
      bullet('Dias e horários: segunda a sexta, 9h–18h'),
      bullet('SLA: análise em até 2 dias úteis; resolução de bugs críticos em até 5 dias úteis'),

      question('1.6. Temos uma conta teste disponível?'),
      bullet('URL: https://alya.sistemas.viverdepj.com.br'),
      bullet('Usuário: demo@nuvemshop'),
      bullet('Senha: NuvemDemo2024!'),
      answer('A conta possui dados fictícios de pedidos, produtos e clientes para avaliação completa de todas as funcionalidades da integração.'),

      // 2. PLANOS E PREÇOS
      h('2. Planos e Preços'),

      question('2.1. Qual a tabela de preços/precificação do aplicativo? Quais os tipos de planos disponíveis? Quais tarifas são cobradas?'),
      answer('O ALYA é totalmente gratuito. Não há planos pagos, tarifas mensais, percentual sobre vendas ou qualquer outro tipo de cobrança.'),

      question('2.2. O aplicativo possui desconto para lojista Nuvemshop? Se sim, qual a porcentagem?'),
      answer('Não se aplica. O aplicativo é gratuito para todos os lojistas.'),

      question('2.3. O aplicativo possui dias de trial? Se sim, quantos?'),
      answer('Não se aplica. O aplicativo é gratuito e todas as funcionalidades estão disponíveis imediatamente após a instalação, sem período de trial.'),

      question('2.4. O aplicativo possui taxa de setup? Se sim, qual o valor?'),
      answer('Não. Não há taxa de setup, implantação ou configuração inicial.'),

      question('2.5. O aplicativo possui precificação diferenciada para o lojista Nuvemshop Next?'),
      answer('Não se aplica. O aplicativo é gratuito para todos os lojistas independentemente do plano Nuvemshop.'),

      // 3. INSTALAÇÃO
      h('3. Instalação'),

      question('3.1. URL da área de Login'),
      answer('https://alya.sistemas.viverdepj.com.br'),

      question('3.2. Possui requisitos prévios para fazer a instalação? Se sim, quais são?'),
      bullet('Conta ativa na Nuvemshop (qualquer plano).'),
      bullet('Access Token da loja (gerado em: Painel Nuvemshop → Meus aplicativos → ALYA → Gerenciar).'),
      bullet('Store ID da loja (número exibido na tela de gerenciamento do app na Nuvemshop).'),
      bullet('Navegador moderno: Chrome, Firefox, Edge ou Safari (versões dos últimos 2 anos).'),

      question('3.3. Como é o processo de instalação e liberação do aplicativo?'),
      answer('1. O lojista instala o ALYA pelo Marketplace Nuvemshop e é redirecionado para https://alya.sistemas.viverdepj.com.br.'),
      answer('2. Cria uma conta no ALYA (ou faz login, se já tiver conta).'),
      answer('3. Acessa o menu lateral "Nuvemshop".'),
      answer('4. Insere o Access Token e o Store ID e clica em "Conectar".'),
      answer('5. O ALYA valida o token, exibe o nome da loja conectada e registra os webhooks automaticamente.'),
      answer('6. Opcionalmente, clica em "Sincronizar Pedidos", "Sincronizar Produtos" e "Sincronizar Clientes" para importar o histórico.'),
      answer('Tempo total estimado: menos de 5 minutos.'),

      question('3.4. O aplicativo possui seus próprios tutoriais? Se sim, colocar o(s) link(s) aqui.'),
      bullet('Central de ajuda: https://alya.sistemas.viverdepj.com.br/api/support'),
      bullet('Diagrama técnico de sequência: https://alya.sistemas.viverdepj.com.br/api/sequence-diagram'),

      question('3.5. Tutorial de Instalação Nuvemshop'),

      subQ('3.5.1. Como instalar o aplicativo?'),
      answer('Acesse o Marketplace Nuvemshop, localize o ALYA e clique em "Instalar". Você será redirecionado para https://alya.sistemas.viverdepj.com.br onde deverá criar uma conta ou fazer login. Em seguida, acesse o menu "Nuvemshop", insira o Access Token e o Store ID da sua loja e clique em "Conectar".'),

      subQ('3.5.2. Passo a passo detalhado para a instalação do aplicativo na Nuvemshop'),
      answer('Passo 1 — Obter o Access Token: no painel Nuvemshop, acesse Meus aplicativos → ALYA → Gerenciar e copie o Access Token gerado.'),
      answer('Passo 2 — Obter o Store ID: o número da loja é exibido na tela de gerenciamento do app na Nuvemshop.'),
      answer('Passo 3 — Conectar: no ALYA, menu "Nuvemshop", cole o Access Token e o Store ID e clique em "Conectar". O nome da loja aparecerá confirmando a conexão bem-sucedida.'),
      answer('Passo 4 — Sincronização inicial: clique em "Sincronizar Pedidos", "Sincronizar Produtos" e "Sincronizar Clientes" para importar o histórico existente.'),

      subQ('3.5.3. Direcionamento para o suporte do aplicativo'),
      bullet('E-mail: vem@viverdepj.com.br'),
      bullet('Central de ajuda: https://alya.sistemas.viverdepj.com.br/api/support'),
      bullet('Atendimento: segunda a sexta, 9h–18h (horário de Brasília)'),

      subQ('3.5.4. Considerações Gerais'),
      answer('Em caso de reinstalação, basta inserir novamente o Access Token e o Store ID. Os dados financeiros já registrados no ALYA são preservados e os webhooks são recriados automaticamente.'),

      // 4. FUNCIONAMENTO
      h('4. Funcionamento'),

      question('4.1. Quais são os serviços oferecidos (ERP, CRM, POS, etc)?'),
      bullet('Gestão financeira: fluxo de caixa, lançamentos de receitas e despesas, categorias, saldo.'),
      bullet('Dashboard de e-commerce integrado com Nuvemshop.'),
      bullet('Controle de produtos e estoque (sincronizado da Nuvemshop).'),
      bullet('Cadastro de clientes (importados da Nuvemshop, dados sensíveis criptografados — LGPD).'),
      bullet('Registro de saques/retiradas do saldo Nuvemshop.'),
      bullet('Relatórios financeiros e exportação em PDF e CSV.'),
      answer('O ALYA não é um ERP completo, POS ou CRM. É focado em gestão financeira para lojistas de e-commerce.'),

      question('4.2. É possível emitir Notas Fiscais/Informações de faturamento?'),
      answer('Não. O ALYA não emite Nota Fiscal Eletrônica (NF-e) ou NFC-e. Para emissão de notas fiscais, o lojista deve utilizar uma solução específica de faturamento fiscal.'),

      question('4.3. Como e quando ocorre a sincronização de estoque?'),
      bullet('Automática em tempo real: via webhook product/updated — sempre que o estoque é alterado na Nuvemshop, o ALYA é atualizado automaticamente em segundos.'),
      bullet('Manual: o lojista pode acionar "Sincronizar Produtos" a qualquer momento para importar o estoque atual de todos os produtos.'),
      answer('A sincronização é unidirecional: da Nuvemshop para o ALYA. O ALYA não altera o estoque na Nuvemshop.'),

      question('4.4. É possível fazer atualizações/editar os produtos a partir do admin da Nuvemshop?'),
      answer('Sim — as atualizações feitas no painel Nuvemshop são automaticamente refletidas no ALYA via webhook. Porém, não é possível editar produtos no ALYA e sincronizar de volta para a Nuvemshop. O fluxo é unidirecional: Nuvemshop → ALYA.'),

      question('4.5. Com qual(is) informação(s) se sincronizam os produtos?'),
      answer('Segue a tabela completa de campos sincronizados por recurso:'),
      empty(),
      mappingTable(),
      empty(),

      question('4.6. É possível utilizar o aplicativo em mais de uma loja de uma vez?'),
      answer('Atualmente cada conta ALYA suporta a conexão de uma única loja Nuvemshop. Suporte a múltiplas lojas está no roadmap e previsto para versões futuras.'),

      question('4.7. Possui integração com meios de envio?'),
      answer('Não. O ALYA não possui integração com transportadoras ou módulos de frete.'),

      question('4.8. Possui integração com marketplaces?'),
      answer('Não. A integração do ALYA é exclusiva com a Nuvemshop.'),

      question('4.9. Possui reportes de pedidos/envios?'),
      bullet('Extrato de transações filtrado por período, categoria e tipo (receita/despesa).'),
      bullet('Relatório de fluxo de caixa diário/mensal.'),
      bullet('Dashboard de e-commerce: faturamento mensal, número de pedidos, ticket médio, últimos pedidos importados.'),
      bullet('Relatório de saques Nuvemshop: total recebido via e-commerce vs. total sacado.'),
      answer('Não há relatório de envios/logística, pois o ALYA não integra com transportadoras.'),

      question('4.10. Funcionalidades adicionais importantes sobre esse aplicativo.'),
      bullet('Webhooks em tempo real: order/paid, order/cancelled, product/created, product/updated, customer/created, customer/updated.'),
      bullet('Validação HMAC-SHA256 nos webhooks recebidos para garantir segurança.'),
      bullet('Conformidade com LGPD: suporte aos eventos store/redact, customers/redact e customers/data_request da Nuvemshop (anonimização e exclusão de dados pessoais mediante solicitação).'),
      bullet('Criptografia AES-256-GCM para tokens de acesso, e-mail e telefone de clientes armazenados no banco de dados.'),

      subQ('Considerações'),
      answer('O ALYA não é um meio de pagamento — é um sistema de gestão financeira. A seção acima descreve funcionalidades adicionais relevantes da integração com a Nuvemshop.'),

      // 5. INFORMAÇÕES DO SERVIÇO
      h('5. Informações do Serviço'),

      question('5.1. Quais relatórios podem ser emitidos?'),
      bullet('Extrato financeiro completo (receitas + despesas) com filtros por data, categoria e tipo.'),
      bullet('Fluxo de caixa diário e mensal.'),
      bullet('Dashboard de e-commerce: faturamento mensal, pedidos, ticket médio.'),
      bullet('Relatório de saques Nuvemshop: total recebido vs. total sacado.'),
      answer('Exportação disponível em PDF (gerado no navegador) e CSV.'),

      question('5.2. Possui integração com ferramentas similares? Quais?'),
      answer('Não. O ALYA integra exclusivamente com a Nuvemshop. Não há integração nativa com outros ERPs, sistemas contábeis ou plataformas de e-commerce no momento.'),

      question('5.3. Quais informações podemos exportar via .csv?'),
      bullet('Transações financeiras: data, descrição, valor, tipo (receita/despesa), categoria.'),
      bullet('A exportação CSV está disponível na tela de Transações, com filtros por período aplicáveis.'),
      bullet('Dados de produtos e clientes não são exportados via CSV — ficam disponíveis dentro do sistema.'),

      empty(),
      empty(),
      new Paragraph({
        children: [new TextRun({ text: 'ALYA — vem@viverdepj.com.br — https://alya.sistemas.viverdepj.com.br', size: 18, font: 'Arial', color: GRAY, italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 480 },
      }),
    ],
  }],
});

Packer.toBuffer(doc).then(buffer => {
  const out = '/Users/fernandocarvalho/Alya/FAQ-ALYA-Nuvemshop.docx';
  fs.writeFileSync(out, buffer);
  console.log('Gerado:', out);
}).catch(err => { console.error(err); process.exit(1); });
