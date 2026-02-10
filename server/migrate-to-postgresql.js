/**
 * Script para migrar dados dos arquivos JSON para PostgreSQL
 * Execute após criar o schema: npm run migrate
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'alya',
  user: process.env.DB_USER || 'fernandocarvalho',
  password: process.env.DB_PASSWORD || 'Korjup-qahwev-9tydbe',
});

const dbPath = path.join(__dirname, 'database');

function parseDate(dateStr) {
  if (!dateStr) return null;
  if (typeof dateStr !== 'string') return dateStr;
  const str = dateStr.trim();
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const month = parseInt(m, 10);
    const day = parseInt(d, 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${y}-${m}-${d}`;
    }
  }
  const parts = str.split(/[\/\-\.]/);
  if (parts.length >= 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);
    let y, m, d;
    if (parts[0].length === 4) {
      y = p0; m = p1; d = p2;
    } else if (parts[2].length === 4) {
      y = p2;
      if (p0 > 12) {
        d = p0; m = p1;
      } else if (p1 > 12) {
        m = p0; d = p1;
      } else {
        m = p0; d = p1;
      }
    } else {
      d = p0; m = p1; y = p2;
    }
    const month0 = m - 1;
    if (d >= 1 && d <= 31 && month0 >= 0 && month0 <= 11 && y > 1900) {
      const date = new Date(y, month0, d);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    return new Date().toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

function readJsonFile(filename) {
  const filePath = path.join(dbPath, filename);
  if (!fs.existsSync(filePath)) return [];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [data];
  } catch (e) {
    console.warn(`Aviso: não foi possível ler ${filename}:`, e.message);
    return [];
  }
}

async function migrateData() {
  const client = await pool.connect();
  const report = { users: 0, transactions: 0, products: 0, clients: 0, modules: 0, activity_logs: 0 };

  try {
    await client.query('SELECT 1');
    console.log('Conexão com PostgreSQL estabelecida.\n');
  } catch (err) {
    console.error('Erro ao conectar ao PostgreSQL:', err.message);
    process.exit(1);
  }

  try {
    await client.query('BEGIN');
    console.log('Iniciando migração de dados...\n');

    const users = readJsonFile('users.json');
    console.log(`Migrando ${users.length} usuários...`);
    for (const u of users) {
      await client.query(`
        INSERT INTO users (id, username, password, first_name, last_name, email, phone, photo_url, cpf, birth_date, gender, position, address, role, modules, is_active, last_login, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (username) DO UPDATE SET
          id = EXCLUDED.id, password = EXCLUDED.password, first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name, email = EXCLUDED.email, phone = EXCLUDED.phone,
          photo_url = EXCLUDED.photo_url, cpf = EXCLUDED.cpf, birth_date = EXCLUDED.birth_date,
          gender = EXCLUDED.gender, position = EXCLUDED.position, address = EXCLUDED.address,
          role = EXCLUDED.role, modules = EXCLUDED.modules, is_active = EXCLUDED.is_active,
          last_login = EXCLUDED.last_login, created_at = EXCLUDED.created_at, updated_at = EXCLUDED.updated_at
      `, [
        u.id, u.username, u.password || '', u.firstName || null, u.lastName || null, u.email || null, u.phone || null,
        u.photoUrl || null, u.cpf || null, u.birthDate || null, u.gender || null, u.position || null,
        u.address ? JSON.stringify(u.address) : null, u.role || 'user', u.modules || [], u.isActive !== false,
        u.lastLogin || null, u.createdAt || new Date().toISOString(), u.updatedAt || new Date().toISOString()
      ]);
      report.users++;
    }
    console.log(`  ${report.users} usuários migrados.`);

    const transactions = readJsonFile('transactions.json');
    console.log(`Migrando ${transactions.length} transações...`);
    for (const t of transactions) {
      const date = parseDate(t.date) || new Date().toISOString().split('T')[0];
      await client.query(`
        INSERT INTO transactions (id, date, description, value, type, category, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `, [
        t.id, date, t.description || '', parseFloat(t.value) || 0, t.type || 'Outros', t.category || null,
        t.createdAt || new Date().toISOString(), t.updatedAt || new Date().toISOString()
      ]);
      report.transactions++;
    }
    console.log(`  ${report.transactions} transações migradas.`);

    const products = readJsonFile('products.json');
    console.log(`Migrando ${products.length} produtos...`);
    for (const p of products) {
      await client.query(`
        INSERT INTO products (id, name, category, price, cost, stock, sold, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `, [
        p.id, p.name || '', p.category || null, parseFloat(p.price) || 0, parseFloat(p.cost) || 0,
        parseInt(p.stock, 10) || 0, parseInt(p.sold, 10) || 0,
        p.createdAt || new Date().toISOString(), p.updatedAt || new Date().toISOString()
      ]);
      report.products++;
    }
    console.log(`  ${report.products} produtos migrados.`);

    const clients = readJsonFile('clients.json');
    console.log(`Migrando ${clients.length} clientes...`);
    for (const c of clients) {
      const addr = typeof c.address === 'object' ? JSON.stringify(c.address) : (c.address || null);
      await client.query(`
        INSERT INTO clients (id, name, email, phone, address, cpf, cnpj, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `, [
        c.id, c.name || '', c.email || null, c.phone || null, addr, c.cpf || null, c.cnpj || null,
        c.createdAt || new Date().toISOString(), c.updatedAt || new Date().toISOString()
      ]);
      report.clients++;
    }
    console.log(`  ${report.clients} clientes migrados.`);

    const modules = readJsonFile('modules.json');
    console.log(`Migrando ${modules.length} módulos...`);
    for (const m of modules) {
      await client.query(`
        INSERT INTO modules (id, name, key, icon, description, route, is_active, is_system, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (key) DO UPDATE SET
          id = EXCLUDED.id, name = EXCLUDED.name, icon = EXCLUDED.icon, description = EXCLUDED.description,
          route = EXCLUDED.route, is_active = EXCLUDED.is_active, is_system = EXCLUDED.is_system,
          created_at = EXCLUDED.created_at, updated_at = EXCLUDED.updated_at
      `, [
        m.id, m.name || '', m.key || '', m.icon || null, m.description || null, m.route || null,
        m.isActive !== false, m.isSystem || false,
        m.createdAt || new Date().toISOString(), m.updatedAt || new Date().toISOString()
      ]);
      report.modules++;
    }
    console.log(`  ${report.modules} módulos migrados.`);

    const logs = readJsonFile('activity-logs.json');
    const recentLogs = logs.slice(-10000);
    console.log(`Migrando ${recentLogs.length} logs de atividade (máx. 10000)...`);
    for (const l of recentLogs) {
      await client.query(`
        INSERT INTO activity_logs (id, user_id, username, action, module, entity_type, entity_id, details, timestamp, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING
      `, [
        l.id, l.userId || null, l.username || null, l.action || 'unknown', l.module || 'general',
        l.entityType || null, l.entityId || null, l.details ? JSON.stringify(l.details) : null,
        l.timestamp || new Date().toISOString(), l.ipAddress || null
      ]);
      report.activity_logs++;
    }
    console.log(`  ${report.activity_logs} logs migrados.`);

    await client.query('COMMIT');
    console.log('\nMigração concluída com sucesso.');
    console.log('Resumo:', report);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro durante a migração:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateData().then(() => process.exit(0)).catch(() => process.exit(1));
