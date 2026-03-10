# 🔍 Snyk + SonarQube - Code Quality & Security

**Status:** ✅ Configurado
**Data:** 2026-03-04
**Tempo de Implementação:** ~6 horas

---

## 📋 O Que São Essas Ferramentas?

### Snyk
Plataforma de segurança para desenvolvedores que:
- 🔎 Detecta vulnerabilidades em dependências (npm packages)
- 🔎 Encontra vulnerabilidades em código (SAST)
- 🔎 Escaneia containers Docker
- 🔎 Analisa arquivos de infraestrutura (IaC)
- 🤖 Cria PRs automáticos com patches de segurança

**Site:** https://snyk.io
**Preço:** Gratuito para projetos open-source

### SonarQube / SonarCloud
Plataforma de análise de qualidade de código que:
- 🐛 Detecta bugs
- 🔒 Encontra vulnerabilidades de segurança
- 🧹 Identifica code smells
- 📊 Calcula cobertura de testes
- 📈 Rastreia dívida técnica

**Site:** https://sonarcloud.io
**Preço:** Gratuito para projetos open-source

---

## 🚀 Setup - Snyk

### 1. Criar Conta (Gratuito)
```bash
# Visitar: https://snyk.io/signup
# Conectar com GitHub
```

### 2. Instalar CLI (Opcional para uso local)
```bash
npm install -g snyk
```

### 3. Autenticar
```bash
snyk auth
# Abrirá navegador para autenticação
```

### 4. Testar Projeto
```bash
# Frontend
snyk test

# Backend
cd server
snyk test
```

### 5. Monitorar Projeto (Continuous Monitoring)
```bash
# Frontend
snyk monitor

# Backend
cd server
snyk monitor
```

### 6. Configurar GitHub Actions
Adicione os seguintes secrets no GitHub:
- **Settings** > **Secrets and variables** > **Actions** > **New repository secret**

**Secrets necessários:**
```
SNYK_TOKEN=seu-token-aqui
SNYK_ORG_ID=sua-org-id
```

**Como obter:**
1. Token: https://app.snyk.io/account > "Generate API Token"
2. Org ID: https://app.snyk.io/org/YOUR_ORG/manage/settings

---

## 🚀 Setup - SonarCloud

### 1. Criar Conta (Gratuito)
```bash
# Visitar: https://sonarcloud.io
# Conectar com GitHub
# Importar repositório "alya-financial-system"
```

### 2. Obter Token
```bash
# Account > Security > Generate Tokens
# Nome: "Alya GitHub Actions"
# Copiar token gerado
```

### 3. Configurar GitHub Actions
Adicione o seguinte secret no GitHub:

```
SONAR_TOKEN=seu-token-sonarcloud
SONAR_ORGANIZATION=seu-username-github
```

### 4. Executar Análise Local (Opcional)
```bash
# Instalar scanner
npm install -g sonarqube-scanner

# Executar
sonar-scanner \
  -Dsonar.token=SEU_TOKEN \
  -Dsonar.organization=SUA_ORG \
  -Dsonar.host.url=https://sonarcloud.io
```

---

## 📊 Dashboard & Relatórios

### Snyk Dashboard
**URL:** https://app.snyk.io

**O que ver:**
- **Projects:** Lista de projetos monitorados
- **Vulnerabilities:** Vulnerabilidades encontradas
- **Dependencies:** Árvore de dependências
- **Fix PRs:** PRs automáticos criados

**Badges:**
```markdown
[![Known Vulnerabilities](https://snyk.io/test/github/seu-usuario/alya/badge.svg)](https://snyk.io/test/github/seu-usuario/alya)
```

### SonarCloud Dashboard
**URL:** https://sonarcloud.io/project/overview?id=alya-financial-system

**O que ver:**
- **Quality Gate:** Status geral (Passed/Failed)
- **Bugs:** Número de bugs detectados
- **Vulnerabilities:** Vulnerabilidades de segurança
- **Code Smells:** Issues de manutenibilidade
- **Coverage:** Cobertura de testes
- **Duplications:** Código duplicado
- **Security Hotspots:** Áreas que precisam revisão manual

**Badges:**
```markdown
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=alya-financial-system&metric=alert_status)](https://sonarcloud.io/dashboard?id=alya-financial-system)

[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=alya-financial-system&metric=bugs)](https://sonarcloud.io/dashboard?id=alya-financial-system)

[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=alya-financial-system&metric=vulnerabilities)](https://sonarcloud.io/dashboard?id=alya-financial-system)
```

---

## 🔧 Comandos Úteis

### Snyk

```bash
# Testar apenas HIGH e CRITICAL
snyk test --severity-threshold=high

# Testar apenas dependências de produção
snyk test --production

# Testar com JSON output
snyk test --json > snyk-report.json

# Gerar relatório HTML
snyk test --json | snyk-to-html -o snyk-report.html

# Ignorar vulnerabilidade específica (temporariamente)
snyk ignore --id=SNYK-JS-PACKAGE-123456 --reason="Fix planejado" --expiry=2026-06-01

# Atualizar dependências com correções de segurança
snyk wizard
```

### SonarQube

```bash
# Análise local
sonar-scanner

# Análise com propriedades customizadas
sonar-scanner \
  -Dsonar.projectKey=alya \
  -Dsonar.sources=src,server \
  -Dsonar.host.url=https://sonarcloud.io \
  -Dsonar.login=SEU_TOKEN

# Ver resultados localmente (se usando SonarQube local)
open http://localhost:9000
```

