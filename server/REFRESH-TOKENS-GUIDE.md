# 🔄 Guia do Sistema de Refresh Tokens - Fase 3

Sistema de autenticação com tokens de curta e longa duração implementado para melhorar a segurança.

---

## 📋 O Que Mudou?

### Antes (Fase 1-2):
- **Access Token:** 24 horas de duração
- **Problema:** Se o token for roubado, atacante tem acesso por 24h

### Agora (Fase 3):
- **Access Token:** 15 minutos de duração
- **Refresh Token:** 7 dias de duração
- **Benefício:** Janela de risco reduzida de 24h para 15min

---

## 🔐 Como Funciona?

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │ 1. POST /api/auth/login
       │    { username, password }
       ▼
┌─────────────────────────────────────┐
│            Servidor                 │
│  • Valida credenciais              │
│  • Gera accessToken (15min)        │
│  • Gera refreshToken (7d)          │
└──────┬──────────────────────────────┘
       │ 2. Retorna tokens
       ▼
┌─────────────┐
│   Cliente   │
│ • Armazena accessToken (memória)   │
│ • Armazena refreshToken (localStorage) │
└──────┬──────┘
       │
       │ 3. Requisições normais
       │    Authorization: Bearer <accessToken>
       ▼
┌─────────────────────────────────────┐
│   API Endpoints                     │
│   (protegidos com authenticateToken) │
└─────────────────────────────────────┘
       │
       │ 4. Access token expira (15min)
       │
       ▼
┌─────────────┐
│   Cliente   │
│  Interceptor Axios detecta 401     │
└──────┬──────┘
       │ 5. POST /api/auth/refresh
       │    { refreshToken }
       ▼
┌─────────────────────────────────────┐
│            Servidor                 │
│  • Valida refreshToken             │
│  • Gera novo accessToken (15min)   │
│  • Rotaciona refreshToken (novo 7d) │
└──────┬──────────────────────────────┘
       │ 6. Retorna novos tokens
       ▼
┌─────────────┐
│   Cliente   │
│  • Atualiza tokens                 │
│  • Retenta requisição original     │
└─────────────┘
```

---

## 🛠️ API Endpoints

### 1. Login (Modificado)
**POST** `/api/auth/login`

**Request:**
```json
{
  "username": "admin",
  "password": "senha123"
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6...",
  "expiresIn": 900000,
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "admin",
    ...
  }
}
```

**Mudanças:**
- ✅ `token` → `accessToken` (duração: 15min)
- ✅ Adicionado `refreshToken` (duração: 7 dias)
- ✅ Adicionado `expiresIn` (milissegundos até expiração)

---

### 2. Refresh Token (Novo)
**POST** `/api/auth/refresh`

**Request:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "f6e5d4c3b2a1...",
  "expiresIn": 900000
}
```

**Comportamento:**
- ✅ Valida o refresh token fornecido
- ✅ Gera novo access token
- ✅ **Rotaciona** o refresh token (retorna um novo)
- ✅ Revoga o refresh token antigo
- ❌ Retorna 401 se refresh token for inválido/expirado

---

### 3. Logout (Modificado)
**POST** `/api/auth/logout`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logout realizado com sucesso"
}
```

**Comportamento:**
- ✅ Revoga o refresh token fornecido
- ✅ Registra logout no audit log

---

### 4. Logout All Devices (Novo)
**POST** `/api/auth/logout-all`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "message": "3 sessão(ões) encerrada(s) com sucesso"
}
```

**Comportamento:**
- ✅ Revoga **todos** os refresh tokens do usuário
- ✅ Força logout em todos os dispositivos
- ✅ Útil em caso de comprometimento de conta

---

## 💻 Implementação no Frontend

### 1. Atualizar AuthContext

```typescript
// src/contexts/AuthContext.tsx

interface AuthResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

const login = async (username: string, password: string) => {
  const response = await axios.post<AuthResponse>('/api/auth/login', {
    username,
    password,
  });

  const { accessToken, refreshToken, user } = response.data;

  // Armazenar tokens
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);

  // Configurar Axios
  axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

  setUser(user);
};
```

---

### 2. Criar Interceptor Axios para Refresh Automático

```typescript
// src/utils/axiosInterceptor.ts

import axios from 'axios';

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Interceptor de resposta
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se erro 401 e ainda não tentou refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Já está refreshando, adicionar à fila
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return axios(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        // Sem refresh token, fazer logout
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post('/api/auth/refresh', {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Atualizar tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

        // Processar fila de requisições pendentes
        processQueue(null, accessToken);

        // Retentar requisição original
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        // Refresh falhou, fazer logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axios;
```

---

### 3. Usar no App.tsx

```typescript
// src/App.tsx

import './utils/axiosInterceptor'; // Importar no topo

// Resto do código...
```

---

## 🔄 Rotação de Refresh Tokens

### Por que rotacionar?

**Problema:** Se um refresh token for roubado, atacante pode usá-lo por 7 dias.

**Solução:** Toda vez que o refresh token é usado, ele é trocado por um novo e o antigo é revogado.

**Detecção de roubo:**
- Se o token antigo (já revogado) for usado novamente, sabemos que há um problema
- Podemos revogar TODOS os tokens do usuário automaticamente

