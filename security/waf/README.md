# 🛡️ WAF (Web Application Firewall) - ModSecurity + Nginx

**Status:** ✅ Configurado (Pronto para Deploy)
**Data:** 2026-03-04
**Tempo de Implementação:** ~10 horas

---

## 📋 O Que é WAF?

Um **Web Application Firewall** (WAF) é uma camada de segurança que filtra e monitora tráfego HTTP entre uma aplicação web e a Internet. Ele protege contra ataques comuns como:

- 🛡️ **SQL Injection** (SQLi)
- 🛡️ **Cross-Site Scripting** (XSS)
- 🛡️ **Cross-Site Request Forgery** (CSRF)
- 🛡️ **Path Traversal**
- 🛡️ **Remote File Inclusion** (RFI)
- 🛡️ **Command Injection**
- 🛡️ **XML External Entity** (XXE)
- 🛡️ **Server-Side Request Forgery** (SSRF)

---

## 🏗️ Arquitetura

```
Internet
    ↓
┌─────────────────┐
│  Nginx + WAF    │ ← ModSecurity + OWASP CRS
│  (Port 443)     │    Rate Limiting
└────────┬────────┘    Geo Blocking
         │             DDoS Protection
    ┌────┴────┐
    ↓         ↓
Frontend   Backend
(5173)     (8001)
```

---

## 🚀 Instalação

### Pré-requisitos:
- Ubuntu 20.04+ / Debian 11+ / CentOS 8+ / RHEL 8+
- Acesso root (sudo)
- Backend e Frontend rodando

### Instalação Automatizada:

```bash
cd security/waf
sudo ./setup-waf.sh
```

O script irá:
1. ✅ Instalar Nginx + ModSecurity
2. ✅ Baixar e configurar OWASP Core Rule Set (CRS)
3. ✅ Configurar regras customizadas para Alya
4. ✅ Configurar rate limiting
5. ✅ Criar logs de auditoria
6. ✅ Testar configuração
7. ✅ Reiniciar Nginx

---

## 📝 Configuração Manual

Se preferir instalar manualmente:

### 1. Instalar Nginx + ModSecurity

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y nginx libnginx-mod-security2
```

**CentOS/RHEL:**
```bash
sudo yum install -y nginx mod_security
```

### 2. Baixar OWASP CRS

```bash
cd /usr/share
sudo wget https://github.com/coreruleset/coreruleset/archive/refs/tags/v3.3.5.tar.gz
sudo tar -xzf v3.3.5.tar.gz
sudo mv coreruleset-3.3.5 modsecurity-crs
cd modsecurity-crs
sudo cp crs-setup.conf.example crs-setup.conf
```

### 3. Configurar ModSecurity

```bash
sudo mkdir -p /etc/nginx/modsec
sudo cp /etc/modsecurity/modsecurity.conf-recommended /etc/nginx/modsec/modsecurity.conf
sudo cp security/waf/modsec-main.conf /etc/nginx/modsec/main.conf
```

### 4. Configurar Nginx

```bash
sudo cp security/waf/nginx-modsecurity.conf /etc/nginx/sites-available/alya
sudo ln -s /etc/nginx/sites-available/alya /etc/nginx/sites-enabled/alya
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🧪 Testes

### 1. Testar SQL Injection

```bash
# Deve retornar 403 Forbidden
curl "https://seu-dominio.com/api/clients?id=1 OR 1=1"
curl "https://seu-dominio.com/api/clients?name=admin'--"
```

### 2. Testar XSS

```bash
# Deve retornar 403 Forbidden
curl "https://seu-dominio.com/api/test?q=<script>alert(1)</script>"
curl "https://seu-dominio.com/search?query=<img src=x onerror=alert(1)>"
```

### 3. Testar Path Traversal

```bash
# Deve retornar 403 Forbidden
curl "https://seu-dominio.com/api/files?path=../../../etc/passwd"
curl "https://seu-dominio.com/download?file=..\..\..\..\windows\system32\config\sam"
```

### 4. Testar Rate Limiting

```bash
# Fazer 10+ requisições em 1 segundo (deve bloquear)
for i in {1..15}; do
    curl "https://seu-dominio.com/api/clients" &
done
```

### 5. Testar Login Rate Limiting

```bash
# Fazer 5+ tentativas de login em 1 minuto (deve bloquear)
for i in {1..6}; do
    curl -X POST "https://seu-dominio.com/api/auth/login" \
         -H "Content-Type: application/json" \
         -d '{"username":"test","password":"wrong"}'
done
```

---

