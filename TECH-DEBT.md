# 📋 Dívida Técnica - Sistema ALYA

**Última Atualização:** 2026-03-03

Este documento rastreia itens de dívida técnica conhecidos que devem ser endereçados no futuro.

---

## 🔴 ALTA PRIORIDADE

### 1. Migração de xlsx para exceljs

**Status:** 🟡 Mitigado, mas não resolvido
**Severidade:** HIGH
**Criado em:** 2026-03-03
**Responsável:** Equipe Backend

#### Descrição
A biblioteca `xlsx` possui vulnerabilidades conhecidas (Prototype Pollution + ReDoS) sem fix disponível. A migração para `exceljs` é necessária para eliminar completamente o risco.

#### Impacto
- **Segurança:** Vulnerabilidade HIGH (Prototype Pollution + ReDoS)
- **Funcionalidade:** Upload e export de planilhas Excel (.xlsx)
- **Rotas afetadas:** 6 endpoints (upload/download transações, produtos, clientes)

#### Mitigações Atuais
- ✅ Limite de tamanho de arquivo: 5MB
- ✅ Rate limiting em uploads: 20/hora
- ✅ Validação de extensão e MIME type
- ✅ Sanitização de dados após parse (mongoSanitize, hpp)
- ✅ Monitoramento com npm audit

#### Por que não foi feito agora?
- **Risco alto** de quebrar funcionalidade crítica
- **6+ horas** de trabalho (código + testes extensivos)
- **Benefício médio** vs risco (vulnerabilidade não facilmente exploitável)
- **Prioridades** mais urgentes e menos arriscadas disponíveis

#### Plano de Migração (Futuro)

**Pré-requisitos:**
1. Ambiente de staging configurado
2. Suite de testes E2E para uploads
3. Backup completo de dados
4. Janela de manutenção agendada

**Passos:**
1. Criar branch `feature/migrate-exceljs`
2. Instalar exceljs: `npm install exceljs --save`
3. Refatorar endpoints um por vez:
   - Upload de transações
   - Upload de produtos
   - Upload de clientes
   - Download de modelos
   - Export de dados
4. Converter código síncrono para async/await
5. Testar cada endpoint extensivamente:
   - Diferentes formatos de Excel
   - Dados com acentos e caracteres especiais
   - Arquivos grandes (limite de 5MB)
   - Compatibilidade Excel/LibreOffice/Google Sheets
6. Deploy gradual com feature flag
7. Monitorar erros por 1 semana
8. Remover xlsx após confirmação

**Estimativa:** 2 sprints (código + testes + deploy gradual)

#### Código de Referência

**LEITURA (Upload) - Conversão necessária:**
```javascript
// Antes (xlsx - síncrono)
const workbook = XLSX.readFile(req.file.path);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(worksheet);

// Depois (exceljs - assíncrono)
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(req.file.path);
const worksheet = workbook.getWorksheet(1);
const data = [];
worksheet.eachRow((row, rowNumber) => {
  if (rowNumber > 1) { // Skip header
    data.push({
      campo1: row.getCell(1).value,
      campo2: row.getCell(2).value,
      // ... mapear colunas
    });
  }
});
```

**ESCRITA (Export) - Conversão necessária:**
```javascript
// Antes (xlsx - síncrono)
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(data);
XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

// Depois (exceljs - assíncrono)
const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Sheet1');
worksheet.columns = [
  { header: 'Campo1', key: 'campo1', width: 20 },
  { header: 'Campo2', key: 'campo2', width: 20 },
  // ... definir colunas
];
worksheet.addRows(data);
const buffer = await workbook.xlsx.writeBuffer();
```

#### Links Úteis
- [ExcelJS Documentation](https://github.com/exceljs/exceljs)
- [Migration Guide xlsx → exceljs](https://github.com/exceljs/exceljs/wiki/Migration-from-xlsx)
- [Security Advisory GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6)

---

## 🟡 MÉDIA PRIORIDADE

### 2. Implementar Refresh Tokens

**Status:** 📋 Planejado para Fase 3
**Severidade:** MEDIUM
**Criado em:** 2026-03-03

#### Descrição
Sistema atual usa apenas JWT access tokens. Implementar refresh tokens aumentaria segurança e UX.

#### Benefícios
- Tokens de curta duração (15min) reduzem janela de ataque
- Possibilidade de invalidar sessões remotamente
- Melhor experiência (usuário não precisa fazer login frequentemente)

#### Plano
Ver [SECURITY-AUDIT-REPORT.md](SECURITY-AUDIT-REPORT.md) - Seção "Falta de Refresh Tokens"

---

### 3. Rotação Automática de Logs de Auditoria

**Status:** ✅ Implementado em 2026-03-03
**Severidade:** MEDIUM
**Criado em:** 2026-03-03
**Resolvido em:** 2026-03-03

#### Descrição
Tabela `audit_logs` cresce indefinidamente, podendo causar problemas de performance e disco.

#### Solução Implementada
- ✅ Script de arquivamento (`archive-audit-logs.js`)
- ✅ Exportação de logs para JSON com metadata
- ✅ Deleção automática de logs antigos
- ✅ VACUUM para compactação da tabela
- ✅ Scripts NPM para facilitar execução
- ✅ Documentação completa de setup (AUDIT-LOG-ROTATION-SETUP.md)

#### Como Usar
```bash
# Testar (dry-run)
npm run archive-logs:dry-run

# Arquivar logs > 90 dias
npm run archive-logs:90d

# Arquivar logs > 180 dias
npm run archive-logs:180d
```

Ver [AUDIT-LOG-ROTATION-SETUP.md](server/AUDIT-LOG-ROTATION-SETUP.md) para configuração de cron job.

---

## 🟢 BAIXA PRIORIDADE

### 4. Otimizar CSP (Content Security Policy)

**Status:** 🔄 Aceitável por enquanto
**Severidade:** LOW
**Criado em:** 2026-03-03

#### Descrição
CSP atual permite `'unsafe-inline'` para scripts e estilos (necessário para React/Vite).

#### Possível Melhoria
- Implementar nonces para scripts inline
- Migrar para CSS-in-JS com hash/nonce

#### Por que baixa prioridade?
- Configuração atual é aceitável para SPAs modernas
- Mudança complexa com benefício marginal
- React já escapa valores automaticamente

---

## 📊 Estatísticas

- **Total de itens:** 4
- **Alta prioridade:** 1 (pendente)
- **Média prioridade:** 2 (1 implementado, 1 planejado)
- **Baixa prioridade:** 1 (aceitável)
- **Resolvidos:** 1 (Rotação de logs)

---

## 📝 Como Adicionar Itens

Ao identificar nova dívida técnica:

1. Adicionar seção neste documento
2. Incluir: Status, Severidade, Descrição, Impacto, Plano
3. Priorizar: Alta/Média/Baixa
4. Criar issue no GitHub (se aplicável)
5. Atualizar "Última Atualização" no topo

---

**Revisão recomendada:** Trimestral (próxima em 2026-06-03)

---

## ✅ Resolvidos

### jspdf 3.0.4 → 4.2.0

**Resolvido em:** 2026-03-03
**8 vulnerabilidades críticas corrigidas:** LFI, PDF Injection, DoS (BMP/GIF), XMP Injection, Race Condition, PDF Object Injection.

```bash
npm install jspdf@latest --save
```

Nenhum breaking change. API permanece compatível (`jsPDF()`, `.text()`, `.save()`, `.autoTable()`).