### Como funciona:

1. Cliente usa `refreshToken_A` para renovar access token
2. Servidor:
   - Gera novo `refreshToken_B`
   - Marca `refreshToken_A` como revogado e aponta para `refreshToken_B`
   - Retorna `refreshToken_B` ao cliente
3. `refreshToken_A` não pode mais ser usado

---

## 📊 Monitoramento

### Ver sessões ativas de um usuário

```sql
SELECT
  id,
  created_at,
  expires_at,
  ip_address,
  user_agent,
  CASE
    WHEN revoked = TRUE THEN 'revoked'
    WHEN expires_at < NOW() THEN 'expired'
    ELSE 'active'
  END as status
FROM refresh_tokens
WHERE user_id = 'user-id-here'
ORDER BY created_at DESC;
```

### Estatísticas gerais

```sql
SELECT
  COUNT(*) FILTER (WHERE revoked = FALSE AND expires_at > NOW()) as active_tokens,
  COUNT(*) FILTER (WHERE revoked = TRUE) as revoked_tokens,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_tokens,
  COUNT(DISTINCT user_id) FILTER (WHERE revoked = FALSE AND expires_at > NOW()) as active_users
FROM refresh_tokens;
```

---

## 🧹 Manutenção

### Limpar tokens expirados (manual)

```bash
cd server
node -e "
require('dotenv').config();
const { cleanupExpiredTokens } = require('./utils/refresh-tokens');
cleanupExpiredTokens().then(count => {
  console.log(\`\${count} tokens removidos\`);
  process.exit(0);
});
"
```

### Configurar limpeza automática (cron)

```bash
# Adicionar ao crontab (executar diariamente às 3AM)
0 3 * * * cd /caminho/para/Alya/server && node -e "require('dotenv').config(); require('./utils/refresh-tokens').cleanupExpiredTokens().then(() => process.exit(0));" >> /var/log/alya-refresh-tokens-cleanup.log 2>&1
```

Ou usar a função PostgreSQL:

```sql
-- Executar manualmente
SELECT cleanup_expired_refresh_tokens();

-- Ou agendar com pg_cron
SELECT cron.schedule('cleanup-refresh-tokens', '0 3 * * *', 'SELECT cleanup_expired_refresh_tokens();');
```

---

## 🔒 Configurações de Segurança

### Duração dos Tokens

Ajustar em `server/utils/refresh-tokens.js`:

```javascript
const TOKEN_EXPIRY = {
  ACCESS_TOKEN: '15m',           // Access token
  ACCESS_TOKEN_MS: 15 * 60 * 1000,
  REFRESH_TOKEN: '7d',           // Refresh token
  REFRESH_TOKEN_MS: 7 * 24 * 60 * 60 * 1000,
};
```

**Recomendações:**
- **Access Token:** 15-30 minutos (quanto menor, mais seguro, mas mais requisições de refresh)
- **Refresh Token:** 7-30 dias (depende do caso de uso)

### Para Ambientes Diferentes

**Desenvolvimento:**
- Access: 1h (menos requisições de refresh)
- Refresh: 30d (conveniência)

**Produção:**
- Access: 15min (segurança)
- Refresh: 7d (equilíbrio)

**Alta Segurança (financeiro):**
- Access: 5min
- Refresh: 1d
- Implementar MFA

---

## 🆘 Troubleshooting

### Erro: "Refresh token inválido ou expirado"

**Causas:**
1. Refresh token realmente expirou (7 dias)
2. Usuário fez logout
3. Token foi revogado manualmente
4. Usuário foi desativado

**Solução:** Redirecionar para tela de login

---

### Erro: "Loop infinito de refresh"

**Causa:** Interceptor Axios tentando renovar token em endpoints que não exigem auth

**Solução:** Verificar se originalRequest._retry está sendo definido corretamente

---

### Erro: "Múltiplos refresh simultâneos"

**Causa:** Várias requisições falhando ao mesmo tempo

**Solução:** Usar fila de requisições pendentes (já implementado no interceptor)

---

## 📈 Benefícios vs. Fase Anterior

| Aspecto | Fase 1-2 | Fase 3 |
|---------|----------|--------|
| Duração do token | 24h | 15min |
| Janela de risco | 24h | 15min |
| Renovação automática | ❌ | ✅ |
| Detecção de roubo | ❌ | ✅ |
| Logout remoto | ❌ | ✅ |
| Sessões ativas visíveis | ❌ | ✅ |
| Auditoria de renovações | ❌ | ✅ |

---

## ✅ Checklist de Implementação Frontend

- [ ] Atualizar AuthContext para usar accessToken/refreshToken
- [ ] Criar interceptor Axios
- [ ] Importar interceptor no App.tsx
- [ ] Atualizar logout para enviar refreshToken
- [ ] Testar login
- [ ] Testar refresh automático (esperar 15min ou mudar TOKEN_EXPIRY temporariamente)
- [ ] Testar logout
- [ ] Adicionar UI para "Sessões Ativas" (opcional)
- [ ] Adicionar botão "Sair de todos os dispositivos" (opcional)

---

**Última Atualização:** 2026-03-04
**Fase:** 3 - Médio Prazo
**Status:** ✅ Backend Implementado | ⏳ Frontend Pendente
