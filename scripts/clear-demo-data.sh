#!/bin/bash

# Script para limpar dados de demonstração do Service Worker
# Garante que o modo demo sempre comece limpo

set -e

echo "🧹 Limpando dados de demonstração do Service Worker..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -f "docs/sw.js" ]; then
    echo -e "${RED}❌ Erro: Arquivo docs/sw.js não encontrado${NC}"
    exit 1
fi

# Verificar se há dados de exemplo no Service Worker (transações, produtos, etc)
# Ignorar 'demo-1' que é o ID do usuário demo (correto)
if grep -q "demo_tx_\|description: 'Venda\|description: 'Serviço\|description: 'Aluguel\|description: 'Compra\|description: 'Salários" docs/sw.js; then
    echo -e "${RED}❌ Dados de exemplo encontrados no Service Worker${NC}"
    echo -e "${YELLOW}   Execute manualmente a limpeza ou use o script de build${NC}"
else
    echo -e "${GREEN}✓ Service Worker está limpo (sem dados de exemplo)${NC}"
fi

# Verificar arrays vazios
if grep -q "transactions: \[\]" docs/sw.js && \
   grep -q "products: \[\]" docs/sw.js && \
   grep -q "clients: \[\]" docs/sw.js && \
   grep -q "metas: \[\]" docs/sw.js; then
    echo -e "${GREEN}✓ Todos os arrays estão vazios (correto para modo demo)${NC}"
else
    echo -e "${YELLOW}⚠️  Alguns arrays podem conter dados${NC}"
fi

echo -e "\n${GREEN}✅ Verificação concluída${NC}"
echo -e "\n${YELLOW}Nota:${NC} O modo demo deve sempre começar com:"
echo "  - transactions: []"
echo "  - products: []"
echo "  - clients: []"
echo "  - metas: []"
echo ""
echo "Os usuários criam seus próprios dados durante a demonstração."

