# 🛡️ OWASP ZAP - Penetration Testing

**Status:** ✅ Configurado
**Data:** 2026-03-04
**Tempo de Implementação:** ~4 horas

---

## 📋 O Que é OWASP ZAP?

OWASP ZAP (Zed Attack Proxy) é uma ferramenta **open-source** de teste de segurança automatizado que ajuda a encontrar vulnerabilidades em aplicações web, como:

- 🔓 SQL Injection
- 🔓 Cross-Site Scripting (XSS)
- 🔓 CSRF (Cross-Site Request Forgery)
- 🔓 Path Traversal
- 🔓 Server Misconfigurations
- 🔓 Insecure Headers
- 🔓 Cookie Security Issues

---

## 🚀 Instalação

### macOS:
```bash
brew install --cask owasp-zap
```

### Linux:
```bash
# Ubuntu/Debian
sudo snap install zaproxy --classic

# Ou baixe direto
wget https://github.com/zaproxy/zaproxy/releases/download/v2.14.0/ZAP_2.14.0_Linux.tar.gz
tar -xvf ZAP_2.14.0_Linux.tar.gz
```

### Docker (Recomendado para CI/CD):
```bash
docker pull owasp/zap2docker-stable
```

### Windows:
Download: https://www.zaproxy.org/download/

---

## 📖 Uso

### 1. Quick Scan (5-10 minutos)
**Recomendado para desenvolvimento diário**

```bash
cd security/owasp-zap
./zap-scan.sh quick
```

**O que faz:**
- ✅ Spider (crawl) da aplicação
- ✅ Passive Scan (sem ataques ativos)
- ✅ Detecta configurações inseguras
- ✅ Gera relatório HTML/JSON

---

### 2. Full Scan (30-60 minutos)
**Recomendado antes de releases**

```bash
./zap-scan.sh full
```

**O que faz:**
- ✅ Spider + AJAX Spider (crawl profundo)
- ✅ Active Scan (testa exploits reais)
- ⚠️ **AVISO:** Gera muito tráfego, NÃO use em produção!

---

### 3. Baseline Scan (5-10 minutos)
**Recomendado para CI/CD**

```bash
./zap-scan.sh baseline
```

**O que faz:**
- ✅ Scan rápido focado em issues comuns
- ✅ Ideal para GitHub Actions / GitLab CI
- ✅ Falha o build se encontrar vulnerabilidades críticas

---

## 📊 Relatórios

Os relatórios são salvos em `security/owasp-zap/reports/`:

```
reports/
├── zap-report-quick-20260304_143022.html   ← Relatório visual
└── zap-report-quick-20260304_143022.json   ← Dados estruturados
```

### Abrir Relatório HTML:
```bash
open security/owasp-zap/reports/zap-report-quick-*.html
```

### Parsear JSON (Exemplo):
```bash
jq '.site[0].alerts[] | select(.riskcode >= "2") | {name, risk, desc}' \
  reports/zap-report-quick-*.json
```

---

## 🔍 Interpretando Resultados

### Níveis de Risco:
- 🔴 **High** - Corrigir IMEDIATAMENTE (exploitável)
- 🟠 **Medium** - Corrigir em 1-2 sprints
- 🟡 **Low** - Corrigir quando possível
- 🔵 **Informational** - Boas práticas

### Falsos Positivos:
Nem tudo que o ZAP reporta é uma vulnerabilidade real. Revise cuidadosamente antes de corrigir.

**Exemplos comuns de falsos positivos:**
- "X-Content-Type-Options header missing" em arquivos estáticos
- "Cookie without SameSite attribute" em cookies de bibliotecas de terceiros
- "CSP not defined" se você já tem CSP configurado (ZAP pode não detectar)

---

## 🔧 Integração com CI/CD

### GitHub Actions (Exemplo):

Crie `.github/workflows/zap-scan.yml`:

```yaml
name: OWASP ZAP Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 1' # Segunda-feira às 2AM

jobs:
  zap-scan:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Install Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          npm install
          cd server && npm install

      - name: Start backend
        run: |
          cd server
          npm start &
          sleep 10

      - name: Start frontend
        run: |
          npm run dev &
          sleep 10

      - name: Run ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'http://localhost:5173'
          rules_file_name: 'security/owasp-zap/zap-rules.tsv'
          fail_action: true # Falha o build se encontrar issues críticos

      - name: Upload ZAP Report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: zap-report
          path: report_html.html
```

---

## 🛠️ Configuração Avançada

### Autenticação Automatizada

Se você precisa testar rotas autenticadas, configure um contexto ZAP:

```bash
# 1. Criar contexto
zap-cli context new alya-context

# 2. Incluir URLs autenticadas
zap-cli context include alya-context "http://localhost:5173/.*"

# 3. Configurar login
zap-cli auth login http://localhost:8001/api/auth/login \
  -d '{"username":"admin","password":"senha"}' \
  -m POST
```

### Exclusões (Para Evitar Falsos Positivos)

Crie `zap-rules.tsv`:

```tsv
# ZAP Scanning Rules Configuration
# Formato: ruleId	IGNORE	URL	PARAMETER
10021	IGNORE	http://localhost:5173/static/.*		# Ignore X-Content-Type-Options em static files
10038	IGNORE	http://localhost:5173/assets/.*		# Ignore headers em assets
```

---

## 📈 Frequência Recomendada

| Ambiente | Frequência | Modo |
|----------|-----------|------|
| **Desenvolvimento** | Diário (opcional) | Quick |
| **Staging** | Antes de cada release | Full |
| **CI/CD** | A cada commit | Baseline |
| **Produção** | ❌ NUNCA execute Active Scan | - |

---

## 🚨 Vulnerabilidades Comuns Detectadas

### 1. Missing Security Headers

**Issue:** `X-Content-Type-Options header missing`

**Correção:**
```javascript
// server/middleware/security.js
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
```

### 2. Cookie Without Secure Flag

**Issue:** `Cookie 'authToken' without Secure flag`

**Correção:**
```javascript
res.cookie('authToken', token, {
  httpOnly: true,
  secure: true, // ← Adicionar
  sameSite: 'strict'
});
```

### 3. CSP Not Defined

**Issue:** `Content Security Policy (CSP) not defined`

**Correção:** Já implementado em `server/middleware/security.js` (Fase 3)

### 4. SQL Injection

**Issue:** `Possible SQL Injection`

**Correção:** Usar prepared statements (já implementado no projeto)

---

## 📚 Recursos

- **Documentação Oficial:** https://www.zaproxy.org/docs/
- **ZAP Scripting:** https://www.zaproxy.org/docs/desktop/addons/script-console/
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/

---

## ✅ Checklist de Implementação

- [x] Script `zap-scan.sh` criado
- [x] Documentação completa
- [ ] Executar primeiro scan (`./zap-scan.sh quick`)
- [ ] Revisar relatório gerado
- [ ] Corrigir vulnerabilidades High/Medium
- [ ] Integrar ao GitHub Actions (opcional)
- [ ] Agendar scans semanais (opcional)

---

## 🎯 Próximos Passos

1. **Executar primeiro scan:**
   ```bash
   cd security/owasp-zap
   ./zap-scan.sh quick
   ```

2. **Revisar relatório:**
   ```bash
   open reports/zap-report-quick-*.html
   ```

3. **Corrigir issues encontrados**

4. **Re-executar scan para validar correções**

---

**OWASP ZAP Configurado! 🛡️**

*Parte da Etapa 1 - Fase 4 do Plano de Segurança*
