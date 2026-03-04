# 🔄 Configuração de Rotação Automática de Logs de Auditoria

Este documento explica como configurar a rotação automática de logs de auditoria no sistema ALYA.

---

## 📋 Visão Geral

O sistema de logs de auditoria pode crescer indefinidamente se não for gerenciado. Esta solução implementa:

1. **Script de arquivamento** (`archive-audit-logs.js`) - Exporta e deleta logs antigos
2. **Cron job** - Executa o script automaticamente em intervalos regulares
3. **Política de retenção** - Padrão: 90 dias (configurável)

---

## 🚀 Uso do Script de Arquivamento

### Sintaxe

```bash
node archive-audit-logs.js [opções]
```

### Opções Disponíveis

| Opção | Descrição | Padrão |
|-------|-----------|--------|
| `--days=N` | Arquivar logs mais antigos que N dias | 90 |
| `--delete` | Deletar logs sem arquivar (use com cuidado!) | false |
| `--dry-run` | Simular sem fazer alterações | false |
| `--export-path` | Diretório para backups | `./audit-archives` |

### Exemplos de Uso

#### 1. Testar sem fazer alterações (recomendado primeiro)
```bash
cd server
node archive-audit-logs.js --dry-run
```

#### 2. Arquivar logs com mais de 90 dias (padrão)
```bash
node archive-audit-logs.js
```

#### 3. Arquivar logs com mais de 180 dias
```bash
node archive-audit-logs.js --days=180
```

#### 4. Deletar logs com mais de 2 anos (sem arquivar)
```bash
node archive-audit-logs.js --delete --days=730
```

#### 5. Arquivar para diretório customizado
```bash
node archive-audit-logs.js --export-path=/backup/audit-logs
```

---

## ⏰ Configuração de Cron Job (Execução Automática)

### Opção 1: Cron do Sistema (Linux/macOS)

#### Editar crontab
```bash
crontab -e
```

#### Adicionar entrada para executar mensalmente
```cron
# Arquivar logs de auditoria todo dia 1 às 2:00 AM
0 2 1 * * cd /caminho/para/Alya/server && /usr/bin/node archive-audit-logs.js --days=90 >> /var/log/alya-audit-rotation.log 2>&1
```

#### Adicionar entrada para executar semanalmente
```cron
# Arquivar logs de auditoria todo domingo às 2:00 AM
0 2 * * 0 cd /caminho/para/Alya/server && /usr/bin/node archive-audit-logs.js --days=90 >> /var/log/alya-audit-rotation.log 2>&1
```

#### Verificar cron job ativo
```bash
crontab -l
```

### Opção 2: pm2 (se estiver usando pm2 para gerenciar o servidor)

#### Criar arquivo de configuração pm2 para cron
```json
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'alya-server',
      script: './server.js',
      // ... outras configurações
    },
    {
      name: 'audit-log-rotation',
      script: './archive-audit-logs.js',
      args: '--days=90',
      cron_restart: '0 2 1 * *', // Todo dia 1 às 2:00 AM
      autorestart: false,
      watch: false
    }
  ]
};
```

#### Iniciar com pm2
```bash
pm2 start ecosystem.config.js
pm2 save
```

### Opção 3: Systemd Timer (Linux)

#### Criar arquivo de serviço
```bash
sudo nano /etc/systemd/system/alya-audit-rotation.service
```

Conteúdo:
```ini
[Unit]
Description=ALYA Audit Log Rotation
After=postgresql.service

[Service]
Type=oneshot
User=seu_usuario
WorkingDirectory=/caminho/para/Alya/server
ExecStart=/usr/bin/node archive-audit-logs.js --days=90
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

#### Criar arquivo de timer
```bash
sudo nano /etc/systemd/system/alya-audit-rotation.timer
```

Conteúdo:
```ini
[Unit]
Description=ALYA Audit Log Rotation Timer
Requires=alya-audit-rotation.service

[Timer]
OnCalendar=monthly
Persistent=true

[Install]
WantedBy=timers.target
```

#### Ativar e iniciar timer
```bash
sudo systemctl daemon-reload
sudo systemctl enable alya-audit-rotation.timer
sudo systemctl start alya-audit-rotation.timer
```

#### Verificar status
```bash
sudo systemctl status alya-audit-rotation.timer
sudo systemctl list-timers | grep alya
```

### Opção 4: pg_cron (PostgreSQL Extension)

Se você quiser que o PostgreSQL execute a limpeza automaticamente:

#### 1. Instalar extensão pg_cron
```sql
-- Como superusuário do PostgreSQL
CREATE EXTENSION pg_cron;
```

#### 2. Agendar job
```sql
-- Executar limpeza todo dia 1 às 2:00 AM
SELECT cron.schedule(
  'cleanup-audit-logs',
  '0 2 1 * *',
  'SELECT cleanup_old_audit_logs();'
);
```

**Nota:** Esta opção deleta logs SEM arquivar. Use o script Node.js se precisar de backups.

#### 3. Verificar jobs agendados
```sql
SELECT * FROM cron.job;
```

#### 4. Remover job (se necessário)
```sql
SELECT cron.unschedule('cleanup-audit-logs');
```

---

## 📁 Estrutura de Arquivos de Backup

Quando você executa o script de arquivamento, os logs são exportados em formato JSON:

```
server/audit-archives/
├── audit-logs-2026-01-01.json
├── audit-logs-2026-02-01.json
└── audit-logs-2026-03-01.json
```

### Formato do Arquivo
```json
{
  "metadata": {
    "exportDate": "2026-03-03T02:00:00.000Z",
    "cutoffDate": "2025-12-03T02:00:00.000Z",
    "totalLogs": 15420,
    "retentionDays": 90
  },
  "logs": [
    {
      "id": 1,
      "timestamp": "2025-10-15T14:30:00.000Z",
      "operation": "login_success",
      "user_id": "123",
      "username": "admin",
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "details": { "method": "POST" },
      "status": "success",
      "error_message": null,
      "created_at": "2025-10-15T14:30:00.000Z"
    }
    // ... mais logs
  ]
}
```

---

## 🔒 Backup e Restore

### Fazer Backup Manual
```bash
# Exportar logs dos últimos 180 dias
node archive-audit-logs.js --days=180 --export-path=/backup/audit-logs
```

### Restaurar Logs (se necessário)
```javascript
// restore-audit-logs.js
const fs = require('fs');
const { Pool } = require('pg');