---

## 🛡️ Integração com GitHub Actions

### Workflows Criados

1. **`.github/workflows/snyk-security.yml`**
   - Executa diariamente às 3AM BRT
   - Escaneia frontend e backend
   - Cria alertas no GitHub Security

2. **`.github/workflows/sonarcloud.yml`**
   - Executa em cada push/PR
   - Analisa qualidade de código
   - Quality Gate bloqueia merge se falhar

### Status Checks

Ambos workflows podem ser configurados como **required status checks** para PRs:

**Settings** > **Branches** > **Branch protection rules** > **Require status checks**
- ✅ Snyk Security Scan
- ✅ SonarCloud Code Quality

---

## 🎯 Quality Gates Recomendados

### Snyk (já configurado em `.snyk`)
```yaml
failThreshold: high  # Falha se encontrar HIGH ou CRITICAL
```

### SonarCloud (configurar no dashboard)
```yaml
Conditions on New Code:
  - Bugs: 0 (A)
  - Vulnerabilities: 0 (A)
  - Code Smells: ≤ 10 per 1K lines (A)
  - Coverage: ≥ 80% (C)
  - Duplications: ≤ 3% (A)
  - Security Hotspots: 100% reviewed (A)
```

**Como configurar:**
1. Dashboard SonarCloud > **Quality Gates**
2. Selecionar "Sonar way" ou criar custom
3. Aplicar ao projeto

---

## 📈 Métricas de Sucesso

### Antes (Baseline):
```
npm audit
  - 6 high severity vulnerabilities
  - Score: 6.0/10

SonarQube: N/A (não configurado)
```

### Objetivo (Etapa 1 - Fase 4):
```
Snyk:
  - 0 critical vulnerabilities
  - ≤ 1 high vulnerability (xlsx - planejado Etapa 2)
  - Score: 8.5/10

SonarCloud:
  - Quality Gate: PASSED
  - Bugs: 0 (A rating)
  - Vulnerabilities: 0 (A rating)
  - Code Smells: ≤ 50 (A rating)
  - Duplications: ≤ 3%
  - Coverage: ≥ 70%
```

---

## 🐛 Troubleshooting

### Snyk: "Authentication failed"
```bash
# Re-autenticar
snyk auth

# Verificar token
snyk config get api
```

### Snyk: "Project not found on Snyk.io"
```bash
# Criar projeto primeiro
snyk monitor
```

### SonarCloud: "Quality Gate failed"
```bash
# Ver detalhes no dashboard
# Corrigir issues reportados
# Re-executar análise
```

### SonarCloud: "No coverage information"
```bash
# Configurar testes com cobertura
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# Adicionar script em package.json
"test:coverage": "jest --coverage"

# Executar
npm run test:coverage

# Arquivo gerado: coverage/lcov.info
```

---

## 🔄 Workflow Recomendado

### Desenvolvimento Diário:
```bash
# 1. Antes de commitar
snyk test

# 2. Verificar issues reportados
# 3. Corrigir se houver HIGH/CRITICAL
# 4. Commitar

# 5. Aguardar CI passar
# 6. Revisar SonarCloud report no PR
```

### Semanal:
```bash
# 1. Revisar dashboard Snyk
# 2. Atualizar dependências vulneráveis
npm audit fix

# 3. Revisar dashboard SonarCloud
# 4. Corrigir code smells prioritários
```

### Mensal:
```bash
# 1. Revisar dívida técnica (SonarCloud)
# 2. Planejar sprints de refatoração
# 3. Atualizar dependências (npm outdated)
```

---

## 📚 Recursos

### Snyk:
- **Docs:** https://docs.snyk.io/
- **CLI Reference:** https://docs.snyk.io/snyk-cli
- **Vulnerability Database:** https://security.snyk.io/

### SonarCloud:
- **Docs:** https://docs.sonarcloud.io/
- **Rules:** https://rules.sonarsource.com/
- **Clean Code Guide:** https://www.sonarsource.com/learn/clean-code/

---

## ✅ Checklist de Implementação

- [x] Arquivos de configuração criados
  - [x] `.snyk`
  - [x] `sonar-project.properties`
  - [x] `.github/workflows/snyk-security.yml`
  - [x] `.github/workflows/sonarcloud.yml`
- [ ] Contas criadas
  - [ ] Snyk account (https://snyk.io/signup)
  - [ ] SonarCloud account (https://sonarcloud.io)
- [ ] Tokens configurados no GitHub
  - [ ] `SNYK_TOKEN`
  - [ ] `SNYK_ORG_ID`
  - [ ] `SONAR_TOKEN`
  - [ ] `SONAR_ORGANIZATION`
- [ ] Primeiro scan executado
  - [ ] `snyk test`
  - [ ] `sonar-scanner` (ou via GitHub Actions)
- [ ] Dashboards configurados
  - [ ] Snyk project importado
  - [ ] SonarCloud project configurado
- [ ] Quality Gates definidos
- [ ] Badges adicionados ao README (opcional)

---

## 🎯 Próximos Passos

1. **Criar contas** (Snyk + SonarCloud)
2. **Configurar tokens** no GitHub Secrets
3. **Executar primeiro scan** (local ou via Actions)
4. **Revisar relatórios** e priorizar correções
5. **Configurar Quality Gates** apropriados
6. **Integrar ao workflow de desenvolvimento**

---

**Snyk + SonarQube Configurados! 🔍**

*Parte da Etapa 1 - Fase 4 do Plano de Segurança*
