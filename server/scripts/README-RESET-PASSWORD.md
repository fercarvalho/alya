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
psql -U seuusuario -d alya -h localhost -f /var/www/alya/server/scripts/reset-admin-password.sql
```

---

## 🚀 Guia Rápido (VPS)

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

---

## 🔒 Segurança

### Após Resetar a Senha

1. **Faça login imediatamente** com as novas credenciais
2. **Altere a senha** para uma senha forte (mínimo 12 caracteres)
3. **Monitore logs** de acesso em Active Sessions

**Gerador de senha aleatória:**
```bash
openssl rand -base64 24
```

---

## ⚠️ Troubleshooting

### Erro: "Cannot find module 'bcryptjs'"
```bash
cd /var/www/alya/server
npm install bcryptjs
node scripts/reset-admin-password.js
```

### Erro: "Connection refused" (PostgreSQL)
```bash
sudo systemctl status postgresql
cat /var/www/alya/server/.env | grep DB_
```

### Verificar usuário admin
```bash
psql -U seuusuario -d alya -h localhost -c "SELECT id, username, email, updated_at FROM users WHERE username = 'admin';"
```

---

**Última atualização:** 2026-03-16