## 📊 Monitoramento

### Ver Logs de Bloqueios

```bash
# Audit log (bloqueios)
sudo tail -f /var/log/nginx/modsec-audit.log

# Access log (todas as requisições)
sudo tail -f /var/log/nginx/alya-access.log

# Error log
sudo tail -f /var/log/nginx/alya-error.log
```

### Parsear Audit Log (JSON)

Se configurou `SecAuditLogFormat JSON`:

```bash
# Ver bloqueios recentes
sudo jq 'select(.transaction.response.http_code == 403)' /var/log/nginx/modsec-audit.log

# Top IPs bloqueados
sudo jq -r '.transaction.client_ip' /var/log/nginx/modsec-audit.log | sort | uniq -c | sort -rn | head -10

# Top regras acionadas
sudo jq -r '.audit_data.messages[].message' /var/log/nginx/modsec-audit.log | sort | uniq -c | sort -rn | head -10
```

### Dashboard Grafana (Avançado)

Integre com ELK Stack ou Prometheus + Grafana para visualizações:
- Gráfico de bloqueios por hora
- Top IPs atacantes
- Top tipos de ataques
- Taxa de falsos positivos

---

## ⚙️ Configuração

### Ajustar Paranoia Level

Paranoia Level define o quão agressivo é o WAF:

**Arquivo:** `/etc/nginx/modsec/main.conf`

```nginx
# Level 1: Recomendado para produção (poucos falsos positivos)
# Level 2: Moderado
# Level 3: Alto (mais falsos positivos)
# Level 4: Paranóico (muitos falsos positivos)
SecAction "id:900001,phase:1,nolog,pass,setvar:tx.paranoia_level=1"
```

**Recomendação:** Começar com Level 1, aumentar gradualmente após análise de logs.

### Ajustar Anomaly Score Threshold

Threshold define a pontuação necessária para bloquear:

```nginx
# Quanto MENOR, mais rigoroso (mais bloqueios)
# Quanto MAIOR, mais permissivo (menos bloqueios)
SecAction \
    "id:900000,phase:1,nolog,pass,\
    setvar:tx.inbound_anomaly_score_threshold=5,\
    setvar:tx.outbound_anomaly_score_threshold=4"
```

**Recomendação:**
- Produção: 5 (padrão)
- Desenvolvimento: 10 (mais permissivo para testes)

### Whitelist (Exceções)

Para adicionar exceções e evitar falsos positivos:

**Arquivo:** `/etc/nginx/modsec/main.conf`

```nginx
# Exemplo: Permitir JSON com caracteres especiais
SecRule REQUEST_HEADERS:Content-Type "@contains application/json" \
    "id:3001,phase:1,pass,nolog,ctl:ruleRemoveById=920420"

# Exemplo: Desabilitar regra específica para rota específica
SecRule REQUEST_URI "@beginsWith /api/clients" \
    "id:3002,phase:1,pass,nolog,ctl:ruleRemoveById=942100"

# Exemplo: Whitelist de IP confiável
SecRule REMOTE_ADDR "@ipMatch 192.168.1.100" \
    "id:3003,phase:1,pass,nolog,ctl:ruleEngine=Off"
```

**Após alterações:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🐛 Troubleshooting

### Problema: Muitos Falsos Positivos

**Sintoma:** Requisições legítimas bloqueadas (403)

**Solução:**
1. Verificar audit log: `sudo tail -n 100 /var/log/nginx/modsec-audit.log`
2. Identificar rule ID que bloqueou
3. Adicionar whitelist para aquela regra ou rota
4. Recarregar Nginx

**Exemplo:**
```
Audit log mostra: [id "920420"] [msg "Request content type is not allowed..."]
```

Adicionar whitelist:
```nginx
SecRule REQUEST_URI "@beginsWith /api/upload" \
    "id:3010,phase:1,pass,nolog,ctl:ruleRemoveById=920420"
```

### Problema: WAF Não Está Bloqueando

**Possíveis causas:**

1. **ModSecurity em modo DetectionOnly:**
```nginx
# Mudar de:
SecRuleEngine DetectionOnly

# Para:
SecRuleEngine On
```

2. **Regras não carregadas:**
```bash
# Verificar se OWASP CRS está incluído
sudo grep -r "Include.*crs" /etc/nginx/modsec/
```

3. **Nginx não está usando ModSecurity:**
```bash
# Verificar se diretiva está presente
sudo grep -r "modsecurity on" /etc/nginx/
```

### Problema: Nginx Não Inicia

