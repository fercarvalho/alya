/**
 * Script de migração - Criar tabela de audit logs
 * Executa: node create-audit-logs-table.js
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

async function runMigration() {
  console.log('🔧 Iniciando migração: Criação da tabela de audit logs...\n');

  try {
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'migrations', 'create-audit-logs-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar a migração
    await pool.query(sql);

    console.log('✅ Tabela audit_logs criada com sucesso!');
    console.log('✅ Índices criados para otimização de queries');
    console.log('✅ Função de limpeza automática criada');

    // Verificar se a tabela foi criada
    const result = await pool.query(`
      SELECT
        table_name,
        (SELECT COUNT(*) FROM audit_logs) as record_count
      FROM information_schema.tables
      WHERE table_name = 'audit_logs'
    `);

    if (result.rows.length > 0) {
      console.log('\n📊 Status da tabela:');
      console.log(`   - Tabela: ${result.rows[0].table_name}`);
      console.log(`   - Registros: ${result.rows[0].record_count}`);
    }

    // Verificar índices
    const indexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'audit_logs'
      ORDER BY indexname
    `);

    console.log('\n📋 Índices criados:');
    indexes.rows.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });

  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    console.error('\nDetalhes:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n✅ Migração concluída!');
  }
}

// Executar migração
runMigration().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
