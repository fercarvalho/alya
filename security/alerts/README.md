# 🚨 Sistema de Alertas de Segurança

**Status:** ✅ Implementado (Aguardando Configuração)
**Data:** 2026-03-04
**Tempo de Implementação:** ~5 horas

---

## 📋 O Que é?

Sistema automatizado que envia **notificações em tempo real** para eventos críticos de segurança via:
- 📱 **Slack** (webhook)
- 📧 **Email** (SMTP)

---

## 🎯 Eventos Monitorados

| Evento | Severidade | Descrição |
|--------|-----------|-----------|
| **Múltiplas Tentativas de Login Falhadas** | 🔶 HIGH | 5+ tentativas em 5 minutos |
| **IP Suspeito** | 🔶 HIGH | Login de IP em blacklist |
| **Alteração em Admin** | 🔶 HIGH | Criação/promoção de admin |
| **Roubo de Token** | 🚨 CRITICAL | Refresh token usado 2x |
| **Vulnerabilidade Crítica** | 🚨 CRITICAL | Snyk/SonarQube detectou CVE crítica |
| **WAF Bloqueou Ataque** | 🔶 HIGH | ModSecurity bloqueou SQLi/XSS/etc |
| **Anomalia de Comportamento** | ⚠️ MEDIUM | ML detectou padrão anômalo |
| **Erro no Sistema** | 🚨 CRITICAL | Falha crítica em componente |

---

## 🚀 Setup

### 1. Instalar Dependências

```bash
cd server
npm install nodemailer axios
```

### 2. Configurar Slack (Opcional)

**a) Criar Webhook do Slack:**
1. Acesse: https://api.slack.com/messaging/webhooks
2. Clique em "Create your Slack app"
3. Escolha "From scratch"
4. Nome: "Alya Security Alerts"
5. Workspace: Escolha seu workspace
6. Em "Incoming Webhooks", ative e clique "Add New Webhook to Workspace"
7. Escolha canal (#security ou #alerts)
8. Copie a **Webhook URL**

**b) Adicionar ao .env:**
```bash
# server/.env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

### 3. Configurar Email (Opcional)

**a) Gmail (recomendado para desenvolvimento):**
```bash
# server/.env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app  # Use "App Password", não senha normal!
ALERT_EMAIL_TO=admin@exemplo.com
ALERT_EMAIL_FROM=noreply@alya.com
```

**Como criar App Password no Gmail:**
1. Conta Google > Segurança
2. Verificação em duas etapas (habilitar)
3. Senhas de app > Selecionar app: "Email" > Gerar
4. Copiar senha gerada (16 caracteres)

**b) Outro provedor SMTP:**
```bash
# server/.env
SMTP_HOST=smtp.provedor.com
SMTP_PORT=587
SMTP_USER=usuario
SMTP_PASS=senha
ALERT_EMAIL_TO=admin@exemplo.com
ALERT_EMAIL_FROM=noreply@alya.com
```

### 4. Testar Alertas

```bash
cd /caminho/do/projeto/alya

# Teste simples
node "scripts/server/03 - TESTAR-ALERTAS.js" suspicious-login

# Todos os alertas
node "scripts/server/03 - TESTAR-ALERTAS.js" all

# Alerta específico
node "scripts/server/03 - TESTAR-ALERTAS.js" brute-force
node "scripts/server/03 - TESTAR-ALERTAS.js" token-theft
```

**Output esperado:**
```
═══════════════════════════════════════════════════════════════
           Teste do Sistema de Alertas de Segurança
═══════════════════════════════════════════════════════════════

Tipo de teste: test

📧 Enviando alerta de teste...
[Alerts] ✅ Slack alert sent: Sistema de Alertas - Teste
[Alerts] ✅ Email alert sent: Sistema de Alertas - Teste

═══════════════════════════════════════════════════════════════
                     ✅ TESTES CONCLUÍDOS
═══════════════════════════════════════════════════════════════

Verifique:
  - Slack (canal configurado)
  - Email (caixa de entrada)
```

---

## 📝 Uso no Código

### Importar Módulo

```javascript
const {
  alertFailedLogins,
  alertSuspiciousIP,
  alertAdminChange,
  alertTokenTheft,
  alertCriticalVulnerability,
  alertWAFBlock,
  alertAnomaly,
  alertSystemError,
  sendAlert,
  SEVERITY
} = require('./utils/security-alerts');
```

### Exemplo 1: Logins Falhados

```javascript
// server.js - Endpoint de login

