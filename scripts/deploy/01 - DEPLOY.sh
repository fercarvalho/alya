#!/bin/bash

# Script de deploy para o sistema Alya
# Uso:
#   ./scripts/deploy/deploy.sh          # Deploy de produção
#   ./scripts/deploy/deploy.sh --demo   # Build para GitHub Pages (docs/app/)

set -e

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DEMO_MODE=false
if [[ "$1" == "--demo" ]]; then
  DEMO_MODE=true
fi

if [ "$DEMO_MODE" = true ]; then
  echo "🚀 Iniciando build do modo demo..."
else
  echo "🚀 Iniciando deploy do Alya..."
fi

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script a partir da raiz do projeto${NC}"
    exit 1
fi

# ─────────────────────────────────────────────
# MODO PRODUÇÃO
# ─────────────────────────────────────────────
if [ "$DEMO_MODE" = false ]; then

  # Verificar se .env.production existe
  if [ ! -f ".env.production" ]; then
      echo -e "${YELLOW}⚠️  Arquivo .env.production não encontrado${NC}"
      echo "Criando .env.production com valores padrão..."
      cat > .env.production << 'EOF'
VITE_API_BASE_URL=https://alya.sistemas.viverdepj.com.br/api
EOF
      echo -e "${GREEN}✓ Arquivo .env.production criado${NC}"
  fi

  # Instalar dependências do frontend
  echo -e "\n${YELLOW}📦 Instalando dependências do frontend...${NC}"
  npm install

  # Build do frontend
  echo -e "\n${YELLOW}🔨 Fazendo build do frontend...${NC}"
  npm run build

  if [ ! -d "dist" ]; then
      echo -e "${RED}❌ Erro: Build falhou - pasta dist não encontrada${NC}"
      exit 1
  fi
  echo -e "${GREEN}✓ Build do frontend concluído${NC}"

  # Instalar dependências do backend
  echo -e "\n${YELLOW}📦 Instalando dependências do backend...${NC}"
  cd server && npm install && cd ..

  echo -e "\n${GREEN}✅ Deploy local concluído com sucesso!${NC}"
  echo -e "\n${YELLOW}Próximos passos:${NC}"
  echo "1. Faça upload dos arquivos para a VPS em /var/www/alya"
  echo "2. Configure o PM2: cd /var/www/alya/server && pm2 start server.js --name alya-api"
  echo "3. Consulte docs/01 - GUIA-DE-DEPLOY-PRODUCAO.md para instruções detalhadas."

fi

# ─────────────────────────────────────────────
# MODO DEMO (GitHub Pages)
# ─────────────────────────────────────────────
if [ "$DEMO_MODE" = true ]; then

  # Build com base path /app/ para GitHub Pages
  echo -e "\n${YELLOW}🔨 Fazendo build do frontend (base: /app/)...${NC}"
  BASE_PATH=/app/ npm run build

  if [ ! -d "dist" ]; then
      echo -e "${RED}❌ Erro: Build falhou - pasta dist não encontrada${NC}"
      exit 1
  fi
  echo -e "${GREEN}✓ Build do frontend concluído${NC}"

  # Preparar diretório docs/app
  echo -e "\n${YELLOW}📁 Preparando docs/app/...${NC}"
  mkdir -p docs/app
  find docs/app -mindepth 1 ! -name '.git' -delete 2>/dev/null || true

  # Copiar build para docs/app
  echo -e "\n${YELLOW}📦 Copiando arquivos para docs/app/...${NC}"
  cp -r dist/* docs/app/

  # Verificar arquivos do GitHub Pages
  [ ! -f "docs/sw.js" ]     && echo -e "${YELLOW}⚠️  docs/sw.js não encontrado${NC}"
  [ ! -f "docs/index.html" ] && echo -e "${YELLOW}⚠️  docs/index.html não encontrado${NC}"

  # Verificar dados de exemplo no Service Worker
  echo -e "\n${YELLOW}🔍 Verificando dados de demonstração...${NC}"
  if grep -q "demo_tx_\|description: 'Venda\|description: 'Serviço\|description: 'Aluguel\|description: 'Compra\|description: 'Salários" docs/sw.js 2>/dev/null; then
      echo -e "${RED}❌ ATENÇÃO: Dados de exemplo encontrados no Service Worker!${NC}"
      echo -e "${YELLOW}   Verifique docs/sw.js e remova qualquer dado de exemplo${NC}"
  else
      echo -e "${GREEN}✓ Service Worker está limpo${NC}"
  fi

  echo -e "\n${GREEN}✅ Build do modo demo concluído com sucesso!${NC}"
  echo -e "\n${YELLOW}Próximos passos:${NC}"
  echo "1. Commit e push para o repositório"
  echo "2. Configure GitHub Pages para servir da pasta 'docs'"
  echo "3. Acesse o site no GitHub Pages"

fi
