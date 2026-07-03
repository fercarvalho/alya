#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// validate-sync-points.js — melhoria #6 do doc 12.
//
// Confere que os "3 pontos de sincronização" de módulos concordam:
//   1. manifest.ts (front)     — SUBSYSTEMS[].moduleKeys
//   2. tabela subsystems (DB)  — subsystem_key
//   3. tabela modules (DB)     — key + subsystem_key
//
// Para cada subsistema do manifest, compara seus moduleKeys com os módulos
// ativos daquele subsystem_key na tabela `modules`. Diverge → sai com código 1.
//
// Uso: node validate-sync-points.js   (ou npm run validate:sync)
// ═══════════════════════════════════════════════════════════════════════════

'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const MANIFEST = path.join(__dirname, '..', 'src', 'subsistemas', 'manifest.ts');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'alya',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Extrai { key, moduleKeys[] } de cada subsistema do manifest via regex.
function parseManifest() {
  const src = fs.readFileSync(MANIFEST, 'utf8');
  const out = [];
  const re = /key:\s*'([^']+)'[\s\S]*?moduleKeys:\s*\[([\s\S]*?)\]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const key = m[1];
    const keys = [...m[2].matchAll(/'([^']+)'/g)].map(x => x[1]);
    out.push({ key, moduleKeys: keys });
  }
  return out;
}

async function main() {
  const manifest = parseManifest();
  if (!manifest.length) {
    console.error('✗ Não consegui extrair subsistemas do manifest.ts');
    process.exit(1);
  }

  const subsRes = await pool.query('SELECT subsystem_key FROM subsystems');
  const dbSubs = new Set(subsRes.rows.map(r => r.subsystem_key));

  let problems = 0;
  for (const sub of manifest) {
    if (!dbSubs.has(sub.key)) {
      console.error(`✗ Subsistema '${sub.key}' está no manifest mas NÃO na tabela subsystems.`);
      problems++;
      continue;
    }
    const modRes = await pool.query(
      'SELECT key FROM modules WHERE subsystem_key = $1 AND is_active = TRUE', [sub.key]
    );
    const dbKeys = new Set(modRes.rows.map(r => r.key));
    const manifestKeys = new Set(sub.moduleKeys);

    const soNoManifest = [...manifestKeys].filter(k => !dbKeys.has(k));
    const soNoDb = [...dbKeys].filter(k => !manifestKeys.has(k));

    if (soNoManifest.length || soNoDb.length) {
      console.error(`✗ Subsistema '${sub.key}' divergente:`);
      if (soNoManifest.length) console.error(`    no manifest, faltam no DB: ${soNoManifest.join(', ')}`);
      if (soNoDb.length) console.error(`    no DB (modules), faltam no manifest: ${soNoDb.join(', ')}`);
      problems++;
    } else {
      console.log(`✓ ${sub.key}: ${manifestKeys.size} módulos concordam (manifest ↔ subsystems ↔ modules).`);
    }
  }

  await pool.end();
  if (problems) {
    console.error(`\n✗ ${problems} subsistema(s) com divergência nos 3 sync points.`);
    process.exit(1);
  }
  console.log('\n✓ Todos os 3 sync points concordam.');
}

main().catch(e => { console.error(e); process.exit(1); });