let failedAttempts = {}; // Em produção, use Redis ou banco

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip;

  // Verificar credenciais
  const user = await validateCredentials(username, password);

  if (!user) {
    // Incrementar contador de falhas
    const key = `${username}:${ip}`;
    failedAttempts[key] = (failedAttempts[key] || 0) + 1;

    // Se >= 5 tentativas, enviar alerta
    if (failedAttempts[key] >= 5) {
      await alertFailedLogins(username, ip, failedAttempts[key], '5 minutos');
    }

    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  // Reset contador se login bem-sucedido
  delete failedAttempts[`${username}:${ip}`];

  res.json({ success: true, token: generateToken(user) });
});
```

### Exemplo 2: Detecção de Roubo de Token

```javascript
// server.js - Endpoint de refresh

app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  // Verificar se token já foi usado
  const tokenRecord = await pool.query(
    'SELECT * FROM refresh_tokens WHERE token = $1',
    [refreshToken]
  );

  if (tokenRecord.rows.length === 0) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  const token = tokenRecord.rows[0];

  // TOKEN JÁ FOI USADO! Possível roubo!
  if (token.used_at !== null) {
    console.error('🚨 ROUBO DE TOKEN DETECTADO!');

    // Revogar TODOS os tokens do usuário
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [token.user_id]);

    // Enviar alerta CRÍTICO
    await alertTokenTheft(token.user_id, req.ip, refreshToken);

    return res.status(401).json({ error: 'Token inválido (sessão revogada)' });
  }

  // Restante da lógica de refresh...
});
```

### Exemplo 3: Mudança em Admin

```javascript
// server.js - Endpoint de promoção de usuário

app.post('/api/admin/promote', authenticateAdmin, async (req, res) => {
  const { targetUserId } = req.body;
  const adminUser = req.user; // Do middleware de autenticação

  // Promover usuário
  await pool.query(
    'UPDATE users SET role = $1 WHERE id = $2',
    ['admin', targetUserId]
  );

  // Enviar alerta
  await alertAdminChange(
    adminUser.username,
    targetUserId,
    'promote',
    adminUser.username
  );

  res.json({ success: true });
});
```

### Exemplo 4: Alerta Customizado

```javascript
const { sendAlert, SEVERITY } = require('./utils/security-alerts');

// Alerta genérico
await sendAlert(
  'Título do Alerta',
  'Mensagem descritiva do que aconteceu.',
  SEVERITY.HIGH,
  [
    { title: 'Campo 1', value: 'Valor 1', short: true },
    { title: 'Campo 2', value: 'Valor 2', short: true },
    { title: 'Descrição Longa', value: 'Texto completo...', short: false }
  ]
);
```

---

## 🔄 Monitoramento Automático

O sistema pode verificar automaticamente eventos suspeitos a cada X minutos:

```javascript
// server.js - Ao iniciar servidor

const { startAutomaticMonitoring } = require('./utils/security-alerts');

// Iniciar monitoramento a cada 5 minutos
startAutomaticMonitoring(5);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Security alerts monitoring active');
});
```

**Verificações automáticas:**
- ✅ Logins falhados (5+ tentativas em 5 min)
- ✅ Mudanças em admins (últimos 5 min)
- 🔜 IPs suspeitos (integração com blacklists)
- 🔜 Anomalias de comportamento

---

## 📊 Formato dos Alertas

### Slack:

```
🔶 Múltiplas Tentativas de Login Falhadas

Detectadas 7 tentativas de login falhadas em 5 minutos.

Usuário: admin
IP: 192.168.1.100
Tentativas: 7
Período: 5 minutos

Alya Security System • 04/03/2026 às 15:30
```

### Email:

```
Subject: 🔶 [Alya Security] Múltiplas Tentativas de Login Falhadas

[Header laranja]
🔶 Múltiplas Tentativas de Login Falhadas

[Body]
Detectadas 7 tentativas de login falhadas em 5 minutos.

Usuário: admin
IP: 192.168.1.100
Tentativas: 7
Período: 5 minutos

