#!/usr/bin/env node
/**
 * Script de Arquivamento de Logs de Auditoria
 *
 * Este script arquiva logs de auditoria antigos para evitar crescimento
 * indefinido da tabela audit_logs.
 *
 * Uso:
 *   node archive-audit-logs.js [opções]
 *
 * Opções:
 *   --days=N         Arquivar logs mais antigos que N dias (padrão: 90)
 *   --delete         Deletar logs antigos em vez de arquivar (use com cuidado!)
 *   --dry-run        Simular sem fazer alterações
 *   --export-path    Diretório para arquivos de backup (padrão: ./audit-archives)
 *
 * Exemplos:
 *   node archive-audit-logs.js --days=90 --dry-run
 *   node archive-audit-logs.js --days=180
 *   node archive-audit-logs.js --delete --days=730
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Parse argumentos
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  const cleanKey = key.replace('--', '');
  acc[cleanKey] = value || true;
  return acc;
}, {});

const DAYS_TO_KEEP = parseInt(args.days) || 90;
const DRY_RUN = args['dry-run'] === true;
const DELETE_MODE = args.delete === true;
const EXPORT_PATH = args['export-path'] || path.join(__dirname, 'audit-archives');

// Conexão com o banco
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'alya',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

/**
 * Cria diretório de arquivos se não existir
 */
function ensureArchiveDirectory() {
  if (!fs.existsSync(EXPORT_PATH)) {
    console.log(`📁 Criando diretório de arquivos: ${EXPORT_PATH}`);
    fs.mkdirSync(EXPORT_PATH, { recursive: true });
  }
}

/**
 * Obtém estatísticas dos logs a serem arquivados
 */
async function getArchiveStats() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP);

  const query = `
    SELECT
      COUNT(*) as total_logs,
      MIN(timestamp) as oldest_log,
      MAX(timestamp) as newest_log,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(DISTINCT operation) as unique_operations,
      pg_size_pretty(pg_total_relation_size('audit_logs')) as table_size
    FROM audit_logs
    WHERE timestamp < $1
  `;

  const result = await pool.query(query, [cutoffDate]);
  return { cutoffDate, stats: result.rows[0] };
}

/**
 * Exporta logs antigos para arquivo JSON
 */
async function exportLogs(cutoffDate) {
  console.log('📤 Exportando logs antigos...');

  const query = `
    SELECT
      id,
      timestamp,
      operation,
      user_id,
      username,
      ip_address,
      user_agent,
      details,
      status,
      error_message,
      created_at
    FROM audit_logs
    WHERE timestamp < $1
    ORDER BY timestamp ASC
  `;

  const result = await pool.query(query, [cutoffDate]);

  if (result.rows.length === 0) {
    console.log('ℹ️  Nenhum log para exportar.');
    return null;
  }

  // Nome do arquivo: audit-logs-YYYY-MM-DD.json
  const filename = `audit-logs-${cutoffDate.toISOString().split('T')[0]}.json`;
  const filepath = path.join(EXPORT_PATH, filename);

  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      cutoffDate: cutoffDate.toISOString(),
      totalLogs: result.rows.length,
      retentionDays: DAYS_TO_KEEP,
    },
    logs: result.rows,
  };

  fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2), 'utf8');
  console.log(`✅ Logs exportados para: ${filepath}`);
  console.log(`   Total de logs: ${result.rows.length}`);
  console.log(`   Tamanho do arquivo: ${(fs.statSync(filepath).size / 1024 / 1024).toFixed(2)} MB`);

  return filepath;
}

/**
 * Deleta logs antigos do banco de dados
 */
async function deleteLogs(cutoffDate) {
  console.log('🗑️  Deletando logs antigos do banco de dados...');

  const query = `
    DELETE FROM audit_logs
    WHERE timestamp < $1
    RETURNING id
  `;

  const result = await pool.query(query, [cutoffDate]);
  console.log(`✅ ${result.rowCount} logs deletados.`);

  return result.rowCount;
}

/**
 * Compacta a tabela após deleção (VACUUM)
 */
async function vacuumTable() {
  console.log('🧹 Compactando tabela audit_logs...');

  // VACUUM não pode ser executado dentro de transação
  const client = await pool.connect();
  try {
    await client.query('VACUUM ANALYZE audit_logs');
    console.log('✅ Tabela compactada com sucesso.');
  } finally {
    client.release();
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Script de Arquivamento de Logs de Auditoria');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📅 Data de corte: logs antes de ${DAYS_TO_KEEP} dias atrás`);
  console.log(`🔧 Modo: ${DRY_RUN ? 'DRY RUN (simulação)' : 'EXECUÇÃO REAL'}`);
  console.log(`💾 Ação: ${DELETE_MODE ? 'DELETAR permanentemente' : 'ARQUIVAR e deletar'}`);
  console.log('───────────────────────────────────────────────────────────');

  try {
    // Obter estatísticas
    const { cutoffDate, stats } = await getArchiveStats();

    console.log('\n📊 Estatísticas:');
    console.log(`   Total de logs a processar: ${stats.total_logs}`);
    console.log(`   Log mais antigo: ${stats.oldest_log || 'N/A'}`);
    console.log(`   Log mais recente (no grupo): ${stats.newest_log || 'N/A'}`);
    console.log(`   Usuários únicos: ${stats.unique_users}`);
    console.log(`   Operações únicas: ${stats.unique_operations}`);
    console.log(`   Tamanho atual da tabela: ${stats.table_size}`);

    if (parseInt(stats.total_logs) === 0) {
      console.log('\n✅ Nenhum log para arquivar. Tabela está dentro do período de retenção.');
      return;
    }

    // Confirmar antes de prosseguir (se não for dry-run)
    if (!DRY_RUN && DELETE_MODE) {
      console.log('\n⚠️  ATENÇÃO: Você está prestes a DELETAR logs permanentemente!');
      console.log('   Pressione Ctrl+C nos próximos 5 segundos para cancelar...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    if (DRY_RUN) {
      console.log('\n🔍 [DRY RUN] Simulação concluída. Nenhuma alteração foi feita.');
      return;
    }

    // Exportar logs (se não for modo delete-only)
    if (!DELETE_MODE) {
      ensureArchiveDirectory();
      await exportLogs(cutoffDate);
    }

    // Deletar logs antigos
    const deletedCount = await deleteLogs(cutoffDate);

    // Compactar tabela
    if (deletedCount > 0) {
      await vacuumTable();
    }

    // Estatísticas finais
    const finalStats = await pool.query(
      `SELECT
        COUNT(*) as remaining_logs,
        pg_size_pretty(pg_total_relation_size('audit_logs')) as new_size
      FROM audit_logs`
    );

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Arquivamento concluído com sucesso!');
    console.log('───────────────────────────────────────────────────────────');
    console.log(`   Logs deletados: ${deletedCount}`);
    console.log(`   Logs restantes: ${finalStats.rows[0].remaining_logs}`);
    console.log(`   Novo tamanho da tabela: ${finalStats.rows[0].new_size}`);
    if (!DELETE_MODE) {
      console.log(`   Arquivo de backup: ${EXPORT_PATH}`);
    }
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Erro durante arquivamento:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Executar
main();
