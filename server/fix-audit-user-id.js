/**
 * Script para corrigir tipo do user_id na tabela audit_logs
 * Altera de INTEGER para VARCHAR para suportar UUIDs
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'alya_db',
  user: process.env.DB_USER || 'alya_user',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function fixUserIdType() {
  console.log('🔧 Corrigindo tipo do user_id na tabela audit_logs...\n');

  try {
    // Verificar tipo atual
    const currentType = await pool.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'audit_logs'
        AND column_name = 'user_id'
    `);

    if (currentType.rows.length === 0) {
      console.error('❌ Tabela audit_logs não encontrada!');
      console.log('Execute primeiro: npm run create-audit-table');
      process.exit(1);
    }

    console.log(`📊 Tipo atual: ${currentType.rows[0].data_type}`);

    if (currentType.rows[0].data_type === 'character varying') {
      console.log('✅ Tipo já está correto (VARCHAR)!');
      console.log('Nenhuma alteração necessária.');
      return;
    }

    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, 'migrations', 'alter-audit-logs-user-id.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar alteração
    console.log('⚙️  Alterando tipo da coluna...');
    await pool.query(sql);

    console.log('✅ Tipo alterado com sucesso!');
    console.log('✅ Índice recriado');

    // Verificar tipo novo
    const newType = await pool.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'audit_logs'
        AND column_name = 'user_id'
    `);

    console.log(`\n📊 Tipo novo: ${newType.rows[0].data_type}`);

    // Verificar índices
    const indexes = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'audit_logs'
        AND indexname = 'idx_audit_logs_user_id'
    `);

    if (indexes.rows.length > 0) {
      console.log('✅ Índice idx_audit_logs_user_id recriado com sucesso');
    }

  } catch (error) {
    console.error('❌ Erro na correção:', error.message);
    console.error('\nDetalhes:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n✅ Correção concluída!');
  }
}

// Executar
fixUserIdType().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
