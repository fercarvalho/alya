#!/bin/bash

# Script para build do modo demo do Alya
# Copia o build para docs/app/ para GitHub Pages

set -e

echo "🚀 Iniciando build do modo demo..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script a partir da raiz do projeto${NC}"
    exit 1
fi

# Fazer build do frontend com base path /app/ para GitHub Pages
echo -e "\n${YELLOW}🔨 Fazendo build do frontend (base: /app/)...${NC}"
BASE_PATH=/app/ npm run build

# Verificar se o build foi bem-sucedido
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Erro: Build falhou - pasta dist não encontrada${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build do frontend concluído${NC}"

# Criar diretório docs/app se não existir
echo -e "\n${YELLOW}📁 Preparando estrutura de diretórios...${NC}"
mkdir -p docs/app

# Limpar conteúdo anterior de docs/app (exceto se for git)
echo -e "\n${YELLOW}🧹 Limpando docs/app...${NC}"
find docs/app -mindepth 1 ! -name '.git' -delete 2>/dev/null || true

# Copiar build para docs/app
echo -e "\n${YELLOW}📦 Copiando arquivos para docs/app...${NC}"
cp -r dist/* docs/app/

# Verificar se sw.js e index.html existem em docs/
if [ ! -f "docs/sw.js" ]; then
    echo -e "${YELLOW}⚠️  Arquivo docs/sw.js não encontrado${NC}"
fi

if [ ! -f "docs/index.html" ]; then
    echo -e "${YELLOW}⚠️  Arquivo docs/index.html não encontrado${NC}"
fi

echo -e "\n${GREEN}✅ Build do modo demo concluído com sucesso!${NC}"
echo -e "\n${YELLOW}Estrutura criada:${NC}"
echo "  docs/"
echo "  ├── index.html (launcher)"
echo "  ├── sw.js (service worker)"
echo "  └── app/ (build do React)"
echo ""
echo -e "${YELLOW}Próximos passos:${NC}"
echo "1. Commit e push para o repositório"
echo "2. Configure GitHub Pages para servir da pasta 'docs'"
echo "3. Acesse o site no GitHub Pages"

