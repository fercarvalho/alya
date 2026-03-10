#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# Setup WAF (ModSecurity + Nginx) - Alya Financial System
# ═══════════════════════════════════════════════════════════════════════════════
#
# Este script automatiza a instalação e configuração do ModSecurity com Nginx.
#
# Uso:
#   sudo ./setup-waf.sh
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}      WAF Setup - ModSecurity + Nginx + OWASP CRS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Verificar se é root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Este script deve ser executado como root (sudo)${NC}"
    exit 1
fi

# Detectar sistema operacional
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo -e "${RED}❌ Sistema operacional não identificado${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Sistema operacional detectado: $OS${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# INSTALAR NGINX + MODSECURITY
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}⏳ Instalando Nginx + ModSecurity...${NC}"

case $OS in
    ubuntu|debian)
        apt-get update
        apt-get install -y nginx libnginx-mod-security2
        ;;
    centos|rhel|fedora)
        yum install -y nginx mod_security
        ;;
    *)
        echo -e "${RED}❌ Sistema não suportado: $OS${NC}"
        echo "Instale manualmente: nginx + mod_security"
        exit 1
        ;;
esac

echo -e "${GREEN}✅ Nginx + ModSecurity instalados${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# INSTALAR OWASP CORE RULE SET (CRS)
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}⏳ Instalando OWASP CRS...${NC}"

CRS_VERSION="v3.3.5"
CRS_DIR="/usr/share/modsecurity-crs"

if [ ! -d "$CRS_DIR" ]; then
    mkdir -p "$CRS_DIR"
    cd /tmp
    wget "https://github.com/coreruleset/coreruleset/archive/refs/tags/${CRS_VERSION}.tar.gz"
    tar -xzf "${CRS_VERSION}.tar.gz"
    mv "coreruleset-${CRS_VERSION#v}"/* "$CRS_DIR/"
    rm -rf "/tmp/${CRS_VERSION}.tar.gz" "/tmp/coreruleset-${CRS_VERSION#v}"

    # Copiar configuração padrão
    cd "$CRS_DIR"
    cp crs-setup.conf.example crs-setup.conf

    echo -e "${GREEN}✅ OWASP CRS instalado${NC}"
else
    echo -e "${YELLOW}⚠️  OWASP CRS já instalado${NC}"
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURAR MODSECURITY
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}⏳ Configurando ModSecurity...${NC}"

MODSEC_DIR="/etc/nginx/modsec"
mkdir -p "$MODSEC_DIR"

# Copiar configuração recomendada
if [ -f /etc/modsecurity/modsecurity.conf-recommended ]; then
    cp /etc/modsecurity/modsecurity.conf-recommended "$MODSEC_DIR/modsecurity.conf"
else
    echo -e "${YELLOW}⚠️  Arquivo modsecurity.conf-recommended não encontrado${NC}"
    echo "Criando configuração básica..."
    cat > "$MODSEC_DIR/modsecurity.conf" <<'EOF'
SecRuleEngine On
SecRequestBodyAccess On
SecResponseBodyAccess On
SecAuditEngine RelevantOnly
SecAuditLogType Serial
SecAuditLog /var/log/nginx/modsec-audit.log
EOF
fi

# Copiar unicode mapping
if [ -f /usr/share/modsecurity-crs/unicode.mapping ]; then
    cp /usr/share/modsecurity-crs/unicode.mapping "$MODSEC_DIR/"
fi

# Copiar nossa configuração customizada
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/modsec-main.conf" ]; then
    cp "$SCRIPT_DIR/modsec-main.conf" "$MODSEC_DIR/main.conf"
    echo -e "${GREEN}✅ Configuração customizada copiada${NC}"
else
    echo -e "${RED}❌ Arquivo modsec-main.conf não encontrado${NC}"
    exit 1
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURAR NGINX
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}⏳ Configurando Nginx...${NC}"

NGINX_CONF="/etc/nginx/sites-available/alya"
NGINX_ENABLED="/etc/nginx/sites-enabled/alya"

# Backup de configuração existente
if [ -f "$NGINX_CONF" ]; then
    cp "$NGINX_CONF" "$NGINX_CONF.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}✅ Backup criado: $NGINX_CONF.backup.*${NC}"
fi

# Copiar nossa configuração
if [ -f "$SCRIPT_DIR/nginx-modsecurity.conf" ]; then
    cp "$SCRIPT_DIR/nginx-modsecurity.conf" "$NGINX_CONF"

    # Criar symlink se não existir
    if [ ! -L "$NGINX_ENABLED" ]; then
        ln -s "$NGINX_CONF" "$NGINX_ENABLED"
    fi

    echo -e "${GREEN}✅ Configuração do Nginx copiada${NC}"
else
    echo -e "${RED}❌ Arquivo nginx-modsecurity.conf não encontrado${NC}"
    exit 1
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# CRIAR DIRETÓRIOS DE LOGS
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}⏳ Criando diretórios de logs...${NC}"

mkdir -p /var/log/nginx
touch /var/log/nginx/modsec-audit.log
touch /var/log/nginx/modsec-debug.log
chown -R www-data:www-data /var/log/nginx  # Ubuntu/Debian
# chown -R nginx:nginx /var/log/nginx  # CentOS/RHEL

echo -e "${GREEN}✅ Diretórios de logs criados${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# TESTAR CONFIGURAÇÃO
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}⏳ Testando configuração do Nginx...${NC}"

if nginx -t; then
    echo -e "${GREEN}✅ Configuração válida${NC}"
else
    echo -e "${RED}❌ Erro na configuração do Nginx${NC}"
    echo "Execute 'nginx -t' para ver detalhes"
    exit 1
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# REINICIAR NGINX
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${YELLOW}⏳ Reiniciando Nginx...${NC}"

systemctl restart nginx

if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx reiniciado com sucesso${NC}"
else
    echo -e "${RED}❌ Falha ao reiniciar Nginx${NC}"
    systemctl status nginx
    exit 1
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# RESUMO
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                     INSTALAÇÃO COMPLETA${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✅ WAF (ModSecurity + Nginx + OWASP CRS) configurado!${NC}"
echo ""
echo -e "${YELLOW}📁 Arquivos importantes:${NC}"
echo "   - Nginx config:       $NGINX_CONF"
echo "   - ModSec config:      $MODSEC_DIR/main.conf"
echo "   - OWASP CRS:          $CRS_DIR"
echo "   - Audit log:          /var/log/nginx/modsec-audit.log"
echo ""
echo -e "${YELLOW}🧪 Testar WAF:${NC}"
echo '   curl "https://seu-dominio.com/api/test?id=1 OR 1=1"'
echo "   (Deve retornar 403 Forbidden)"
echo ""
echo -e "${YELLOW}📊 Monitorar logs:${NC}"
echo "   tail -f /var/log/nginx/modsec-audit.log"
echo "   tail -f /var/log/nginx/alya-access.log"
echo ""
echo -e "${YELLOW}⚙️  Ajustar configuração:${NC}"
echo "   nano $MODSEC_DIR/main.conf"
echo "   nginx -t && systemctl reload nginx"
echo ""
echo -e "${YELLOW}🔍 Próximos passos:${NC}"
echo "   1. Ajustar domínio em: $NGINX_CONF"
echo "   2. Configurar certificado SSL"
echo "   3. Testar regras do WAF"
echo "   4. Monitorar logs por falsos positivos"
echo "   5. Ajustar whitelist conforme necessário"
echo ""