async function restoreLogs(filepath) {
  const pool = new Pool({ /* config */ });
  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

  for (const log of data.logs) {
    await pool.query(`
      INSERT INTO audit_logs (
        id, timestamp, operation, user_id, username,
        ip_address, user_agent, details, status, error_message, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO NOTHING
    `, [
      log.id, log.timestamp, log.operation, log.user_id, log.username,
      log.ip_address, log.user_agent, log.details, log.status,
      log.error_message, log.created_at
    ]);
  }

  await pool.end();
  console.log(`Restaurados ${data.logs.length} logs.`);
}

// Uso: node restore-audit-logs.js /backup/audit-logs-2026-01-01.json
restoreLogs(process.argv[2]);
```

---

## 📊 Monitoramento

### Verificar tamanho da tabela
```sql
SELECT
  COUNT(*) as total_logs,
  MIN(timestamp) as oldest_log,
  MAX(timestamp) as newest_log,
  pg_size_pretty(pg_total_relation_size('audit_logs')) as table_size
FROM audit_logs;
```

### Logs por período
```sql
SELECT
  DATE_TRUNC('month', timestamp) as month,
  COUNT(*) as log_count
FROM audit_logs
GROUP BY month
ORDER BY month DESC
LIMIT 12;
```

### Criar alerta de tamanho (opcional)
```bash
# Adicionar ao cron para alertar se tabela > 10GB
0 8 * * 1 psql -U seu_usuario -d alya -c "SELECT pg_size_pretty(pg_total_relation_size('audit_logs')) as size FROM pg_tables WHERE tablename='audit_logs';" | mail -s "Tamanho da tabela audit_logs" admin@exemplo.com
```

---

## ⚙️ Configurações Recomendadas

### Desenvolvimento
- **Período de retenção:** 30 dias
- **Frequência:** Manual (não precisa de cron)
- **Comando:** `node archive-audit-logs.js --days=30 --dry-run`

### Staging
- **Período de retenção:** 60 dias
- **Frequência:** Mensal
- **Comando:** `node archive-audit-logs.js --days=60`

### Produção
- **Período de retenção:** 90-180 dias (ou conforme requisitos legais)
- **Frequência:** Mensal
- **Comando:** `node archive-audit-logs.js --days=90`
- **Backup:** Arquivos devem ser movidos para storage externo (S3, backup server, etc.)

---

## 🛡️ Requisitos Legais

**IMPORTANTE:** Alguns setores têm requisitos específicos de retenção de logs:

- **Financeiro (BACEN):** Mínimo 5 anos
- **Saúde (LGPD/HIPAA):** Geralmente 5-7 anos
- **E-commerce:** Geralmente 5 anos (Código de Defesa do Consumidor)
- **LGPD:** Conforme necessário para compliance e defesa legal

**Consulte seu departamento jurídico antes de definir períodos de retenção.**

Se precisar de retenção > 2 anos, use o script de arquivamento e mantenha os arquivos JSON em storage seguro.

---

## 🔧 Troubleshooting

### Erro: "Permission denied"
```bash
chmod +x archive-audit-logs.js
```

### Erro: "Cannot find module 'dotenv'"
```bash
cd server
npm install
```

### Erro: "EACCES: permission denied, mkdir"
```bash
# Criar diretório manualmente com permissões corretas
mkdir -p server/audit-archives
chmod 755 server/audit-archives
```

### Cron não executa
```bash
# Verificar logs do cron
tail -f /var/log/syslog | grep CRON

# Usar caminho absoluto para node e script
which node  # Ex: /usr/bin/node
pwd  # Pegar caminho completo do diretório
```

---

## 📝 Adicionado ao package.json

Você pode adicionar scripts NPM para facilitar:

```json
{
  "scripts": {
    "archive-logs": "node archive-audit-logs.js",
    "archive-logs:dry-run": "node archive-audit-logs.js --dry-run",
    "archive-logs:90d": "node archive-audit-logs.js --days=90",
    "archive-logs:180d": "node archive-audit-logs.js --days=180"
  }
}
```

Uso:
```bash
npm run archive-logs:dry-run
npm run archive-logs:90d
```

---

## ✅ Checklist de Implementação

- [ ] Testar script com `--dry-run`
- [ ] Executar manualmente pela primeira vez
- [ ] Verificar arquivo de backup gerado
- [ ] Configurar cron job (escolher método)
- [ ] Testar cron job (aguardar execução ou forçar)
- [ ] Configurar backup externo dos arquivos JSON
- [ ] Documentar política de retenção
- [ ] Adicionar monitoramento de tamanho da tabela
- [ ] Treinar equipe sobre restore de logs

---

**Última Atualização:** 2026-03-03
**Responsável:** Equipe Backend