[Footer]
Alya Financial System - Security Alerts
04/03/2026 15:30:45
```

---

## 🎨 Severidades

| Severidade | Cor | Emoji | Uso |
|-----------|-----|-------|-----|
| **INFO** | 🟢 Verde | ℹ️ | Informações gerais |
| **LOW** | 🔵 Azul | 🔵 | Eventos de baixa prioridade |
| **MEDIUM** | 🟡 Amarelo | ⚠️ | Requer atenção |
| **HIGH** | 🟠 Laranja | 🔶 | Requer ação rápida |
| **CRITICAL** | 🔴 Vermelho | 🚨 | Requer ação IMEDIATA |

---

## 🛠️ Troubleshooting

### Problema: Alertas Slack não chegam

**Verificar:**
1. `SLACK_WEBHOOK_URL` está no `.env`?
2. Webhook está ativo no Slack?
3. Canal existe e você tem acesso?
4. Logs do console mostram erro?

**Testar webhook manualmente:**
```bash
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Teste"}' \
  YOUR_WEBHOOK_URL
```

### Problema: Emails não chegam

**Verificar:**
1. Credenciais SMTP corretas?
2. Se Gmail: "App Password" criada?
3. Verificação em 2 etapas habilitada (Gmail)?
4. Firewall bloqueando porta 587?
5. Email está em spam?

**Testar SMTP manualmente:**
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'seu-email@gmail.com',
    pass: 'sua-app-password'
  }
});

transporter.sendMail({
  from: 'seu-email@gmail.com',
  to: 'destino@exemplo.com',
  subject: 'Teste',
  text: 'Teste de email'
});
```

### Problema: Muitos alertas (spam)

**Soluções:**
1. **Rate limiting:** Enviar no máximo 1 alerta do mesmo tipo por X minutos
2. **Agrupamento:** Agrupar múltiplos eventos similares
3. **Filtros:** Aumentar thresholds (ex: 5 → 10 tentativas)

**Implementar rate limiting:**
```javascript
// utils/security-alerts.js

const alertCache = new Map();
const RATE_LIMIT_MINUTES = 15;

async function sendAlertWithRateLimit(key, alertFunction, ...args) {
  const now = Date.now();
  const lastSent = alertCache.get(key);

  if (lastSent && (now - lastSent) < RATE_LIMIT_MINUTES * 60 * 1000) {
    console.log(`[Alerts] Rate limit: pulando alerta "${key}"`);
    return;
  }

  await alertFunction(...args);
  alertCache.set(key, now);
}

// Uso:
await sendAlertWithRateLimit(
  `failed-login:${username}:${ip}`,
  alertFailedLogins,
  username, ip, count
);
```

---

## 📈 Métricas

Adicione dashboard de alertas ao sistema:

```javascript
// server.js - Endpoint de métricas

app.get('/api/admin/security/alerts', authenticateAdmin, async (req, res) => {
  const stats = await pool.query(`
    SELECT
      DATE(timestamp) as date,
      COUNT(*) FILTER (WHERE action LIKE '%:failed') as failed_logins,
      COUNT(*) FILTER (WHERE action = 'token:theft') as token_thefts,
      COUNT(*) FILTER (WHERE action LIKE 'admin:%') as admin_changes
    FROM audit_logs
    WHERE timestamp > NOW() - INTERVAL '30 days'
    GROUP BY DATE(timestamp)
    ORDER BY date DESC
  `);

  res.json(stats.rows);
});
```

---

## 🔐 Segurança

**Boas práticas:**
1. ✅ **Não expor informações sensíveis** em alertas (ex: senhas, tokens completos)
2. ✅ **Mascarar dados pessoais** (CPF, email parcial)
3. ✅ **Rate limiting** para evitar spam
4. ✅ **Logs de auditoria** de alertas enviados
5. ✅ **Autenticação** em webhook Slack (se possível)

---

## 📚 Recursos

- **Slack Webhooks:** https://api.slack.com/messaging/webhooks
- **Nodemailer:** https://nodemailer.com/
- **Gmail App Passwords:** https://support.google.com/accounts/answer/185833

---

## ✅ Checklist de Implementação

- [x] Módulo de alertas criado
- [x] Script de teste criado
- [x] Documentação completa
- [ ] Configurar Slack webhook
- [ ] Configurar SMTP email
- [ ] Adicionar variáveis ao .env
- [ ] Executar teste: `node "scripts/server/03 - TESTAR-ALERTAS.js" all`
- [ ] Integrar aos endpoints críticos
- [ ] Iniciar monitoramento automático
- [ ] Configurar dashboard de métricas (opcional)

---

**Sistema de Alertas Implementado! 🚨**

*Parte da Etapa 1 - Fase 4 do Plano de Segurança*
