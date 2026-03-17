#!/bin/bash

# ============================================================
# SCRIPT PARA RESETAR SENHA DO ADMIN - SISTEMA ALYA
# ============================================================
# Uso: ./scripts/reset-admin-password.sh [nova-senha]
# Se não fornecer senha, será usada a senha padrão: admin123
# ============================================================

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Senha padrão ou fornecida pelo usuário
NEW_PASSWORD="${1:-admin123}"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║        RESET DE SENHA DO ADMINISTRADOR - ALYA             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não está instalado!${NC}"
    echo ""
    echo "Instale Node.js primeiro:"
    echo "  sudo apt install nodejs npm"
    exit 1
fi

# Verificar se bcryptjs está instalado
if ! node -e "require('bcryptjs')" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  bcryptjs não encontrado. Instalando...${NC}"
    npm install bcryptjs
fi

# Gerar hash bcrypt da nova senha
echo -e "${BLUE}🔐 Gerando hash criptografado da senha...${NC}"
HASHED_PASSWORD=$(node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('$NEW_PASSWORD', 10));")

if [ -z "$HASHED_PASSWORD" ]; then
    echo -e "${RED}❌ Erro ao gerar hash da senha!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Hash gerado com sucesso${NC}"
echo ""

# Verificar credenciais do PostgreSQL no .env
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Arquivo .env não encontrado!${NC}"
    echo ""
    echo "Crie o arquivo .env com as credenciais do PostgreSQL:"
    echo "  DB_HOST=localhost"
    echo "  DB_PORT=5432"
    echo "  DB_NAME=alya"
    echo "  DB_USER=postgres"
    echo "  DB_PASSWORD=sua_senha"
    exit 1
fi

# Carregar variáveis do .env
source .env 2>/dev/null || export $(cat .env | xargs)

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-alya}"
DB_USER="${DB_USER:-postgres}"

# Verificar se PostgreSQL está acessível
echo -e "${BLUE}🔍 Verificando conexão com PostgreSQL...${NC}"
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
    echo -e "${RED}❌ Não foi possível conectar ao PostgreSQL!${NC}"
    echo ""
    echo "Verifique:"
    echo "  1. PostgreSQL está rodando?"
    echo "  2. Credenciais no .env estão corretas?"
    echo "  3. Banco de dados '$DB_NAME' existe?"
    exit 1
fi

echo -e "${GREEN}✅ Conectado ao PostgreSQL${NC}"
echo ""

# Executar UPDATE no banco de dados
echo -e "${BLUE}💾 Atualizando senha no banco de dados...${NC}"

RESULT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
UPDATE users
SET password = '$HASHED_PASSWORD', updated_at = NOW()
WHERE username = 'admin' OR email = 'admin@alya.com';

SELECT id, username, email, role
FROM users
WHERE username = 'admin' OR email = 'admin@alya.com';
")

if [ -z "$RESULT" ]; then
    echo -e "${RED}❌ Usuário admin não encontrado!${NC}"
    echo ""
    echo -e "${YELLOW}📝 Deseja criar um novo usuário admin? (s/n)${NC}"
    read -r CREATE_ADMIN

    if [ "$CREATE_ADMIN" = "s" ] || [ "$CREATE_ADMIN" = "S" ]; then
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        INSERT INTO users (username, password, email, role, created_at)
        VALUES ('admin', '$HASHED_PASSWORD', 'admin@alya.com', 'admin', NOW());
        "
        echo -e "${GREEN}✅ Usuário admin criado com sucesso!${NC}"
    else
        echo -e "${YELLOW}⚠️  Operação cancelada${NC}"
        exit 0
    fi
else
    echo -e "${GREEN}✅ Senha atualizada com sucesso!${NC}"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    CREDENCIAIS DE ACESSO                   ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  Username: admin                                           ║"
echo "║  Senha:    $NEW_PASSWORD"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Anote estas credenciais em local seguro!${NC}"
echo ""
echo -e "${BLUE}🔒 Recomendações de segurança:${NC}"
echo "   1. Altere esta senha após o primeiro login"
echo "   2. Use uma senha forte (mín. 12 caracteres)"
echo "   3. Não compartilhe suas credenciais"
echo ""
