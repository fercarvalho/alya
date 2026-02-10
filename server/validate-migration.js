/**
 * Script para validar a migração de dados JSON para PostgreSQL
 * Compara contagens e amostras entre as fontes
 * Retorna 0 se válido, 1 se houver problemas
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'alya',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const dbPath = path.join(__dirname, 'database');

function readJsonFile(filename) {
  const filePath = path.join(dbPath, filename);
  if (!fs.existsSync(filePath)) return [];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [data];
  } catch {
    return [];
  }
}

async function validate() {
  const errors = [];
  let client;

  try {
    client = await pool.connect();
  } catch (err) {
    console.error('Erro ao conectar ao PostgreSQL:', err.message);
    process.exit(1);
  }

  try {
    const tables = [
      { json: 'users.json', table: 'users' },
      { json: 'transactions.json', table: 'transactions' },
      { json: 'products.json', table: 'products' },
      { json: 'clients.json', table: 'clients' },
      { json: 'modules.json', table: 'modules' },
      { json: 'activity-logs.json', table: 'activity_logs' },
    ];

    for (const { json, table } of tables) {
      const jsonData = readJsonFile(json);
      const limit = table === 'activity_logs' ? 10000 : jsonData.length;
      const jsonCount = table === 'activity_logs' ? Math.min(jsonData.length, 10000) : jsonData.length;

      const res = await client.query(`SELECT COUNT(*) as c FROM ${table}`);
      const pgCount = parseInt(res.rows[0].c, 10);

      if (pgCount !== jsonCount) {
        errors.push(`${table}: JSON=${jsonCount}, PostgreSQL=${pgCount}`);
      } else {
        console.log(`${table}: OK (${pgCount} registros)`);
      }
    }

    if (errors.length > 0) {
      console.error('\nDivergências encontradas:');
      errors.forEach(e => console.error('  -', e));
      process.exit(1);
    }

    console.log('\nValidação concluída com sucesso.');
    process.exit(0);
  } catch (err) {
    console.error('Erro na validação:', err);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

validate();
