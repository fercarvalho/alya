# Alya - Sistema Financeiro

Sistema completo de gestão financeira desenvolvido para o ecommerce de velas Alya. Aplicação web moderna e responsiva para gerenciamento de produtos, transações, clientes, projeções financeiras e segurança.

**Desenvolvido por Fernando Carvalho**
- Email: contato@fercarvalho.com
- Instagram: [@cadeofer](https://instagram.com/cadeofer)

---

## Funcionalidades

- **Dashboard** — métricas em tempo real, receitas, despesas, saldo
- **Transações** — controle completo de receitas e despesas com categorização
- **Produtos** — catálogo com controle de estoque, preço e margem de lucro
- **Clientes** — cadastro com dados sensíveis criptografados (CPF, telefone, email)
- **DRE** — Demonstração de Resultado do Exercício
- **Projeção Financeira** — simulações de receita, despesas, investimentos e resultado
- **Importação/Exportação** — planilhas Excel (.xlsx) para transações, produtos e clientes
- **Exportação PDF** — relatórios e DRE exportáveis em PDF
- **Perfil de Usuário** — edição de perfil, foto com recorte, alteração de senha e username
- **Administração** — gerenciamento de usuários, módulos, permissões e logs de atividade
- **Segurança** — sessões ativas, detecção de anomalias, alertas de segurança em tempo real
- **Recuperação de Senha** — fluxo completo com e-mail via SendGrid e rate limiting

---

## Stack Tecnológica

### Frontend
- **React 18** + TypeScript
- **Vite 7** — build e desenvolvimento
- **Tailwind CSS** — estilização
- **Recharts** — gráficos e visualizações
- **Lucide React** — ícones
- **date-fns** — formatação de datas
- **jsPDF** + **html2canvas** — exportação de PDFs
- **axios** — cliente HTTP
- **browser-image-compression** + **react-easy-crop** — upload e recorte de imagens

### Backend
- **Node.js 18+** + Express
- **PostgreSQL** — banco de dados relacional
- **bcryptjs** — hash de senhas
- **jsonwebtoken** — autenticação JWT com refresh tokens
- **Multer** — upload de arquivos
- **SendGrid** — envio de e-mails (alertas de segurança e recuperação de senha)
- **express-validator** — validação de entradas
- **geoip-lite** — geolocalização de IPs
- **ua-parser-js** — identificação de dispositivos por user agent
- **helmet** — headers de segurança HTTP
- **express-mongo-sanitize** + **xss-clean** + **hpp** — sanitização e proteção contra injeções

### Infraestrutura
- **Nginx** — servidor web e proxy reverso
- **PM2** — gerenciamento de processos Node.js
- **Let's Encrypt** — certificado SSL
- **VPS Hostinger** — hospedagem

---

## Segurança (Score 9.9/10)

- Autenticação JWT com refresh tokens (access: 15min, refresh: 7 dias)
- Criptografia AES-256-GCM para dados sensíveis (CPF, telefone, email, endereço)
- Rate limiting por endpoint, CORS, Helmet, CSP com nonces
- Validação de CPF/CNPJ e sanitização de todos os inputs
- Sistema de auditoria completo com rotação automática de logs
- Detecção de anomalias com ML em tempo real (comportamento suspeito por usuário)
- Alertas automáticos via SendGrid (brute force, múltiplos IPs, roubo de token, etc.)
- Sessões ativas com controle por dispositivo, geolocalização e logout remoto
- Gerador de senhas seguras integrado

---

## Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- npm

---

## Instalação (Desenvolvimento)

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/alya.git
cd alya

# 2. Instale dependências
npm install
cd server && npm install && cd ..

# 3. Configure o banco de dados (execute na ordem)
psql -U seuusuario -d alya -h localhost -f "server/migrations/001 - SCHEMA.sql"
psql -U seuusuario -d alya -h localhost -f "server/migrations/002 - SCHEMA-PROJECAO.sql"
psql -U seuusuario -d alya -h localhost -f "server/migrations/003 - SEGURANCA.sql"

# 4. Configure as variáveis de ambiente
cp server/.env.example server/.env
# Edite server/.env com suas credenciais

# 5. Inicie os servidores
# Terminal 1 - Backend
cd server && npm start

# Terminal 2 - Frontend
npm run dev
```

Frontend: `http://localhost:8000`
Backend: `http://localhost:8001`

Para detalhes completos de configuração, veja [docs/02 - CONFIGURACAO-AMBIENTE-DEV.md](docs/02%20-%20CONFIGURACAO-AMBIENTE-DEV.md).

---

## Estrutura do Projeto

```
alya/
├── src/                        # Aplicação React (frontend)
│   ├── components/             # Componentes por módulo
│   │   ├── admin/              # Painel administrativo
│   │   ├── modals/             # Modais (perfil, senha, usuários, etc.)
│   │   ├── Dashboard.tsx
│   │   ├── Transactions.tsx
│   │   ├── Products.tsx
│   │   ├── Clients.tsx
│   │   ├── DRE.tsx
│   │   ├── Projection.tsx
│   │   └── ...
│   ├── contexts/               # Contextos React (estado global)
│   ├── config/                 # Configurações (API, etc.)
│   └── types/                  # Tipos TypeScript
├── server/                     # Backend Node.js
│   ├── migrations/             # Migrações SQL (001 a 003, executar em ordem)
│   ├── utils/                  # Utilitários (anomaly detection, alerts, encryption)
│   ├── middleware/             # Middlewares Express
│   └── server.js               # Servidor principal
├── scripts/                    # Scripts de administração e deploy
│   ├── deploy/
│   │   └── 01 - DEPLOY.sh      # Build de produção ou demo (--demo)
│   └── server/
│       ├── 01 - ADMIN.js       # Gera chaves e migra dados criptografados
│       ├── 02 - RESET-SENHA-ADMIN.js
│       └── 03 - TESTAR-ALERTAS.js
├── security/                   # Módulos e documentação de segurança
│   ├── alerts/
│   ├── anomaly-detection/
│   ├── csp-nonces/
│   ├── encryption/
│   ├── owasp-zap/
│   ├── snyk-sonar/
│   └── waf/
├── docs/                       # Documentação completa
│   ├── 00 - COMECE POR AQUI.md
│   ├── 01 - GUIA-DE-DEPLOY-PRODUCAO.md
│   └── ...
└── openspec/                   # Especificações de funcionalidades
```

---

## Scripts Úteis

```bash
# Arquivamento de logs (rodar na pasta server/)
npm run archive-logs:90d
npm run archive-logs:dry-run

# Administração (rodar na raiz do projeto)
node "scripts/server/01 - ADMIN.js" --gen-key
node "scripts/server/01 - ADMIN.js" --migrate-fields --dry-run
node "scripts/server/01 - ADMIN.js" --migrate-fields
node "scripts/server/02 - RESET-SENHA-ADMIN.js"
node "scripts/server/03 - TESTAR-ALERTAS.js" all

# Deploy
bash "scripts/deploy/01 - DEPLOY.sh"          # produção
bash "scripts/deploy/01 - DEPLOY.sh" --demo   # GitHub Pages
```

Veja [scripts/server/README.md](scripts/server/README.md) para detalhes de cada script.

---

## Documentação

Toda a documentação está em [`docs/`](docs/). Comece por [`docs/00 - COMECE POR AQUI.md`](docs/00%20-%20COMECE%20POR%20AQUI.md).

---

## Deploy em Produção

Veja o guia completo em [`docs/01 - GUIA-DE-DEPLOY-PRODUCAO.md`](docs/01%20-%20GUIA-DE-DEPLOY-PRODUCAO.md).

---

## Licença

Licença MIT — Uso Educacional e Não Comercial.

- ✅ Uso educacional e de aprendizado
- ✅ Referência e inspiração para projetos originais
- ❌ Uso comercial sem autorização
- ❌ Cópia ou distribuição comercial

Para uso comercial: contato@fercarvalho.com

---

**Desenvolvido com ❤️ para facilitar a gestão financeira da Alya Velas**