**Erro comum:** `nginx: [emerg] unknown directive "modsecurity"`

**Solução:** Módulo ModSecurity não está instalado
```bash
# Ubuntu/Debian
sudo apt-get install libnginx-mod-security2

# Reiniciar
sudo systemctl restart nginx
```

### Problema: High CPU Usage

**Causa:** ModSecurity pode aumentar uso de CPU

**Soluções:**
1. Reduzir Paranoia Level (3 → 1)
2. Desabilitar regras desnecessárias
3. Aumentar recursos do servidor
4. Usar caching (Nginx proxy_cache)

---

## 📈 Performance

### Impacto no Desempenho

| Configuração | Latência Adicional | CPU Adicional |
|--------------|-------------------|---------------|
| WAF Desabilitado | 0ms (baseline) | 0% |
| Paranoia Level 1 | +5-15ms | +5-10% |
| Paranoia Level 2 | +10-25ms | +10-20% |
| Paranoia Level 3 | +20-40ms | +20-30% |

**Recomendação:** Level 1 para produção (impacto mínimo)

### Otimizações

1. **Caching:**
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=alya_cache:10m max_size=1g inactive=60m;

location /api/ {
    proxy_cache alya_cache;
    proxy_cache_valid 200 1m;
    proxy_cache_bypass $http_authorization;
}
```

2. **Limitar Body Inspection:**
```nginx
SecRequestBodyLimit 131072  # 128KB (menor = mais rápido)
SecResponseBodyLimit 524288  # 512KB
```

3. **Desabilitar Regras Não Usadas:**
```nginx
# Se não usa uploads de arquivos
SecRuleRemoveById 200001-200010
```

---

## 🔐 Boas Práticas

1. ✅ **Começar em Detection Mode:**
   - `SecRuleEngine DetectionOnly`
   - Monitorar logs por 1-2 semanas
   - Ajustar whitelists
   - Mudar para `SecRuleEngine On`

2. ✅ **Monitorar Logs Regularmente:**
   - Verificar falsos positivos
   - Identificar padrões de ataque
   - Ajustar regras

3. ✅ **Manter CRS Atualizado:**
   ```bash
   sudo wget https://github.com/coreruleset/coreruleset/releases/latest
   # Atualizar regras
   sudo systemctl reload nginx
   ```

4. ✅ **Rate Limiting Multi-Camada:**
   - WAF (ModSecurity)
   - Nginx (limit_req)
   - Application (backend)

5. ✅ **Backup de Configurações:**
   ```bash
   sudo tar -czf nginx-modsec-backup-$(date +%Y%m%d).tar.gz \
       /etc/nginx/sites-available/alya \
       /etc/nginx/modsec/
   ```

6. ✅ **Testar Antes de Deploy:**
   - Ambiente de staging
   - Testes de carga (Apache Bench, Locust)
   - Testes de segurança (OWASP ZAP)

---

## 📚 Recursos

- **ModSecurity:** https://github.com/SpiderLabs/ModSecurity
- **OWASP CRS:** https://coreruleset.org/
- **Nginx ModSecurity Module:** https://github.com/SpiderLabs/ModSecurity-nginx
- **CRS Documentation:** https://coreruleset.org/docs/
- **Rule ID Reference:** https://github.com/coreruleset/coreruleset/tree/v3.3/dev/rules

---

## ✅ Checklist de Implementação

- [x] Scripts de configuração criados
- [x] Documentação completa
- [ ] WAF instalado em servidor
- [ ] Configurações ajustadas (domínio, SSL)
- [ ] Testes de bloqueio realizados
- [ ] Falsos positivos identificados e corrigidos
- [ ] Monitoramento configurado
- [ ] Logs sendo revisados regularmente
- [ ] Backup de configurações realizado
- [ ] Equipe treinada em troubleshooting

---

## 🎯 Próximos Passos

1. **Deploy em Staging:**
   ```bash
   sudo ./setup-waf.sh
   ```

2. **Testar Bloqueios:**
   ```bash
   curl "https://staging.exemplo.com/api/test?id=1 OR 1=1"
   ```

3. **Monitorar Logs (1-2 semanas):**
   ```bash
   sudo tail -f /var/log/nginx/modsec-audit.log
   ```

4. **Ajustar Whitelists:**
   - Identificar falsos positivos
   - Adicionar exceções
   - Re-testar

5. **Deploy em Produção:**
   - Mesmo processo
   - Monitorar de perto primeiras 48h

---

**WAF Configurado! 🛡️**

*Parte da Etapa 1 - Fase 4 do Plano de Segurança*
