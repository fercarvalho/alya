#!/usr/bin/env node

/**
 * CLI de Administração do Servidor Alya
 *
 * Uso:
 *   node scripts/server/admin.js --gen-key             Gera chaves de criptografia AES-256
 *   node scripts/server/admin.js --migrate-fields      Migra dados para campos criptografados
 *   node scripts/server/admin.js --migrate-fields --dry-run
 *   node scripts/server/admin.js --migrate-fields --table=clients
 */

const command = process.argv[2];

if (!command || command === '--help') {
  console.log('');
  console.log('Uso: node scripts/server/admin.js <comando>');
  console.log('');
  console.log('Comandos disponíveis:');
  console.log('  --gen-key                        Gera chaves ENCRYPTION_KEY e ENCRYPTION_SALT');
  console.log('  --migrate-fields                 Migra dados para campos criptografados');
  console.log('  --migrate-fields --dry-run       Simula a migração sem alterar dados');
  console.log('  --migrate-fields --table=nome    Migra tabela específica (padrão: clients)');
  console.log('');
  process.exit(0);
}

// ─────────────────────────────────────────────
// --gen-key: Gera chaves de criptografia
// ─────────────────────────────────────────────
if (command === '--gen-key') {
  const crypto = require('crypto');

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('         Gerador de Chave de Criptografia (AES-256)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  const key  = crypto.randomBytes(32).toString('base64');
  const salt = crypto.randomBytes(64).toString('base64');

  console.log('✅ Chaves geradas com sucesso!');
  console.log('');
  console.log('Adicione ao arquivo server/.env:');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`ENCRYPTION_KEY=${key}`);
  console.log(`ENCRYPTION_SALT=${salt}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('⚠️  IMPORTANTE:');
  console.log('   1. NUNCA commite estas chaves no Git!');
  console.log('   2. Guarde em local seguro (ex: 1Password, Bitwarden)');
  console.log('   3. Use chaves diferentes em dev/staging/produção');
  console.log('   4. Rotacione a cada 90 dias');
  console.log('');
  process.exit(0);
}

// ─────────────────────────────────────────────
// --migrate-fields: Migra dados para criptografia
// ─────────────────────────────────────────────
if (command === '--migrate-fields') {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../server/.env') });

  const { Pool } = require('pg');
  const { encrypt, hash } = require('../../server/utils/encryption');

  const args      = process.argv.slice(3);
  const isDryRun  = args.includes('--dry-run');
  const tableArg  = args.find(arg => arg.startsWith('--table='));
  const tableName = tableArg ? tableArg.split('=')[1] : 'clients';

  const pool = new Pool({
    host:     process.env.DB_HOST || 'localhost',
    port:     process.env.DB_PORT || 5432,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('       Migração de Campos Criptografados');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`Tabela: ${tableName}`);
  console.log(`Modo: ${isDryRun ? '🔍 DRY-RUN (sem alterações)' : '✏️  PRODUÇÃO (vai alterar dados)'}`);
  console.log('');

  async function checkTableStructure() {
    const result = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = $1
        AND column_name IN ('cpf_encrypted','phone_encrypted','email_encrypted','address_encrypted')
    `, [tableName]);
    return result.rows.map(r => r.column_name);
  }

  async function countPendingRecords() {
    const result = await pool.query(`
      SELECT COUNT(*) as count FROM ${tableName}
      WHERE (cpf IS NOT NULL AND cpf_encrypted IS NULL)
         OR (phone IS NOT NULL AND phone_encrypted IS NULL)
         OR (email IS NOT NULL AND email_encrypted IS NULL)
         OR (address IS NOT NULL AND address_encrypted IS NULL)
    `);
    return parseInt(result.rows[0].count);
  }

  async function getPendingRecords(limit, offset) {
    const result = await pool.query(`
      SELECT * FROM ${tableName}
      WHERE (cpf IS NOT NULL AND cpf_encrypted IS NULL)
         OR (phone IS NOT NULL AND phone_encrypted IS NULL)
         OR (email IS NOT NULL AND email_encrypted IS NULL)
         OR (address IS NOT NULL AND address_encrypted IS NULL)
      ORDER BY id LIMIT $1 OFFSET $2
    `, [limit, offset]);
    return result.rows;
  }

  async function migrateRecord(record) {
    const updates = [], values = [];
    let i = 1;

    if (record.cpf && !record.cpf_encrypted) {
      updates.push(`cpf_encrypted = $${i++}`); values.push(encrypt(record.cpf));
      updates.push(`cpf_hash = $${i++}`);       values.push(hash(record.cpf));
    }
    if (record.phone && !record.phone_encrypted) {
      updates.push(`phone_encrypted = $${i++}`); values.push(encrypt(record.phone));
    }
    if (record.email && !record.email_encrypted) {
      updates.push(`email_encrypted = $${i++}`); values.push(encrypt(record.email));
      updates.push(`email_hash = $${i++}`);       values.push(hash(record.email));
    }
    if (record.address && !record.address_encrypted) {
      updates.push(`address_encrypted = $${i++}`); values.push(encrypt(record.address));
    }

    if (updates.length === 0) return { updated: false };

    values.push(record.id);
    const query = `UPDATE ${tableName} SET ${updates.join(', ')} WHERE id = $${i}`;
    if (!isDryRun) await pool.query(query, values);
    return { updated: true, query };
  }

  async function main() {
    try {
      console.log('⏳ Verificando estrutura da tabela...');
      const fields = await checkTableStructure();
      if (fields.length === 0) {
        console.error('❌ Campos criptografados não encontrados. Execute a migration 004 primeiro.');
        process.exit(1);
      }
      console.log(`✅ Campos encontrados: ${fields.join(', ')}\n`);

      const total = await countPendingRecords();
      if (total === 0) { console.log('✅ Nenhum registro pendente.'); process.exit(0); }
      console.log(`📊 Registros pendentes: ${total}\n`);

      const BATCH = 100;
      let offset = 0, migrated = 0, errors = 0;

      while (offset < total) {
        const records = await getPendingRecords(BATCH, offset);
        if (records.length === 0) break;
        for (const record of records) {
          try {
            const r = await migrateRecord(record);
            if (r.updated) migrated++;
          } catch (e) {
            errors++;
            console.error(`❌ Erro ID ${record.id}: ${e.message}`);
          }
        }
        offset += BATCH;
        if (!isDryRun) process.stdout.write(`\r⏳ ${Math.min(100, ((offset/total)*100).toFixed(1))}% (${Math.min(offset,total)}/${total})`);
      }

      if (!isDryRun) process.stdout.write('\n');
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log(`✅ Migrados: ${migrated} | ❌ Erros: ${errors}`);
      if (isDryRun) console.log('\n🔍 DRY-RUN: nenhuma alteração feita. Remova --dry-run para executar.');
      else console.log('\n✅ Migração concluída! Valide a aplicação antes de remover campos antigos.');
      console.log('');
    } catch (e) {
      console.error('❌ Erro fatal:', e);
      process.exit(1);
    } finally {
      await pool.end();
    }
  }

  main();
  return;
}

console.error(`❌ Comando desconhecido: ${command}`);
console.error('   Use --help para ver os comandos disponíveis.');
process.exit(1);
