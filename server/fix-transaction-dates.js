/**
 * Corrige as datas das transações no PostgreSQL a partir do arquivo JSON.
 * O JSON usa formato DD/MM/YYYY (brasileiro). Este script atualiza o banco.
 *
 * Uso: node fix-transaction-dates.js
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
const jsonPath = path.join(dbPath, 'transactions.json');

function parseDateFlexible(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const str = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.split('T')[0];
  const parts = str.split(/[\/\-\.]/);
  if (parts.length >= 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);
    let d, m, y;
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
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y > 1900) {
      const date = new Date(y, m - 1, d);
      if (!isNaN(date.getTime())) {
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
  }
  return null;
}

async function fixDates() {
  if (!fs.existsSync(jsonPath)) {
    console.error('Arquivo transactions.json não encontrado.');
    process.exit(1);
  }

  const txs = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const client = await pool.connect();

  try {
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const t of txs) {
      const correctDate = parseDateFlexible(t.date);
      if (!correctDate) {
        skipped++;
        continue;
      }

      const r = await client.query(
        'UPDATE transactions SET date = $2 WHERE id = $1 RETURNING date',
        [t.id, correctDate]
      );

      if (r.rowCount > 0) {
        updated++;
      } else {
        errors++;
      }
    }

    console.log(`Datas corrigidas: ${updated} transações atualizadas.`);
    if (skipped > 0) console.log(`  Ignoradas (data inválida): ${skipped}`);
    if (errors > 0) console.log(`  Não encontradas no banco: ${errors}`);
  } finally {
    client.release();
    await pool.end();
  }
}

fixDates().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
