#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// run-migrations.js — runner de migrations (melhoria #2 do doc 12).
//
// Aplica os arquivos server/migrations/NNN - *.sql (exclui os *-rollback) em
// ordem numérica, registrando cada um em schema_migrations. As migrations do
// projeto já são idempotentes (IF NOT EXISTS / ON CONFLICT) e trazem seu próprio
// BEGIN/COMMIT — o runner só decide QUAIS rodar e registra o que aplicou.
//
// NÃO substitui o fluxo manual (psql -f) — é uma ferramenta a mais.
//
// Uso:
//   node run-migrations.js            → aplica as migrations ainda não registradas
//   node run-migrations.js --baseline → registra as existentes como aplicadas
//                                        SEM executá-las (para bancos já migrados
//                                        à mão, como este projeto até a 036)
//   node run-migrations.js --status   → lista aplicadas x pendentes e sai
// ═══════════════════════════════════════════════════════════════════════════

'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DIR = path.join(__dirname, 'migrations');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'alya',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Lista as migrations forward, ordenadas por número (NNN no início do nome).
function listMigrations() {
  return fs.readdirSync(DIR)
    .filter(f => f.endsWith('.sql') && !f.includes('-rollback'))
    .map(f => {
      const m = f.match(/^(\d+)\s*-\s*(.+)\.sql$/);
      return m ? { version: m[1], name: f, file: path.join(DIR, f) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));
}

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    VARCHAR(16)  PRIMARY KEY,
      name       TEXT         NOT NULL,
      applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )`);
}

async function appliedVersions() {
  const r = await pool.query('SELECT version FROM schema_migrations');
  return new Set(r.rows.map(x => x.version));
}

async function main() {
  const baseline = process.argv.includes('--baseline');
  const statusOnly = process.argv.includes('--status');

  await ensureTable();
  const done = await appliedVersions();
  const migs = listMigrations();
  const pending = migs.filter(m => !done.has(m.version));

  if (statusOnly) {
    console.log(`Aplicadas: ${migs.length - pending.length} / ${migs.length}`);
    pending.forEach(m => console.log('  pendente:', m.name));
    await pool.end();
    return;
  }

  if (!pending.length) {
    console.log('Nada a fazer — todas as migrations já estão registradas.');
    await pool.end();
    return;
  }

  for (const mig of pending) {
    if (baseline) {
      await pool.query(
        'INSERT INTO schema_migrations (version, name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [mig.version, mig.name]
      );
      console.log('baseline (registrado, não executado):', mig.name);
      continue;
    }
    const sql = fs.readFileSync(mig.file, 'utf8');
    console.log('aplicando:', mig.name, '...');
    try {
      await pool.query(sql); // a migration traz seu próprio BEGIN/COMMIT
      await pool.query(
        'INSERT INTO schema_migrations (version, name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [mig.version, mig.name]
      );
      console.log('  ✓', mig.name);
    } catch (e) {
      console.error('  ✗ FALHOU:', mig.name, '—', e.message);
      await pool.end();
      process.exit(1);
    }
  }
  console.log(`migrate: ${pending.length} migration(s) processada(s).`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
