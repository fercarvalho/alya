/**
 * Implementação do Database usando PostgreSQL.
 * Inclui entidades core e módulo de Projeção.
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const FileDatabase = require('./database');
const permissionsHelpers = require('./permissions');

function formatDateForApi(dateVal) {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    const s = dateVal.toISOString().split('T')[0];
    return s || null;
  }
  const str = String(dateVal).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.split('T')[0];
  return str;
}

function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = toCamelCase(v);
  }
  return out;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  if (typeof dateStr !== 'string') return dateStr;
  const str = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.split('T')[0];
  const parts = str.split(/[\/\-\.]/);
  if (parts.length >= 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    if (d <= 31 && m >= 0 && m <= 11 && y > 1900) {
      return new Date(y, m, d).toISOString().split('T')[0];
    }
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return str;
}

function parseUser(row) {
  // Preservar as chaves do JSONB permissoes_legais antes do toCamelCase recursivo.
  // toCamelCase converte chaves aninhadas (ex: termos_uso → termosUso), o que
  // quebraria as verificações de permissão que usam snake_case como identificadores.
  const rawPermissoesLegais = row.permissoes_legais ?? null;
  const u = toCamelCase(row);
  // Restaurar o JSONB com as chaves originais (snake_case)
  u.permissoesLegais = (rawPermissoesLegais && typeof rawPermissoesLegais === 'object')
    ? rawPermissoesLegais
    : (typeof rawPermissoesLegais === 'string' ? JSON.parse(rawPermissoesLegais) : {});
  if (u.address && typeof u.address === 'object' && u.address !== null) return u;
  if (typeof u.address === 'string') {
    try {
      u.address = JSON.parse(u.address);
    } catch {
      u.address = null;
    }
  }
  return u;
}

function parseLog(row) {
  const l = toCamelCase(row);
  if (l.details && typeof l.details !== 'object') {
    try {
      l.details = JSON.parse(l.details);
    } catch {
      l.details = {};
    }
  }
  return l;
}

class Database extends FileDatabase {
  constructor() {
    super();
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || 'alya',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    this._ensurePgDefaults();
    this._ensureLegalDefaults();
  }

  /** Não criar arquivos JSON; o backend usa apenas PostgreSQL. */
  ensureFilesExist() { }

  async _ensurePgDefaults() {
    try {
      // Catálogo de subcategorias (migration 023). Self-heal: garante a tabela
      // mesmo se a migration manual não tiver rodado ainda.
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS subcategories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_subcategories_name ON subcategories(name);`);

      // Garantir que as tabelas de documentação existem
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS doc_sections (
          id VARCHAR(255) PRIMARY KEY,
          title VARCHAR(500) NOT NULL,
          ordem INTEGER DEFAULT 0,
          visibility VARCHAR(20) DEFAULT 'todos',
          created_at TIMESTAMP,
          updated_at TIMESTAMP
        )
      `);
      // Migrações para bancos existentes
      await this.pool.query(`ALTER TABLE doc_sections ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'todos'`);
      // Migra admin_only → visibility se a coluna ainda existir
      await this.pool.query(`
        DO $$ BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='doc_sections' AND column_name='admin_only') THEN
            UPDATE doc_sections SET visibility = 'admins' WHERE admin_only = true AND visibility = 'todos';
          END IF;
        END $$
      `);
      // Migração da tabela faq
      await this.pool.query(`ALTER TABLE faq ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'todos'`);
      await this.pool.query(`
        DO $$ BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='faq' AND column_name='admin_only') THEN
            UPDATE faq SET visibility = 'admins' WHERE admin_only = true AND visibility = 'todos';
          END IF;
        END $$
      `);
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS doc_pages (
          id VARCHAR(255) PRIMARY KEY,
          section_id VARCHAR(255) NOT NULL REFERENCES doc_sections(id) ON DELETE CASCADE,
          title VARCHAR(500) NOT NULL,
          content TEXT DEFAULT '',
          ordem INTEGER DEFAULT 0,
          created_at TIMESTAMP,
          updated_at TIMESTAMP
        )
      `);

      // Garantir que o módulo documentacao está registrado
      const modDocRes = await this.pool.query(
        `SELECT id FROM modules WHERE key = 'documentacao' LIMIT 1`
      );
      if (modDocRes.rows.length === 0) {
        const modId = this.generateId();
        await this.pool.query(
          `INSERT INTO modules (id, name, key, icon, is_active, is_system) VALUES ($1, $2, $3, $4, true, true)`,
          [modId, 'Documentação', 'documentacao', 'BookOpen']
        );
        console.log('Módulo Documentação criado no PostgreSQL.');
      }

      // Garantir que a tabela roadmap_items existe
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS roadmap_items (
          id VARCHAR(255) PRIMARY KEY,
          titulo VARCHAR(255) NOT NULL,
          descricao TEXT,
          status VARCHAR(50) NOT NULL DEFAULT 'backlog',
          prioridade VARCHAR(20) DEFAULT 'media',
          ordem INTEGER DEFAULT 0,
          data_inicio TIMESTAMP,
          depende_de VARCHAR(255) REFERENCES roadmap_items(id) ON DELETE SET NULL,
          tempo_acumulado INTEGER DEFAULT 0,
          em_andamento BOOLEAN DEFAULT FALSE,
          ultimo_inicio TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL
        )
      `);
      await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_roadmap_status ON roadmap_items(status)`);
      await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_roadmap_ordem ON roadmap_items(ordem)`);

      // Criar tabela de colunas
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS roadmap_colunas (
          id VARCHAR(255) PRIMARY KEY,
          key VARCHAR(100) UNIQUE NOT NULL,
          label VARCHAR(255) NOT NULL,
          cor VARCHAR(50) DEFAULT '#6b7280',
          cor_fundo VARCHAR(50) DEFAULT '#f3f4f6',
          ordem INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Criar tabela de configurações do roadmap
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS roadmap_config (
          id VARCHAR(255) PRIMARY KEY,
          coluna_concluir VARCHAR(100) DEFAULT 'lancado',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      const cfgRes = await this.pool.query('SELECT COUNT(*) FROM roadmap_config');
      if (parseInt(cfgRes.rows[0].count, 10) === 0) {
        await this.pool.query(
          'INSERT INTO roadmap_config (id, coluna_concluir) VALUES ($1, $2)',
          [this.generateId(), 'lancado']
        );
      }

      // Inserir colunas padrão se a tabela estiver vazia
      const colRes = await this.pool.query('SELECT COUNT(*) FROM roadmap_colunas');
      if (parseInt(colRes.rows[0].count, 10) === 0) {
        const defaultCols = [
          { key: 'backlog', label: 'Backlog',  cor: '#6b7280', cor_fundo: '#f3f4f6', ordem: 0 },
          { key: 'doing',   label: 'Doing',    cor: '#d97706', cor_fundo: '#fef3c7', ordem: 1 },
          { key: 'em_beta', label: 'Em Beta',  cor: '#2563eb', cor_fundo: '#dbeafe', ordem: 2 },
          { key: 'lancado', label: 'Lançado',  cor: '#16a34a', cor_fundo: '#dcfce7', ordem: 3 },
        ];
        for (const col of defaultCols) {
          const id = this.generateId();
          await this.pool.query(
            'INSERT INTO roadmap_colunas (id, key, label, cor, cor_fundo, ordem) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, col.key, col.label, col.cor, col.cor_fundo, col.ordem]
          );
        }
      }

      const userRes = await this.pool.query('SELECT COUNT(*) FROM users');
      if (parseInt(userRes.rows[0].count, 10) === 0) {
        const ph = bcrypt.hashSync('FIRST_LOGIN_PLACEHOLDER', 10);
        // Fase 2.10 — coluna users.modules dropada. Bootstrap inicial só
        // cria as 3 rows de user; permissões granulares dependem de
        // role_default_permissions (migration 021), que rodam antes deste
        // bootstrap quando o servidor inicia pela 1ª vez em um banco vazio.
        // Como aqui não temos request context (rodando em runtime startup),
        // não dá pra chamar permissionsHelpers.applyRoleDefaultsToUser sem
        // criar dependência circular; deixamos as 3 rows sem perms iniciais
        // e contamos com 1) migration 020 ter rodado (que reseed
        // user_module_permissions baseado em role × módulo), ou
        // 2) admin criar usuários via UI (onde saveUser já chama
        // applyRoleDefaultsToUser).
        const defaults = [
          ['admin', ph, 'superadmin'],
          ['user',  ph, 'user'],
          ['guest', ph, 'guest'],
        ];
        for (const [username, password, role] of defaults) {
          const id = this.generateId();
          await this.pool.query(
            'INSERT INTO users (id, username, password, role, is_active) VALUES ($1, $2, $3, $4, true)',
            [id, username, password, role]
          );
        }
        console.log('Usuários padrão criados no PostgreSQL.');
      }
      const modRes = await this.pool.query('SELECT COUNT(*) FROM modules');
      if (parseInt(modRes.rows[0].count, 10) === 0) {
        const mods = [
          ['Dashboard', 'dashboard', 'Home'],
          ['Transações', 'transactions', 'DollarSign'],
          ['Produtos', 'products', 'Package'],
          ['Clientes', 'clients', 'Users'],
          ['Relatórios', 'reports', 'BarChart3'],
          ['Metas', 'metas', 'Target'],
          ['DRE', 'dre', 'BarChart3'],
          ['Projeção', 'projecao', 'Calculator'],
          ['Administração', 'admin', 'Shield'],
          ['Sessões Ativas', 'activeSessions', 'Lock'],
          ['Anomalias', 'anomalies', 'Activity'],
          ['Alertas de Segurança', 'securityAlerts', 'Bell'],
          ['Roadmap', 'roadmap', 'Map'],
          ['FAQ', 'faq', 'HelpCircle'],
        ];
        for (const [name, key, icon] of mods) {
          const id = this.generateId();
          await this.pool.query(
            'INSERT INTO modules (id, name, key, icon, is_active, is_system) VALUES ($1, $2, $3, $4, true, true)',
            [id, name, key, icon]
          );
        }
        console.log('Módulos padrão criados no PostgreSQL.');
      }
    } catch (err) {
      console.error('Erro ao configurar PostgreSQL:', err.message);
    }
  }

  async getAllTransactions() {
    try {
      const r = await this.pool.query('SELECT * FROM transactions ORDER BY created_at DESC');
      return r.rows.map(row => {
        const t = toCamelCase(row);
        if (t.date) t.date = formatDateForApi(t.date);
        return t;
      });
    } catch (e) {
      console.error('Erro ao ler transações:', e);
      return [];
    }
  }

  async saveTransaction(transaction) {
    const id = this.generateId();
    const now = new Date().toISOString();
    const date = parseDate(transaction.date) || now.split('T')[0];
    const r = await this.pool.query(
      `INSERT INTO transactions (id, date, description, value, type, category, subcategory, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        id,
        date,
        transaction.description || '',
        parseFloat(transaction.value) || 0,
        transaction.type || 'Outros',
        transaction.category || null,
        transaction.subcategory || null,
        now,
        now,
      ]
    );
    const t = toCamelCase(r.rows[0]);
    t.date = formatDateForApi(t.date);
    return t;
  }

  async updateTransaction(id, data) {
    const date = data.date != null ? parseDate(data.date) : null;
    const r = await this.pool.query(
      `UPDATE transactions SET
        date = COALESCE($2, date),
        description = COALESCE($3, description),
        value = COALESCE($4, value),
        type = COALESCE($5, type),
        category = COALESCE($6, category),
        subcategory = COALESCE($7, subcategory),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [
        id,
        date,
        data.description,
        data.value != null ? parseFloat(data.value) : null,
        data.type,
        data.category,
        data.subcategory,
      ]
    );
    if (r.rows.length === 0) throw new Error('Transação não encontrada');
    const t = toCamelCase(r.rows[0]);
    t.date = formatDateForApi(t.date);
    return t;
  }

  async getTransactionById(id) {
    const r = await this.pool.query('SELECT * FROM transactions WHERE id = $1', [id]);
    if (r.rows.length === 0) return null;
    const t = toCamelCase(r.rows[0]);
    t.date = formatDateForApi(t.date);
    return t;
  }

  async deleteTransaction(id) {
    const r = await this.pool.query('DELETE FROM transactions WHERE id = $1', [id]);
    return r.rowCount > 0;
  }

  async deleteMultipleTransactions(ids) {
    const r = await this.pool.query('DELETE FROM transactions WHERE id = ANY($1)', [ids]);
    return r.rowCount > 0;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Regras automáticas de transações (migration 015)
  // ════════════════════════════════════════════════════════════════════════════

  async getAllTransactionRules() {
    try {
      const r = await this.pool.query(
        'SELECT * FROM transaction_rules ORDER BY sort_order ASC, created_at ASC'
      );
      return toCamelCase(r.rows);
    } catch (e) {
      console.error('Erro ao ler regras:', e);
      return [];
    }
  }

  async getActiveTransactionRules() {
    try {
      const r = await this.pool.query(
        'SELECT * FROM transaction_rules WHERE is_active = TRUE ORDER BY sort_order ASC, created_at ASC'
      );
      return toCamelCase(r.rows);
    } catch (e) {
      console.error('Erro ao ler regras ativas:', e);
      return [];
    }
  }

  async getTransactionRuleById(id) {
    const r = await this.pool.query('SELECT * FROM transaction_rules WHERE id = $1', [id]);
    return r.rows[0] ? toCamelCase(r.rows[0]) : null;
  }

  async saveTransactionRule(rule) {
    const id = this.generateId();
    const orderRes = await this.pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM transaction_rules'
    );
    const nextOrder = rule.sortOrder ?? orderRes.rows[0].next;
    const r = await this.pool.query(
      `INSERT INTO transaction_rules
         (id, name, description_contains, action_type, action_value, set_category, set_subcategory,
          hide_transaction, min_value, max_value, match_type, is_active, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        id,
        rule.name,
        rule.descriptionContains,
        rule.actionType || 'change_type',
        rule.actionValue || null,
        rule.setCategory || null,
        rule.setSubcategory || null,
        !!rule.hideTransaction,
        rule.minValue ?? null,
        rule.maxValue ?? null,
        rule.matchType || null,
        rule.isActive !== false,
        nextOrder,
        rule.createdBy || null,
      ]
    );
    return toCamelCase(r.rows[0]);
  }

  async updateTransactionRule(id, updates) {
    const existing = await this.getTransactionRuleById(id);
    if (!existing) throw new Error('Regra não encontrada');
    const pick = (key, fallback) =>
      Object.prototype.hasOwnProperty.call(updates, key) ? updates[key] : fallback;

    const r = await this.pool.query(
      `UPDATE transaction_rules SET
         name = $2,
         description_contains = $3,
         action_type = $4,
         action_value = $5,
         set_category = $6,
         set_subcategory = $7,
         hide_transaction = $8,
         min_value = $9,
         max_value = $10,
         match_type = $11,
         is_active = $12,
         sort_order = $13,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [
        id,
        updates.name ?? existing.name,
        updates.descriptionContains ?? existing.descriptionContains,
        updates.actionType ?? existing.actionType,
        pick('actionValue', existing.actionValue),
        pick('setCategory', existing.setCategory),
        pick('setSubcategory', existing.setSubcategory),
        Object.prototype.hasOwnProperty.call(updates, 'hideTransaction')
          ? !!updates.hideTransaction
          : existing.hideTransaction,
        pick('minValue', existing.minValue),
        pick('maxValue', existing.maxValue),
        pick('matchType', existing.matchType),
        updates.isActive ?? existing.isActive,
        updates.sortOrder ?? existing.sortOrder,
      ]
    );
    return toCamelCase(r.rows[0]);
  }

  async deleteTransactionRule(id) {
    const r = await this.pool.query(
      'DELETE FROM transaction_rules WHERE id = $1 RETURNING id',
      [id]
    );
    if (r.rowCount === 0) throw new Error('Regra não encontrada');
    return true;
  }

  async reorderTransactionRules(orderedIds) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query(
          'UPDATE transaction_rules SET sort_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [i, orderedIds[i]]
        );
      }
      await client.query('COMMIT');
      return true;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // ── Catálogo de subcategorias (migration 023) ───────────────────────────────
  // Fonte única, compartilhada pelo modal de transação, modal de Regras e modal
  // de Gerenciar Subcategorias. A coluna subcategory em transactions é texto
  // livre (sem FK): excluir do catálogo não apaga o valor das transações.

  async getAllSubcategories() {
    try {
      const result = await this.pool.query('SELECT name FROM subcategories ORDER BY name');
      return result.rows.map((row) => row.name);
    } catch (error) {
      console.error('Erro ao ler subcategorias:', error);
      return [];
    }
  }

  async saveSubcategory(name) {
    await this.pool.query(
      'INSERT INTO subcategories (name, created_at) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
      [name, new Date().toISOString()]
    );
    return name;
  }

  async deleteSubcategory(name) {
    const result = await this.pool.query('DELETE FROM subcategories WHERE name = $1', [name]);
    return result.rowCount > 0;
  }

  // Regras que referenciam a subcategoria (set_subcategory). Usado pra bloquear
  // a exclusão enquanto houver regra dependente.
  async getRulesUsingSubcategory(name) {
    const result = await this.pool.query(
      'SELECT id, name FROM transaction_rules WHERE set_subcategory = $1 ORDER BY name',
      [name]
    );
    return result.rows;
  }

  // Renomeia e propaga o novo nome para tudo que referencia por texto:
  // transações (subcategory + original_subcategory) e regras (set_subcategory).
  // Atômico. Retorna 'ok' | 'not_found' | 'conflict'.
  async renameSubcategory(oldName, newName) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const exists = await client.query('SELECT 1 FROM subcategories WHERE name = $1', [oldName]);
      if (exists.rowCount === 0) {
        await client.query('ROLLBACK');
        return 'not_found';
      }
      const clash = await client.query('SELECT 1 FROM subcategories WHERE name = $1', [newName]);
      if (clash.rowCount > 0) {
        await client.query('ROLLBACK');
        return 'conflict';
      }

      await client.query('UPDATE subcategories SET name = $1 WHERE name = $2', [newName, oldName]);
      await client.query('UPDATE transactions SET subcategory = $1 WHERE subcategory = $2', [newName, oldName]);
      await client.query('UPDATE transactions SET original_subcategory = $1 WHERE original_subcategory = $2', [newName, oldName]);
      await client.query('UPDATE transaction_rules SET set_subcategory = $1 WHERE set_subcategory = $2', [newName, oldName]);

      await client.query('COMMIT');
      return 'ok';
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro ao renomear subcategoria:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ── Aplicação de regras ─────────────────────────────────────────────────────

  /**
   * Avalia uma transação contra todas as regras ATIVAS. Função pura: não
   * persiste nada. Caller decide o que fazer com o resultado.
   */
  async evaluateRulesForTransaction(transaction) {
    const rules = await this.getActiveTransactionRules();
    const description = (transaction.description || '').toLowerCase();
    if (!description) return { matched: [], rules };
    const absValue = Math.abs(parseFloat(transaction.value) || 0);
    const txType = transaction.type;

    const matched = rules.filter((r) => {
      const needle = (r.descriptionContains || '').toLowerCase().trim();
      if (!needle) return false;
      if (!description.includes(needle)) return false;
      if (r.minValue != null && absValue < parseFloat(r.minValue)) return false;
      if (r.maxValue != null && absValue > parseFloat(r.maxValue)) return false;
      if (r.matchType && r.matchType !== txType) return false;
      return true;
    });

    return { matched, rules };
  }

  async applyRuleToTransaction(transactionId, ruleId) {
    const rule = await this.getTransactionRuleById(ruleId);
    if (!rule) throw new Error('Regra não encontrada');
    const txRes = await this.pool.query('SELECT * FROM transactions WHERE id = $1', [transactionId]);
    const tx = txRes.rows[0];
    if (!tx) throw new Error('Transação não encontrada');

    // Se a transação está pendente, parte dos valores originais antes de aplicar
    // a regra; caso contrário, parte do estado atual.
    const isPending = tx.needs_confirmation === true || tx.type === 'A confirmar';
    const baseType        = isPending ? (tx.original_type        || tx.type)        : tx.type;
    const baseCategory    = isPending ? (tx.original_category    || tx.category)    : tx.category;
    const baseSubcategory = isPending ? (tx.original_subcategory || tx.subcategory) : tx.subcategory;

    const newType        = rule.actionValue     ? rule.actionValue     : baseType;
    const newCategory    = rule.setCategory     ? rule.setCategory     : baseCategory;
    const newSubcategory = rule.setSubcategory  ? rule.setSubcategory  : baseSubcategory;
    const newHidden      = rule.hideTransaction ? true                 : tx.is_hidden;

    // Preserva original_* apenas na primeira aplicação
    const originalType        = tx.original_type        || tx.type;
    const originalCategory    = tx.original_category    || tx.category;
    const originalSubcategory = tx.original_subcategory || tx.subcategory;

    const r = await this.pool.query(
      `UPDATE transactions SET
         type = $1,
         category = $2,
         subcategory = $3,
         is_hidden = $4,
         applied_rule_id = $5,
         original_type = $6,
         original_category = $7,
         original_subcategory = $8,
         needs_confirmation = FALSE,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [newType, newCategory, newSubcategory, newHidden, ruleId, originalType, originalCategory, originalSubcategory, transactionId]
    );
    await this.clearTransactionRuleCandidates(transactionId);
    const out = toCamelCase(r.rows[0]);
    out.date = formatDateForApi(out.date);
    return out;
  }

  async revertTransactionRule(transactionId) {
    const r = await this.pool.query(
      `UPDATE transactions SET
         type = COALESCE(original_type, type),
         category = COALESCE(original_category, category),
         subcategory = COALESCE(original_subcategory, subcategory),
         is_hidden = FALSE,
         applied_rule_id = NULL,
         original_type = NULL,
         original_category = NULL,
         original_subcategory = NULL,
         needs_confirmation = FALSE,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [transactionId]
    );
    if (r.rowCount === 0) throw new Error('Transação não encontrada');
    await this.clearTransactionRuleCandidates(transactionId);
    const out = toCamelCase(r.rows[0]);
    out.date = formatDateForApi(out.date);
    return out;
  }

  async markTransactionPendingConfirmation(transactionId, candidateRuleIds) {
    const txRes = await this.pool.query('SELECT * FROM transactions WHERE id = $1', [transactionId]);
    const tx = txRes.rows[0];
    if (!tx) throw new Error('Transação não encontrada');
    const originalType        = tx.original_type        || tx.type;
    const originalCategory    = tx.original_category    || tx.category;
    const originalSubcategory = tx.original_subcategory || tx.subcategory;

    const r = await this.pool.query(
      `UPDATE transactions SET
         type = 'A confirmar',
         applied_rule_id = NULL,
         original_type = $1,
         original_category = $2,
         original_subcategory = $3,
         needs_confirmation = TRUE,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [originalType, originalCategory, originalSubcategory, transactionId]
    );
    await this.saveTransactionRuleCandidates(transactionId, candidateRuleIds);
    const out = toCamelCase(r.rows[0]);
    out.date = formatDateForApi(out.date);
    return out;
  }

  // ── Candidatos ──────────────────────────────────────────────────────────────

  async saveTransactionRuleCandidates(transactionId, ruleIds) {
    if (!ruleIds || ruleIds.length === 0) return;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM transaction_rule_candidates WHERE transaction_id = $1', [transactionId]);
      for (const ruleId of ruleIds) {
        await client.query(
          `INSERT INTO transaction_rule_candidates (transaction_id, rule_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [transactionId, ruleId]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getTransactionRuleCandidates(transactionId) {
    const r = await this.pool.query(
      `SELECT r.* FROM transaction_rules r
         INNER JOIN transaction_rule_candidates c ON c.rule_id = r.id
        WHERE c.transaction_id = $1
        ORDER BY r.sort_order ASC, r.created_at ASC`,
      [transactionId]
    );
    return toCamelCase(r.rows);
  }

  async clearTransactionRuleCandidates(transactionId) {
    await this.pool.query(
      'DELETE FROM transaction_rule_candidates WHERE transaction_id = $1',
      [transactionId]
    );
  }

  // ── Preview retroativo ──────────────────────────────────────────────────────

  /**
   * Dada uma condição (descrição contém + faixa de valor + tipo casado),
   * retorna transações existentes que dariam match. Cada item vem com info
   * se já está governada por outra regra.
   */
  async previewRuleMatches({ descriptionContains, minValue = null, maxValue = null, matchType = null, excludeRuleId = null }) {
    const needle = (descriptionContains || '').trim();
    if (!needle) return [];
    const params = [`%${needle}%`, excludeRuleId];
    let whereExtras = '';
    if (minValue != null) { params.push(parseFloat(minValue)); whereExtras += ` AND ABS(t.value) >= $${params.length}`; }
    if (maxValue != null) { params.push(parseFloat(maxValue)); whereExtras += ` AND ABS(t.value) <= $${params.length}`; }
    if (matchType)        { params.push(matchType);            whereExtras += ` AND t.type = $${params.length}`; }

    const r = await this.pool.query(
      `SELECT t.*, r.id AS existing_rule_id, r.name AS existing_rule_name
         FROM transactions t
         LEFT JOIN transaction_rules r ON r.id = t.applied_rule_id
        WHERE LOWER(t.description) LIKE LOWER($1)
          AND ($2::VARCHAR IS NULL OR t.applied_rule_id IS DISTINCT FROM $2)
          ${whereExtras}
        ORDER BY t.date DESC`,
      params
    );
    return r.rows.map((row) => {
      const c = toCamelCase(row);
      c.date = formatDateForApi(c.date);
      return c;
    });
  }

  // Transações atualmente governadas por uma regra (applied_rule_id = ruleId).
  // Usado pelo modal de edição para detectar "órfãs" — transações que a regra
  // já alterou mas que não casam mais com a condição depois de editada.
  async getTransactionsByAppliedRule(ruleId) {
    const r = await this.pool.query(
      `SELECT t.*, r.id AS existing_rule_id, r.name AS existing_rule_name
         FROM transactions t
         LEFT JOIN transaction_rules r ON r.id = t.applied_rule_id
        WHERE t.applied_rule_id = $1
        ORDER BY t.date DESC`,
      [ruleId]
    );
    return r.rows.map((row) => {
      const c = toCamelCase(row);
      c.date = formatDateForApi(c.date);
      return c;
    });
  }

  // ── Notificações in-app ─────────────────────────────────────────────────────

  async createNotification(notif) {
    const id = this.generateId();
    const r = await this.pool.query(
      `INSERT INTO notifications
         (id, user_id, notification_type, title, message, related_entity_type, related_entity_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id,
        notif.userId,
        notif.notificationType,
        notif.title,
        notif.message || null,
        notif.relatedEntityType || null,
        notif.relatedEntityId || null,
      ]
    );
    return toCamelCase(r.rows[0]);
  }

  async getNotificationsForUser(userId, { onlyUnread = false, limit = 50, includeCleared = false } = {}) {
    const r = await this.pool.query(
      `SELECT * FROM notifications
        WHERE user_id = $1
          AND ($2::BOOLEAN = FALSE OR is_read = FALSE)
          AND ($3::BOOLEAN = TRUE  OR cleared = FALSE)
        ORDER BY created_at DESC
        LIMIT $4`,
      [userId, onlyUnread, includeCleared, limit]
    );
    return toCamelCase(r.rows);
  }

  async getUnreadNotificationCount(userId) {
    const r = await this.pool.query(
      'SELECT COUNT(*)::INT AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE AND cleared = FALSE',
      [userId]
    );
    return r.rows[0].count;
  }

  async markNotificationAsRead(id, userId) {
    const r = await this.pool.query(
      `UPDATE notifications SET is_read = TRUE, read_at = NOW()
        WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );
    return r.rows[0] ? toCamelCase(r.rows[0]) : null;
  }

  async markAllNotificationsAsRead(userId) {
    await this.pool.query(
      `UPDATE notifications SET is_read = TRUE, read_at = NOW()
        WHERE user_id = $1 AND is_read = FALSE AND cleared = FALSE`,
      [userId]
    );
  }

  async clearNotification(id, userId) {
    const r = await this.pool.query(
      `UPDATE notifications SET cleared = TRUE, cleared_at = NOW()
        WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );
    return r.rows[0] ? toCamelCase(r.rows[0]) : null;
  }

  async clearAllNotifications(userId) {
    const r = await this.pool.query(
      `UPDATE notifications SET cleared = TRUE, cleared_at = NOW()
        WHERE user_id = $1 AND cleared = FALSE RETURNING id`,
      [userId]
    );
    return r.rowCount;
  }

  async deleteNotification(id, userId) {
    const r = await this.pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return r.rowCount > 0;
  }

  async deleteAllNotificationsForUser(userId, { onlyCleared = false } = {}) {
    const r = await this.pool.query(
      `DELETE FROM notifications
        WHERE user_id = $1
          AND ($2::BOOLEAN = FALSE OR cleared = TRUE)
        RETURNING id`,
      [userId, onlyCleared]
    );
    return r.rowCount;
  }

  async deleteNotificationsByEntity(entityType, entityId) {
    await this.pool.query(
      'DELETE FROM notifications WHERE related_entity_type = $1 AND related_entity_id = $2',
      [entityType, entityId]
    );
  }

  async fanoutNotificationToAdmins(notif, excludeUserIds = []) {
    const adminsRes = await this.pool.query(
      "SELECT id FROM users WHERE role IN ('admin', 'superadmin') AND is_active = TRUE"
    );
    const created = [];
    for (const row of adminsRes.rows) {
      if (excludeUserIds.includes(row.id)) continue;
      const n = await this.createNotification({ ...notif, userId: row.id });
      created.push(n);
    }
    return created;
  }

  // ===========================================================================
  // Web Push: subscriptions e preferências de notificação
  // ===========================================================================
  // Portado do impgeo (database-pg.js seção "Web Push"), CONSOLIDADO num
  // único scope já que o Alya é single-origin (não há tc-users separados).
  //
  // Os helpers de preferências têm fallback de defaults inline (constante
  // NOTIFICATION_DEFAULTS abaixo). Idéia: nem todo user precisa ter linha pra
  // cada (type, channel) — só quando o user toca o toggle a linha aparece.
  // Mantém a tabela enxuta e permite mudar defaults sem migration.
  //
  // Tipos especiais com prefixo '_meta:' guardam toggles que não correspondem
  // a um evento (ex: '_meta:foreground' = "mostrar push OS-level com o app
  // aberto").

  static NOTIFICATION_DEFAULTS = Object.freeze({
    transaction_confirm_needed: { push: true,  email: false },
    '_meta:foreground':         { push: false, email: false },
  });

  // ── push_subscriptions ─────────────────────────────────────────────────────

  // Insere uma subscription nova ou atualiza last_seen_at se o endpoint já
  // existir (mesmo dispositivo re-subscribendo, ou outro user na mesma máquina
  // — neste caso o user_id também é atualizado, decisão consciente: a
  // subscription "pertence" ao último usuário logado naquela combinação
  // browser+origin).
  async upsertPushSubscription(userId, sub, userAgent) {
    const id = this.generateId();
    const r = await this.pool.query(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (endpoint) DO UPDATE
         SET user_id      = EXCLUDED.user_id,
             p256dh       = EXCLUDED.p256dh,
             auth         = EXCLUDED.auth,
             user_agent   = EXCLUDED.user_agent,
             failed_count = 0,
             last_seen_at = NOW()
       RETURNING *`,
      [id, userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth, userAgent || null]
    );
    return toCamelCase(r.rows[0]);
  }

  async listActivePushSubscriptions(userId) {
    const r = await this.pool.query(
      `SELECT * FROM push_subscriptions WHERE user_id = $1 ORDER BY last_seen_at DESC`,
      [userId]
    );
    return toCamelCase(r.rows);
  }

  async deletePushSubscriptionByEndpoint(userId, endpoint) {
    const r = await this.pool.query(
      `DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2 RETURNING id`,
      [userId, endpoint]
    );
    return r.rows.length > 0;
  }

  // Remove uma subscription que o push service marcou como inválida (410/404).
  // Não exige user_id porque o endpoint é único globalmente.
  async pruneInvalidPushSubscription(endpoint) {
    await this.pool.query(
      `DELETE FROM push_subscriptions WHERE endpoint = $1`,
      [endpoint]
    );
  }

  // Marca uma falha transitória; quando failed_count atinge MAX, remove.
  // Devolve { removed: boolean, failedCount: number } pra observabilidade.
  async markPushSubscriptionFailed(endpoint, maxFails = 5) {
    const r = await this.pool.query(
      `UPDATE push_subscriptions
          SET failed_count = failed_count + 1
        WHERE endpoint = $1
        RETURNING failed_count`,
      [endpoint]
    );
    if (r.rows.length === 0) return { removed: false, failedCount: 0 };
    const count = r.rows[0].failed_count;
    if (count >= maxFails) {
      await this.pruneInvalidPushSubscription(endpoint);
      return { removed: true, failedCount: count };
    }
    return { removed: false, failedCount: count };
  }

  async touchPushSubscriptionLastSeen(endpoint) {
    await this.pool.query(
      `UPDATE push_subscriptions
          SET last_seen_at = NOW(), failed_count = 0
        WHERE endpoint = $1`,
      [endpoint]
    );
  }

  // ── notification_preferences ──────────────────────────────────────────────

  // Devolve TRUE/FALSE (nunca null). Usa default do mapa se não houver linha.
  // Default-default = FALSE pra tipos desconhecidos (segurança: não envia push
  // sem opt-in explícito).
  async getNotificationPreference(userId, notificationType, channel) {
    const r = await this.pool.query(
      `SELECT enabled FROM notification_preferences
        WHERE user_id = $1 AND notification_type = $2 AND channel = $3`,
      [userId, notificationType, channel]
    );
    if (r.rows.length > 0) return r.rows[0].enabled;
    const forType = Database.NOTIFICATION_DEFAULTS[notificationType];
    if (forType && typeof forType[channel] === 'boolean') return forType[channel];
    return false;
  }

  async setNotificationPreference(userId, notificationType, channel, enabled) {
    const id = this.generateId();
    const r = await this.pool.query(
      `INSERT INTO notification_preferences (id, user_id, notification_type, channel, enabled)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, notification_type, channel) DO UPDATE
         SET enabled    = EXCLUDED.enabled,
             updated_at = NOW()
       RETURNING *`,
      [id, userId, notificationType, channel, !!enabled]
    );
    return toCamelCase(r.rows[0]);
  }

  // Devolve o grid completo de preferências do user, com defaults aplicados
  // para qualquer combinação (type, channel) que não tenha linha explícita.
  // Útil pra UI desenhar a tabela toda.
  async listNotificationPreferences(userId) {
    const r = await this.pool.query(
      `SELECT notification_type, channel, enabled, updated_at
         FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );
    const stored = new Map();
    for (const row of r.rows) {
      stored.set(`${row.notification_type}:${row.channel}`, row);
    }
    const grid = [];
    const types = new Set([
      ...Object.keys(Database.NOTIFICATION_DEFAULTS),
      ...r.rows.map(row => row.notification_type),
    ]);
    for (const type of types) {
      for (const channel of ['push', 'email']) {
        const key = `${type}:${channel}`;
        const row = stored.get(key);
        const def = (Database.NOTIFICATION_DEFAULTS[type]
                     && typeof Database.NOTIFICATION_DEFAULTS[type][channel] === 'boolean')
          ? Database.NOTIFICATION_DEFAULTS[type][channel]
          : false;
        grid.push({
          notificationType: type,
          channel,
          enabled: row ? row.enabled : def,
          isDefault: !row,
          updatedAt: row ? row.updated_at : null,
        });
      }
    }
    return grid;
  }

  // ── Permissões granulares para regras ───────────────────────────────────────

  /**
   * Retorna { canCreate, canEdit, canDelete, isAdminBypass }.
   * admin/superadmin sempre TRUE (bypass).
   */
  async getUserRulePermissions(userId, role) {
    if (role === 'admin' || role === 'superadmin') {
      return { canCreate: true, canEdit: true, canDelete: true, isAdminBypass: true };
    }
    const r = await this.pool.query(
      'SELECT can_create, can_edit, can_delete FROM user_rule_permissions WHERE user_id = $1',
      [userId]
    );
    if (r.rows.length === 0) {
      return { canCreate: false, canEdit: false, canDelete: false, isAdminBypass: false };
    }
    return { ...toCamelCase(r.rows[0]), isAdminBypass: false };
  }

  async setUserRulePermissions(userId, perms, grantedBy) {
    const r = await this.pool.query(
      `INSERT INTO user_rule_permissions
         (user_id, can_create, can_edit, can_delete, granted_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE
         SET can_create = EXCLUDED.can_create,
             can_edit   = EXCLUDED.can_edit,
             can_delete = EXCLUDED.can_delete,
             granted_by = EXCLUDED.granted_by,
             updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, !!perms.canCreate, !!perms.canEdit, !!perms.canDelete, grantedBy || null]
    );
    return toCamelCase(r.rows[0]);
  }

  async deleteUserRulePermissions(userId) {
    await this.pool.query('DELETE FROM user_rule_permissions WHERE user_id = $1', [userId]);
  }

  async getAllProducts() {
    try {
      const r = await this.pool.query('SELECT * FROM products ORDER BY created_at DESC');
      return toCamelCase(r.rows);
    } catch (e) {
      console.error('Erro ao ler produtos:', e);
      return [];
    }
  }

  async saveProduct(product) {
    const id = this.generateId();
    const now = new Date().toISOString();
    const r = await this.pool.query(
      `INSERT INTO products (id, name, category, price, cost, stock, sold, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [id, product.name || '', product.category || null, parseFloat(product.price) || 0, parseFloat(product.cost) || 0, parseInt(product.stock, 10) || 0, parseInt(product.sold, 10) || 0, now, now]
    );
    return toCamelCase(r.rows[0]);
  }

  async updateProduct(id, data) {
    const r = await this.pool.query(
      `UPDATE products SET
        name = COALESCE($2, name),
        category = COALESCE($3, category),
        price = COALESCE($4, price),
        cost = COALESCE($5, cost),
        stock = COALESCE($6, stock),
        sold = COALESCE($7, sold),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id, data.name, data.category, data.price != null ? parseFloat(data.price) : null, data.cost != null ? parseFloat(data.cost) : null, data.stock != null ? parseInt(data.stock, 10) : null, data.sold != null ? parseInt(data.sold, 10) : null]
    );
    if (r.rows.length === 0) throw new Error('Produto não encontrado');
    return toCamelCase(r.rows[0]);
  }

  async getProductById(id) {
    const r = await this.pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (r.rows.length === 0) return null;
    return toCamelCase(r.rows[0]);
  }

  async deleteProduct(id) {
    const r = await this.pool.query('DELETE FROM products WHERE id = $1', [id]);
    return r.rowCount > 0;
  }

  async deleteMultipleProducts(ids) {
    const r = await this.pool.query('DELETE FROM products WHERE id = ANY($1)', [ids]);
    return r.rowCount > 0;
  }

  async getAllClients() {
    try {
      const r = await this.pool.query('SELECT * FROM clients ORDER BY created_at DESC');
      return toCamelCase(r.rows);
    } catch (e) {
      console.error('Erro ao ler clientes:', e);
      return [];
    }
  }

  async saveClient(client) {
    const id = this.generateId();
    const now = new Date().toISOString();
    const addr = typeof client.address === 'object' ? JSON.stringify(client.address) : (client.address || null);
    const r = await this.pool.query(
      `INSERT INTO clients (id, name, email, phone, address, cpf, cnpj, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [id, client.name || '', client.email || null, client.phone || null, addr, client.cpf || null, client.cnpj || null, now, now]
    );
    return toCamelCase(r.rows[0]);
  }

  async updateClient(id, data) {
    const addr = data.address !== undefined ? (typeof data.address === 'object' ? JSON.stringify(data.address) : data.address) : null;
    const r = await this.pool.query(
      `UPDATE clients SET
        name = COALESCE($2, name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        address = COALESCE($5, address),
        cpf = COALESCE($6, cpf),
        cnpj = COALESCE($7, cnpj),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id, data.name, data.email, data.phone, addr, data.cpf, data.cnpj]
    );
    if (r.rows.length === 0) throw new Error('Cliente não encontrado');
    return toCamelCase(r.rows[0]);
  }

  async getClientById(id) {
    const r = await this.pool.query('SELECT * FROM clients WHERE id = $1', [id]);
    if (r.rows.length === 0) return null;
    return toCamelCase(r.rows[0]);
  }

  async deleteClient(id) {
    const r = await this.pool.query('DELETE FROM clients WHERE id = $1', [id]);
    return r.rowCount > 0;
  }

  async deleteMultipleClients(ids) {
    const r = await this.pool.query('DELETE FROM clients WHERE id = ANY($1)', [ids]);
    return r.rowCount > 0;
  }

  // Fase 2.4 — enriquecimento granular do user.
  //
  // Acopla um campo `modulesAccess` no shape { [moduleKey]: 'view' | 'edit' }
  // lido de user_module_permissions. Source of truth única pra autorização
  // desde a Fase 2.4 (frontend) / 2.4b (backend); a coluna legada
  // users.modules foi dropada na Fase 2.10 (migration 023).
  //
  // Para superadmin: forçamos edit em TODOS os módulos ativos do catálogo,
  // independente de o que estiver gravado em user_module_permissions
  // (defesa contra desincronizações temporárias entre roles/módulos novos).
  async _enrichUserPermissions(user) {
    if (!user) return user;
    try {
      const map = await permissionsHelpers.loadUserPermissions(this.pool, user.id);
      if (user.role === 'superadmin') {
        const modsRes = await this.pool.query(
          `SELECT key FROM modules WHERE is_active = TRUE`
        );
        const superMap = {};
        for (const row of modsRes.rows) superMap[row.key] = 'edit';
        // Mesclar: explícitos do banco têm precedência caso alguém tenha
        // explicitamente "view" pra um superadmin (não deveria acontecer,
        // mas respeitamos), o resto vira edit.
        user.modulesAccess = { ...superMap, ...map };
      } else {
        user.modulesAccess = map;
      }
    } catch (e) {
      console.error('Erro ao enriquecer permissões do user:', e);
      user.modulesAccess = {};
    }
    return user;
  }

  async getAllUsers() {
    try {
      const r = await this.pool.query('SELECT * FROM users ORDER BY created_at DESC');
      const users = r.rows.map(parseUser);
      // Enrich em paralelo — uma query por user. Pra catálogos pequenos
      // (dezenas de users) isso é aceitável. Se virar gargalo, migrar pra
      // 1 query JOIN com agregação por user_id.
      await Promise.all(users.map(u => this._enrichUserPermissions(u)));
      return users;
    } catch (e) {
      console.error('Erro ao ler usuários:', e);
      return [];
    }
  }

  async getUserByUsername(username) {
    try {
      const r = await this.pool.query('SELECT * FROM users WHERE username = $1', [username]);
      if (!r.rows.length) return null;
      const user = parseUser(r.rows[0]);
      return this._enrichUserPermissions(user);
    } catch (e) {
      console.error('Erro ao buscar usuário:', e);
      return null;
    }
  }

  async getUserById(id) {
    try {
      const r = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (!r.rows.length) return null;
      const user = parseUser(r.rows[0]);
      return this._enrichUserPermissions(user);
    } catch (e) {
      console.error('Erro ao buscar usuário:', e);
      return null;
    }
  }

  async saveUser(userData) {
    const id = this.generateId();
    const now = new Date().toISOString();
    const addr = userData.address ? JSON.stringify(userData.address) : null;
    const role = userData.role || 'user';
    // Fase 2.10 — coluna users.modules dropada (migration 023). INSERT só
    // cria a row de user; permissões granulares são populadas logo abaixo
    // via setUserPermissions / applyRoleDefaultsToUser.
    await this.pool.query(
      `INSERT INTO users (id, username, password, first_name, last_name, email, phone, photo_url, cpf, birth_date, gender, position, address, role, is_active, last_login, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [id, userData.username, userData.password || '', userData.firstName || null, userData.lastName || null, userData.email || null, userData.phone || null, userData.photoUrl || null, userData.cpf || null, userData.birthDate || null, userData.gender || null, userData.position || null, addr, role, userData.isActive !== false, userData.lastLogin || null, now, now]
    );

    // Aplicação das perms granulares (a coluna users.modules foi dropada
    // na Fase 2.10; aqui o `userData.modules` é só payload de API legado
    // — não corresponde mais a uma coluna do schema):
    //   - se `modulesAccess` foi fornecido explicitamente → usa esse mapa
    //   - se veio `modules` array (payload legado de API) → traduz pra
    //     todos com 'edit' (backward compat com callers antigos da API)
    //   - caso contrário → aplica os defaults da role do banco
    //     (ou do FALLBACK_DEFAULTS hardcoded se a tabela estiver vazia)
    if (userData.modulesAccess && typeof userData.modulesAccess === 'object') {
      await permissionsHelpers.setUserPermissions(this.pool, id, userData.modulesAccess);
    } else if (Array.isArray(userData.modules) && userData.modules.length > 0) {
      const legacyMap = {};
      for (const k of userData.modules) legacyMap[k] = 'edit';
      await permissionsHelpers.setUserPermissions(this.pool, id, legacyMap);
    } else {
      await permissionsHelpers.applyRoleDefaultsToUser(this.pool, id, role);
    }

    return this.getUserById(id);
  }

  // --- Funções de Recuperação de Senha ---

  async criarTokenRecuperacao(userId, expiresInMinutes = 60) {
    try {
      // Limpar tokens expirados antes de criar um novo
      await this.pool.query('DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP OR used = TRUE');

      const token = crypto.randomUUID();
      const r = await this.pool.query(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at) 
         VALUES ($1, $2, CURRENT_TIMESTAMP + ($3 || ' minutes')::INTERVAL) RETURNING *`,
        [userId, token, expiresInMinutes]
      );
      return r.rows[0];
    } catch (error) {
      console.error('Erro ao criar token de recuperação:', error);
      throw new Error('Não foi possível gerar o token de recuperação');
    }
  }

  async validarTokenRecuperacao(token) {
    try {
      const r = await this.pool.query(
        `SELECT t.*, u.username, u.email 
         FROM password_reset_tokens t
         JOIN users u ON t.user_id = u.id
         WHERE t.token = $1 AND t.used = FALSE AND t.expires_at > CURRENT_TIMESTAMP`,
        [token]
      );

      if (r.rows.length === 0) {
        return null; // Token inválido, usado ou expirado
      }

      return r.rows[0];
    } catch (error) {
      console.error('Erro ao validar token:', error);
      throw new Error('Não foi possível validar o token');
    }
  }

  async resetarSenhaComToken(token, newHash) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Validar token novamente (com FOR UPDATE para evitar race conditions, dependendo do design, mas o update direto com check já resolve)
      const r = await client.query(
        `SELECT user_id FROM password_reset_tokens 
         WHERE token = $1 AND used = FALSE AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`,
        [token]
      );

      if (r.rows.length === 0) {
        throw new Error('Token inválido ou expirado');
      }

      const userId = r.rows[0].user_id;

      // 2. Atualizar senha do usuário e remover obrigatoriedade de first_login, se houver
      await client.query(
        `UPDATE users SET password = $1, last_login = COALESCE(last_login, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [newHash, userId]
      );

      // 3. Marcar token como usado (ou deletar)
      await client.query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);

      await client.query('COMMIT');

      const userRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      return parseUser(userRes.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro ao resetar senha com token:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateUser(id, data) {
    // Fase 2.4 — perms são tratadas APÓS o UPDATE da row de users, pra
    // garantir que role nova já esteja persistida quando aplicarmos
    // defaults. Tipos de mudança de permissão suportados (precedência
    // de cima pra baixo):
    //   1. `modulesAccess` (object) → substitui o conjunto inteiro
    //   2. `modules` (TEXT[] legado) → traduz pra mapa com 'edit'
    //      (backward compat com callers antigos)
    //   3. Mudança de `role` com `applyRoleDefaults: true` → reaplica
    //      os defaults da role nova (espelha "Aplicar padrões da role")
    //   4. Mudança de `role` sem essa flag → mantém perms atuais
    //      intactas (opção A do fluxo A/B da Fase 2.9)
    const fields = [];
    const vals = [];
    let i = 1;
    const map = {
      firstName: 'first_name', lastName: 'last_name', email: 'email', phone: 'phone', photoUrl: 'photo_url',
      cpf: 'cpf', birthDate: 'birth_date', gender: 'gender', position: 'position', address: 'address',
      role: 'role', isActive: 'is_active', password: 'password', lastLogin: 'last_login',
    };
    for (const [camel, col] of Object.entries(map)) {
      if (data[camel] === undefined) continue;
      fields.push(`${col} = $${i++}`);
      vals.push(col === 'address' && typeof data[camel] === 'object' ? JSON.stringify(data[camel]) : data[camel]);
    }

    // `modules` TEXT[] legado: aceita mas só pra registrar a precedência
    // 2 abaixo — não persiste direto, vai pelo dual-write do helper.
    let legacyModulesArr = null;
    if (data.modules !== undefined) legacyModulesArr = data.modules;

    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      vals.push(id);
      const r = await this.pool.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
        vals
      );
      if (r.rows.length === 0) throw new Error('Usuário não encontrado');
    } else if (data.modulesAccess === undefined && legacyModulesArr === null) {
      // Nada a fazer
      return this.getUserById(id);
    }

    // Tratamento das perms (precedência descrita no topo)
    if (data.modulesAccess && typeof data.modulesAccess === 'object') {
      await permissionsHelpers.setUserPermissions(this.pool, id, data.modulesAccess);
    } else if (Array.isArray(legacyModulesArr)) {
      const legacyMap = {};
      for (const k of legacyModulesArr) legacyMap[k] = 'edit';
      await permissionsHelpers.setUserPermissions(this.pool, id, legacyMap);
    } else if (data.role !== undefined && data.applyRoleDefaults === true) {
      await permissionsHelpers.applyRoleDefaultsToUser(this.pool, id, data.role);
    }

    return this.getUserById(id);
  }

  async deleteUser(id) {
    const r = await this.pool.query('DELETE FROM users WHERE id = $1', [id]);
    if (r.rowCount === 0) throw new Error('Usuário não encontrado');
  }

  // --- Funções de Convite de Usuário (Segurança) ---

  async createUserInvite(userId, tempPasswordHash, expiresInDays = 7, createdBy = null) {
    try {
      const inviteToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const r = await this.pool.query(
        `INSERT INTO user_invites (id, user_id, invite_token, temp_password_hash, expires_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [this.generateId(), userId, inviteToken, tempPasswordHash, expiresAt.toISOString(), createdBy]
      );

      return {
        id: r.rows[0].id,
        userId: r.rows[0].user_id,
        inviteToken: r.rows[0].invite_token,
        expiresAt: r.rows[0].expires_at
      };
    } catch (error) {
      console.error('Erro ao criar convite de usuário:', error);
      throw new Error('Não foi possível gerar o convite de usuário');
    }
  }

  async validateUserInvite(inviteToken) {
    try {
      const r = await this.pool.query(
        `SELECT i.*, u.username, u.email, u.id as user_id
         FROM user_invites i
         JOIN users u ON i.user_id = u.id
         WHERE i.invite_token = $1 AND i.used = FALSE AND i.expires_at > CURRENT_TIMESTAMP`,
        [inviteToken]
      );

      if (r.rows.length === 0) {
        return null; // Convite inválido, usado ou expirado
      }

      return {
        id: r.rows[0].id,
        userId: r.rows[0].user_id,
        username: r.rows[0].username,
        email: r.rows[0].email,
        tempPasswordHash: r.rows[0].temp_password_hash,
        expiresAt: r.rows[0].expires_at
      };
    } catch (error) {
      console.error('Erro ao validar convite:', error);
      throw new Error('Não foi possível validar o convite');
    }
  }

  async markInviteAsUsed(inviteToken) {
    try {
      const r = await this.pool.query(
        `UPDATE user_invites SET used = TRUE, used_at = CURRENT_TIMESTAMP
         WHERE invite_token = $1 RETURNING *`,
        [inviteToken]
      );

      return r.rows.length > 0;
    } catch (error) {
      console.error('Erro ao marcar convite como usado:', error);
      throw new Error('Não foi possível atualizar o convite');
    }
  }

  async cleanupExpiredInvites() {
    try {
      const r = await this.pool.query(
        `DELETE FROM user_invites WHERE expires_at < CURRENT_TIMESTAMP AND used = FALSE`
      );
      return r.rowCount;
    } catch (error) {
      console.error('Erro ao limpar convites expirados:', error);
      return 0;
    }
  }

  async getAllActivityLogs() {
    try {
      const r = await this.pool.query('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 10000');
      return r.rows.map(parseLog);
    } catch (e) {
      console.error('Erro ao ler logs:', e);
      return [];
    }
  }

  async getActivityLogs(filters = {}) {
    const cond = [];
    const vals = [];
    let i = 1;
    if (filters.userId) { cond.push(`user_id = $${i++}`); vals.push(filters.userId); }
    if (filters.module) { cond.push(`module = $${i++}`); vals.push(filters.module); }
    if (filters.action) { cond.push(`action = $${i++}`); vals.push(filters.action); }
    if (filters.startDate) { cond.push(`timestamp >= $${i++}`); vals.push(filters.startDate); }
    if (filters.endDate) { cond.push(`timestamp <= $${i++}`); vals.push(filters.endDate); }
    let sql = 'SELECT * FROM activity_logs';
    if (cond.length) sql += ' WHERE ' + cond.join(' AND ');
    sql += ' ORDER BY timestamp DESC';
    if (filters.page && filters.limit) {
      const limit = parseInt(filters.limit, 10) || 100;
      const offset = ((parseInt(filters.page, 10) || 1) - 1) * limit;
      sql += ` LIMIT $${i++} OFFSET $${i++}`;
      vals.push(limit, offset);
    } else if (filters.limit) {
      sql += ` LIMIT $${i++}`;
      vals.push(parseInt(filters.limit, 10) || 100);
    } else {
      sql += ' LIMIT 10000';
    }
    const r = await this.pool.query(sql, vals);
    return r.rows.map(parseLog);
  }

  async saveActivityLog(log) {
    const id = log.id || this.generateId();
    await this.pool.query(
      `INSERT INTO activity_logs (id, user_id, username, action, module, entity_type, entity_id, details, timestamp, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, log.userId || null, log.username || null, log.action || 'unknown', log.module || 'general', log.entityType || null, log.entityId || null, log.details ? JSON.stringify(log.details) : null, log.timestamp || new Date().toISOString(), log.ipAddress || null]
    );
    await this.pool.query(`
      DELETE FROM activity_logs WHERE id NOT IN (
        SELECT id FROM activity_logs ORDER BY timestamp DESC LIMIT 10000
      )
    `);
    const r = await this.pool.query('SELECT * FROM activity_logs WHERE id = $1', [id]);
    return r.rows.length ? parseLog(r.rows[0]) : { ...log, id };
  }

  async getAllSystemModules() {
    try {
      await this.pool.query('ALTER TABLE modules ADD COLUMN IF NOT EXISTS sort_order INTEGER');
      const r = await this.pool.query('SELECT * FROM modules ORDER BY sort_order ASC NULLS LAST, created_at ASC');
      return toCamelCase(r.rows);
    } catch (e) {
      console.error('Erro ao ler módulos:', e);
      return [];
    }
  }

  // ─── Fase 3.0 — Subsistemas e módulos respeitando subsystem_key ────────
  //
  // listSubsystems / getSubsystemByKey: read-only sobre a tabela subsystems
  // (introduzida na migration 018). Usados pra popular dropdown da UI
  // de "mover módulo entre subsistemas" e pra validar subsystemKey nos
  // CRUD de módulos.
  async listSubsystems() {
    if (!this.pool) return [];
    try {
      const r = await this.pool.query(
        'SELECT * FROM subsystems WHERE is_active = TRUE ORDER BY sort_order, subsystem_key'
      );
      return r.rows.map(toCamelCase);
    } catch (e) {
      console.error('Erro ao listar subsistemas:', e);
      return [];
    }
  }

  async getSubsystemByKey(key) {
    if (!this.pool) return null;
    try {
      const r = await this.pool.query('SELECT * FROM subsystems WHERE subsystem_key = $1', [key]);
      return r.rows.length ? toCamelCase(r.rows[0]) : null;
    } catch (e) {
      console.error('Erro ao buscar subsistema:', e);
      return null;
    }
  }

  // Fase 3.0 — reorder agora opera DENTRO de um subsistema. Valida que
  // todas as keys pertencem ao subsystemKey antes do UPDATE (proteção
  // contra inputs maliciosos ou stale). Atômico via transação.
  //
  // Assinatura nova: reorderModules(subsystemKey, orderedIds).
  // Contrato antigo (orderedIds globais sem subsystem) deixou de existir
  // — o endpoint aborta com 400 quando chama no formato antigo.
  async reorderModules(subsystemKey, orderedIds) {
    if (!subsystemKey || !Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new Error('reorderModules: subsystemKey e orderedIds (array não vazio) são obrigatórios');
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Valida que todos os IDs pertencem ao subsistema
      const r = await client.query(
        'SELECT id FROM modules WHERE id = ANY($1) AND subsystem_key = $2',
        [orderedIds, subsystemKey]
      );
      const validIds = new Set(r.rows.map((row) => row.id));
      const orphans = orderedIds.filter((id) => !validIds.has(id));
      if (orphans.length > 0) {
        throw new Error(
          `reorderModules: ${orphans.length} módulo(s) não pertencem ao subsistema "${subsystemKey}": ${orphans.join(', ')}`
        );
      }
      const now = new Date().toISOString();
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query(
          'UPDATE modules SET sort_order = $1, updated_at = $2 WHERE id = $3',
          [i, now, orderedIds[i]]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch {}
      throw e;
    } finally {
      client.release();
    }
  }

  async getSystemModuleByKey(key) {
    if (!this.pool) return null;
    try {
      const r = await this.pool.query('SELECT * FROM modules WHERE key = $1', [key]);
      return r.rows.length ? toCamelCase(r.rows[0]) : null;
    } catch (e) {
      console.error('Erro ao buscar módulo:', e);
      return null;
    }
  }

  async getSystemModuleById(id) {
    try {
      const r = await this.pool.query('SELECT * FROM modules WHERE id = $1', [id]);
      return r.rows.length ? toCamelCase(r.rows[0]) : null;
    } catch (e) {
      console.error('Erro ao buscar módulo:', e);
      return null;
    }
  }

  async saveSystemModule(data) {
    if (!this.pool) return null;
    if (data.key) {
      const ex = await this.getSystemModuleByKey(data.key);
      if (ex && ex.id !== data.id) throw new Error('Já existe um módulo com esta key');
    }
    // Fase 3.0 — subsystemKey é obrigatório (todo módulo pertence a um
    // subsistema; ver migration 018). Valida contra a tabela subsystems.
    if (!data.subsystemKey) {
      throw new Error('saveSystemModule: subsystemKey é obrigatório');
    }
    const sub = await this.getSubsystemByKey(data.subsystemKey);
    if (!sub) {
      throw new Error(`saveSystemModule: subsystema "${data.subsystemKey}" não existe`);
    }
    const id = this.generateId();
    const now = new Date().toISOString();
    // sort_order = próximo dentro do subsistema (não global) — schema
    // mudou na 018; antes era global.
    const maxR = await this.pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM modules WHERE subsystem_key = $1',
      [data.subsystemKey]
    );
    const nextOrder = maxR.rows[0].next;
    await this.pool.query(
      `INSERT INTO modules (id, name, key, icon, description, route, is_active, is_system, sort_order, subsystem_key, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [id, data.name || '', data.key || '', data.icon || null, data.description || null, data.route || null, data.isActive !== false, data.isSystem || false, nextOrder, data.subsystemKey, now, now]
    );
    return this.getSystemModuleById(id);
  }

  async updateSystemModule(id, data) {
    if (data.key) {
      const cur = await this.getSystemModuleById(id);
      if (cur && data.key !== cur.key) {
        const ex = await this.getSystemModuleByKey(data.key);
        if (ex && ex.id !== id) throw new Error('Já existe um módulo com esta key');
      }
    }
    // Fase 3.0 — quando subsystemKey muda, valida o destino e recalcula
    // sort_order pra ficar no fim do subsistema novo. Tudo em transação
    // pra invariante "todo módulo tem subsystem_key válido e sort_order
    // consistente" não quebrar parcialmente.
    let moveTarget = null;
    if (data.subsystemKey !== undefined) {
      const sub = await this.getSubsystemByKey(data.subsystemKey);
      if (!sub) {
        throw new Error(`updateSystemModule: subsystema "${data.subsystemKey}" não existe`);
      }
      const cur = await this.getSystemModuleById(id);
      if (!cur) throw new Error('Módulo não encontrado');
      if (cur.subsystemKey !== data.subsystemKey) moveTarget = data.subsystemKey;
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const fields = [];
      const vals = [];
      let i = 1;
      for (const [camel, col] of [
        ['name', 'name'],
        ['key', 'key'],
        ['icon', 'icon'],
        ['description', 'description'],
        ['route', 'route'],
        ['isActive', 'is_active'],
        ['subsystemKey', 'subsystem_key'],
      ]) {
        if (data[camel] === undefined) continue;
        fields.push(`${col} = $${i++}`);
        vals.push(data[camel]);
      }
      // Recalcula sort_order só se houve movimentação real entre subsistemas
      if (moveTarget) {
        const maxR = await client.query(
          'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM modules WHERE subsystem_key = $1',
          [moveTarget]
        );
        fields.push(`sort_order = $${i++}`);
        vals.push(maxR.rows[0].next);
      }
      if (fields.length === 0) {
        await client.query('COMMIT');
        return this.getSystemModuleById(id);
      }
      fields.push('updated_at = CURRENT_TIMESTAMP');
      vals.push(id);
      const r = await client.query(`UPDATE modules SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, vals);
      if (r.rows.length === 0) throw new Error('Módulo não encontrado');
      await client.query('COMMIT');
      return toCamelCase(r.rows[0]);
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch {}
      throw e;
    } finally {
      client.release();
    }
  }

  async deleteSystemModule(id) {
    const m = await this.getSystemModuleById(id);
    if (!m) throw new Error('Módulo não encontrado');
    if (m.isSystem) throw new Error('Não é possível deletar módulos do sistema');
    await this.pool.query('DELETE FROM modules WHERE id = $1', [id]);
    return true;
  }

  async getSystemStatistics() {
    try {
      const [users, logs, txCount, prodCount, clientCount, modules] = await Promise.all([
        this.getAllUsers(),
        this.getAllActivityLogs(),
        this.pool.query('SELECT COUNT(*) FROM transactions').then(r => parseInt(r.rows[0].count, 10)),
        this.pool.query('SELECT COUNT(*) FROM products').then(r => parseInt(r.rows[0].count, 10)),
        this.pool.query('SELECT COUNT(*) FROM clients').then(r => parseInt(r.rows[0].count, 10)),
        this.getAllSystemModules(),
      ]);
      const activeUsers = users.filter(u => u.isActive !== false).length;
      const totalLogins = logs.filter(l => l.action === 'login').length;
      const moduleStats = {};
      logs.forEach(log => {
        if (!moduleStats[log.module]) moduleStats[log.module] = { actions: 0, users: new Set() };
        moduleStats[log.module].actions++;
        if (log.userId) moduleStats[log.module].users.add(log.userId);
      });
      Object.keys(moduleStats).forEach(k => { moduleStats[k].users = moduleStats[k].users.size; });
      const last30 = new Date();
      last30.setDate(last30.getDate() - 30);
      const recentLogs = logs.filter(l => new Date(l.timestamp) >= last30);
      const userCount = {};
      logs.forEach(log => {
        if (!log.userId) return;
        if (!userCount[log.userId]) userCount[log.userId] = { count: 0, username: log.username };
        userCount[log.userId].count++;
      });
      const topUsers = Object.values(userCount).sort((a, b) => b.count - a.count).slice(0, 5);
      const modUsage = {};
      logs.forEach(log => { modUsage[log.module] = (modUsage[log.module] || 0) + 1; });
      const topModules = Object.entries(modUsage).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([key, count]) => ({ key, count }));
      const byRole = { admin: 0, user: 0, guest: 0 };
      users.forEach(u => { if (byRole[u.role] !== undefined) byRole[u.role]++; });
      return {
        users: { total: users.length, active: activeUsers, inactive: users.length - activeUsers, byRole },
        activity: { totalLogins, totalActions: logs.length, actionsLast30Days: recentLogs.length, byModule: moduleStats, topUsers, topModules },
        data: { transactions: txCount, products: prodCount, clients: clientCount },
        modules: { total: modules.length, active: modules.filter(m => m.isActive).length, system: modules.filter(m => m.isSystem).length, custom: modules.filter(m => !m.isSystem).length },
        lastUpdated: new Date().toISOString(),
      };
    } catch (e) {
      console.error('Erro ao calcular estatísticas:', e);
      return {};
    }
  }

  async getUserStatistics(userId) {
    const [user, logs] = await Promise.all([this.getUserById(userId), this.getAllActivityLogs()]);
    if (!user) throw new Error('Usuário não encontrado');
    const userLogs = logs.filter(l => l.userId === userId);
    const actionsByModule = {};
    const actionsByType = {};
    userLogs.forEach(log => {
      actionsByModule[log.module] = (actionsByModule[log.module] || 0) + 1;
      actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
    });
    const last30 = new Date();
    last30.setDate(last30.getDate() - 30);
    const recentLogs = userLogs.filter(l => new Date(l.timestamp) >= last30);
    const timeline = {};
    recentLogs.forEach(log => {
      const d = new Date(log.timestamp).toISOString().split('T')[0];
      timeline[d] = (timeline[d] || 0) + 1;
    });
    return {
      userId, username: user.username, role: user.role,
      totalActions: userLogs.length, actionsLast30Days: recentLogs.length,
      actionsByModule, actionsByType,
      lastLogin: user.lastLogin || null, createdAt: user.createdAt,
      timeline: Object.entries(timeline).map(([date, count]) => ({ date, count })),
      recentActivity: recentLogs.slice(0, 20),
    };
  }

  async getModuleStatistics(moduleKey) {
    const [module, logs] = await Promise.all([this.getSystemModuleByKey(moduleKey), this.getAllActivityLogs()]);
    if (!module) throw new Error('Módulo não encontrado');
    const modLogs = logs.filter(l => l.module === moduleKey);
    const actionsByType = {};
    const usersByModule = new Set();
    modLogs.forEach(log => {
      actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
      if (log.userId) usersByModule.add(log.userId);
    });
    const last30 = new Date();
    last30.setDate(last30.getDate() - 30);
    const recentLogs = modLogs.filter(l => new Date(l.timestamp) >= last30);
    const timeline = {};
    recentLogs.forEach(log => {
      const d = new Date(log.timestamp).toISOString().split('T')[0];
      timeline[d] = (timeline[d] || 0) + 1;
    });
    return {
      moduleKey, moduleName: module.name,
      totalActions: modLogs.length, actionsLast30Days: recentLogs.length,
      uniqueUsers: usersByModule.size, actionsByType,
      timeline: Object.entries(timeline).map(([date, count]) => ({ date, count })),
    };
  }

  async getUsageTimeline(startDate, endDate, groupBy = 'day') {
    try {
      let sql = 'SELECT * FROM activity_logs WHERE 1=1';
      const vals = [];
      let i = 1;
      if (startDate) { sql += ` AND timestamp >= $${i++}`; vals.push(startDate); }
      if (endDate) { sql += ` AND timestamp <= $${i++}`; vals.push(endDate); }
      sql += ' ORDER BY timestamp';
      const r = await this.pool.query(sql, vals);
      const logs = r.rows.map(parseLog);
      const timeline = {};
      logs.forEach(log => {
        const date = new Date(log.timestamp);
        let key;
        if (groupBy === 'day') key = date.toISOString().split('T')[0];
        else if (groupBy === 'hour') key = `${date.toISOString().split('T')[0]} ${date.getHours()}:00`;
        else if (groupBy === 'week') {
          const ws = new Date(date);
          ws.setDate(date.getDate() - date.getDay());
          key = ws.toISOString().split('T')[0];
        } else if (groupBy === 'month') key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        else key = date.toISOString().split('T')[0];
        if (!timeline[key]) timeline[key] = { date: key, count: 0, byModule: {}, byAction: {} };
        timeline[key].count++;
        timeline[key].byModule[log.module] = (timeline[key].byModule[log.module] || 0) + 1;
        timeline[key].byAction[log.action] = (timeline[key].byAction[log.action] || 0) + 1;
      });
      return Object.values(timeline).sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (e) {
      console.error('Erro ao calcular timeline:', e);
      return [];
    }
  }

  // ----- Projeção (PostgreSQL) -----
  _monthRowsToArray(rows) {
    const out = new Array(12).fill(0);
    for (const r of (rows || [])) {
      const idx = (r.month_num || r.monthNum) - 1;
      if (idx >= 0 && idx < 12) out[idx] = Number(r.value) || 0;
    }
    return out;
  }

  _nullableMonthRowsToArray(rows) {
    const out = new Array(12).fill(null);
    for (const r of (rows || [])) {
      const idx = (r.month_num || r.monthNum) - 1;
      if (idx >= 0 && idx < 12) out[idx] = r.value !== null && r.value !== undefined ? Number(r.value) : null;
    }
    return out;
  }

  async getProjectionConfig() {
    try {
      const [revRes, mktRes] = await Promise.all([
        this.pool.query('SELECT id, name, "order", is_active FROM projection_revenue_streams ORDER BY "order"'),
        this.pool.query('SELECT id, name, "order", is_active FROM projection_mkt_components ORDER BY "order"'),
      ]);
      const revenueStreams = (revRes.rows || []).map(r => ({
        id: r.id,
        name: r.name || '',
        order: parseInt(r.order, 10) || 1,
        isActive: r.is_active !== false,
      }));
      const mktComponents = (mktRes.rows || []).map(r => ({
        id: r.id,
        name: r.name || '',
        order: parseInt(r.order, 10) || 1,
        isActive: r.is_active !== false,
      }));
      return { revenueStreams, mktComponents, updatedAt: null };
    } catch (e) {
      console.error('Erro ao ler projection config:', e);
      return { revenueStreams: [], mktComponents: [], updatedAt: null };
    }
  }

  async updateProjectionConfig(config) {
    const cfg = config || {};
    const revenueStreams = cfg.revenueStreams || [];
    const mktComponents = cfg.mktComponents || [];
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM projection_revenue_streams');
      await client.query('DELETE FROM projection_mkt_components');
      for (const s of revenueStreams) {
        if (!s?.id) continue;
        await client.query(
          'INSERT INTO projection_revenue_streams (id, name, "order", is_active) VALUES ($1, $2, $3, $4)',
          [s.id, s.name || '', (s.order ?? 1), s.isActive !== false]
        );
      }
      for (const c of mktComponents) {
        if (!c?.id) continue;
        await client.query(
          'INSERT INTO projection_mkt_components (id, name, "order", is_active) VALUES ($1, $2, $3, $4)',
          [c.id, c.name || '', (c.order ?? 1), c.isActive !== false]
        );
      }
      await client.query('COMMIT');
      return { ...cfg, updatedAt: new Date().toISOString() };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getProjectionBase() {
    const cfg = await this.getProjectionConfig();
    try {
      const [growthRes, fixedRes, varRes, invRes, revRes, mktRes,
        ofFixedRes, ofVarRes, ofInvRes, ofMktRes, ofRevRes] = await Promise.all([
          this.pool.query('SELECT minimo, medio, maximo FROM projection_growth WHERE id = 1'),
          this.pool.query('SELECT month_num, value FROM projection_base_fixed_expenses ORDER BY month_num'),
          this.pool.query('SELECT month_num, value FROM projection_base_variable_expenses ORDER BY month_num'),
          this.pool.query('SELECT month_num, value FROM projection_base_investments ORDER BY month_num'),
          this.pool.query('SELECT stream_id, month_num, value FROM projection_base_revenue ORDER BY stream_id, month_num'),
          this.pool.query('SELECT component_id, month_num, value FROM projection_base_mkt ORDER BY component_id, month_num'),
          this.pool.query('SELECT scenario, month_num, value FROM projection_override_fixed ORDER BY scenario, month_num'),
          this.pool.query('SELECT scenario, month_num, value FROM projection_override_variable ORDER BY scenario, month_num'),
          this.pool.query('SELECT scenario, month_num, value FROM projection_override_investments ORDER BY scenario, month_num'),
          this.pool.query('SELECT scenario, month_num, value FROM projection_override_mkt ORDER BY scenario, month_num'),
          this.pool.query('SELECT stream_id, scenario, month_num, value FROM projection_override_revenue ORDER BY stream_id, scenario, month_num'),
        ]);

      const growthRow = growthRes.rows?.[0];
      const growth = {
        minimo: Number(growthRow?.minimo) || 0,
        medio: Number(growthRow?.medio) || 0,
        maximo: Number(growthRow?.maximo) || 0,
      };

      const scenarioToKey = {
        previsto: 'fixedPrevistoManual',
        medio: 'fixedMediaManual',
        maximo: 'fixedMaximoManual',
      };
      const scenarioToVarKey = { previsto: 'variablePrevistoManual', medio: 'variableMedioManual', maximo: 'variableMaximoManual' };
      const scenarioToInvKey = { previsto: 'investimentosPrevistoManual', medio: 'investimentosMedioManual', maximo: 'investimentosMaximoManual' };
      const scenarioToMktKey = { previsto: 'mktPrevistoManual', medio: 'mktMedioManual', maximo: 'mktMaximoManual' };

      const byScenario = (rows, scenarioCol = 'scenario') => {
        const out = { previsto: [], medio: [], maximo: [] };
        for (const r of (rows || [])) {
          const s = r[scenarioCol] || r.scenario;
          if (out[s]) out[s].push(r);
          else if (s) out[s] = [r];
        }
        return out;
      };

      const overrideFixed = byScenario(ofFixedRes.rows);
      const overrideVar = byScenario(ofVarRes.rows);
      const overrideInv = byScenario(ofInvRes.rows);
      const overrideMkt = byScenario(ofMktRes.rows);

      const manualOverrides = {
        fixedPrevistoManual: this._nullableMonthRowsToArray(overrideFixed.previsto),
        fixedMediaManual: this._nullableMonthRowsToArray(overrideFixed.medio),
        fixedMaximoManual: this._nullableMonthRowsToArray(overrideFixed.maximo),
        variablePrevistoManual: this._nullableMonthRowsToArray(overrideVar.previsto),
        variableMedioManual: this._nullableMonthRowsToArray(overrideVar.medio),
        variableMaximoManual: this._nullableMonthRowsToArray(overrideVar.maximo),
        investimentosPrevistoManual: this._nullableMonthRowsToArray(overrideInv.previsto),
        investimentosMedioManual: this._nullableMonthRowsToArray(overrideInv.medio),
        investimentosMaximoManual: this._nullableMonthRowsToArray(overrideInv.maximo),
        mktPrevistoManual: this._nullableMonthRowsToArray(overrideMkt.previsto),
        mktMedioManual: this._nullableMonthRowsToArray(overrideMkt.medio),
        mktMaximoManual: this._nullableMonthRowsToArray(overrideMkt.maximo),
        revenueManual: {},
      };

      const revByStream = {};
      for (const r of (ofRevRes.rows || [])) {
        const sid = r.stream_id;
        if (!revByStream[sid]) revByStream[sid] = { previsto: [], medio: [], maximo: [] };
        const s = r.scenario;
        if (revByStream[sid][s]) revByStream[sid][s].push(r);
        else if (s) revByStream[sid][s] = [r];
      }
      for (const s of (cfg.revenueStreams || [])) {
        if (!s?.id) continue;
        const rm = revByStream[s.id] || {};
        manualOverrides.revenueManual[s.id] = {
          previsto: this._nullableMonthRowsToArray(rm.previsto),
          medio: this._nullableMonthRowsToArray(rm.medio),
          maximo: this._nullableMonthRowsToArray(rm.maximo),
        };
      }

      const revStreamsById = {};
      for (const r of (revRes.rows || [])) {
        const sid = r.stream_id;
        if (!revStreamsById[sid]) revStreamsById[sid] = [];
        revStreamsById[sid].push(r);
      }
      const mktByComp = {};
      for (const r of (mktRes.rows || [])) {
        const cid = r.component_id;
        if (!mktByComp[cid]) mktByComp[cid] = [];
        mktByComp[cid].push(r);
      }

      const prevYear = {
        fixedExpenses: this._monthRowsToArray(fixedRes.rows),
        variableExpenses: this._monthRowsToArray(varRes.rows),
        investments: this._monthRowsToArray(invRes.rows),
        revenueStreams: {},
        mktComponents: {},
      };
      for (const s of (cfg.revenueStreams || [])) {
        if (s?.id) prevYear.revenueStreams[s.id] = this._monthRowsToArray(revStreamsById[s.id]);
      }
      for (const c of (cfg.mktComponents || [])) {
        if (c?.id) prevYear.mktComponents[c.id] = this._monthRowsToArray(mktByComp[c.id]);
      }

      const raw = {
        growth,
        prevYear,
        manualOverrides,
        updatedAt: new Date().toISOString(),
      };
      return this.ensureProjectionBaseShape(raw, cfg);
    } catch (e) {
      console.error('Erro ao ler projection base:', e);
      return this.ensureProjectionBaseShape({}, cfg);
    }
  }

  async updateProjectionBase(nextBase) {
    const cfg = await this.getProjectionConfig();
    const shaped = this.ensureProjectionBaseShape(nextBase, cfg);
    const client = await this.pool.connect();

    const arrToRows = (arr, defaultVal = 0) =>
      (arr || []).slice(0, 12).map((v, i) => ({ month_num: i + 1, value: v !== null && v !== undefined ? Number(v) : defaultVal }));
    const arrToNullableRows = (arr) =>
      (arr || []).slice(0, 12).map((v, i) => ({ month_num: i + 1, value: v !== null && v !== undefined ? Number(v) : null }));

    try {
      await client.query('BEGIN');

      await client.query('UPDATE projection_growth SET minimo = $1, medio = $2, maximo = $3 WHERE id = 1', [
        Number(shaped.growth?.minimo) || 0, Number(shaped.growth?.medio) || 0, Number(shaped.growth?.maximo) || 0,
      ]);

      for (const { month_num, value } of arrToRows(shaped.prevYear?.fixedExpenses)) {
        await client.query('INSERT INTO projection_base_fixed_expenses (month_num, value) VALUES ($1, $2) ON CONFLICT (month_num) DO UPDATE SET value = EXCLUDED.value', [month_num, value]);
      }
      for (const { month_num, value } of arrToRows(shaped.prevYear?.variableExpenses)) {
        await client.query('INSERT INTO projection_base_variable_expenses (month_num, value) VALUES ($1, $2) ON CONFLICT (month_num) DO UPDATE SET value = EXCLUDED.value', [month_num, value]);
      }
      for (const { month_num, value } of arrToRows(shaped.prevYear?.investments)) {
        await client.query('INSERT INTO projection_base_investments (month_num, value) VALUES ($1, $2) ON CONFLICT (month_num) DO UPDATE SET value = EXCLUDED.value', [month_num, value]);
      }

      for (const s of (cfg.revenueStreams || [])) {
        if (!s?.id) continue;
        const arr = shaped.prevYear?.revenueStreams?.[s.id] || [];
        await client.query('DELETE FROM projection_base_revenue WHERE stream_id = $1', [s.id]);
        for (const { month_num, value } of arrToRows(arr)) {
          await client.query('INSERT INTO projection_base_revenue (stream_id, month_num, value) VALUES ($1, $2, $3)', [s.id, month_num, value]);
        }
      }
      for (const c of (cfg.mktComponents || [])) {
        if (!c?.id) continue;
        const arr = shaped.prevYear?.mktComponents?.[c.id] || [];
        await client.query('DELETE FROM projection_base_mkt WHERE component_id = $1', [c.id]);
        for (const { month_num, value } of arrToRows(arr)) {
          await client.query('INSERT INTO projection_base_mkt (component_id, month_num, value) VALUES ($1, $2, $3)', [c.id, month_num, value]);
        }
      }

      const ov = shaped.manualOverrides || {};
      const overrideTables = [
        ['projection_override_fixed', ov.fixedPrevistoManual, ov.fixedMediaManual, ov.fixedMaximoManual],
        ['projection_override_variable', ov.variablePrevistoManual, ov.variableMedioManual, ov.variableMaximoManual],
        ['projection_override_investments', ov.investimentosPrevistoManual, ov.investimentosMedioManual, ov.investimentosMaximoManual],
        ['projection_override_mkt', ov.mktPrevistoManual, ov.mktMedioManual, ov.mktMaximoManual],
      ];
      for (const [table, p, m, x] of overrideTables) {
        await client.query(`DELETE FROM ${table}`);
        for (const scenario of ['previsto', 'medio', 'maximo']) {
          const arr = scenario === 'previsto' ? p : (scenario === 'medio' ? m : x);
          for (const { month_num, value } of arrToNullableRows(arr || [])) {
            await client.query(`INSERT INTO ${table} (scenario, month_num, value) VALUES ($1, $2, $3)`, [scenario, month_num, value]);
          }
        }
      }

      await client.query('DELETE FROM projection_override_revenue');
      const revManual = ov.revenueManual || {};
      for (const s of (cfg.revenueStreams || [])) {
        if (!s?.id) continue;
        const rm = revManual[s.id] || {};
        for (const scenario of ['previsto', 'medio', 'maximo']) {
          const arr = rm[scenario] || [];
          for (const { month_num, value } of arrToNullableRows(arr)) {
            await client.query('INSERT INTO projection_override_revenue (stream_id, scenario, month_num, value) VALUES ($1, $2, $3, $4)', [s.id, scenario, month_num, value]);
          }
        }
      }

      await client.query('COMMIT');
      return { ...shaped, updatedAt: new Date().toISOString() };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getRevenueData() {
    const base = await this.getProjectionBase();
    const streams = {};
    for (const [id, arr] of Object.entries(base.prevYear?.revenueStreams || {})) {
      streams[id] = { previsto: this.normalizeMonthArray(arr, 0) };
    }
    return { streams, updatedAt: base.updatedAt || null };
  }

  async updateRevenueData(revenueData) {
    const cfg = await this.getProjectionConfig();
    const base = await this.getProjectionBase();
    const next = this.ensureProjectionBaseShape(base, cfg);
    const streams = revenueData?.streams || {};
    for (const s of (cfg.revenueStreams || [])) {
      if (!s?.id) continue;
      const arr = streams[s.id]?.previsto;
      next.prevYear.revenueStreams[s.id] = this.normalizeMonthArray(arr, 0);
    }
    const updatedBase = await this.updateProjectionBase(next);
    const mirror = await this.getRevenueData();
    return { ...mirror, updatedAt: updatedBase.updatedAt };
  }

  async getMktComponentsData() {
    const base = await this.getProjectionBase();
    const components = {};
    for (const [id, arr] of Object.entries(base.prevYear?.mktComponents || {})) {
      components[id] = { previsto: this.normalizeMonthArray(arr, 0) };
    }
    return { components, updatedAt: base.updatedAt || null };
  }

  async updateMktComponentsData(mktComponentsData) {
    const cfg = await this.getProjectionConfig();
    const base = await this.getProjectionBase();
    const next = this.ensureProjectionBaseShape(base, cfg);
    const comps = mktComponentsData?.components || {};
    for (const c of (cfg.mktComponents || [])) {
      if (!c?.id) continue;
      const arr = comps[c.id]?.previsto;
      next.prevYear.mktComponents[c.id] = this.normalizeMonthArray(arr, 0);
    }
    const updatedBase = await this.updateProjectionBase(next);
    const mirror = await this.getMktComponentsData();
    return { ...mirror, updatedAt: updatedBase.updatedAt };
  }

  async _getDerivedByScenario(tableName) {
    const r = await this.pool.query(`SELECT scenario, month_num, value FROM ${tableName} ORDER BY scenario, month_num`);
    const byScenario = { previsto: [], medio: [], maximo: [] };
    for (const row of (r.rows || [])) {
      const s = row.scenario;
      if (byScenario[s]) byScenario[s].push(row);
    }
    const previsto = this._monthRowsToArray(byScenario.previsto);
    const medio = this._monthRowsToArray(byScenario.medio);
    const maximo = this._monthRowsToArray(byScenario.maximo);
    return { previsto, medio, maximo };
  }

  async _setDerivedByScenario(tableName, data, mediaKey = 'medio', dbClient = null) {
    const q = dbClient || this.pool;
    const arrToRows = (arr) => (arr || []).slice(0, 12).map((v, i) => ({ month_num: i + 1, value: Number(v) || 0 }));
    const scenarios = [
      ['previsto', data.previsto],
      [mediaKey, data.medio ?? data.media],
      ['maximo', data.maximo],
    ];
    for (const [scenario, arr] of scenarios) {
      if (!arr) continue;
      for (const { month_num, value } of arrToRows(arr)) {
        await q.query(
          `INSERT INTO ${tableName} (scenario, month_num, value) VALUES ($1, $2, $3) ON CONFLICT (scenario, month_num) DO UPDATE SET value = EXCLUDED.value`,
          [scenario, month_num, value]
        );
      }
    }
    return { ...data, updatedAt: new Date().toISOString() };
  }

  async getFixedExpensesData() {
    const d = await this._getDerivedByScenario('projection_fixed_expenses');
    return { previsto: d.previsto, media: d.medio, maximo: d.maximo, updatedAt: null };
  }

  async updateFixedExpensesData(fixedExpensesData) {
    await this._setDerivedByScenario('projection_fixed_expenses', fixedExpensesData, 'medio');
    return await this.getFixedExpensesData();
  }

  async getVariableExpensesData() {
    return this._getDerivedByScenario('projection_variable_expenses');
  }

  async updateVariableExpensesData(variableExpensesData) {
    await this._setDerivedByScenario('projection_variable_expenses', variableExpensesData);
    return await this.getVariableExpensesData();
  }

  async getInvestmentsData() {
    return this._getDerivedByScenario('projection_investments');
  }

  async updateInvestmentsData(investmentsData) {
    await this._setDerivedByScenario('projection_investments', investmentsData);
    return await this.getInvestmentsData();
  }

  async getBudgetData() {
    return this._getDerivedByScenario('projection_budget');
  }

  async updateBudgetData(budgetData) {
    const data = budgetData || {};
    await this._setDerivedByScenario('projection_budget', {
      previsto: data.previsto,
      medio: data.medio,
      maximo: data.maximo,
    });
  }

  async getResultadoData() {
    return this._getDerivedByScenario('projection_resultado');
  }

  async updateResultadoData(resultadoData) {
    const data = resultadoData || {};
    await this._setDerivedByScenario('projection_resultado', {
      previsto: data.previsto,
      medio: data.medio,
      maximo: data.maximo,
    });
  }

  async getProjectionSnapshot() {
    return this.syncProjectionData();
  }

  async updateProjectionSnapshot(snapshot, dbClient = null) {
    const client = dbClient || await this.pool.connect();
    const ownClient = !dbClient;
    try {
      if (ownClient) await client.query('BEGIN');
      if (snapshot.fixedExpenses) await this._setDerivedByScenario('projection_fixed_expenses', { previsto: snapshot.fixedExpenses.previsto, medio: snapshot.fixedExpenses.media, maximo: snapshot.fixedExpenses.maximo }, 'medio', client);
      if (snapshot.variableExpenses) await this._setDerivedByScenario('projection_variable_expenses', snapshot.variableExpenses, 'medio', client);
      if (snapshot.investments) await this._setDerivedByScenario('projection_investments', snapshot.investments, 'medio', client);
      if (snapshot.budget) await this._setDerivedByScenario('projection_budget', snapshot.budget, 'medio', client);
      if (snapshot.resultado) await this._setDerivedByScenario('projection_resultado', snapshot.resultado, 'medio', client);
      if (snapshot.revenue?.streams) {
        for (const [streamId, data] of Object.entries(snapshot.revenue.streams)) {
          for (const scenario of ['previsto', 'medio', 'maximo']) {
            const arr = data[scenario] || data.previsto || [];
            for (let i = 0; i < 12; i++) {
              const month_num = i + 1;
              const value = Number(arr[i]) || 0;
              await client.query(
                'INSERT INTO projection_revenue_values (stream_id, scenario, month_num, value) VALUES ($1, $2, $3, $4) ON CONFLICT (stream_id, scenario, month_num) DO UPDATE SET value = EXCLUDED.value',
                [streamId, scenario, month_num, value]
              );
            }
          }
        }
      }
      if (snapshot.mktComponents?.components) {
        for (const [compId, data] of Object.entries(snapshot.mktComponents.components)) {
          const arr = data.previsto || [];
          for (let i = 0; i < 12; i++) {
            const month_num = i + 1;
            const value = Number(arr[i]) || 0;
            await client.query(
              'INSERT INTO projection_mkt_values (component_id, scenario, month_num, value) VALUES ($1, $2, $3, $4) ON CONFLICT (component_id, scenario, month_num) DO UPDATE SET value = EXCLUDED.value',
              [compId, 'previsto', month_num, value]
            );
          }
        }
      }
      if (ownClient) await client.query('COMMIT');
      return { ...snapshot, updatedAt: new Date().toISOString() };
    } catch (e) {
      if (ownClient) await client.query('ROLLBACK');
      throw e;
    } finally {
      if (ownClient) client.release();
    }
  }

  async syncProjectionData() {
    const cfg = await this.getProjectionConfig();
    const base = await this.getProjectionBase();
    const growth = base.growth || { minimo: 0, medio: 0, maximo: 0 };

    const percentFactor = (pct) => {
      const p = Number(pct);
      return Number.isFinite(p) ? (1 + p / 100) : 1;
    };
    const applyOverride = (autoArr, overrideArr) => {
      const a = this.normalizeMonthArray(autoArr, 0);
      const o = this.normalizeNullableMonthArray(overrideArr);
      return a.map((v, i) => (o[i] !== null && o[i] !== undefined ? Number(o[i]) : v));
    };

    const dezAnterior = Number(base.prevYear?.fixedExpenses?.[11]) || 0;
    const fixedAuto = (() => {
      const out = new Array(12).fill(0);
      const jan = dezAnterior * 1.10;
      out[0] = jan; out[1] = jan; out[2] = jan;
      const abr = jan * 1.10;
      out[3] = abr; out[4] = abr; out[5] = abr;
      const jul = abr * 1.10;
      out[6] = jul; out[7] = jul; out[8] = jul;
      const outVal = jul * 1.10;
      out[9] = outVal; out[10] = outVal; out[11] = outVal;
      return out;
    })();

    const fixedPrevisto = applyOverride(fixedAuto, base.manualOverrides?.fixedPrevistoManual);
    const fixedMedioAuto = fixedPrevisto.map(v => Number(v) * 1.10);
    const fixedMedio = applyOverride(fixedMedioAuto, base.manualOverrides?.fixedMediaManual);
    const fixedMaximoAuto = fixedMedio.map(v => Number(v) * 1.10);
    const fixedMaximo = applyOverride(fixedMaximoAuto, base.manualOverrides?.fixedMaximoManual);

    const prevVariable = this.normalizeMonthArray(base.prevYear?.variableExpenses, 0);
    const prevInvest = this.normalizeMonthArray(base.prevYear?.investments, 0);

    const variablePrevisto = applyOverride(prevVariable.map(v => v * percentFactor(growth.minimo)), base.manualOverrides?.variablePrevistoManual);
    const variableMedio = applyOverride(prevVariable.map(v => v * percentFactor(growth.medio)), base.manualOverrides?.variableMedioManual);
    const variableMaximo = applyOverride(prevVariable.map(v => v * percentFactor(growth.maximo)), base.manualOverrides?.variableMaximoManual);

    const investmentsPrevisto = applyOverride(prevInvest.map(v => v * percentFactor(growth.minimo)), base.manualOverrides?.investimentosPrevistoManual);
    const investmentsMedio = applyOverride(prevInvest.map(v => v * percentFactor(growth.medio)), base.manualOverrides?.investimentosMedioManual);
    const investmentsMaximo = applyOverride(prevInvest.map(v => v * percentFactor(growth.maximo)), base.manualOverrides?.investimentosMaximoManual);

    const activeStreams = (cfg.revenueStreams || []).filter(s => s && s.isActive !== false && s.id);
    const revenueTotalsPrevisto = new Array(12).fill(0);
    const revenueTotalsMedio = new Array(12).fill(0);
    const revenueTotalsMaximo = new Array(12).fill(0);

    for (const s of activeStreams) {
      const prevStream = this.normalizeMonthArray(base.prevYear?.revenueStreams?.[s.id], 0);
      const rm = base.manualOverrides?.revenueManual?.[s.id] || {};
      const prevAuto = prevStream.map(v => v * percentFactor(growth.minimo));
      const medAuto = prevStream.map(v => v * percentFactor(growth.medio));
      const maxAuto = prevStream.map(v => v * percentFactor(growth.maximo));
      const prevEff = applyOverride(prevAuto, rm.previsto);
      const medEff = applyOverride(medAuto, rm.medio);
      const maxEff = applyOverride(maxAuto, rm.maximo);
      for (let i = 0; i < 12; i++) {
        revenueTotalsPrevisto[i] += prevEff[i];
        revenueTotalsMedio[i] += medEff[i];
        revenueTotalsMaximo[i] += maxEff[i];
      }
    }

    const activeMkt = (cfg.mktComponents || []).filter(c => c && c.isActive !== false && c.id);
    const mktTotalsBase = new Array(12).fill(0);
    for (const c of activeMkt) {
      const arr = this.normalizeMonthArray(base.prevYear?.mktComponents?.[c.id], 0);
      for (let i = 0; i < 12; i++) mktTotalsBase[i] += arr[i];
    }
    const mktPrevAuto = this.normalizeMonthArray(mktTotalsBase.map(v => v * percentFactor(growth.minimo)), 0);
    const mktTotalsPrevisto = applyOverride(mktPrevAuto, base.manualOverrides?.mktPrevistoManual);
    const mktTotalsMedio = applyOverride(mktTotalsBase.map(v => v * percentFactor(growth.medio)), base.manualOverrides?.mktMedioManual);
    const mktTotalsMaximo = applyOverride(mktTotalsBase.map(v => v * percentFactor(growth.maximo)), base.manualOverrides?.mktMaximoManual);

    const budgetPrev = new Array(12).fill(0).map((_, i) => fixedPrevisto[i] + variablePrevisto[i] + investmentsPrevisto[i] + mktTotalsPrevisto[i]);
    const budgetMedio = new Array(12).fill(0).map((_, i) => fixedMedio[i] + variableMedio[i] + investmentsMedio[i] + mktTotalsMedio[i]);
    const budgetMax = new Array(12).fill(0).map((_, i) => fixedMaximo[i] + variableMaximo[i] + investmentsMaximo[i] + mktTotalsMaximo[i]);

    const resultadoPrev = new Array(12).fill(0).map((_, i) => revenueTotalsPrevisto[i] - budgetPrev[i]);
    const resultadoMedio = new Array(12).fill(0).map((_, i) => revenueTotalsMedio[i] - budgetMedio[i]);
    const resultadoMax = new Array(12).fill(0).map((_, i) => revenueTotalsMaximo[i] - budgetMax[i]);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await this._setDerivedByScenario('projection_budget', { previsto: budgetPrev, medio: budgetMedio, maximo: budgetMax }, 'medio', client);
      await this._setDerivedByScenario('projection_resultado', { previsto: resultadoPrev, medio: resultadoMedio, maximo: resultadoMax }, 'medio', client);
      await this._setDerivedByScenario('projection_fixed_expenses', { previsto: fixedPrevisto, media: fixedMedio, maximo: fixedMaximo }, 'medio', client);
      await this._setDerivedByScenario('projection_variable_expenses', { previsto: variablePrevisto, medio: variableMedio, maximo: variableMaximo }, 'medio', client);
      await this._setDerivedByScenario('projection_investments', { previsto: investmentsPrevisto, medio: investmentsMedio, maximo: investmentsMaximo }, 'medio', client);

      const mktData = await this.getMktComponentsData();
      const revData = await this.getRevenueData();
      const newSnapshot = {
        growth: { minimo: Number(growth.minimo) || 0, medio: Number(growth.medio) || 0, maximo: Number(growth.maximo) || 0 },
        config: { revenueStreams: cfg.revenueStreams || [], mktComponents: cfg.mktComponents || [] },
        fixedExpenses: { previsto: fixedPrevisto, media: fixedMedio, maximo: fixedMaximo },
        variableExpenses: { previsto: variablePrevisto, medio: variableMedio, maximo: variableMaximo },
        investments: { previsto: investmentsPrevisto, medio: investmentsMedio, maximo: investmentsMaximo },
        mktComponents: mktData,
        mktTotals: { previsto: mktTotalsPrevisto, medio: mktTotalsMedio, maximo: mktTotalsMaximo },
        revenue: revData,
        revenueTotals: { previsto: revenueTotalsPrevisto, medio: revenueTotalsMedio, maximo: revenueTotalsMaximo },
        budget: { previsto: budgetPrev, medio: budgetMedio, maximo: budgetMax },
        resultado: { previsto: resultadoPrev, medio: resultadoMedio, maximo: resultadoMax },
      };
      await this.updateProjectionSnapshot(newSnapshot, client);
      await client.query('COMMIT');
      return { ...newSnapshot, updatedAt: new Date().toISOString() };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async syncProjectionBaseFromTransactions(year) {
    const transactions = await this.getAllTransactions();
    const targetYear = Number(year) || new Date().getFullYear() - 1;
    const cfg = await this.getProjectionConfig();
    const base = await this.getProjectionBase();
    const fixedExpenses = new Array(12).fill(0);
    const variableExpenses = new Array(12).fill(0);
    const investments = new Array(12).fill(0);
    const revenueStreams = {};
    const mktComponents = {};
    for (const s of (cfg.revenueStreams || [])) {
      if (s?.id) revenueStreams[s.id] = new Array(12).fill(0);
    }
    for (const c of (cfg.mktComponents || [])) {
      if (c?.id) mktComponents[c.id] = new Array(12).fill(0);
    }
    const catLower = (c) => (c || '').toLowerCase().trim();
    for (const t of transactions) {
      const { month, year: y } = this.parseTransactionDate(t.date);
      if (month < 0 || month > 11 || y !== targetYear) continue;
      const value = Number(t.value) || 0;
      const type = (t.type || '').toLowerCase();
      const category = catLower(t.category);
      if (type.includes('receita')) {
        const streamId = this.mapTransactionCategoryToRevenueStream(category, cfg);
        if (streamId && revenueStreams[streamId]) revenueStreams[streamId][month] += value;
        else if (Object.keys(revenueStreams).length > 0) {
          const firstId = Object.keys(revenueStreams)[0];
          revenueStreams[firstId][month] += value;
        }
      } else if (type.includes('despesa')) {
        if (category.includes('fixo') || category.includes('fixa')) fixedExpenses[month] += value;
        else if (category.includes('variável') || category.includes('variavel')) variableExpenses[month] += value;
        else if (category.includes('investimento')) investments[month] += value;
        else if (category.includes('mkt') || category.includes('marketing')) {
          const mktId = Object.keys(mktComponents)[0];
          if (mktId) mktComponents[mktId][month] += value;
        } else variableExpenses[month] += value;
      }
    }
    const nextBase = {
      ...base,
      prevYear: {
        ...base.prevYear,
        fixedExpenses,
        variableExpenses,
        investments,
        revenueStreams: { ...(base.prevYear?.revenueStreams || {}), ...revenueStreams },
        mktComponents: { ...(base.prevYear?.mktComponents || {}), ...mktComponents },
      },
    };
    await this.updateProjectionBase(nextBase);
    return this.syncProjectionData();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTEGRAÇÃO NUVEMSHOP
  // ═══════════════════════════════════════════════════════════════════════════

  async getNuvemshopConfig(userId) {
    const r = await this.pool.query(
      'SELECT * FROM nuvemshop_config WHERE user_id = $1 AND is_active = TRUE',
      [userId]
    );
    if (r.rows.length === 0) return null;
    return toCamelCase(r.rows[0]);
  }

  async getNuvemshopConfigByStoreId(storeId) {
    const r = await this.pool.query(
      'SELECT * FROM nuvemshop_config WHERE store_id = $1 AND is_active = TRUE',
      [storeId]
    );
    if (r.rows.length === 0) return null;
    return toCamelCase(r.rows[0]);
  }

  async saveNuvemshopConfig(userId, data) {
    const now = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO nuvemshop_config
        (user_id, store_id, access_token, store_name, store_url, webhook_token, connected_at, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
       ON CONFLICT (user_id) DO UPDATE SET
        store_id = EXCLUDED.store_id,
        access_token = EXCLUDED.access_token,
        store_name = EXCLUDED.store_name,
        store_url = EXCLUDED.store_url,
        webhook_token = EXCLUDED.webhook_token,
        connected_at = EXCLUDED.connected_at,
        is_active = TRUE`,
      [userId, data.storeId, data.accessToken, data.storeName, data.storeUrl, data.webhookToken, now]
    );
  }

  async updateNuvemshopConfig(userId, fields) {
    const sets = [];
    const values = [userId];
    let idx = 2;

    if (fields.webhookIdOrders !== undefined) {
      sets.push(`webhook_id_orders = $${idx++}`);
      values.push(fields.webhookIdOrders);
    }
    if (fields.webhookIdProducts !== undefined) {
      sets.push(`webhook_id_products = $${idx++}`);
      values.push(fields.webhookIdProducts);
    }
    if (fields.webhookIdCustomers !== undefined) {
      sets.push(`webhook_id_customers = $${idx++}`);
      values.push(fields.webhookIdCustomers);
    }
    if (fields.lastSyncOrders !== undefined) {
      sets.push(`last_sync_orders = $${idx++}`);
      values.push(fields.lastSyncOrders);
    }
    if (fields.lastSyncProducts !== undefined) {
      sets.push(`last_sync_products = $${idx++}`);
      values.push(fields.lastSyncProducts);
    }
    if (fields.lastSyncCustomers !== undefined) {
      sets.push(`last_sync_customers = $${idx++}`);
      values.push(fields.lastSyncCustomers);
    }

    if (sets.length === 0) return;

    await this.pool.query(
      `UPDATE nuvemshop_config SET ${sets.join(', ')} WHERE user_id = $1`,
      values
    );
  }

  async deleteNuvemshopConfig(userId) {
    await this.pool.query('DELETE FROM nuvemshop_config WHERE user_id = $1', [userId]);
    await this.pool.query('DELETE FROM nuvemshop_sync_map WHERE user_id = $1', [userId]);
  }

  async getSyncMap(userId, resourceType, nuvemshopId) {
    const r = await this.pool.query(
      'SELECT * FROM nuvemshop_sync_map WHERE user_id = $1 AND resource_type = $2 AND nuvemshop_id = $3',
      [userId, resourceType, nuvemshopId]
    );
    if (r.rows.length === 0) return null;
    return toCamelCase(r.rows[0]);
  }

  async saveSyncMap(userId, resourceType, nuvemshopId, localId) {
    await this.pool.query(
      `INSERT INTO nuvemshop_sync_map (user_id, resource_type, nuvemshop_id, local_id, synced_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, resource_type, nuvemshop_id) DO UPDATE SET
        local_id = EXCLUDED.local_id,
        synced_at = NOW()`,
      [userId, resourceType, nuvemshopId, localId]
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Bling (ERP) — espelha o padrão da Nuvemshop. Tokens chegam JÁ criptografados
  // (a cifragem AES-256-GCM acontece na camada de auth/rota, não aqui).
  // ───────────────────────────────────────────────────────────────────────────

  async getBlingConfig(userId) {
    const r = await this.pool.query(
      'SELECT * FROM bling_config WHERE user_id = $1 AND is_active = TRUE',
      [userId]
    );
    if (r.rows.length === 0) return null;
    return toCamelCase(r.rows[0]);
  }

  async saveBlingConfig(userId, data) {
    const now = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO bling_config
        (user_id, bling_company_id, access_token, refresh_token, token_expires_at,
         refresh_expires_at, scopes, connected_at, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
       ON CONFLICT (user_id) DO UPDATE SET
        bling_company_id   = EXCLUDED.bling_company_id,
        access_token       = EXCLUDED.access_token,
        refresh_token      = EXCLUDED.refresh_token,
        token_expires_at   = EXCLUDED.token_expires_at,
        refresh_expires_at = EXCLUDED.refresh_expires_at,
        scopes             = EXCLUDED.scopes,
        connected_at       = EXCLUDED.connected_at,
        is_active          = TRUE`,
      [userId, data.blingCompanyId || null, data.accessToken, data.refreshToken,
       data.tokenExpiresAt, data.refreshExpiresAt, data.scopes || null, now]
    );
  }

  // Atualiza apenas os tokens (usado no refresh automático ~6h)
  async updateBlingTokens(userId, { accessToken, refreshToken, tokenExpiresAt, refreshExpiresAt, scopes }) {
    await this.pool.query(
      `UPDATE bling_config SET
        access_token       = $2,
        refresh_token      = COALESCE($3, refresh_token),
        token_expires_at   = $4,
        refresh_expires_at = COALESCE($5, refresh_expires_at),
        scopes             = COALESCE($6, scopes)
       WHERE user_id = $1`,
      [userId, accessToken, refreshToken || null, tokenExpiresAt, refreshExpiresAt || null, scopes || null]
    );
  }

  // Atualiza cursores de sincronização (usado pelo poller da Fase A)
  async updateBlingConfig(userId, fields) {
    const map = {
      lastSyncReceivables: 'last_sync_receivables',
      lastSyncPayables: 'last_sync_payables',
      lastSyncOrders: 'last_sync_orders',
    };
    const sets = [];
    const values = [userId];
    let idx = 2;
    for (const [k, col] of Object.entries(map)) {
      if (fields[k] !== undefined) {
        sets.push(`${col} = $${idx++}`);
        values.push(fields[k]);
      }
    }
    if (sets.length === 0) return;
    await this.pool.query(`UPDATE bling_config SET ${sets.join(', ')} WHERE user_id = $1`, values);
  }

  async deleteBlingConfig(userId) {
    await this.pool.query('DELETE FROM bling_config WHERE user_id = $1', [userId]);
    await this.pool.query('DELETE FROM bling_sync_map WHERE user_id = $1', [userId]);
  }

  async getBlingSyncMap(userId, resourceType, blingId) {
    const r = await this.pool.query(
      'SELECT * FROM bling_sync_map WHERE user_id = $1 AND resource_type = $2 AND bling_id = $3',
      [userId, resourceType, blingId]
    );
    if (r.rows.length === 0) return null;
    return toCamelCase(r.rows[0]);
  }

  async saveBlingSyncMap(userId, resourceType, blingId, localId, { sourceRef = null, status = 'synced' } = {}) {
    await this.pool.query(
      `INSERT INTO bling_sync_map (user_id, resource_type, bling_id, local_id, source_ref, status, synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id, resource_type, bling_id) DO UPDATE SET
        local_id   = EXCLUDED.local_id,
        source_ref = EXCLUDED.source_ref,
        status     = EXCLUDED.status,
        synced_at  = NOW()`,
      [userId, resourceType, blingId, localId, sourceRef, status]
    );
  }

  async getNuvemshopDashboardMetrics(userId, startDate, endDate) {
    // Receitas do mês com categoria "Venda Online" (originadas da Nuvemshop)
    const revenueResult = await this.pool.query(
      `SELECT
        COUNT(*) AS order_count,
        COALESCE(SUM(value), 0) AS total_revenue,
        COALESCE(AVG(value), 0) AS avg_ticket
       FROM transactions
       WHERE category = 'Venda Online'
         AND type = 'Receita'
         AND date BETWEEN $1 AND $2`,
      [startDate, endDate]
    );

    // Total de saques Nuvemshop no mês
    const withdrawalResult = await this.pool.query(
      `SELECT COALESCE(SUM(value), 0) AS total_withdrawals
       FROM transactions
       WHERE category = 'Saque Nuvemshop'
         AND type = 'Despesa'
         AND date BETWEEN $1 AND $2`,
      [startDate, endDate]
    );

    // Últimos 10 pedidos importados
    const recentOrders = await this.pool.query(
      `SELECT t.id, t.date, t.description, t.value, m.nuvemshop_id
       FROM transactions t
       JOIN nuvemshop_sync_map m ON m.local_id::text = t.id::text AND m.resource_type = 'order'
       WHERE m.user_id = $1
         AND t.category = 'Venda Online'
       ORDER BY t.created_at DESC
       LIMIT 10`,
      [userId]
    );

    // Total de produtos sincronizados
    const productCount = await this.pool.query(
      `SELECT COUNT(*) AS count FROM nuvemshop_sync_map
       WHERE user_id = $1 AND resource_type = 'product'`,
      [userId]
    );

    const rev = revenueResult.rows[0];
    const wd = withdrawalResult.rows[0];

    return {
      orderCount: parseInt(rev.order_count, 10),
      totalRevenue: parseFloat(rev.total_revenue),
      avgTicket: parseFloat(rev.avg_ticket),
      totalWithdrawals: parseFloat(wd.total_withdrawals),
      pendingBalance: parseFloat(rev.total_revenue) - parseFloat(wd.total_withdrawals),
      recentOrders: toCamelCase(recentOrders.rows),
      syncedProductCount: parseInt(productCount.rows[0].count, 10),
    };
  }

  // ========== ROADMAP ==========

  async getRoadmapItems() {
    try {
      const r = await this.pool.query(
        `SELECT r.*, u.username AS created_by_username
         FROM roadmap_items r
         LEFT JOIN users u ON u.id = r.created_by
         ORDER BY
           CASE r.status
             WHEN 'backlog' THEN 1
             WHEN 'doing' THEN 2
             WHEN 'em_testes' THEN 3
             WHEN 'em_beta' THEN 4
             WHEN 'lancado' THEN 5
             WHEN 'done' THEN 6
             ELSE 7
           END,
           r.ordem ASC,
           r.created_at ASC`
      );
      return r.rows.map(row => toCamelCase(row));
    } catch (e) {
      console.error('Erro ao buscar itens do roadmap:', e);
      return [];
    }
  }

  async getRoadmapItemById(id) {
    const r = await this.pool.query(
      `SELECT r.*, u.username AS created_by_username
       FROM roadmap_items r
       LEFT JOIN users u ON u.id = r.created_by
       WHERE r.id = $1`,
      [id]
    );
    if (r.rows.length === 0) return null;
    return toCamelCase(r.rows[0]);
  }

  async createRoadmapItem({ titulo, descricao, status, prioridade, dataInicio, dependeDe, createdBy }) {
    const id = this.generateId();
    const now = new Date().toISOString();
    const r = await this.pool.query(
      `INSERT INTO roadmap_items
         (id, titulo, descricao, status, prioridade, ordem, data_inicio, depende_de, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5,
         (SELECT COALESCE(MAX(ordem), 0) + 1 FROM roadmap_items WHERE status = $4::varchar),
         $6, $7, $8, $9, $9)
       RETURNING *`,
      [id, titulo, descricao || null, status || 'backlog', prioridade || 'media',
       dataInicio || null, dependeDe || null, createdBy || null, now]
    );
    return toCamelCase(r.rows[0]);
  }

  async updateRoadmapItem(id, dados) {
    const fields = [];
    const values = [id];
    let i = 2;
    const map = {
      titulo: 'titulo',
      descricao: 'descricao',
      status: 'status',
      prioridade: 'prioridade',
      dataInicio: 'data_inicio',
      dependeDe: 'depende_de',
    };
    for (const [key, col] of Object.entries(map)) {
      if (dados[key] !== undefined) {
        fields.push(`${col} = $${i}`);
        values.push(dados[key] !== '' ? dados[key] : null);
        i++;
      }
    }
    if (fields.length === 0) return this.getRoadmapItemById(id);
    fields.push('updated_at = CURRENT_TIMESTAMP');
    const r = await this.pool.query(
      `UPDATE roadmap_items SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );
    if (r.rows.length === 0) throw new Error('Item do roadmap não encontrado');
    return toCamelCase(r.rows[0]);
  }

  async updateRoadmapItemStatus(id, status) {
    const r = await this.pool.query(
      `UPDATE roadmap_items SET
         status = $2,
         ordem = (SELECT COALESCE(MAX(ordem), 0) + 1 FROM roadmap_items WHERE status = $2::varchar AND id != $1),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id, status]
    );
    if (r.rows.length === 0) throw new Error('Item do roadmap não encontrado');
    return toCamelCase(r.rows[0]);
  }

  async updateRoadmapOrdem(itens) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const { id, ordem } of itens) {
        await client.query(
          'UPDATE roadmap_items SET ordem = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [id, ordem]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async deleteRoadmapItem(id) {
    const r = await this.pool.query(
      'DELETE FROM roadmap_items WHERE id = $1 RETURNING *',
      [id]
    );
    if (r.rows.length === 0) throw new Error('Item do roadmap não encontrado');
    return toCamelCase(r.rows[0]);
  }

  async iniciarTempoRoadmap(id) {
    const r = await this.pool.query(
      `UPDATE roadmap_items SET
         em_andamento = TRUE,
         ultimo_inicio = COALESCE(ultimo_inicio, CURRENT_TIMESTAMP),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id]
    );
    if (r.rows.length === 0) throw new Error('Item do roadmap não encontrado');
    return toCamelCase(r.rows[0]);
  }

  async pausarTempoRoadmap(id) {
    const r = await this.pool.query(
      `UPDATE roadmap_items SET
         em_andamento = FALSE,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id]
    );
    if (r.rows.length === 0) throw new Error('Item do roadmap não encontrado');
    return toCamelCase(r.rows[0]);
  }

  async pararTempoRoadmap(id, tempoDecorrido) {
    const r = await this.pool.query(
      `UPDATE roadmap_items SET
         tempo_acumulado = tempo_acumulado + $2,
         em_andamento = FALSE,
         ultimo_inicio = NULL,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id, parseInt(tempoDecorrido, 10) || 0]
    );
    if (r.rows.length === 0) throw new Error('Item do roadmap não encontrado');
    return toCamelCase(r.rows[0]);
  }

  async getRoadmapConfig() {
    const r = await this.pool.query('SELECT * FROM roadmap_config LIMIT 1');
    if (r.rows.length === 0) return { colunaConcluir: 'lancado' };
    return toCamelCase(r.rows[0]);
  }

  async updateRoadmapConfig(dados) {
    const r = await this.pool.query(
      `UPDATE roadmap_config SET coluna_concluir = $1, updated_at = CURRENT_TIMESTAMP RETURNING *`,
      [dados.colunaConcluir || 'lancado']
    );
    if (r.rows.length === 0) throw new Error('Configuração não encontrada');
    return toCamelCase(r.rows[0]);
  }

  async getRoadmapColunas() {
    const r = await this.pool.query('SELECT * FROM roadmap_colunas ORDER BY ordem ASC, created_at ASC');
    return r.rows.map(row => toCamelCase(row));
  }

  async createRoadmapColuna({ label, cor, corFundo }) {
    const id = this.generateId();
    const key = label.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'coluna';
    const existing = await this.pool.query('SELECT COUNT(*) FROM roadmap_colunas WHERE key LIKE $1', [key + '%']);
    const count = parseInt(existing.rows[0].count, 10);
    const finalKey = count > 0 ? `${key}_${count + 1}` : key;
    const maxOrdem = await this.pool.query('SELECT COALESCE(MAX(ordem), -1) + 1 AS next FROM roadmap_colunas');
    const ordem = maxOrdem.rows[0].next;
    const r = await this.pool.query(
      'INSERT INTO roadmap_colunas (id, key, label, cor, cor_fundo, ordem) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id, finalKey, label, cor || '#6b7280', corFundo || '#f3f4f6', ordem]
    );
    return toCamelCase(r.rows[0]);
  }

  async updateRoadmapColunasOrdem(colunas) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const { id, ordem } of colunas) {
        await client.query('UPDATE roadmap_colunas SET ordem = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id, ordem]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async deleteRoadmapColuna(id) {
    const colRes = await this.pool.query('SELECT * FROM roadmap_colunas WHERE id = $1', [id]);
    if (colRes.rows.length === 0) throw new Error('Coluna não encontrada');
    const col = toCamelCase(colRes.rows[0]);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Remover dependências entre itens da coluna e outros
      await client.query(
        `UPDATE roadmap_items SET depende_de = NULL WHERE depende_de IN (SELECT id FROM roadmap_items WHERE status = $1)`,
        [col.key]
      );
      // Deletar todos os itens da coluna
      await client.query('DELETE FROM roadmap_items WHERE status = $1', [col.key]);
      // Deletar a coluna
      await client.query('DELETE FROM roadmap_colunas WHERE id = $1', [id]);
      await client.query('COMMIT');
      return col;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // ========== FAQ ==========

  // Retorna os valores de visibility permitidos para cada role
  _visibilityFor(userRole) {
    if (userRole === 'admin' || userRole === 'superadmin') return ['todos', 'usuarios', 'admins'];
    if (userRole === 'user') return ['todos', 'usuarios'];
    return ['todos']; // guest
  }

  async obterFAQ(userRole = 'guest') {
    try {
      const allowed = this._visibilityFor(userRole);
      const placeholders = allowed.map((_, i) => `$${i + 1}`).join(', ');
      const r = await this.pool.query(
        `SELECT id, pergunta, resposta, ordem, visibility FROM faq
         WHERE ativo = true AND visibility IN (${placeholders})
         ORDER BY ordem ASC, created_at ASC`,
        allowed
      );
      return r.rows.map(row => toCamelCase(row));
    } catch (e) {
      console.error('Erro ao buscar FAQ:', e);
      return [];
    }
  }

  async obterFAQAdmin() {
    try {
      const r = await this.pool.query(
        `SELECT * FROM faq ORDER BY ordem ASC, created_at ASC`
      );
      return r.rows.map(row => toCamelCase(row));
    } catch (e) {
      console.error('Erro ao buscar FAQ (admin):', e);
      return [];
    }
  }

  async criarFAQ({ pergunta, resposta, visibility = 'todos' }) {
    const id = this.generateId();
    const now = new Date().toISOString();
    const validVisibility = ['todos', 'usuarios', 'admins'].includes(visibility) ? visibility : 'todos';
    const ordemRes = await this.pool.query(
      'SELECT COALESCE(MAX(ordem), -1) + 1 AS prox FROM faq'
    );
    const ordem = ordemRes.rows[0].prox;
    const r = await this.pool.query(
      `INSERT INTO faq (id, pergunta, resposta, ativo, ordem, visibility, created_at, updated_at)
       VALUES ($1, $2, $3, true, $4, $5, $6, $6) RETURNING *`,
      [id, pergunta, resposta, ordem, validVisibility, now]
    );
    return toCamelCase(r.rows[0]);
  }

  async atualizarFAQ(id, { pergunta, resposta, ativo, visibility }) {
    const fields = [];
    const values = [id];
    let i = 2;
    if (pergunta !== undefined)   { fields.push(`pergunta = $${i++}`);   values.push(pergunta); }
    if (resposta !== undefined)   { fields.push(`resposta = $${i++}`);   values.push(resposta); }
    if (ativo !== undefined)      { fields.push(`ativo = $${i++}`);      values.push(ativo); }
    if (visibility !== undefined) {
      const v = ['todos', 'usuarios', 'admins'].includes(visibility) ? visibility : 'todos';
      fields.push(`visibility = $${i++}`);
      values.push(v);
    }
    fields.push(`updated_at = $${i++}`);
    values.push(new Date().toISOString());
    const r = await this.pool.query(
      `UPDATE faq SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );
    if (r.rows.length === 0) throw new Error('Item FAQ não encontrado');
    return toCamelCase(r.rows[0]);
  }

  async deletarFAQ(id) {
    const r = await this.pool.query(
      'DELETE FROM faq WHERE id = $1 RETURNING *',
      [id]
    );
    if (r.rows.length === 0) throw new Error('Item FAQ não encontrado');
    return toCamelCase(r.rows[0]);
  }

  async atualizarOrdemFAQ(faqIds) {
    const now = new Date().toISOString();
    for (let i = 0; i < faqIds.length; i++) {
      await this.pool.query(
        'UPDATE faq SET ordem = $1, updated_at = $2 WHERE id = $3',
        [i, now, faqIds[i]]
      );
    }
  }

  // ========== FEEDBACK ==========

  async criarFeedback({ usuarioId, categoria, descricao, imagemBase64, linkVideo, pagina }) {
    const id = this.generateId();
    const now = new Date().toISOString();
    const r = await this.pool.query(
      `INSERT INTO feedbacks (id, usuario_id, categoria, descricao, imagem_base64, link_video, pagina, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendente', $8, $8) RETURNING *`,
      [id, usuarioId, categoria, descricao, imagemBase64 || null, linkVideo || null, pagina || null, now]
    );
    return toCamelCase(r.rows[0]);
  }

  async obterFeedbacks() {
    const r = await this.pool.query(
      `SELECT f.*,
              u.first_name, u.last_name, u.username, u.email AS usuario_email
       FROM feedbacks f
       LEFT JOIN users u ON u.id = f.usuario_id
       ORDER BY f.created_at DESC`
    );
    return r.rows.map(row => {
      const fb = toCamelCase(row);
      fb.usuarioNome = [row.first_name, row.last_name].filter(Boolean).join(' ') || row.username || 'Usuário';
      fb.usuarioEmail = row.usuario_email || '';
      return fb;
    });
  }

  async obterFeedbackPorId(id) {
    const r = await this.pool.query(
      `SELECT f.*,
              u.first_name, u.last_name, u.username, u.email AS usuario_email
       FROM feedbacks f
       LEFT JOIN users u ON u.id = f.usuario_id
       WHERE f.id = $1`,
      [id]
    );
    if (r.rows.length === 0) throw new Error('Feedback não encontrado');
    const row = r.rows[0];
    const fb = toCamelCase(row);
    fb.usuarioNome = [row.first_name, row.last_name].filter(Boolean).join(' ') || row.username || 'Usuário';
    fb.usuarioEmail = row.usuario_email || '';
    return fb;
  }

  async responderFeedback(id, { resposta }) {
    const now = new Date().toISOString();
    const r = await this.pool.query(
      `UPDATE feedbacks SET resposta = $1, status = 'respondido', updated_at = $2 WHERE id = $3 RETURNING *`,
      [resposta, now, id]
    );
    if (r.rows.length === 0) throw new Error('Feedback não encontrado');
    return toCamelCase(r.rows[0]);
  }

  async aceitarFeedback(id, { resposta, roadmapItemId }) {
    const now = new Date().toISOString();
    const r = await this.pool.query(
      `UPDATE feedbacks SET resposta = $1, status = 'aceito', roadmap_item_id = $2, updated_at = $3 WHERE id = $4 RETURNING *`,
      [resposta, roadmapItemId || null, now, id]
    );
    if (r.rows.length === 0) throw new Error('Feedback não encontrado');
    return toCamelCase(r.rows[0]);
  }

  // ========== DOCUMENTAÇÃO ==========

  async obterDocumentacao(userRole = 'guest') {
    const allowed = this._visibilityFor(userRole);
    const placeholders = allowed.map((_, i) => `$${i + 1}`).join(', ');
    const sectionsRes = await this.pool.query(
      `SELECT * FROM doc_sections WHERE visibility IN (${placeholders}) ORDER BY ordem ASC, created_at ASC`,
      allowed
    );
    const pagesRes = await this.pool.query(
      `SELECT * FROM doc_pages ORDER BY ordem ASC, created_at ASC`
    );
    const pages = pagesRes.rows.map(r => toCamelCase(r));
    return sectionsRes.rows.map(row => {
      const section = toCamelCase(row);
      section.pages = pages.filter(p => p.sectionId === section.id);
      return section;
    });
  }

  async criarDocSection({ title, visibility = 'todos' }) {
    const id = this.generateId();
    const now = new Date().toISOString();
    const validVisibility = ['todos', 'usuarios', 'admins'].includes(visibility) ? visibility : 'todos';
    const ordemRes = await this.pool.query(
      `SELECT COALESCE(MAX(ordem), -1) + 1 AS prox FROM doc_sections`
    );
    const ordem = ordemRes.rows[0].prox;
    const r = await this.pool.query(
      `INSERT INTO doc_sections (id, title, ordem, visibility, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $5) RETURNING *`,
      [id, title, ordem, validVisibility, now]
    );
    return toCamelCase(r.rows[0]);
  }

  async atualizarDocSection(id, { title, visibility }) {
    const now = new Date().toISOString();
    const fields = [];
    const values = [id];
    let i = 2;
    if (title !== undefined)      { fields.push(`title = $${i++}`);      values.push(title); }
    if (visibility !== undefined) {
      const v = ['todos', 'usuarios', 'admins'].includes(visibility) ? visibility : 'todos';
      fields.push(`visibility = $${i++}`);
      values.push(v);
    }
    fields.push(`updated_at = $${i++}`);
    values.push(now);
    const r = await this.pool.query(
      `UPDATE doc_sections SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );
    if (r.rows.length === 0) throw new Error('Seção não encontrada');
    return toCamelCase(r.rows[0]);
  }

  async deletarDocSection(id) {
    await this.pool.query(`DELETE FROM doc_pages WHERE section_id = $1`, [id]);
    const r = await this.pool.query(
      `DELETE FROM doc_sections WHERE id = $1 RETURNING *`, [id]
    );
    if (r.rows.length === 0) throw new Error('Seção não encontrada');
    return toCamelCase(r.rows[0]);
  }

  async criarDocPage(sectionId, { title, content }) {
    const id = this.generateId();
    const now = new Date().toISOString();
    const ordemRes = await this.pool.query(
      `SELECT COALESCE(MAX(ordem), -1) + 1 AS prox FROM doc_pages WHERE section_id = $1`,
      [sectionId]
    );
    const ordem = ordemRes.rows[0].prox;
    const r = await this.pool.query(
      `INSERT INTO doc_pages (id, section_id, title, content, ordem, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING *`,
      [id, sectionId, title, content || '', ordem, now]
    );
    return toCamelCase(r.rows[0]);
  }

  async atualizarDocPage(id, { title, content }) {
    const now = new Date().toISOString();
    const fields = [];
    const values = [id];
    if (title !== undefined) { values.push(title); fields.push(`title = $${values.length}`); }
    if (content !== undefined) { values.push(content); fields.push(`content = $${values.length}`); }
    values.push(now);
    fields.push(`updated_at = $${values.length}`);
    const r = await this.pool.query(
      `UPDATE doc_pages SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );
    if (r.rows.length === 0) throw new Error('Página não encontrada');
    return toCamelCase(r.rows[0]);
  }

  async deletarDocPage(id) {
    const r = await this.pool.query(
      `DELETE FROM doc_pages WHERE id = $1 RETURNING *`, [id]
    );
    if (r.rows.length === 0) throw new Error('Página não encontrada');
    return toCamelCase(r.rows[0]);
  }

  async reordenarDocSections(ids) {
    const now = new Date().toISOString();
    for (let i = 0; i < ids.length; i++) {
      await this.pool.query(
        `UPDATE doc_sections SET ordem = $1, updated_at = $2 WHERE id = $3`,
        [i, now, ids[i]]
      );
    }
  }

  async reordenarDocPages(ids) {
    const now = new Date().toISOString();
    for (let i = 0; i < ids.length; i++) {
      await this.pool.query(
        `UPDATE doc_pages SET ordem = $1, updated_at = $2 WHERE id = $3`,
        [i, now, ids[i]]
      );
    }
  }

  // ========== RODAPÉ ==========

  async obterRodapeCompleto() {
    const [confRes, colunasRes, linksRes, bottomRes] = await Promise.all([
      this.pool.query(`SELECT chave, valor FROM rodape_configuracoes`),
      this.pool.query(`SELECT * FROM rodape_colunas ORDER BY ordem ASC, created_at ASC`),
      this.pool.query(`SELECT * FROM rodape_links ORDER BY ordem ASC, created_at ASC`),
      this.pool.query(`SELECT * FROM rodape_bottom_links ORDER BY ordem ASC, created_at ASC`).catch(() => ({ rows: [] })),
    ]);

    const configuracoes = {};
    for (const row of confRes.rows) {
      configuracoes[row.chave] = row.valor;
    }

    const linksMap = {};
    for (const link of linksRes.rows) {
      if (!linksMap[link.coluna_id]) linksMap[link.coluna_id] = [];
      linksMap[link.coluna_id].push({
        id: link.id,
        coluna_id: link.coluna_id,
        texto: link.texto,
        link: link.link,
        ehLink: link.eh_link,
        ordem: link.ordem,
      });
    }

    const colunas = colunasRes.rows.map(col => ({
      id: col.id,
      titulo: col.titulo,
      ordem: col.ordem,
      links: linksMap[col.id] || [],
    }));

    const bottomLinks = bottomRes.rows.map(row => ({
      id: row.id,
      texto: row.texto,
      link: row.link,
      ativo: row.ativo,
      ordem: row.ordem,
    }));

    return { configuracoes, colunas, bottomLinks };
  }

  async obterRodapeConfiguracoes() {
    const r = await this.pool.query(`SELECT chave, valor FROM rodape_configuracoes`);
    const obj = {};
    for (const row of r.rows) obj[row.chave] = row.valor;
    return obj;
  }

  async atualizarRodapeConfig(chave, valor) {
    const now = new Date().toISOString();
    const r = await this.pool.query(
      `INSERT INTO rodape_configuracoes (chave, valor, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (chave) DO UPDATE SET valor = $2, updated_at = $3
       RETURNING *`,
      [chave, valor, now]
    );
    return r.rows[0];
  }

  async obterRodapeColunas() {
    const r = await this.pool.query(
      `SELECT * FROM rodape_colunas ORDER BY ordem ASC, created_at ASC`
    );
    return r.rows.map(row => toCamelCase(row));
  }

  async criarRodapeColuna(titulo) {
    const id = this.generateId();
    const now = new Date().toISOString();
    const ordemRes = await this.pool.query(
      `SELECT COALESCE(MAX(ordem), -1) + 1 AS prox FROM rodape_colunas`
    );
    const ordem = ordemRes.rows[0].prox;
    const r = await this.pool.query(
      `INSERT INTO rodape_colunas (id, titulo, ordem, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $4) RETURNING *`,
      [id, titulo, ordem, now]
    );
    return toCamelCase(r.rows[0]);
  }

  async atualizarRodapeColuna(id, titulo) {
    const now = new Date().toISOString();
    const r = await this.pool.query(
      `UPDATE rodape_colunas SET titulo = $1, updated_at = $2 WHERE id = $3 RETURNING *`,
      [titulo, now, id]
    );
    if (r.rows.length === 0) throw new Error('Coluna não encontrada');
    return toCamelCase(r.rows[0]);
  }

  async deletarRodapeColuna(id) {
    const r = await this.pool.query(
      `DELETE FROM rodape_colunas WHERE id = $1 RETURNING *`, [id]
    );
    if (r.rows.length === 0) throw new Error('Coluna não encontrada');
    return toCamelCase(r.rows[0]);
  }

  async atualizarOrdemColunas(colunaIds) {
    const now = new Date().toISOString();
    for (let i = 0; i < colunaIds.length; i++) {
      await this.pool.query(
        `UPDATE rodape_colunas SET ordem = $1, updated_at = $2 WHERE id = $3`,
        [i, now, colunaIds[i]]
      );
    }
  }

  async obterRodapeLinks() {
    const r = await this.pool.query(
      `SELECT rl.*, rc.titulo AS coluna_titulo
       FROM rodape_links rl
       LEFT JOIN rodape_colunas rc ON rl.coluna_id = rc.id
       ORDER BY rc.ordem ASC, rl.ordem ASC, rl.created_at ASC`
    );
    return r.rows.map(row => ({
      id: row.id,
      colunaId: row.coluna_id,
      texto: row.texto,
      link: row.link,
      ehLink: row.eh_link,
      ordem: row.ordem,
      colunaTitulo: row.coluna_titulo,
    }));
  }

  async criarRodapeLink({ coluna_id, texto, link, eh_link }) {
    const id = this.generateId();
    const now = new Date().toISOString();
    const ordemRes = await this.pool.query(
      `SELECT COALESCE(MAX(ordem), -1) + 1 AS prox FROM rodape_links WHERE coluna_id = $1`,
      [coluna_id]
    );
    const ordem = ordemRes.rows[0].prox;
    const ehLink = eh_link !== undefined ? eh_link : (link && link.trim() !== '');
    const linkVal = ehLink ? (link || '') : '';
    const r = await this.pool.query(
      `INSERT INTO rodape_links (id, coluna_id, texto, link, eh_link, ordem, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *`,
      [id, coluna_id, texto, linkVal, ehLink, ordem, now]
    );
    return {
      id: r.rows[0].id,
      colunaId: r.rows[0].coluna_id,
      texto: r.rows[0].texto,
      link: r.rows[0].link,
      ehLink: r.rows[0].eh_link,
      ordem: r.rows[0].ordem,
    };
  }

  async atualizarRodapeLink(id, { texto, link, eh_link, coluna_id }) {
    const now = new Date().toISOString();
    const fields = [];
    const values = [id];
    if (texto !== undefined) { values.push(texto); fields.push(`texto = $${values.length}`); }
    if (eh_link !== undefined) { values.push(eh_link); fields.push(`eh_link = $${values.length}`); }
    if (link !== undefined || eh_link === false) {
      const linkVal = eh_link === false ? '' : (link || '');
      values.push(linkVal); fields.push(`link = $${values.length}`);
    }
    if (coluna_id !== undefined) { values.push(coluna_id); fields.push(`coluna_id = $${values.length}`); }
    values.push(now); fields.push(`updated_at = $${values.length}`);
    const r = await this.pool.query(
      `UPDATE rodape_links SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );
    if (r.rows.length === 0) throw new Error('Link não encontrado');
    return {
      id: r.rows[0].id,
      colunaId: r.rows[0].coluna_id,
      texto: r.rows[0].texto,
      link: r.rows[0].link,
      ehLink: r.rows[0].eh_link,
      ordem: r.rows[0].ordem,
    };
  }

  async deletarRodapeLink(id) {
    const r = await this.pool.query(
      `DELETE FROM rodape_links WHERE id = $1 RETURNING *`, [id]
    );
    if (r.rows.length === 0) throw new Error('Link não encontrado');
    return r.rows[0];
  }

  async atualizarOrdemLinks(linkIds) {
    const now = new Date().toISOString();
    for (let i = 0; i < linkIds.length; i++) {
      await this.pool.query(
        `UPDATE rodape_links SET ordem = $1, updated_at = $2 WHERE id = $3`,
        [i, now, linkIds[i]]
      );
    }
  }

  // ============================================================
  // LEGAL / LGPD — Termos de Uso, Política de Privacidade,
  //                Cookies e Consentimentos
  // ============================================================

  /** Inicializa tabelas e dados padrão para módulo legal */
  async _ensureLegalDefaults() {
    try {
      // Tabela: termos_uso
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS termos_uso (
          id SERIAL PRIMARY KEY,
          conteudo TEXT NOT NULL DEFAULT '',
          versao INTEGER DEFAULT 1,
          updated_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabela: politica_privacidade
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS politica_privacidade (
          id SERIAL PRIMARY KEY,
          conteudo TEXT NOT NULL DEFAULT '',
          versao INTEGER DEFAULT 1,
          updated_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabela: cookie_banner_config
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS cookie_banner_config (
          id SERIAL PRIMARY KEY,
          titulo VARCHAR(255) NOT NULL DEFAULT 'Política de Cookies',
          texto TEXT NOT NULL DEFAULT '',
          texto_botao_aceitar VARCHAR(100) DEFAULT 'Aceitar Todos',
          texto_botao_rejeitar VARCHAR(100) DEFAULT 'Rejeitar Todos',
          texto_botao_personalizar VARCHAR(100) DEFAULT 'Personalizar',
          texto_descricao_gerenciamento TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabela: cookie_categorias
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS cookie_categorias (
          id SERIAL PRIMARY KEY,
          chave VARCHAR(100) UNIQUE NOT NULL,
          nome VARCHAR(255) NOT NULL,
          descricao TEXT NOT NULL,
          ativo BOOLEAN DEFAULT TRUE,
          obrigatorio BOOLEAN DEFAULT FALSE,
          ordem INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabela: cookie_consentimentos
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS cookie_consentimentos (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          preferencias JSONB NOT NULL,
          versao_termos INTEGER DEFAULT 1,
          versao_politica INTEGER DEFAULT 1,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id)
        )
      `);
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_consentimentos_user ON cookie_consentimentos(user_id)
      `);

      // Coluna permissoes_legais na tabela users
      await this.pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS permissoes_legais JSONB DEFAULT '{}'
      `);

      // Dados padrão: cookie_banner_config
      const bannerRes = await this.pool.query('SELECT COUNT(*) FROM cookie_banner_config');
      if (parseInt(bannerRes.rows[0].count, 10) === 0) {
        await this.pool.query(`
          INSERT INTO cookie_banner_config
            (titulo, texto, texto_botao_aceitar, texto_botao_rejeitar, texto_botao_personalizar, texto_descricao_gerenciamento)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          'Política de Cookies e Privacidade',
          'Utilizamos cookies para melhorar sua experiência, analisar o uso do sistema e garantir segurança. Ao continuar, você concorda com nossa Política de Privacidade e Termos de Uso, em conformidade com a LGPD (Lei 13.709/2018).',
          'Aceitar Todos',
          'Rejeitar Todos',
          'Personalizar',
          'Escolha quais tipos de cookies que deseja aceitar. Os cookies necessários são sempre ativados, pois são essenciais para o funcionamento seguro do sistema.',
        ]);
      }

      // Dados padrão: cookie_categorias
      const categDefaults = [
        { chave: 'necessary', nome: 'Cookies Necessários', descricao: 'Essenciais para o funcionamento e segurança do sistema. Não podem ser desativados.', ativo: true, obrigatorio: true, ordem: 1 },
        { chave: 'analytics', nome: 'Cookies de Análise', descricao: 'Nos ajudam a entender como o sistema é utilizado, coletando informações de forma anônima para melhorar a experiência.', ativo: true, obrigatorio: false, ordem: 2 },
        { chave: 'preferences', nome: 'Cookies de Preferências', descricao: 'Permitem que o sistema lembre suas configurações, como tema (claro/escuro) e preferências de exibição.', ativo: true, obrigatorio: false, ordem: 3 },
      ];
      for (const cat of categDefaults) {
        await this.pool.query(`
          INSERT INTO cookie_categorias (chave, nome, descricao, ativo, obrigatorio, ordem)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (chave) DO NOTHING
        `, [cat.chave, cat.nome, cat.descricao, cat.ativo, cat.obrigatorio, cat.ordem]);
      }

      // Dados padrão: termos_uso
      const termosRes = await this.pool.query('SELECT COUNT(*) FROM termos_uso');
      if (parseInt(termosRes.rows[0].count, 10) === 0) {
        const termosConteudo = `<h1>Termos de Uso</h1>
<p>Última atualização: ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
<p>Bem-vindo ao <strong>Alya</strong>. Ao acessar ou utilizar este sistema, você concorda com os presentes Termos de Uso. Leia-os atentamente antes de prosseguir.</p>

<h2>1. Aceitação dos Termos</h2>
<p>O uso do sistema Alya implica na aceitação integral e irrestrita destes Termos de Uso. Caso não concorde com qualquer disposição, você não deve utilizar o sistema. O acesso é concedido exclusivamente mediante autorização prévia do administrador responsável.</p>

<h2>2. Descrição do Sistema</h2>
<p>O <strong>Alya</strong> é um sistema de gestão financeira e operacional desenvolvido para apoiar a administração de negócios. As funcionalidades disponíveis incluem:</p>
<ul>
<li><strong>Financeiro:</strong> controle de receitas, despesas, fluxo de caixa e DRE (Demonstração do Resultado do Exercício);</li>
<li><strong>Produtos e Estoque:</strong> cadastro, gestão de preços, custos e margens;</li>
<li><strong>Clientes:</strong> cadastro e relacionamento com clientes;</li>
<li><strong>Projeções:</strong> modelagem de cenários financeiros e metas;</li>
<li><strong>Relatórios:</strong> geração de documentos financeiros em PDF e Excel;</li>
<li><strong>Integração Nuvemshop:</strong> sincronização de pedidos, produtos e clientes com a plataforma de e-commerce;</li>
<li><strong>Administração:</strong> gestão de usuários, permissões, segurança e auditoria.</li>
</ul>
<p>As funcionalidades disponíveis para cada usuário dependem das permissões atribuídas pelo administrador do sistema.</p>

<h2>3. Cadastro, Acesso e Segurança da Conta</h2>
<p>O acesso ao sistema é realizado exclusivamente por convite do administrador. Ao receber acesso, o usuário deve:</p>
<ul>
<li>Alterar a senha temporária no primeiro acesso;</li>
<li>Utilizar uma senha segura com no mínimo 10 caracteres;</li>
<li>Manter suas credenciais em sigilo, não compartilhando com terceiros;</li>
<li>Comunicar imediatamente ao administrador qualquer suspeita de acesso não autorizado;</li>
<li>Encerrar a sessão ao término do uso, especialmente em dispositivos compartilhados.</li>
</ul>
<p>O sistema monitora sessões ativas por dispositivo, com registro de IP e geolocalização para fins de segurança. O administrador pode encerrar sessões remotamente em caso de comprometimento.</p>

<h2>4. Responsabilidades do Usuário</h2>
<p>O usuário é responsável por:</p>
<ul>
<li>Utilizar o sistema exclusivamente para fins legítimos relacionados às atividades do negócio;</li>
<li>Inserir informações verdadeiras, precisas e atualizadas;</li>
<li>Respeitar a confidencialidade dos dados financeiros e de clientes acessados pelo sistema;</li>
<li>Não realizar operações que possam comprometer a integridade, disponibilidade ou segurança do sistema;</li>
<li>Reportar qualquer falha, vulnerabilidade ou comportamento anômalo ao administrador;</li>
<li>Cumprir a legislação vigente, em especial a LGPD (Lei 13.709/2018), no tratamento de dados pessoais acessados pelo sistema.</li>
</ul>

<h2>5. Usos Expressamente Proibidos</h2>
<p>É vedado ao usuário:</p>
<ul>
<li>Tentar acessar áreas, dados ou funcionalidades não autorizadas pelo perfil de acesso atribuído;</li>
<li>Realizar engenharia reversa, descompilar ou modificar qualquer componente do sistema;</li>
<li>Utilizar o sistema para fins ilícitos, fraudes ou atividades que violem direitos de terceiros;</li>
<li>Inserir dados maliciosos, scripts, vírus ou qualquer código que comprometa a segurança do sistema;</li>
<li>Exportar, copiar ou transferir dados do sistema para fins alheios à atividade do negócio;</li>
<li>Compartilhar credenciais de acesso com pessoas não autorizadas;</li>
<li>Realizar testes de carga, varreduras ou ataques de qualquer natureza contra a infraestrutura do sistema.</li>
</ul>
<p>A tentativa de violação de segurança é registrada no log de auditoria e pode resultar no bloqueio imediato da conta e responsabilização legal.</p>

<h2>6. Dados Pessoais e Privacidade</h2>
<p>O tratamento de dados pessoais no sistema Alya é regido pela <strong>Política de Privacidade</strong>, disponível neste mesmo sistema, em conformidade com a LGPD (Lei 13.709/2018). Os dados pessoais de clientes inseridos no sistema são de responsabilidade do usuário que os inseriu e da organização controladora dos dados.</p>
<p>O administrador do sistema é responsável por garantir que apenas pessoas autorizadas tenham acesso a dados sensíveis, como CPF, dados financeiros e informações de contato de clientes.</p>

<h2>7. Auditoria e Monitoramento</h2>
<p>O sistema registra automaticamente todas as ações realizadas pelos usuários em um log de auditoria, incluindo:</p>
<ul>
<li>Criação, edição e exclusão de registros;</li>
<li>Tentativas de acesso (com sucesso ou falha);</li>
<li>Alterações de permissões e configurações;</li>
<li>Exportações e importações de dados.</li>
</ul>
<p>Esses registros são mantidos por até <strong>2 (dois) anos</strong> e podem ser utilizados para fins de segurança, auditoria interna e cumprimento de obrigações legais.</p>

<h2>8. Integrações com Terceiros</h2>
<p>O sistema pode se integrar a plataformas externas, como a <strong>Nuvemshop</strong> (e-commerce) e o <strong>SendGrid</strong> (envio de e-mails). O uso dessas integrações está sujeito às políticas e termos de serviço de cada plataforma. O usuário é responsável por garantir que a utilização das integrações esteja em conformidade com a legislação aplicável.</p>

<h2>9. Propriedade Intelectual</h2>
<p>O sistema Alya, incluindo seu código-fonte, design, logotipas, estrutura, funcionalidades e documentação, é de propriedade exclusiva de seus desenvolvedor(es). É vedada qualquer reprodução, distribuição ou uso comercial sem autorização expressa e por escrito.</p>
<p>Os dados inseridos pelos usuários permanecem de propriedade da organização que utiliza o sistema. O desenvolvedor do Alya não reivindica propriedade sobre os dados operacionais e financeiros inseridos.</p>

<h2>10. Disponibilidade e Limitação de Responsabilidade</h2>
<p>O sistema é disponibilizado no estado em que se encontra. Não são garantidas disponibilidade ininterrupta, ausência de erros ou adequação para finalidades específicas além das documentadas. Em nenhuma hipótese o desenvolvedor será responsável por danos indiretos, perda de dados decorrente de uso indevido, ou decisões financeiras tomadas com base nas informações do sistema.</p>
<p>É responsabilidade do administrador manter backups regulares dos dados e garantir que o ambiente de acesso ao sistema seja seguro.</p>

<h2>11. Suspensão e Encerramento de Acesso</h2>
<p>O administrador pode suspender ou encerrar o acesso de qualquer usuário a qualquer momento, especialmente em caso de:</p>
<ul>
<li>Violação destes Termos de Uso;</li>
<li>Suspeita de comprometimento de credenciais;</li>
<li>Encerramento do vínculo com a organização;</li>
<li>Solicitação do próprio usuário.</li>
</ul>
<p>Após o encerramento do acesso, os dados inseridos pelo usuário permanecem no sistema sob responsabilidade da organização.</p>

<h2>12. Alterações nestes Termos</h2>
<p>Estes Termos de Uso podem ser atualizados a qualquer momento pelo administrador do sistema. As alterações entram em vigor imediatamente após a publicação da nova versão. O uso continuado do sistema após a publicação de alterações implica na aceitação dos novos termos.</p>

<h2>13. Lei Aplicável e Foro</h2>
<p>Estes Termos de Uso são regidos pela legislação brasileira, em especial o Código Civil (Lei 10.406/2002), o Marco Civil da Internet (Lei 12.965/2014) e a LGPD (Lei 13.709/2018). Fica eleito o foro da comarca da sede da organização para dirimir quaisquer controvérsias.</p>

<h2>14. Contato</h2>
<p>Dúvidas sobre estes Termos de Uso devem ser encaminhadas ao administrador do sistema ou ao responsável pela proteção de dados (DPO) da organização.</p>`;

        await this.pool.query(
          `INSERT INTO termos_uso (conteudo, versao, created_at, updated_at) VALUES ($1, 1, NOW(), NOW())`,
          [termosConteudo]
        );
      }

      // Dados padrão: politica_privacidade
      const politicaRes = await this.pool.query('SELECT COUNT(*) FROM politica_privacidade');
      if (parseInt(politicaRes.rows[0].count, 10) === 0) {
        const politicaConteudo = `<h1>Política de Privacidade</h1>
<p>Última atualização: ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
<p>Esta Política de Privacidade descreve como o sistema <strong>Alya</strong> coleta, utiliza, armazena e protege os dados pessoais de seus usuários e dos dados de clientes inseridos no sistema, em conformidade com a <strong>Lei Geral de Proteção de Dados Pessoais — LGPD (Lei 13.709/2018)</strong>.</p>

<h2>1. Identificação do Controlador de Dados</h2>
<p>O <strong>controlador dos dados</strong> é a organização ou pessoa jurídica que contrata e opera o sistema Alya para fins de gestão financeira e operacional. O sistema Alya é a ferramenta tecnológica utilizada pelo controlador para o tratamento dos dados.</p>
<p>Para identificar o controlador responsável pelos seus dados, entre em contato com o administrador do sistema da organização à qual você está vinculado.</p>

<h2>2. Dados Pessoais Tratados</h2>
<p>O sistema Alya trata as seguintes categorias de dados pessoais:</p>

<h3>2.1. Dados de Usuários do Sistema</h3>
<ul>
<li><strong>Dados de identificação:</strong> nome de usuário (login), nome completo, e-mail, telefone, CPF, data de nascimento, gênero e cargo;</li>
<li><strong>Dados de acesso:</strong> senha (armazenada exclusivamente em formato de hash irreversível bcrypt), tokens de sessão e tokens de recuperação de senha;</li>
<li><strong>Dados de perfil:</strong> fotografia de perfil (opcional) e endereço completo (opcional);</li>
<li><strong>Dados de uso e segurança:</strong> endereço IP, User-Agent do navegador, geolocalização da sessão (país e cidade), dispositivo, sistema operacional e horários de acesso.</li>
</ul>

<h3>2.2. Dados de Clientes Cadastrados no Sistema</h3>
<ul>
<li>Nome completo, e-mail, telefone, endereço, CPF e CNPJ (quando aplicável);</li>
<li>Esses dados são inseridos pelos usuários do sistema no exercício das atividades de gestão de relacionamento com clientes.</li>
</ul>

<h3>2.3. Dados Financeiros e Operacionais</h3>
<ul>
<li>Transações financeiras (receitas e despesas), produtos, estoque, metas, projeções e demonstrativos de resultado;</li>
<li>Dados de pedidos, produtos e clientes sincronizados com a plataforma Nuvemshop (quando a integração estiver ativa).</li>
</ul>

<h3>2.4. Dados de Consentimento e Auditoria</h3>
<ul>
<li>Preferências de cookies, versão dos documentos legais aceitos, endereço IP e User-Agent no momento do consentimento;</li>
<li>Registros de auditoria de todas as ações realizadas no sistema (criações, edições, exclusões, acessos).</li>
</ul>

<h2>3. Finalidade e Base Legal do Tratamento</h2>
<p>Os dados pessoais são tratados com as seguintes finalidades e bases legais previstas no Art. 7º da LGPD:</p>
<ul>
<li><strong>Autenticação e segurança de acesso</strong> — base legal: legítimo interesse e execução de contrato (Art. 7º, V);</li>
<li><strong>Gestão financeira e operacional do negócio</strong> — base legal: execução de contrato (Art. 7º, V);</li>
<li><strong>Gestão de relacionamento com clientes (CRM)</strong> — base legal: legítimo interesse do controlador (Art. 7º, IX);</li>
<li><strong>Envio de e-mails transacionais</strong> (recuperação de senha, convites, alertas de segurança) — base legal: legítimo interesse (Art. 7º, IX);</li>
<li><strong>Monitoramento de segurança e detecção de anomalias</strong> — base legal: legítimo interesse para prevenção de fraudes (Art. 7º, IX);</li>
<li><strong>Registro de auditoria</strong> para fins de conformidade legal e segurança — base legal: cumprimento de obrigação legal (Art. 7º, II) e legítimo interesse (Art. 7º, IX);</li>
<li><strong>Cumprimento da LGPD</strong> e demais obrigações regulatórias — base legal: cumprimento de obrigação legal (Art. 7º, II).</li>
</ul>
<p>O sistema <strong>não realiza</strong> tratamento de dados pessoais para fins de publicidade, perfilamento comportamental ou venda de dados a terceiros.</p>

<h2>4. Proteção e Segurança dos Dados</h2>
<p>O sistema Alya implementa medidas técnicas e organizacionais robustas para proteger os dados pessoais tratados:</p>

<h3>4.1. Criptografia e Proteção em Repouso</h3>
<ul>
<li><strong>AES-256-GCM:</strong> dados sensíveis de clientes (CPF, e-mail, telefone, endereço) são armazenados com criptografia simétrica de 256 bits com autenticação de integridade;</li>
<li><strong>Bcrypt (cost factor 10):</strong> senhas dos usuários são armazenadas exclusivamente como hash irreversível — o sistema nunca armazena ou transmite senhas em texto claro;</li>
<li><strong>Hashing SHA-256:</strong> campos utilizados em buscas (como CPF) possuem hash separado para permitir pesquisa sem expor o dado original;</li>
<li><strong>Mascaramento:</strong> dados sensíveis são exibidos parcialmente na interface (ex.: CPF exibe apenas os 2 últimos dígitos).</li>
</ul>

<h3>4.2. Segurança no Transporte</h3>
<ul>
<li><strong>HTTPS com HSTS:</strong> toda comunicação entre o navegador e o servidor é criptografada via TLS;</li>
<li><strong>Tokens JWT de curta duração:</strong> tokens de acesso expiram em 15 minutos; tokens de atualização expiram em 7 dias com rotação automática;</li>
<li><strong>Headers de segurança (Helmet.js):</strong> Content Security Policy (CSP), X-Frame-Options, X-Content-Type-Options e Referrer-Policy são aplicados em todas as respostas.</li>
</ul>

<h3>4.3. Controle de Acesso</h3>
<ul>
<li><strong>RBAC (Role-Based Access Control):</strong> três níveis de acesso (usuário, administrador, superadministrador) com permissões granulares por módulo;</li>
<li><strong>Rate limiting:</strong> limite de requisições por IP para prevenir ataques de força bruta e enumeração;</li>
<li><strong>Bloqueio automático:</strong> contas são bloqueadas após tentativas excessivas de login;</li>
<li><strong>Gerenciamento de sessões:</strong> usuários podem visualizar e encerrar sessões ativas em qualquer dispositivo.</li>
</ul>

<h3>4.4. Monitoramento e Detecção de Ameaças</h3>
<ul>
<li><strong>Detecção de anomalias:</strong> análise estatística em tempo real identifica comportamentos anômalos (volume incomum, horários suspeitos, múltiplos países);</li>
<li><strong>Alertas de segurança:</strong> notificações automáticas por e-mail em caso de múltiplas tentativas de login falhas, acesso de novo país, detecção de injeção SQL ou XSS;</li>
<li><strong>Log de auditoria completo:</strong> todas as operações são registradas com usuário, IP, User-Agent e detalhes da ação, retidos por 2 anos;</li>
<li><strong>Validação e sanitização de entradas:</strong> todos os dados recebidos pelo servidor são validados e sanitizados antes do processamento.</li>
</ul>

<h2>5. Compartilhamento de Dados com Terceiros</h2>
<p>O sistema Alya pode compartilhar dados pessoais com os seguintes terceiros, exclusivamente para as finalidades descritas:</p>
<ul>
<li><strong>SendGrid (Twilio):</strong> provedor de envio de e-mails transacionais. Recebe endereços de e-mail e conteúdo das mensagens para envio de notificações de segurança, recuperação de senha e convites. Política de privacidade: <a href="https://www.twilio.com/en-us/legal/privacy">twilio.com/legal/privacy</a>;</li>
<li><strong>Nuvemshop:</strong> plataforma de e-commerce. Quando a integração estiver ativa, dados de pedidos, produtos e clientes são sincronizados bidirecionalmente. Política de privacidade: <a href="https://www.nuvemshop.com.br/politica-de-privacidade">nuvemshop.com.br/politica-de-privacidade</a>;</li>
<li><strong>BrasilAPI / ViaCEP:</strong> APIs públicas utilizadas exclusivamente para autopreenchimento de endereço a partir do CEP. Nenhum dado pessoal é enviado a essas APIs.</li>
</ul>
<p>O sistema <strong>não vende, cede ou compartilha</strong> dados pessoais com terceiros para fins comerciais, publicitários ou de qualquer natureza diversa das descritas acima.</p>

<h2>6. Cookies e Tecnologias de Rastreamento</h2>
<p>O sistema utiliza cookies e armazenamento local (localStorage) para as seguintes finalidades:</p>
<ul>
<li><strong>Cookies Necessários (obrigatórios):</strong> tokens de autenticação (JWT) e identificadores de sessão, essenciais para o funcionamento seguro do sistema. Não podem ser desativados;</li>
<li><strong>Cookies de Preferências (opcionais):</strong> configurações de interface, como tema claro/escuro, que melhoram a experiência de uso;</li>
<li><strong>Cookies de Análise (opcionais):</strong> informações anônimas de uso para melhoria do sistema.</li>
</ul>
<p>O consentimento para cookies não obrigatórios é coletado antes do login, podendo ser alterado a qualquer momento. O registro de consentimento inclui data, versão dos documentos aceitos, IP e User-Agent, em conformidade com o Art. 7º, I da LGPD.</p>

<h2>7. Retenção dos Dados</h2>
<ul>
<li><strong>Dados de usuários ativos:</strong> mantidos enquanto a conta estiver ativa;</li>
<li><strong>Dados de usuários inativos/removidos:</strong> excluídos ou anonimizados em até 90 dias após a desativação da conta, salvo obrigação legal de retenção;</li>
<li><strong>Logs de auditoria e segurança:</strong> retidos por até <strong>2 (dois) anos</strong> para fins de segurança e conformidade legal;</li>
<li><strong>Tokens de recuperação de senha e convites:</strong> excluídos automaticamente após utilização ou expiração;</li>
<li><strong>Registros de consentimento:</strong> mantidos pelo período necessário para demonstrar conformidade com a LGPD.</li>
</ul>

<h2>8. Direitos do Titular dos Dados (LGPD, Art. 18)</h2>
<p>Na condição de titular de dados pessoais, você possui os seguintes direitos garantidos pela LGPD:</p>
<ul>
<li><strong>Confirmação e acesso:</strong> saber se seus dados são tratados e obter cópia dos dados pessoais mantidos no sistema;</li>
<li><strong>Correção:</strong> solicitar a atualização de dados incompletos, inexatos ou desatualizados;</li>
<li><strong>Anonimização, bloqueio ou eliminação:</strong> solicitar a anonimização ou eliminação de dados desnecessários ou tratados em desconformidade com a LGPD;</li>
<li><strong>Portabilidade:</strong> solicitar a transferência dos seus dados a outro controlador, em formato interoperável;</li>
<li><strong>Eliminação dos dados:</strong> solicitar a exclusão dos dados tratados com base no consentimento, salvo hipóteses legais de retenção;</li>
<li><strong>Revogação do consentimento:</strong> revogar o consentimento para o tratamento de dados, sem prejuízo à legalidade dos tratamentos realizados anteriormente;</li>
<li><strong>Oposição:</strong> opor-se a tratamentos realizados com base em legítimo interesse, quando houver fundamento;</li>
<li><strong>Informação sobre compartilhamento:</strong> obter informações sobre os terceiros com os quais seus dados foram compartilhados.</li>
</ul>
<p>Para exercer seus direitos, entre em contato com o administrador do sistema ou com o Encarregado de Dados (DPO) da organização.</p>

<h2>9. Transferência Internacional de Dados</h2>
<p>Alguns serviços utilizados pelo sistema possuem infraestrutura fora do Brasil:</p>
<ul>
<li><strong>SendGrid (Twilio):</strong> infraestrutura nos Estados Unidos, com proteções contratuais adequadas (Standard Contractual Clauses — SCCs);</li>
<li><strong>Nuvemshop:</strong> empresa com operações na América Latina, sujeita a legislações de proteção de dados compatíveis com a LGPD.</li>
</ul>
<p>As transferências são realizadas com as salvaguardas previstas nos Arts. 33 a 36 da LGPD.</p>

<h2>10. Encarregado de Proteção de Dados (DPO)</h2>
<p>A organização controladora dos dados deve nomear um Encarregado de Proteção de Dados (DPO), conforme previsto no Art. 41 da LGPD. Para consultas, solicitações de direitos ou notificações relacionadas a dados pessoais tratados neste sistema, entre em contato com o administrador responsável pela organização.</p>
<p>A Autoridade Nacional de Proteção de Dados (ANPD) pode ser contatada pelo site: <a href="https://www.gov.br/anpd">gov.br/anpd</a>.</p>

<h2>11. Incidentes de Segurança</h2>
<p>Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares de dados, o controlador comunicará o fato à ANPD e aos titulares afetados em prazo razoável, conforme exigido pelo Art. 48 da LGPD, com as informações sobre a natureza dos dados afetados, os titulares envolvidos, as medidas técnicas adotadas e os riscos relacionados ao incidente.</p>

<h2>12. Alterações nesta Política</h2>
<p>Esta Política de Privacidade pode ser atualizada periodicamente para refletir alterações nas práticas de tratamento de dados ou na legislação vigente. Toda atualização é versionada e registrada no sistema. Recomendamos a leitura periódica deste documento. O uso continuado do sistema após a publicação de uma nova versão implica na aceitação das alterações.</p>

<h2>13. Contato</h2>
<p>Para exercer seus direitos como titular de dados, esclarecer dúvidas sobre esta Política ou reportar incidentes de segurança, entre em contato com o administrador do sistema. As solicitações serão respondidas em até <strong>15 (quinze) dias úteis</strong>, conforme prazo estabelecido pela ANPD.</p>`;

        await this.pool.query(
          `INSERT INTO politica_privacidade (conteudo, versao, created_at, updated_at) VALUES ($1, 1, NOW(), NOW())`,
          [politicaConteudo]
        );
      }

      console.log('✅ Módulo Legal (LGPD) inicializado no PostgreSQL.');
    } catch (err) {
      console.error('Erro ao inicializar módulo legal:', err.message);
    }
  }

  // --- Termos de Uso ---

  async obterTermosUso() {
    const r = await this.pool.query(
      `SELECT conteudo, versao, updated_at FROM termos_uso ORDER BY id DESC LIMIT 1`
    );
    if (r.rows.length === 0) return { conteudo: '', versao: 1, updatedAt: null };
    return toCamelCase(r.rows[0]);
  }

  async obterTermosUsoAdmin() {
    const r = await this.pool.query(
      `SELECT t.id, t.conteudo, t.versao, t.created_at, t.updated_at,
              u.username AS updated_by_username
       FROM termos_uso t
       LEFT JOIN users u ON u.id = t.updated_by
       ORDER BY t.id DESC LIMIT 1`
    );
    if (r.rows.length === 0) return { conteudo: '', versao: 1, updatedAt: null, updatedByUsername: null };
    return toCamelCase(r.rows[0]);
  }

  async atualizarTermosUso(conteudo, userId) {
    const now = new Date().toISOString();
    const existing = await this.pool.query('SELECT id, versao FROM termos_uso ORDER BY id DESC LIMIT 1');
    if (existing.rows.length === 0) {
      await this.pool.query(
        `INSERT INTO termos_uso (conteudo, versao, updated_by, created_at, updated_at)
         VALUES ($1, 1, $2, $3, $3)`,
        [conteudo, userId, now]
      );
      return { versao: 1 };
    }
    const novaVersao = existing.rows[0].versao + 1;
    await this.pool.query(
      `UPDATE termos_uso SET conteudo = $1, versao = $2, updated_by = $3, updated_at = $4
       WHERE id = $5`,
      [conteudo, novaVersao, userId, now, existing.rows[0].id]
    );
    return { versao: novaVersao };
  }

  // --- Política de Privacidade ---

  async obterPoliticaPrivacidade() {
    const r = await this.pool.query(
      `SELECT conteudo, versao, updated_at FROM politica_privacidade ORDER BY id DESC LIMIT 1`
    );
    if (r.rows.length === 0) return { conteudo: '', versao: 1, updatedAt: null };
    return toCamelCase(r.rows[0]);
  }

  async obterPoliticaPrivacidadeAdmin() {
    const r = await this.pool.query(
      `SELECT p.id, p.conteudo, p.versao, p.created_at, p.updated_at,
              u.username AS updated_by_username
       FROM politica_privacidade p
       LEFT JOIN users u ON u.id = p.updated_by
       ORDER BY p.id DESC LIMIT 1`
    );
    if (r.rows.length === 0) return { conteudo: '', versao: 1, updatedAt: null, updatedByUsername: null };
    return toCamelCase(r.rows[0]);
  }

  async atualizarPoliticaPrivacidade(conteudo, userId) {
    const now = new Date().toISOString();
    const existing = await this.pool.query('SELECT id, versao FROM politica_privacidade ORDER BY id DESC LIMIT 1');
    if (existing.rows.length === 0) {
      await this.pool.query(
        `INSERT INTO politica_privacidade (conteudo, versao, updated_by, created_at, updated_at)
         VALUES ($1, 1, $2, $3, $3)`,
        [conteudo, userId, now]
      );
      return { versao: 1 };
    }
    const novaVersao = existing.rows[0].versao + 1;
    await this.pool.query(
      `UPDATE politica_privacidade SET conteudo = $1, versao = $2, updated_by = $3, updated_at = $4
       WHERE id = $5`,
      [conteudo, novaVersao, userId, now, existing.rows[0].id]
    );
    return { versao: novaVersao };
  }

  // --- Cookie Banner Config ---

  async obterCookieBannerConfig() {
    const r = await this.pool.query(
      `SELECT * FROM cookie_banner_config ORDER BY id DESC LIMIT 1`
    );
    if (r.rows.length === 0) return null;
    return toCamelCase(r.rows[0]);
  }

  async atualizarCookieBannerConfig({ titulo, texto, texto_botao_aceitar, texto_botao_rejeitar, texto_botao_personalizar, texto_descricao_gerenciamento }) {
    const now = new Date().toISOString();
    const existing = await this.pool.query('SELECT id FROM cookie_banner_config ORDER BY id DESC LIMIT 1');
    if (existing.rows.length === 0) {
      const r = await this.pool.query(
        `INSERT INTO cookie_banner_config
           (titulo, texto, texto_botao_aceitar, texto_botao_rejeitar, texto_botao_personalizar, texto_descricao_gerenciamento, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [titulo, texto, texto_botao_aceitar, texto_botao_rejeitar, texto_botao_personalizar, texto_descricao_gerenciamento, now]
      );
      return toCamelCase(r.rows[0]);
    }
    const r = await this.pool.query(
      `UPDATE cookie_banner_config SET
         titulo = $1, texto = $2, texto_botao_aceitar = $3, texto_botao_rejeitar = $4,
         texto_botao_personalizar = $5, texto_descricao_gerenciamento = $6, updated_at = $7
       WHERE id = $8 RETURNING *`,
      [titulo, texto, texto_botao_aceitar, texto_botao_rejeitar, texto_botao_personalizar, texto_descricao_gerenciamento, now, existing.rows[0].id]
    );
    return toCamelCase(r.rows[0]);
  }

  // --- Cookie Categorias ---

  async obterCookieCategorias(apenasAtivas = false) {
    const where = apenasAtivas ? 'WHERE ativo = true' : '';
    const r = await this.pool.query(
      `SELECT * FROM cookie_categorias ${where} ORDER BY ordem ASC, id ASC`
    );
    return r.rows.map(row => toCamelCase(row));
  }

  async criarCookieCategoria({ chave, nome, descricao, ativo = true, obrigatorio = false, ordem = 0 }) {
    const now = new Date().toISOString();
    const r = await this.pool.query(
      `INSERT INTO cookie_categorias (chave, nome, descricao, ativo, obrigatorio, ordem, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *`,
      [chave, nome, descricao, ativo, obrigatorio, ordem, now]
    );
    return toCamelCase(r.rows[0]);
  }

  async atualizarCookieCategoria(id, { nome, descricao, ativo, obrigatorio, ordem }) {
    const now = new Date().toISOString();
    const fields = [];
    const values = [id];
    if (nome !== undefined) { values.push(nome); fields.push(`nome = $${values.length}`); }
    if (descricao !== undefined) { values.push(descricao); fields.push(`descricao = $${values.length}`); }
    if (ativo !== undefined) { values.push(ativo); fields.push(`ativo = $${values.length}`); }
    if (obrigatorio !== undefined) { values.push(obrigatorio); fields.push(`obrigatorio = $${values.length}`); }
    if (ordem !== undefined) { values.push(ordem); fields.push(`ordem = $${values.length}`); }
    values.push(now); fields.push(`updated_at = $${values.length}`);
    if (fields.length === 1) throw new Error('Nenhum campo para atualizar');
    const r = await this.pool.query(
      `UPDATE cookie_categorias SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );
    if (r.rows.length === 0) throw new Error('Categoria não encontrada');
    return toCamelCase(r.rows[0]);
  }

  async deletarCookieCategoria(id) {
    // Não permite deletar categorias obrigatórias
    const check = await this.pool.query(
      'SELECT id, obrigatorio FROM cookie_categorias WHERE id = $1', [id]
    );
    if (check.rows.length === 0) return null;
    if (check.rows[0].obrigatorio) return null; // sinaliza que não pode deletar
    const r = await this.pool.query(
      'DELETE FROM cookie_categorias WHERE id = $1 RETURNING *', [id]
    );
    return toCamelCase(r.rows[0]);
  }

  // --- Consentimentos LGPD ---

  async obterConsentimentoUsuario(userId) {
    const r = await this.pool.query(
      `SELECT * FROM cookie_consentimentos WHERE user_id = $1`, [userId]
    );
    if (r.rows.length === 0) return null;
    return toCamelCase(r.rows[0]);
  }

  async salvarConsentimentoUsuario(userId, preferencias, versaoTermos, versaoPolitica, ipAddress, userAgent) {
    const now = new Date().toISOString();
    const r = await this.pool.query(
      `INSERT INTO cookie_consentimentos
         (user_id, preferencias, versao_termos, versao_politica, ip_address, user_agent, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
       ON CONFLICT (user_id) DO UPDATE SET
         preferencias = EXCLUDED.preferencias,
         versao_termos = EXCLUDED.versao_termos,
         versao_politica = EXCLUDED.versao_politica,
         ip_address = EXCLUDED.ip_address,
         user_agent = EXCLUDED.user_agent,
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [userId, JSON.stringify(preferencias), versaoTermos || 1, versaoPolitica || 1, ipAddress, userAgent ? userAgent.substring(0, 500) : null, now]
    );
    return toCamelCase(r.rows[0]);
  }

  // --- Permissões Legais ---

  async obterPermissoesLegais(userId) {
    const r = await this.pool.query(
      `SELECT permissoes_legais FROM users WHERE id = $1`, [userId]
    );
    if (r.rows.length === 0) return null;
    return r.rows[0].permissoes_legais || {};
  }

  async atualizarPermissoesLegais(userId, permissoes) {
    const now = new Date().toISOString();
    const r = await this.pool.query(
      `UPDATE users SET permissoes_legais = $1, updated_at = $2 WHERE id = $3 RETURNING id, username, permissoes_legais`,
      [JSON.stringify(permissoes), now, userId]
    );
    if (r.rows.length === 0) throw new Error('Usuário não encontrado');
    return toCamelCase(r.rows[0]);
  }

  // ========== RODAPÉ — BOTTOM LINKS ==========

  async obterRodapeBottomLinksAdmin() {
    const r = await this.pool.query(
      `SELECT * FROM rodape_bottom_links ORDER BY ordem ASC, created_at ASC`
    );
    return r.rows.map(row => ({
      id: row.id, texto: row.texto, link: row.link, ativo: row.ativo, ordem: row.ordem,
    }));
  }

  async criarRodapeBottomLink({ texto, link, ativo }) {
    const id = this.generateId();
    const now = new Date().toISOString();
    const ordemRes = await this.pool.query(
      `SELECT COALESCE(MAX(ordem), -1) + 1 AS prox FROM rodape_bottom_links`
    );
    const ordem = ordemRes.rows[0].prox;
    const r = await this.pool.query(
      `INSERT INTO rodape_bottom_links (id, texto, link, ativo, ordem, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING *`,
      [id, texto, link || '', ativo !== false, ordem, now]
    );
    const row = r.rows[0];
    return { id: row.id, texto: row.texto, link: row.link, ativo: row.ativo, ordem: row.ordem };
  }

  async atualizarRodapeBottomLink(id, { texto, link, ativo }) {
    const now = new Date().toISOString();
    const fields = [];
    const values = [id];
    if (texto !== undefined) { values.push(texto); fields.push(`texto = $${values.length}`); }
    if (link  !== undefined) { values.push(link);  fields.push(`link = $${values.length}`); }
    if (ativo !== undefined) { values.push(ativo); fields.push(`ativo = $${values.length}`); }
    values.push(now); fields.push(`updated_at = $${values.length}`);
    const r = await this.pool.query(
      `UPDATE rodape_bottom_links SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );
    if (r.rows.length === 0) throw new Error('Link não encontrado');
    const row = r.rows[0];
    return { id: row.id, texto: row.texto, link: row.link, ativo: row.ativo, ordem: row.ordem };
  }

  async deletarRodapeBottomLink(id) {
    const r = await this.pool.query(
      `DELETE FROM rodape_bottom_links WHERE id = $1 RETURNING *`, [id]
    );
    if (r.rows.length === 0) throw new Error('Link não encontrado');
    return r.rows[0];
  }

  async atualizarOrdemBottomLinks(linkIds) {
    const now = new Date().toISOString();
    for (let i = 0; i < linkIds.length; i++) {
      await this.pool.query(
        `UPDATE rodape_bottom_links SET ordem = $1, updated_at = $2 WHERE id = $3`,
        [i, now, linkIds[i]]
      );
    }
  }

  // ========== RODAPÉ — COMMITS PENDENTES (FILA / CARROSSEL) ==========

  /**
   * Retorna a fila de commits que ainda não foram processados pelo superadmin,
   * ordenados do mais antigo para o mais novo, junto com a versão atual do
   * sistema (usada como referência no formulário do carrossel).
   */
  async obterCommitsPendentes() {
    const versaoRes = await this.pool.query(
      `SELECT valor FROM rodape_configuracoes WHERE chave = 'versao_sistema'`
    );
    const versaoAtual = versaoRes.rows.length > 0 ? (versaoRes.rows[0].valor || '') : '';

    const r = await this.pool.query(
      `SELECT commit_hash, mensagem, data, detectado_em
         FROM commits_pendentes
         ORDER BY detectado_em ASC`
    );

    return {
      versaoAtual,
      commits: r.rows.map(row => ({
        commitHash: row.commit_hash,
        mensagem: row.mensagem || '',
        data: row.data || '',
        detectadoEm: row.detectado_em,
      })),
    };
  }

  /**
   * Processa um commit do carrossel.
   * action:            'manter' | 'nova_versao' | 'ignorar'
   * novaVersao:        string (quando action = 'nova_versao')
   * mensagem:          texto editado pelo superadmin
   * data:              data do commit (DD/MM/YYYY)
   * commitHash:        hash do commit
   * rolesNotificados:  string[] (roles que receberão notificação)
   * manterSessionId:   id que agrupa todos os "manter" da mesma sessão de
   *                    carrossel num único card consolidado para os usuários
   *
   * Em "nova_versao": se a versão informada já é a atual e a seção já existe
   * nas notas (ex: vários commits do carrossel reusando a versão sticky), o
   * item é apenas adicionado à seção existente, sem duplicar o cabeçalho. A
   * notificação aos usuários também consolida em um único card.
   */
  async confirmarCommit({ action, novaVersao, mensagem, data, commitHash, rolesNotificados = [], manterSessionId }) {
    const now = new Date().toISOString();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Marca como confirmado (compat com código antigo) e remove da fila
      await client.query(
        `INSERT INTO rodape_configuracoes (chave, valor, updated_at)
         VALUES ('ultimo_commit_confirmado', $1, $2)
         ON CONFLICT (chave) DO UPDATE SET valor = $1, updated_at = $2`,
        [commitHash, now]
      );
      await client.query(`DELETE FROM commits_pendentes WHERE commit_hash = $1`, [commitHash]);

      if (action === 'ignorar') {
        await client.query('COMMIT');
        return { ok: true };
      }

      const novoItem = `<li><strong>${data}</strong> — ${mensagem}</li>`;
      const notasRes = await client.query(
        `SELECT valor FROM rodape_configuracoes WHERE chave = 'notas_versao'`
      );
      let notas = notasRes.rows.length > 0 ? (notasRes.rows[0].valor || '') : '';

      if (action === 'nova_versao' && novaVersao) {
        // Detecta se a seção desta versão já existe (caso sticky no carrossel)
        const versaoAtualRes = await client.query(`SELECT valor FROM rodape_configuracoes WHERE chave = 'versao_sistema'`);
        const versaoAtual = versaoAtualRes.rows.length > 0 ? (versaoAtualRes.rows[0].valor || '') : '';
        const secaoJaExiste = versaoAtual === novaVersao && notas.includes(`<h2>Versão ${novaVersao}</h2>`);

        if (secaoJaExiste) {
          // Apenas adiciona o item na seção existente (não duplica cabeçalho)
          notas = notas.includes('<!--COMMITS-->')
            ? notas.replace('<!--COMMITS-->', `<!--COMMITS-->\n${novoItem}`)
            : notas.replace(
                `<h2>Versão ${novaVersao}</h2>`,
                `<h2>Versão ${novaVersao}</h2>\n<ul>\n<!--COMMITS-->\n${novoItem}\n</ul>`
              );
        } else {
          await client.query(
            `INSERT INTO rodape_configuracoes (chave, valor, updated_at)
             VALUES ('versao_sistema', $1, $2)
             ON CONFLICT (chave) DO UPDATE SET valor = $1, updated_at = $2`,
            [novaVersao, now]
          );

          const novaSecao = `<h2>Versão ${novaVersao}</h2>\n<h3>📋 Atualizações</h3>\n<ul>\n<!--COMMITS-->\n${novoItem}\n</ul>\n<hr>\n`;
          notas = notas.includes('<h2>') ? notas.replace('<h2>', novaSecao + '<h2>') : novaSecao + notas;
        }

        // Notificação aos usuários: UPSERT — consolida vários itens da mesma versão
        const existeNotifRes = await client.query(`SELECT texto FROM versao_notificacoes WHERE versao = $1`, [novaVersao]);
        if (existeNotifRes.rows.length > 0) {
          const textoAtual = existeNotifRes.rows[0].texto || '';
          const textoNovo = textoAtual ? `${textoAtual}\n• ${mensagem}` : `• ${mensagem}`;
          await client.query(
            `UPDATE versao_notificacoes
                SET texto = $2, roles = $3, criado_em = $4, tipo = 'versao', versao_referencia = $1
              WHERE versao = $1`,
            [novaVersao, textoNovo, JSON.stringify(rolesNotificados), now]
          );
          // Reseta vistas para usuários revejam o card consolidado atualizado
          await client.query(`DELETE FROM versao_notificacoes_vistas WHERE versao = $1`, [novaVersao]).catch(() => {});
        } else {
          await client.query(
            `INSERT INTO versao_notificacoes (versao, texto, roles, criado_em, tipo, versao_referencia)
             VALUES ($1, $2, $3, $4, 'versao', $1)`,
            [novaVersao, mensagem, JSON.stringify(rolesNotificados), now]
          );
        }
      } else {
        // action === 'manter': adiciona o item na seção atual das notas
        if (notas.includes('<!--COMMITS-->')) {
          notas = notas.replace('<!--COMMITS-->', `<!--COMMITS-->\n${novoItem}`);
        } else {
          notas = `<ul>\n<!--COMMITS-->\n${novoItem}\n</ul>\n` + notas;
        }

        // Notifica usuários (consolidando todos os "manter" da mesma sessão num único card)
        if (manterSessionId && Array.isArray(rolesNotificados) && rolesNotificados.length > 0) {
          const versaoRefRes = await client.query(`SELECT valor FROM rodape_configuracoes WHERE chave = 'versao_sistema'`);
          const versaoRef = versaoRefRes.rows.length > 0 ? (versaoRefRes.rows[0].valor || '') : '';
          const chave = `m:${manterSessionId}`;
          const itemBullet = `• ${mensagem}`;

          const existeRes = await client.query(`SELECT texto FROM versao_notificacoes WHERE versao = $1`, [chave]);
          if (existeRes.rows.length > 0) {
            const textoAtual = existeRes.rows[0].texto || '';
            const textoNovo = textoAtual ? `${textoAtual}\n${itemBullet}` : itemBullet;
            await client.query(
              `UPDATE versao_notificacoes
                  SET texto = $2, roles = $3, criado_em = $4, tipo = 'aviso', versao_referencia = $5
                WHERE versao = $1`,
              [chave, textoNovo, JSON.stringify(rolesNotificados), now, versaoRef]
            );
            await client.query(`DELETE FROM versao_notificacoes_vistas WHERE versao = $1`, [chave]).catch(() => {});
          } else {
            await client.query(
              `INSERT INTO versao_notificacoes (versao, texto, roles, criado_em, tipo, versao_referencia)
               VALUES ($1, $2, $3, $4, 'aviso', $5)`,
              [chave, itemBullet, JSON.stringify(rolesNotificados), now, versaoRef]
            );
          }
        }
      }

      await client.query(
        `UPDATE rodape_configuracoes SET valor = $1, updated_at = $2 WHERE chave = 'notas_versao'`,
        [notas, now]
      );

      await client.query('COMMIT');
      return { ok: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Verifica se o usuário precisa ver a notificação de nova versão.
   */
  async obterNotificacaoVersao(userId, userRole) {
    const r = await this.pool.query(
      `SELECT n.versao, n.texto, n.roles, n.criado_em, n.tipo, n.versao_referencia
         FROM versao_notificacoes n
         LEFT JOIN versao_notificacoes_vistas v
           ON v.versao = n.versao AND v.user_id = $1
        WHERE v.versao IS NULL
        ORDER BY n.criado_em ASC`,
      [userId]
    ).catch(() => ({ rows: [] }));

    const versoes = [];
    for (const row of r.rows) {
      let roles = [];
      try { roles = JSON.parse(row.roles || '[]'); } catch { roles = []; }
      if (!roles.includes(userRole)) continue;
      versoes.push({
        versao: row.versao,
        texto: row.texto || '',
        criadoEm: row.criado_em,
        tipo: row.tipo || 'versao',
        versaoReferencia: row.versao_referencia || row.versao,
      });
    }

    if (versoes.length === 0) return { notificar: false, versoes: [] };
    return { notificar: true, versoes };
  }

  /**
   * Marca que o usuário já viu a notificação de nova versão.
   */
  async marcarVersaoVista(userId, versao) {
    await this.pool.query(
      `INSERT INTO versao_notificacoes_vistas (user_id, versao)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, versao]
    ).catch(() => {}); // silencia se a tabela ainda não existir
  }
}

module.exports = Database;
