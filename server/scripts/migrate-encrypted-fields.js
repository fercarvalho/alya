#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Script de Migração - Criptografar Campos Sensíveis
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Este script migra dados não-criptografados para campos criptografados.
 *
 * Processo:
 *   1. Ler registros com campos não-criptografados
 *   2. Criptografar cada campo sensível
 *   3. Calcular hash para busca
 *   4. Atualizar registro com dados criptografados
 *   5. (Opcional) Limpar campos antigos
 *
 * Uso:
 *   node scripts/migrate-encrypted-fields.js [--dry-run] [--table=clients]
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const { Pool } = require('pg');
const { encrypt, hash } = require('../utils/encryption');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Parse argumentos
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const tableArg = args.find(arg => arg.startsWith('--table='));
const tableName = tableArg ? tableArg.split('=')[1] : 'clients';

console.log('═══════════════════════════════════════════════════════════════');
console.log('       Migração de Campos Criptografados');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log(`Tabela: ${tableName}`);
console.log(`Modo: ${isDryRun ? '🔍 DRY-RUN (sem alterações)' : '✏️  PRODUÇÃO (vai alterar dados)'}`);
console.log('');

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verifica se tabela possui campos criptografados
 */
async function checkTableStructure() {
  const result = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = $1
      AND column_name IN ('cpf_encrypted', 'phone_encrypted', 'email_encrypted', 'address_encrypted')
  `, [tableName]);

  return result.rows.map(row => row.column_name);
}

/**
 * Conta registros que precisam de migração
 */
async function countPendingRecords() {
  const result = await pool.query(`
    SELECT COUNT(*) as count
    FROM ${tableName}
    WHERE (cpf IS NOT NULL AND cpf_encrypted IS NULL)
       OR (phone IS NOT NULL AND phone_encrypted IS NULL)
       OR (email IS NOT NULL AND email_encrypted IS NULL)
       OR (address IS NOT NULL AND address_encrypted IS NULL)
  `);

  return parseInt(result.rows[0].count);
}

/**
 * Busca registros que precisam de migração
 */
async function getPendingRecords(limit = 100, offset = 0) {
  const result = await pool.query(`
    SELECT *
    FROM ${tableName}
    WHERE (cpf IS NOT NULL AND cpf_encrypted IS NULL)
       OR (phone IS NOT NULL AND phone_encrypted IS NULL)
       OR (email IS NOT NULL AND email_encrypted IS NULL)
       OR (address IS NOT NULL AND address_encrypted IS NULL)
    ORDER BY id
    LIMIT $1 OFFSET $2
  `, [limit, offset]);

  return result.rows;
}

/**
 * Migra um único registro
 */
async function migrateRecord(record) {
  const updates = [];
  const values = [];
  let paramIndex = 1;

  // CPF
  if (record.cpf && !record.cpf_encrypted) {
    const encrypted = encrypt(record.cpf);
    const cpfHash = hash(record.cpf);

    updates.push(`cpf_encrypted = $${paramIndex++}`);
    values.push(encrypted);

    updates.push(`cpf_hash = $${paramIndex++}`);
    values.push(cpfHash);
  }

  // Telefone
  if (record.phone && !record.phone_encrypted) {
    const encrypted = encrypt(record.phone);

    updates.push(`phone_encrypted = $${paramIndex++}`);
    values.push(encrypted);
  }

  // Email
  if (record.email && !record.email_encrypted) {
    const encrypted = encrypt(record.email);
    const emailHash = hash(record.email);

    updates.push(`email_encrypted = $${paramIndex++}`);
    values.push(encrypted);

    updates.push(`email_hash = $${paramIndex++}`);
    values.push(emailHash);
  }

  // Endereço
  if (record.address && !record.address_encrypted) {
    const encrypted = encrypt(record.address);

    updates.push(`address_encrypted = $${paramIndex++}`);
    values.push(encrypted);
  }

  // Se nenhum campo precisa ser atualizado, retornar
  if (updates.length === 0) {
    return { updated: false };
  }

  // Adicionar ID no final
  values.push(record.id);

  const query = `
    UPDATE ${tableName}
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
  `;

  if (!isDryRun) {
    await pool.query(query, values);
  }

  return {
    updated: true,
    query: query,
    values: values.map((v, i) => i === values.length - 1 ? v : '***') // Ocultar valores sensíveis no log
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESSO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  try {
    // 1. Verificar estrutura da tabela
    console.log('⏳ Verificando estrutura da tabela...');
    const encryptedFields = await checkTableStructure();

    if (encryptedFields.length === 0) {
      console.error('❌ Erro: Campos criptografados não encontrados!');
      console.log('');
      console.log('Execute a migration primeiro:');
      console.log(`  psql -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -f server/migrations/004-add-encrypted-fields.sql`);
      console.log('');
      process.exit(1);
    }

    console.log(`✅ Campos criptografados encontrados: ${encryptedFields.join(', ')}`);
    console.log('');

    // 2. Contar registros pendentes
    console.log('⏳ Contando registros pendentes...');
    const totalPending = await countPendingRecords();

    if (totalPending === 0) {
      console.log('✅ Nenhum registro pendente de migração!');
      console.log('');
      process.exit(0);
    }

    console.log(`📊 Total de registros pendentes: ${totalPending}`);
    console.log('');

    if (isDryRun) {
      console.log('🔍 Modo DRY-RUN: Mostrando amostra de 5 registros...');
      console.log('');
    }

    // 3. Processar registros em lotes
    const BATCH_SIZE = 100;
    let offset = 0;
    let totalMigrated = 0;
    let totalErrors = 0;

    while (offset < totalPending) {
      const records = await getPendingRecords(BATCH_SIZE, offset);

      if (records.length === 0) break;

      for (const record of records) {
        try {
          const result = await migrateRecord(record);

          if (result.updated) {
            totalMigrated++;

            if (isDryRun && totalMigrated <= 5) {
              console.log(`📝 Registro ID ${record.id}:`);
              console.log(`   Query: ${result.query}`);
              console.log('');
            }
          }
        } catch (error) {
          totalErrors++;
          console.error(`❌ Erro ao migrar registro ID ${record.id}:`, error.message);
        }
      }

      offset += BATCH_SIZE;

      // Progress
      if (!isDryRun) {
        const progress = Math.min(100, ((offset / totalPending) * 100).toFixed(1));
        process.stdout.write(`\r⏳ Progresso: ${progress}% (${Math.min(offset, totalPending)}/${totalPending})`);
      }
    }

    if (!isDryRun) {
      process.stdout.write('\n');
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                     RESULTADO');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`✅ Registros migrados: ${totalMigrated}`);
    console.log(`❌ Erros: ${totalErrors}`);
    console.log('');

    if (isDryRun) {
      console.log('🔍 Modo DRY-RUN: Nenhuma alteração foi feita.');
      console.log('');
      console.log('Para executar a migração real:');
      console.log('  node scripts/migrate-encrypted-fields.js');
      console.log('');
    } else {
      console.log('✅ Migração concluída!');
      console.log('');
      console.log('⚠️  IMPORTANTE: Valide que tudo está funcionando antes de remover campos antigos.');
      console.log('');
      console.log('Próximos passos:');
      console.log('  1. Testar aplicação (ler/escrever dados criptografados)');
      console.log('  2. Verificar logs de erro');
      console.log('  3. Se tudo OK, remover campos antigos:');
      console.log('     ALTER TABLE clients DROP COLUMN cpf;');
      console.log('     ALTER TABLE clients DROP COLUMN phone;');
      console.log('     ALTER TABLE clients DROP COLUMN email;');
      console.log('     ALTER TABLE clients DROP COLUMN address;');
      console.log('');
    }

  } catch (error) {
    console.error('');
    console.error('❌ Erro fatal:', error);
    console.error('');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTAR
// ═══════════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  main();
}

module.exports = { migrateRecord };
