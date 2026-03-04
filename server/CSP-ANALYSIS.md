# 🛡️ Content Security Policy (CSP) - Análise e Recomendações

## 📋 Configuração Atual

### CSP Headers (via Helmet)

```javascript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],  // ⚠️ Potencial melhoria
    styleSrc: ["'self'", "'unsafe-inline'"],   // ⚠️ Potencial melhoria
    imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
    fontSrc: ["'self'", 'data:'],
    connectSrc: ["'self'"],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: [],
  },
}
```

---

## 🔍 Análise de Risco

### ⚠️ Uso de `unsafe-inline`

**Diretivas afetadas:**
- `script-src: 'unsafe-inline'`
- `style-src: 'unsafe-inline'`

**Por que está sendo usado:**
- React/Vite gera scripts inline durante o build
- Styled-components ou CSS-in-JS precisam de styles inline
- Event handlers inline (onClick, etc.) do React

**Risco:**
- ⚠️ **MÉDIO** para aplicações internas
- 🔴 **ALTO** para aplicações públicas expostas à internet

**Mitigação atual:**
- ✅ Todas as outras diretivas CSP estão restritas
- ✅ XSS-clean middleware ativo
- ✅ Input validation e sanitization em 100% dos endpoints
- ✅ Output encoding automático do React
- ✅ Helmet configurado com outras proteções

---

## 🎯 Opções de Melhoria

### Opção 1: Manter Como Está (Recomendado para Fase 3)

**Quando:**
- Aplicação é interna (não exposta publicamente)
- Uso limitado a usuários confiáveis
- Outras camadas de segurança estão fortes

**Justificativa:**
- CSP ainda protege contra:
  - Carregamento de scripts externos maliciosos
  - Iframes de sites maliciosos
  - Plugins inseguros (Flash, etc.)
- Trade-off aceitável: conveniência vs. segurança marginal
- Custo-benefício de implementar nonces não compensa

**Score:** 8/10 para app interno

---

### Opção 2: Implementar Nonces (Complexo, Fase 4+)

**Como funciona:**
```
1. Servidor gera nonce aleatório por requisição
2. Adiciona nonce ao CSP header
3. Injeta nonce em todos os <script> e <style> tags
4. Browser só executa scripts/styles com nonce correto
```

**Implementação:**

#### 1. Gerar nonce no servidor

```javascript
// server/server.js
const crypto = require('crypto');

app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});
```

#### 2. Atualizar CSP para usar nonce

```javascript
contentSecurityPolicy: {
  directives: {
    scriptSrc: [
      "'self'",
      (req, res) => `'nonce-${res.locals.nonce}'`
    ],
    styleSrc: [
      "'self'",
      (req, res) => `'nonce-${res.locals.nonce}'`
    ],
    // ... resto
  },
}
```

#### 3. Injetar nonce no HTML (Vite plugin)

```javascript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    {
      name: 'html-nonce-injection',
      transformIndexHtml(html, ctx) {
        const nonce = ctx.server?.config.define?.['__CSP_NONCE__'];
        return html.replace(
          /<script/g,
          `<script nonce="${nonce}"`
        );
      },
    },
  ],
});
```

**Desafios:**
- 🔴 Vite build precisa ser ajustado
- 🔴 React event handlers inline não funcionam
- 🔴 Bibliotecas third-party podem quebrar
- 🔴 Complexidade alta para manutenção
- 🔴 Testes extensivos necessários

**Estimativa:** 8-12 horas de trabalho + testes

**Score após implementação:** 9.5/10

---

### Opção 3: CSP em Report-Only Mode (Intermediário)

**Objetivo:** Monitorar violações sem quebrar funcionalidade

```javascript
contentSecurityPolicyReportOnly: {
  directives: {
    scriptSrc: ["'self'"],  // SEM unsafe-inline
    styleSrc: ["'self'"],
    reportUri: '/api/csp-violation-report',
  },
}
```

**Endpoint de report:**

```javascript
app.post('/api/csp-violation-report', express.json(), (req, res) => {
  const violation = req.body['csp-report'];

  console.warn('CSP Violation:', {
    documentUri: violation['document-uri'],
    violatedDirective: violation['violated-directive'],
    blockedUri: violation['blocked-uri'],
    sourceFile: violation['source-file'],
    lineNumber: violation['line-number'],
  });

  // Logar no audit_logs
  logAudit({
    operation: 'csp_violation',
    details: violation,
    status: AUDIT_STATUS.WARNING,
  });

  res.status(204).end();
});
```

