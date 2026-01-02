#!/bin/bash

# Script de deploy para o sistema Alya
# Uso: ./scripts/deploy.sh

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy do Alya..."

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

# Fazer build do frontend
echo -e "\n${YELLOW}🔨 Fazendo build do frontend...${NC}"
npm run build

# Verificar se o build foi bem-sucedido
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Erro: Build falhou - pasta dist não encontrada${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build do frontend concluído${NC}"

# Instalar dependências do backend
echo -e "\n${YELLOW}📦 Instalando dependências do backend...${NC}"
cd server
npm install
cd ..

echo -e "\n${GREEN}✅ Deploy local concluído com sucesso!${NC}"
echo -e "\n${YELLOW}Próximos passos:${NC}"
echo "1. Faça upload dos arquivos para a VPS em /www/alya"
echo "2. Configure o PM2: cd /www/alya/server && pm2 start ecosystem.config.js"
echo "3. Configure o Nginx usando o arquivo nginx-config.example"
echo "4. Configure SSL com Certbot"
echo ""
echo "Consulte DEPLOY.md para instruções detalhadas."

