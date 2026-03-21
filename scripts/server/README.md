# Scripts do Servidor

Scripts de administração e manutenção do backend Alya.

---

## 01 - ADMIN.js

Operações administrativas de setup e manutenção.

```bash
cd /caminho/do/projeto/alya

# Gerar chaves de criptografia AES-256 (necessário no primeiro setup)
node scripts/server/01\ -\ ADMIN.js --gen-key

# Migrar dados existentes para campos criptografados
node scripts/server/01\ -\ ADMIN.js --migrate-fields --dry-run  # simular
node scripts/server/01\ -\ ADMIN.js --migrate-fields            # executar
node scripts/server/01\ -\ ADMIN.js --migrate-fields --table=clients
```

---

## 02 - RESET-SENHA-ADMIN.js

Reseta a senha do usuário administrador.

```bash
cd /caminho/do/projeto/alya

# Resetar para senha padrão (admin123)
node scripts/server/02\ -\ RESET-SENHA-ADMIN.js

# Resetar para senha customizada
node scripts/server/02\ -\ RESET-SENHA-ADMIN.js "minha_senha_forte"
```

> ⚠️ Após resetar, faça login imediatamente e troque a senha para uma forte.

**Gerar senha forte:**
```bash
openssl rand -base64 24
```

---

## 03 - TESTAR-ALERTAS.js

Testa o sistema de alertas de segurança via SendGrid.

```bash
cd /caminho/do/projeto/alya

# Testar todos os alertas
node scripts/server/03\ -\ TESTAR-ALERTAS.js all

# Testar alerta específico
node scripts/server/03\ -\ TESTAR-ALERTAS.js suspicious-login
node scripts/server/03\ -\ TESTAR-ALERTAS.js brute-force
node scripts/server/03\ -\ TESTAR-ALERTAS.js token-theft
node scripts/server/03\ -\ TESTAR-ALERTAS.js sql-injection
node scripts/server/03\ -\ TESTAR-ALERTAS.js xss
node scripts/server/03\ -\ TESTAR-ALERTAS.js new-country
node scripts/server/03\ -\ TESTAR-ALERTAS.js multiple-ips
node scripts/server/03\ -\ TESTAR-ALERTAS.js multiple-devices
```

> Requer `SENDGRID_API_KEY` configurado no `server/.env`.

---

## Troubleshooting

### "Cannot find module 'bcryptjs'"
```bash
cd /caminho/do/projeto/alya/server && npm install
```

### "Connection refused" (PostgreSQL)
```bash
sudo systemctl status postgresql
cat /caminho/do/projeto/alya/server/.env | grep DB_
```

### Verificar usuário admin
```bash
psql -U seuusuario -d alya -h localhost -c "SELECT id, username, updated_at FROM users WHERE username = 'admin';"
```