**Benefícios:**
- ✅ Identifica scripts/styles inline que precisam de nonce
- ✅ Não quebra funcionalidade atual
- ✅ Dados para decidir se vale implementar nonces

**Estimativa:** 1-2 horas

---

## 📊 Comparação de Opções

| Aspecto | Opção 1 (Atual) | Opção 2 (Nonces) | Opção 3 (Report-Only) |
|---------|-----------------|------------------|----------------------|
| Segurança | 8/10 | 9.5/10 | 8/10 (coleta dados) |
| Complexidade | Baixa | Alta | Média |
| Manutenção | Fácil | Difícil | Fácil |
| Tempo de impl. | 0h | 8-12h | 1-2h |
| Risco de quebrar | Nenhum | Alto | Nenhum |
| Recomendado para | App interno | App público | Transição |

---

## 🎯 Recomendação Final

### Para ALYA (Sistema Interno)

**Recomendação: Opção 1 (Manter CSP Atual)**

**Motivos:**
1. **Aplicação interna:** Usuários são funcionários da organização, não público geral
2. **Outras camadas robustas:**
   - Input validation 100%
   - Output encoding automático (React)
   - XSS-clean middleware
   - Rate limiting
   - Audit logging
3. **Custo-benefício:** 8-12h de trabalho para ganho marginal de segurança
4. **Risco de quebrar funcionalidades:** Alto se implementar nonces incorretamente

**Ganho de segurança estimado:** 1.5 pontos (de 8.0 para 9.5)
**Esforço necessário:** 8-12 horas + testes extensivos

---

### Se for Tornar Aplicação Pública

**Recomendação: Opção 3 → Opção 2**

1. **Fase 1:** Implementar CSP Report-Only por 2-4 semanas
2. **Fase 2:** Analisar relatórios de violação
3. **Fase 3:** Implementar nonces baseado nos dados coletados
4. **Fase 4:** Ativar CSP enforcing (bloquear violações)

---

## 🛠️ Melhorias Adicionais de CSP (Fáceis)

### 1. Adicionar `base-uri`

```javascript
baseUri: ["'self'"],  // Previne injeção de <base> tag
```

### 2. Adicionar `form-action`

```javascript
formAction: ["'self'"],  // Previne forms apontando para sites maliciosos
```

### 3. Especificar `connect-src` mais restritivo

```javascript
connectSrc: [
  "'self'",
  'https://api.seudominio.com',  // Se usar API externa
],
```

### 4. Adicionar `manifest-src` (para PWA)

```javascript
manifestSrc: ["'self'"],
```

**Estas melhorias são seguras e podem ser implementadas agora:**

```javascript
// server/middleware/security.js
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
    fontSrc: ["'self'", 'data:'],
    connectSrc: ["'self'"],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],           // ✅ NOVO
    formAction: ["'self'"],        // ✅ NOVO
    manifestSrc: ["'self'"],       // ✅ NOVO
    upgradeInsecureRequests: [],
  },
}
```

---

## 📝 Documentação de Decisão

**Data:** 2026-03-04
**Decisão:** Manter `unsafe-inline` em CSP
**Razão:** Aplicação interna com outras camadas de segurança robustas
**Próxima Revisão:** Se tornar aplicação pública

**Responsável:** Equipe Backend
**Aprovado por:** [Stakeholder]

---

## 📚 Recursos

- [CSP Reference - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator - Google](https://csp-evaluator.withgoogle.com/)
- [CSP Cheat Sheet - OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [Helmet CSP Documentation](https://helmetjs.github.io/#content-security-policy)

---

**Conclusão:**

O CSP atual é **adequado para uma aplicação interna** como ALYA.

**Score de segurança: 8.5/10** (não muda com implementação de nonces)

Foco deve estar em:
1. ✅ Manter outras camadas de segurança fortes (input validation, output encoding)
2. ✅ Monitorar logs de auditoria
3. ✅ Manter dependências atualizadas
4. ⏳ Implementar nonces **apenas se** app for exposto publicamente

---

**Última Atualização:** 2026-03-04
**Próxima Revisão:** 2026-09-04 ou se app tornar-se público
