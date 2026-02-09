/**
 * Implementação do Database usando PostgreSQL.
 * Inclui entidades core e módulo de Projeção.
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const FileDatabase = require('./database');

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
  const u = toCamelCase(row);
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
  }

  async _ensurePgDefaults() {
    try {
      const userRes = await this.pool.query('SELECT COUNT(*) FROM users');
      if (parseInt(userRes.rows[0].count, 10) === 0) {
        const ph = bcrypt.hashSync('FIRST_LOGIN_PLACEHOLDER', 10);
        const defaults = [
          ['admin', ph, 'admin', ['dashboard', 'transactions', 'products', 'clients', 'reports', 'metas', 'dre', 'projecao', 'admin']],
          ['user', ph, 'user', ['dashboard', 'transactions', 'products', 'clients', 'reports', 'metas', 'dre']],
          ['guest', ph, 'guest', ['dashboard', 'metas', 'reports', 'dre']],
        ];
        for (const [username, password, role, modules] of defaults) {
          const id = this.generateId();
          await this.pool.query(
            'INSERT INTO users (id, username, password, role, modules, is_active) VALUES ($1, $2, $3, $4, $5, true)',
            [id, username, password, role, modules]
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
      `INSERT INTO transactions (id, date, description, value, type, category, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, date, transaction.description || '', parseFloat(transaction.value) || 0, transaction.type || 'Outros', transaction.category || null, now, now]
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
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id, date, data.description, data.value != null ? parseFloat(data.value) : null, data.type, data.category]
    );
    if (r.rows.length === 0) throw new Error('Transação não encontrada');
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

  async deleteClient(id) {
    const r = await this.pool.query('DELETE FROM clients WHERE id = $1', [id]);
    return r.rowCount > 0;
  }

  async deleteMultipleClients(ids) {
    const r = await this.pool.query('DELETE FROM clients WHERE id = ANY($1)', [ids]);
    return r.rowCount > 0;
  }

  async getAllUsers() {
    try {
      const r = await this.pool.query('SELECT * FROM users ORDER BY created_at DESC');
      return r.rows.map(parseUser);
    } catch (e) {
      console.error('Erro ao ler usuários:', e);
      return [];
    }
  }

  async getUserByUsername(username) {
    try {
      const r = await this.pool.query('SELECT * FROM users WHERE username = $1', [username]);
      return r.rows.length ? parseUser(r.rows[0]) : null;
    } catch (e) {
      console.error('Erro ao buscar usuário:', e);
      return null;
    }
  }

  async getUserById(id) {
    try {
      const r = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return r.rows.length ? parseUser(r.rows[0]) : null;
    } catch (e) {
      console.error('Erro ao buscar usuário:', e);
      return null;
    }
  }

  async saveUser(userData) {
    const id = this.generateId();
    const now = new Date().toISOString();
    const addr = userData.address ? JSON.stringify(userData.address) : null;
    await this.pool.query(
      `INSERT INTO users (id, username, password, first_name, last_name, email, phone, photo_url, cpf, birth_date, gender, position, address, role, modules, is_active, last_login, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [id, userData.username, userData.password || '', userData.firstName || null, userData.lastName || null, userData.email || null, userData.phone || null, userData.photoUrl || null, userData.cpf || null, userData.birthDate || null, userData.gender || null, userData.position || null, addr, userData.role || 'user', userData.modules || [], userData.isActive !== false, userData.lastLogin || null, now, now]
    );
    return this.getUserById(id);
  }

  async updateUser(id, data) {
    const fields = [];
    const vals = [];
    let i = 1;
    const map = {
      firstName: 'first_name', lastName: 'last_name', email: 'email', phone: 'phone', photoUrl: 'photo_url',
      cpf: 'cpf', birthDate: 'birth_date', gender: 'gender', position: 'position', address: 'address',
      role: 'role', modules: 'modules', isActive: 'is_active', password: 'password', lastLogin: 'last_login',
    };
    for (const [camel, col] of Object.entries(map)) {
      if (data[camel] === undefined) continue;
      fields.push(`${col} = $${i++}`);
      vals.push(col === 'address' && typeof data[camel] === 'object' ? JSON.stringify(data[camel]) : data[camel]);
    }
    if (fields.length === 0) return this.getUserById(id);
    fields.push('updated_at = CURRENT_TIMESTAMP');
    vals.push(id);
    const r = await this.pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, vals);
    if (r.rows.length === 0) throw new Error('Usuário não encontrado');
    return parseUser(r.rows[0]);
  }

  async deleteUser(id) {
    const r = await this.pool.query('DELETE FROM users WHERE id = $1', [id]);
    if (r.rowCount === 0) throw new Error('Usuário não encontrado');
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
      const r = await this.pool.query('SELECT * FROM modules ORDER BY created_at DESC');
      return toCamelCase(r.rows);
    } catch (e) {
      console.error('Erro ao ler módulos:', e);
      return [];
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
    const id = this.generateId();
    const now = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO modules (id, name, key, icon, description, route, is_active, is_system, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, data.name || '', data.key || '', data.icon || null, data.description || null, data.route || null, data.isActive !== false, data.isSystem || false, now, now]
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
    const fields = [];
    const vals = [];
    let i = 1;
    for (const [camel, col] of [['name', 'name'], ['key', 'key'], ['icon', 'icon'], ['description', 'description'], ['route', 'route'], ['isActive', 'is_active']]) {
      if (data[camel] === undefined) continue;
      fields.push(`${col} = $${i++}`);
      vals.push(data[camel]);
    }
    if (fields.length === 0) return this.getSystemModuleById(id);
    fields.push('updated_at = CURRENT_TIMESTAMP');
    vals.push(id);
    const r = await this.pool.query(`UPDATE modules SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, vals);
    if (r.rows.length === 0) throw new Error('Módulo não encontrado');
    return toCamelCase(r.rows[0]);
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
    const mktPrevAuto = this.normalizeMonthArray(mktTotalsBase, 0);
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
}

module.exports = Database;
