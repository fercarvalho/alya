#!/usr/bin/env node
/**
 * Script para criar tabela de refresh tokens
 * Uso: node create-refresh-tokens-table.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'alya',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function createRefreshTokensTable() {
  try {
    console.log('🔐 Criando tabela de refresh tokens...\n');

    // Ler SQL da migration
    const sqlPath = path.join(__dirname, 'migrations', '003-create-refresh-tokens.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar migration
    await pool.query(sql);

    console.log('✅ Tabela refresh_tokens criada com sucesso!\n');

    // Verificar estrutura
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'refresh_tokens'
      ORDER BY ordinal_position
    `);

    console.log('📋 Estrutura da tabela:');
    console.log('┌─────────────────────┬──────────────────────┬──────────┐');
    console.log('│ Coluna              │ Tipo                 │ Nullable │');
    console.log('├─────────────────────┼──────────────────────┼──────────┤');
    result.rows.forEach(row => {
      const col = row.column_name.padEnd(19);
      const type = row.data_type.padEnd(20);
      const nullable = row.is_nullable.padEnd(8);
      console.log(`│ ${col} │ ${type} │ ${nullable} │`);
    });
    console.log('└─────────────────────┴──────────────────────┴──────────┘\n');

    // Verificar índices
    const indexResult = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'refresh_tokens'
    `);

    console.log('📑 Índices criados:');
    indexResult.rows.forEach(row => {
      console.log(`   ✓ ${row.indexname}`);
    });
    console.log();

    console.log('✅ Sistema de refresh tokens pronto para uso!\n');

  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error.message);
    console.error('\n💡 Verifique se:');
    console.error('   - PostgreSQL está rodando');
    console.error('   - Arquivo .env está configurado corretamente');
    console.error('   - As credenciais do banco estão corretas\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Executar
createRefreshTokensTable();
