# Reset de Senha do Administrador

Este diretório contém scripts para resetar a senha do usuário administrador do sistema ALYA.

## 📋 Scripts Disponíveis

### 1. Script Node.js (Recomendado)
**Arquivo:** `reset-admin-password.js`

**Vantagens:**
- ✅ Mais robusto e com tratamento de erros
- ✅ Cria usuário admin se não existir
- ✅ Lê credenciais do .env automaticamente
- ✅ Output formatado e colorido

**Uso:**

```bash
# Navegar até o diretório do servidor
cd /var/www/alya/server

# Resetar senha para padrão (admin123)
node scripts/reset-admin-password.js

# Resetar senha para valor customizado
node scripts/reset-admin-password.js "minha_senha_forte_123"
```

---

### 2. Script Bash
**Arquivo:** `reset-admin-password.sh`

**Vantagens:**
- ✅ Não requer dependências extras
- ✅ Gera hash bcrypt automaticamente
- ✅ Interface interativa
- ✅ Valida conexão com PostgreSQL

**Uso:**

```bash
# Navegar até o diretório do servidor
cd /var/www/alya/server

# Tornar executável
chmod +x scripts/reset-admin-password.sh

# Resetar senha para padrão (admin123)
./scripts/reset-admin-password.sh

# Resetar senha para valor customizado
./scripts/reset-admin-password.sh "minha_senha_forte_123"
```

---

### 3. Script SQL Direto
**Arquivo:** `reset-admin-password.sql`

**Vantagens:**
- ✅ Mais rápido (execução direta)
- ✅ Não requer Node.js
- ✅ Apenas SQL puro

**IMPORTANTE:** Este script usa um hash pré-gerado da senha `admin123`. Se você mudou o salt rounds ou versão do bcrypt, pode não funcionar.

**Uso:**

```bash
# Método 1: Via psql
psql -U postgres -d alya -f /var/www/alya/server/scripts/reset-admin-password.sql

# Método 2: Com senha do PostgreSQL
PGPASSWORD=sua_senha psql -h localhost -U postgres -d alya -f scripts/reset-admin-password.sql
```

---

## 🚀 Guia Rápido (VPS)

### Opção 1: Usando Node.js (RECOMENDADO)

```bash
# 1. Conectar à VPS
ssh root@seu-servidor

# 2. Navegar até o projeto
cd /var/www/alya/server

# 3. Executar script
node scripts/reset-admin-password.js

# 4. Fazer login com:
#    Username: admin
#    Senha: admin123
```

### Opção 2: Usando Bash

```bash
# 1. Conectar à VPS
ssh root@seu-servidor

# 2. Navegar até o projeto
cd /var/www/alya/server

# 3. Tornar executável (primeira vez)
chmod +x scripts/reset-admin-password.sh

# 4. Executar
./scripts/reset-admin-password.sh

# 5. Fazer login com credenciais exibidas
```

### Opção 3: SQL Direto (se tiver problema com Node.js)

```bash
# 1. Conectar à VPS
ssh root@seu-servidor

# 2. Executar SQL
psql -U postgres -d alya -f /var/www/alya/server/scripts/reset-admin-password.sql

# 3. Senha resetada para: admin123
```

---

## 🔒 Segurança

### Após Resetar a Senha

1. **Faça login imediatamente** com as novas credenciais
2. **Altere a senha** para uma senha forte:
   - Mínimo 12 caracteres
   - Mistura de letras maiúsculas e minúsculas
   - Números e símbolos
   - Não use palavras do dicionário
3. **Ative 2FA** (quando implementado)
4. **Monitore logs** de acesso em Active Sessions

### Senhas Fortes Recomendadas

Exemplos de senhas fortes:
- `A1y@2024!Pr0d#Segur0`
- `S1st3m@Fin@nc3ir0!2024`
- `Adm1n!VPS$2024#Segur0`

**Gerador de senha aleatória:**
```bash
# Linux/Mac
openssl rand -base64 24

# Ou
pwgen 20 1
```

---

## ⚠️ Troubleshooting

### Erro: "Cannot find module 'bcryptjs'"

**Solução:**
```bash
cd /var/www/alya/server
npm install bcryptjs
node scripts/reset-admin-password.js
```

### Erro: "Connection refused" (PostgreSQL)

**Verificações:**
1. PostgreSQL está rodando?
   ```bash
   sudo systemctl status postgresql
   ```

2. Credenciais no .env estão corretas?
   ```bash
   cat /var/www/alya/server/.env | grep DB_
   ```

3. Banco de dados existe?
   ```bash
   psql -U postgres -l | grep alya
   ```

### Erro: "User admin not found"

**O script Node.js cria automaticamente.** Se usar SQL direto:

```sql
-- Conectar ao banco
psql -U postgres -d alya

-- Criar admin manualmente
INSERT INTO users (username, password, email, role, created_at)
VALUES (
  'admin',
  '$2a$10$rN8eGmY5F3XxqQqP5V1XxOxK9HF5F3rN8eGmY5F3XxqQqP5V1XxO.',
  'admin@alya.com',
  'admin',
  NOW()
);
```

### Erro: "Permission denied"

**Script bash precisa de permissão:**
```bash
chmod +x /var/www/alya/server/scripts/reset-admin-password.sh
```

---

## 📝 Logs e Auditoria

Após resetar a senha, o evento é registrado:

1. **Tabela users:** Campo `updated_at` é atualizado
2. **Logs do sistema:** Verifique em `/var/www/alya/server/logs/`
3. **Active Sessions:** Todas sessões anteriores são invalidadas

**Verificar última alteração:**
```sql
SELECT id, username, email, updated_at
FROM users
WHERE username = 'admin';
```

---

## 🔄 Rollback

Se precisar reverter para senha anterior (não recomendado):

```sql
-- Você precisaria ter anotado o hash anterior
UPDATE users
SET password = 'hash_anterior_aqui'
WHERE username = 'admin';
```

**IMPORTANTE:** Por segurança, não mantemos histórico de senhas antigas.

---

## 📞 Suporte

Se ainda tiver problemas:

1. Verifique logs do PostgreSQL:
   ```bash
   sudo tail -50 /var/log/postgresql/postgresql-*.log
   ```

2. Verifique logs do servidor:
   ```bash
   pm2 logs alya-backend --lines 100
   ```

3. Teste conexão manualmente:
   ```bash
   psql -U postgres -d alya -c "SELECT username, email, role FROM users WHERE username = 'admin';"
   ```

4. Em último caso, recrie o usuário admin:
   ```bash
   node scripts/reset-admin-password.js
   ```

---

**Última atualização:** 2026-03-16
**Versão dos scripts:** 1.0
