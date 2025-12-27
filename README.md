# 💰 Alya - Sistema Financeiro

Sistema completo de gestão financeira desenvolvido especificamente para o ecommerce de velas Alya. Uma aplicação web leve, responsiva e moderna para gerenciamento completo das finanças do negócio, incluindo controle de produtos, transações e relatórios detalhados.

## 📖 Sobre o Projeto

Este projeto foi desenvolvido especificamente para a empresa de velas **Alya**, focando em facilitar o controle financeiro e a gestão de produtos do ecommerce. O sistema oferece uma interface intuitiva para gerenciar receitas, despesas, produtos e gerar relatórios detalhados.

**Feito com ❤️ por Fernando Carvalho**

- 📧 Email: contato@fercarvalho.com
- 📱 Instagram: [@cadeofer](https://instagram.com/cadeofer)

## ✨ Funcionalidades Principais

### 📊 Dashboard
- Visão geral das métricas principais em tempo real
- Receita total, vendas do mês, produtos vendidos
- Transações recentes com resumo financeiro
- Cards com estatísticas atualizadas automaticamente
- Indicadores de performance e tendências

### 💳 Gestão de Transações
- Gestão completa de receitas e despesas
- Categorização automática de movimentações
- Histórico detalhado de todas as transações
- Resumo financeiro (receitas, despesas, saldo)
- Filtros por data, tipo e categoria
- Exportação e importação de dados em Excel

### 📦 Gerenciamento de Produtos
- Catálogo completo de velas e produtos
- Controle de estoque em tempo real
- Cálculo automático de margens de lucro
- Histórico de vendas por produto
- Gestão de categorias
- Controle de preços e custos

### 📈 Relatórios e Análises
- Análise de desempenho mensal
- Produtos mais vendidos
- Margem de lucro por período
- Gráficos interativos de receitas e despesas
- Exportação de dados em múltiplos formatos
- Visualizações de tendências financeiras

### 📥 Importação e Exportação
- Importação de dados via arquivos Excel (.xlsx)
- Exportação de transações e produtos
- Modelos de planilhas pré-formatados
- Validação automática de dados
- Processamento em lote

## 🛠️ Stack Tecnológica

### Frontend
- **React 18** com TypeScript
- **Vite** para build e desenvolvimento (super rápido e leve)
- **Tailwind CSS** para estilização
- **Lucide React** para ícones
- **Recharts** para gráficos e visualizações
- **date-fns** para formatação de datas

### Backend
- **Node.js** com Express
- **JSON** como banco de dados (arquivos locais)
- **Multer** para upload de arquivos
- **XLSX** para processamento de planilhas Excel
- **CORS** habilitado para comunicação frontend/backend

### Infraestrutura
- Arquitetura cliente-servidor
- API RESTful
- Armazenamento local de dados
- Suporte a upload de arquivos

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Navegador moderno (Chrome, Firefox, Safari, Edge)

## 🚀 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/alya.git
cd alya
```

### 2. Instale as dependências

```bash
# Dependências do frontend
npm install

# Dependências do backend
cd server
npm install
cd ..
```

### 3. Configure o servidor backend

O servidor backend está configurado para rodar na porta `8001` por padrão. Você pode alterar isso no arquivo `server/server.js` se necessário.

### 4. Inicie o servidor

**Desenvolvimento:**

```bash
# Terminal 1 - Backend
cd server
npm start
# ou para desenvolvimento com auto-reload
npm run dev

# Terminal 2 - Frontend
npm run dev
```

**Produção:**

```bash
# Build do frontend
npm run build

# Iniciar servidor backend
cd server
npm start
```

O frontend estará rodando em `http://localhost:5173` (Vite padrão)
O backend estará rodando em `http://localhost:8001`

## 🏗️ Estrutura do Projeto

```
alya/
├── src/                    # Aplicação React
│   ├── components/         # Componentes React
│   │   ├── Dashboard.tsx   # Dashboard principal
│   │   ├── Transactions.tsx # Gestão de transações
│   │   ├── Products.tsx    # Catálogo de produtos
│   │   ├── Reports.tsx     # Relatórios e análises
│   │   ├── modals/         # Modais de formulários
│   │   └── CustomDatePicker.tsx # Seletor de datas
│   ├── contexts/           # Contextos React
│   │   ├── ProductContext.tsx
│   │   └── TransactionContext.tsx
│   ├── lib/                # Utilitários
│   │   └── database.ts     # Funções de banco de dados
│   ├── types/              # Tipos TypeScript
│   │   └── index.ts
│   ├── App.tsx             # Componente principal
│   ├── main.tsx            # Entry point
│   └── index.css           # Estilos globais
├── server/                 # Backend API
│   ├── database/           # Arquivos JSON de dados
│   │   ├── products.json
│   │   └── transactions.json
│   ├── public/             # Modelos de planilhas
│   │   ├── modelo-produtos.xlsx
│   │   └── modelo-transacoes.xlsx
│   ├── uploads/            # Arquivos enviados
│   ├── database.js         # Classe de gerenciamento de dados
│   ├── server.js           # Servidor Express principal
│   └── package.json        # Dependências do backend
├── public/                 # Arquivos estáticos
│   ├── alya-logo.png
│   └── favicon.ico
├── package.json            # Dependências do frontend
├── vite.config.ts          # Configuração do Vite
├── tailwind.config.js      # Configuração do Tailwind
└── tsconfig.json           # Configuração do TypeScript
```

## 🔌 API Endpoints Principais

### Transações
- `GET /api/transactions` - Obter todas as transações
- `POST /api/transactions` - Criar nova transação
- `PUT /api/transactions/:id` - Atualizar transação
- `DELETE /api/transactions/:id` - Deletar transação
- `DELETE /api/transactions` - Deletar múltiplas transações

### Produtos
- `GET /api/products` - Obter todos os produtos
- `POST /api/products` - Criar novo produto
- `PUT /api/products/:id` - Atualizar produto
- `DELETE /api/products/:id` - Deletar produto

### Importação e Exportação
- `POST /api/import` - Importar dados de arquivo Excel
- `POST /api/export` - Exportar dados como Excel
- `GET /api/test` - Testar se a API está funcionando

## 🎨 Design

- Interface moderna e limpa
- Totalmente responsiva (mobile-first)
- Paleta de cores profissional
- UX otimizada para gestão financeira
- Tema claro/escuro (se implementado)
- Animações suaves e transições

## 🔒 Segurança

- Validação de dados no frontend e backend
- Sanitização de inputs
- Validação de tipos de arquivo no upload
- Limites de tamanho de arquivo (5MB)
- CORS configurado adequadamente
- Proteção contra injeção de dados maliciosos

## 📄 Licença

Este projeto está licenciado sob a **Licença MIT - Uso Educacional e Não Comercial**.

### ✅ O que você PODE fazer:
- ✅ Usar para fins educacionais e de aprendizado
- ✅ Estudar o código e arquitetura
- ✅ Usar como referência ou inspiração para criar projetos **novos e originais**
- ✅ Aplicar conceitos e padrões aprendidos em seus próprios projetos comerciais (desde que sejam criações originais)

### ❌ O que você NÃO PODE fazer:
- ❌ Reproduzir, copiar ou distribuir este software para fins comerciais
- ❌ Fazer modificações mínimas e usar comercialmente
- ❌ Vender ou licenciar este software ou partes dele
- ❌ Criar produtos comerciais que sejam substancialmente similares

**Para uso comercial deste código, entre em contato para licenciamento:**
📧 Email: contato@fercarvalho.com

Veja o arquivo [LICENSE](LICENSE) para os termos completos da licença.

## 🤝 Contribuindo

Este é um projeto pessoal, mas sugestões e feedback são sempre bem-vindos!

## 📝 Changelog

### Versão Atual
- ✅ Sistema completo de gestão de transações
- ✅ Gerenciamento de produtos com controle de estoque
- ✅ Dashboard com métricas em tempo real
- ✅ Relatórios e análises com gráficos
- ✅ Importação e exportação de dados Excel
- ✅ Interface responsiva e moderna
- ✅ API RESTful completa
- ✅ Validação de dados e tratamento de erros
- ✅ Sistema de categorias
- ✅ Cálculo automático de margens

### Próximas Funcionalidades
- [ ] Integração com banco de dados relacional (PostgreSQL)
- [ ] Autenticação de usuários
- [ ] Exportação de relatórios em PDF
- [ ] Gráficos mais interativos
- [ ] Notificações de estoque baixo
- [ ] API para integração com marketplaces
- [ ] Sistema de backup automático
- [ ] Histórico de alterações
- [ ] Múltiplos usuários e permissões

---

**Desenvolvido com ❤️ para facilitar a gestão financeira da Alya Velas**
