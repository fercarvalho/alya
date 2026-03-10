#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# OWASP ZAP - Script de Scan Automatizado
# ═══════════════════════════════════════════════════════════════════════════════
#
# Este script executa um scan de segurança automatizado usando OWASP ZAP
# contra a aplicação Alya Financial System.
#
# Pré-requisitos:
#   - OWASP ZAP instalado (https://www.zaproxy.org/download/)
#   - Aplicação rodando em http://localhost:5173 (frontend)
#   - Backend rodando em http://localhost:8001
#
# Uso:
#   ./zap-scan.sh [quick|full|baseline]
#
# Modos:
#   - quick:    Spider + Passive Scan (5-10 min)
#   - full:     Spider + Active Scan (30-60 min)
#   - baseline: Baseline scan (recomendado para CI/CD)
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
TARGET_URL="${ZAP_TARGET_URL:-http://localhost:5173}"
API_URL="${ZAP_API_URL:-http://localhost:8001}"
ZAP_PORT="${ZAP_PORT:-8090}"
SCAN_MODE="${1:-quick}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="./reports"
REPORT_FILE="${REPORT_DIR}/zap-report-${SCAN_MODE}-${TIMESTAMP}.html"
JSON_REPORT="${REPORT_DIR}/zap-report-${SCAN_MODE}-${TIMESTAMP}.json"

# Verificar se ZAP está instalado
if ! command -v zap.sh &> /dev/null && ! command -v zap-cli &> /dev/null; then
    echo -e "${RED}❌ OWASP ZAP não encontrado!${NC}"
    echo ""
    echo "Instale o OWASP ZAP:"
    echo "  macOS:   brew install --cask owasp-zap"
    echo "  Linux:   https://www.zaproxy.org/download/"
    echo "  Docker:  docker pull owasp/zap2docker-stable"
    echo ""
    exit 1
fi

# Criar diretório de relatórios
mkdir -p "${REPORT_DIR}"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}         OWASP ZAP - Security Scan (Modo: ${SCAN_MODE})${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Target:${NC}      ${TARGET_URL}"
echo -e "${GREEN}API:${NC}         ${API_URL}"
echo -e "${GREEN}ZAP Port:${NC}    ${ZAP_PORT}"
echo -e "${GREEN}Report:${NC}      ${REPORT_FILE}"
echo ""

# Verificar se aplicação está rodando
echo -e "${YELLOW}⏳ Verificando se aplicação está acessível...${NC}"
if ! curl -s -o /dev/null -w "%{http_code}" "${TARGET_URL}" > /dev/null; then
    echo -e "${RED}❌ Aplicação não está acessível em ${TARGET_URL}${NC}"
    echo "Inicie o frontend: npm run dev"
    exit 1
fi

if ! curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Backend não está acessível em ${API_URL}${NC}"
    echo "Algumas verificações podem falhar."
fi

echo -e "${GREEN}✅ Aplicação acessível${NC}"
echo ""

# Função para executar ZAP via Docker (fallback se não instalado localmente)
run_zap_docker() {
    local scan_type=$1

    echo -e "${YELLOW}🐳 Executando ZAP via Docker...${NC}"

    case $scan_type in
        baseline)
            docker run --rm -v "$(pwd):/zap/wrk/:rw" \
                -t owasp/zap2docker-stable zap-baseline.py \
                -t "${TARGET_URL}" \
                -r "zap-report-baseline-${TIMESTAMP}.html" \
                -J "zap-report-baseline-${TIMESTAMP}.json"
            ;;
        quick)
            docker run --rm -v "$(pwd):/zap/wrk/:rw" \
                -t owasp/zap2docker-stable zap-baseline.py \
                -t "${TARGET_URL}" \
                -r "zap-report-quick-${TIMESTAMP}.html" \
                -J "zap-report-quick-${TIMESTAMP}.json"
            ;;
        full)
            docker run --rm -v "$(pwd):/zap/wrk/:rw" \
                -t owasp/zap2docker-stable zap-full-scan.py \
                -t "${TARGET_URL}" \
                -r "zap-report-full-${TIMESTAMP}.html" \
                -J "zap-report-full-${TIMESTAMP}.json"
            ;;
    esac
}

# Executar scan baseado no modo
case $SCAN_MODE in
    quick)
        echo -e "${YELLOW}⏳ Executando Quick Scan (Spider + Passive Scan)...${NC}"
        echo "Duração estimada: 5-10 minutos"
        echo ""

        if command -v zap-cli &> /dev/null; then
            # Usando ZAP CLI
            zap-cli quick-scan -s all "${TARGET_URL}" \
                --spider \
                --passive-scan \
                -r "${REPORT_FILE}"
        else
            # Usando Docker
            run_zap_docker "quick"
        fi
        ;;

    full)
        echo -e "${YELLOW}⏳ Executando Full Scan (Spider + Active Scan)...${NC}"
        echo "Duração estimada: 30-60 minutos"
        echo ""
        echo -e "${RED}⚠️  AVISO: Active Scan pode gerar muito tráfego!${NC}"
        echo -e "${RED}   Não execute contra ambientes de produção!${NC}"
        echo ""
        read -p "Continuar? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Scan cancelado."
            exit 0
        fi

        if command -v zap-cli &> /dev/null; then
            zap-cli quick-scan -s all "${TARGET_URL}" \
                --spider \
                --ajax-spider \
                --active-scan \
                -r "${REPORT_FILE}"
        else
            run_zap_docker "full"
        fi
        ;;

    baseline)
        echo -e "${YELLOW}⏳ Executando Baseline Scan (recomendado para CI/CD)...${NC}"
        echo "Duração estimada: 5-10 minutos"
        echo ""

        run_zap_docker "baseline"
        ;;

    *)
        echo -e "${RED}❌ Modo inválido: ${SCAN_MODE}${NC}"
        echo "Uso: $0 [quick|full|baseline]"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Scan concluído!${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                      RELATÓRIO GERADO${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "HTML: ${REPORT_FILE}"
echo -e "JSON: ${JSON_REPORT}"
echo ""
echo -e "${YELLOW}📊 Para visualizar o relatório:${NC}"
echo -e "   open ${REPORT_FILE}"
echo ""
echo -e "${YELLOW}🔍 Próximos passos:${NC}"
echo "   1. Revisar vulnerabilidades encontradas"
echo "   2. Priorizar correções (High/Medium primeiro)"
echo "   3. Corrigir issues no código"
echo "   4. Re-executar scan para validar correções"
echo ""
