# 🔐 Rotação de Credenciais de Segurança - 2026-03-03

## ⚠️ AÇÃO CRÍTICA EXECUTADA

Este documento registra a rotação de credenciais realizada em **2026-03-03** como parte das recomendações da auditoria de segurança.

---

## 📋 RESUMO

**Razão:** O arquivo `.env` estava exposto no repositório Git, comprometendo a segurança das credenciais.

**Ação Tomada:**
1. ✅ Novo `JWT_SECRET` gerado usando `openssl rand -base64 32`
2. ✅ Arquivo `.env` atualizado com novo secret
3. ✅ `.env.example` atualizado com novos campos
4. ✅ SendGrid API key removida (estava comentada)

---

## 🔑 CREDENCIAIS ROTACIONADAS

### JWT_SECRET
- **Status:** ✅ ROTACIONADO
- **Método:** `openssl rand -base64 32`
- **Data:** 2026-03-03
- **Ação Requerida:** Nenhuma (usuários farão login novamente)

**Impacto:**
- Todos os tokens JWT anteriores são invalidados
- Usuários precisarão fazer login novamente

### SendGrid API Key
- **Status:** ⚪ NÃO ESTAVA ATIVA
- **Observação:** Estava comentada no .env, nenhuma ação necessária

### Database Credentials
- **Status:** ✅ SEM ALTERAÇÃO
- **Observação:** Credenciais locais (usuário do sistema), não comprometidas

---

## 📁 NOVO CAMPO ADICIONADO

### CORS_ORIGINS
**Descrição:** Lista de origens permitidas para CORS (separadas por vírgula)

**Exemplo:**
```env
CORS_ORIGINS=https://alya.sistemas.viverdepj.com.br,http://localhost:8000,http://localhost:5173
```

**Benefício:**
- Origens CORS agora são configuráveis via variável de ambiente
- Facilita deployment em diferentes ambientes
- Melhora segurança (não hardcoded no código)

---

## 🚀 PRÓXIMOS PASSOS

### Para Desenvolvimento Local
✅ **Nenhuma ação necessária** - As credenciais locais já foram atualizadas

### Para Produção (VPS)
⚠️ **AÇÃO REQUERIDA:**

1. **Gerar novo JWT_SECRET no servidor:**
   ```bash
   ssh usuario@servidor
   cd /caminho/para/alya/server
   openssl rand -base64 32
   # Copiar resultado
   ```

2. **Atualizar `.env` em produção:**
   ```bash
   nano .env
   # Colar novo JWT_SECRET
   # Adicionar linha CORS_ORIGINS com domínios de produção
   ```

3. **Restart do servidor:**
   ```bash
   pm2 restart alya-server
   ```

4. **Notificar usuários:**
   - Avisar que precisarão fazer login novamente
   - Explicar que é por motivos de segurança

---

## 🛡️ MEDIDAS DE SEGURANÇA ADICIONAIS

### Implementadas
- ✅ `.env` NUNCA será commitado (já está no .gitignore)
- ✅ `.env.example` fornecido para referência
- ✅ Comentários claros sobre segurança no `.env`
- ✅ Validação obrigatória de JWT_SECRET na inicialização

### Recomendadas (Futuro)
- [ ] Usar gerenciador de segredos (AWS Secrets Manager, HashiCorp Vault)
- [ ] Rotação automática de credenciais a cada 90 dias
- [ ] Monitoramento de acesso a .env em produção
- [ ] 2FA para acesso ao servidor de produção

---

## 📞 CONTATO

Para questões de segurança:
- **Email:** security@viverdepj.com.br (configurar)
- **Responsável:** Equipe de TI

---

## 📝 HISTÓRICO DE ROTAÇÃO

| Data | Credencial | Razão | Responsável |
|------|------------|-------|-------------|
| 2026-03-03 | JWT_SECRET | .env exposto no Git (auditoria) | Claude (Automatizado) |
| - | - | - | - |

**Próxima Rotação Recomendada:** 2026-06-03 (3 meses)

---

## ⚠️ IMPORTANTE

**NUNCA** commite o arquivo `.env` no Git!

Se acidentalmente commitado:
1. **IMEDIATAMENTE** remover do Git: `git rm --cached .env`
2. **IMEDIATAMENTE** rotacionar TODAS as credenciais
3. Limpar histórico do Git (se necessário)
4. Notificar equipe de segurança

---

**Documento criado em:** 2026-03-03
**Última atualização:** 2026-03-03
