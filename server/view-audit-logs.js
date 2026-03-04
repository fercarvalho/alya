#!/usr/bin/env node
/**
 * Script para visualizar logs de auditoria via CLI
 * Uso: node view-audit-logs.js [opções]
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'alya_db',
  user: process.env.DB_USER || 'alya_user',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Cores para terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorize(text, color) {
  return `${colors[color] || ''}${text}${colors.reset}`;
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getStatusColor(status) {
  switch (status) {
    case 'success': return 'green';
    case 'failure': return 'red';
    case 'blocked': return 'red';
    case 'warning': return 'yellow';
    default: return 'reset';
  }
}

function printLog(log, index) {
  const statusColor = getStatusColor(log.status);
  const timestamp = formatTimestamp(log.timestamp);

  console.log('\n' + colorize('─'.repeat(80), 'dim'));
  console.log(
    colorize(`#${log.id}`, 'bright') +
    ' | ' +
    colorize(timestamp, 'cyan') +
    ' | ' +
    colorize(log.operation, 'magenta') +
    ' | ' +
    colorize(log.status.toUpperCase(), statusColor)
  );

  if (log.username) {
    console.log(colorize('User:', 'dim'), `${log.username} (ID: ${log.user_id})`);
  }

  if (log.ip_address) {
    console.log(colorize('IP:', 'dim'), log.ip_address);
  }

  if (log.details && Object.keys(log.details).length > 0) {
    console.log(colorize('Details:', 'dim'), JSON.stringify(log.details, null, 2));
  }

  if (log.error_message) {
    console.log(colorize('Error:', 'red'), log.error_message);
  }
}

async function viewRecentLogs(limit = 20) {
  console.log(colorize(`\n📋 Últimos ${limit} logs de auditoria:\n`, 'bright'));

  const result = await pool.query(
    'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT $1',
    [limit]
  );

  if (result.rows.length === 0) {
    console.log(colorize('Nenhum log encontrado.', 'yellow'));
    return;
  }

  result.rows.forEach((log, index) => printLog(log, index));
  console.log('\n' + colorize('─'.repeat(80), 'dim') + '\n');
  console.log(colorize(`Total: ${result.rows.length} logs`, 'bright'));
}

async function viewLoginFailures(hours = 24) {
  console.log(colorize(`\n🔐 Falhas de login nas últimas ${hours} horas:\n`, 'bright'));

  const result = await pool.query(
    `SELECT * FROM audit_logs
     WHERE operation = 'login_failure'
       AND timestamp >= NOW() - INTERVAL '${hours} hours'
     ORDER BY timestamp DESC`,
    []
  );

  if (result.rows.length === 0) {
    console.log(colorize('✅ Nenhuma falha de login registrada.', 'green'));
    return;
  }

  result.rows.forEach((log, index) => printLog(log, index));
  console.log('\n' + colorize('─'.repeat(80), 'dim') + '\n');
  console.log(colorize(`Total: ${result.rows.length} falhas`, 'red'));
}

async function viewUserActivity(username) {
  console.log(colorize(`\n👤 Atividade do usuário: ${username}\n`, 'bright'));

  const result = await pool.query(
    `SELECT * FROM audit_logs
     WHERE username = $1
     ORDER BY timestamp DESC
     LIMIT 50`,
    [username]
  );

  if (result.rows.length === 0) {
    console.log(colorize('Nenhuma atividade encontrada para este usuário.', 'yellow'));
    return;
  }

  result.rows.forEach((log, index) => printLog(log, index));
  console.log('\n' + colorize('─'.repeat(80), 'dim') + '\n');
  console.log(colorize(`Total: ${result.rows.length} ações`, 'bright'));
}

async function viewStatistics(days = 7) {
  console.log(colorize(`\n📊 Estatísticas dos últimos ${days} dias:\n`, 'bright'));

  const result = await pool.query(
    `SELECT
       operation,
       status,
       COUNT(*) as count,
       COUNT(DISTINCT user_id) as unique_users
     FROM audit_logs
     WHERE timestamp >= NOW() - INTERVAL '${days} days'
     GROUP BY operation, status
     ORDER BY count DESC`,
    []
  );

  if (result.rows.length === 0) {
    console.log(colorize('Nenhum dado disponível.', 'yellow'));
    return;
  }

  console.log(
    colorize('Operação', 'bright').padEnd(40) +
    colorize('Status', 'bright').padEnd(15) +
    colorize('Total', 'bright').padEnd(10) +
    colorize('Usuários', 'bright')
  );
  console.log(colorize('─'.repeat(80), 'dim'));

  result.rows.forEach(row => {
    const statusColor = getStatusColor(row.status);
    console.log(
      row.operation.padEnd(30) +
      colorize(row.status.toUpperCase(), statusColor).padEnd(15) +
      row.count.toString().padEnd(10) +
      row.unique_users
    );
  });

  // Totais
  console.log('\n' + colorize('─'.repeat(80), 'dim'));
  const totals = await pool.query(
    `SELECT
       COUNT(*) as total_events,
       COUNT(DISTINCT user_id) as unique_users,
       COUNT(DISTINCT ip_address) as unique_ips
     FROM audit_logs
     WHERE timestamp >= NOW() - INTERVAL '${days} days'`,
    []
  );

  console.log(colorize('\nTotais:', 'bright'));
  console.log(`  Eventos: ${totals.rows[0].total_events}`);
  console.log(`  Usuários únicos: ${totals.rows[0].unique_users}`);
  console.log(`  IPs únicos: ${totals.rows[0].unique_ips}`);
}

async function viewSuspiciousIPs() {
  console.log(colorize('\n⚠️  IPs suspeitos (múltiplas falhas nas últimas 24h):\n', 'bright'));

  const result = await pool.query(
    `SELECT
       ip_address,
       COUNT(*) as failed_attempts,
       MAX(timestamp) as last_attempt,
       array_agg(DISTINCT username) as users_attempted
     FROM audit_logs
     WHERE operation = 'login_failure'
       AND timestamp >= NOW() - INTERVAL '24 hours'
     GROUP BY ip_address
     HAVING COUNT(*) >= 3
     ORDER BY failed_attempts DESC
     LIMIT 20`,
    []
  );

  if (result.rows.length === 0) {
    console.log(colorize('✅ Nenhuma atividade suspeita detectada.', 'green'));
    return;
  }

  console.log(
    colorize('IP', 'bright').padEnd(20) +
    colorize('Falhas', 'bright').padEnd(10) +
    colorize('Última Tentativa', 'bright').padEnd(25) +
    colorize('Usuários', 'bright')
  );
  console.log(colorize('─'.repeat(80), 'dim'));

  result.rows.forEach(row => {
    const lastAttempt = formatTimestamp(row.last_attempt);
    const users = row.users_attempted.filter(u => u !== null).join(', ');
    console.log(
      colorize(row.ip_address, 'red').padEnd(20) +
      colorize(row.failed_attempts.toString(), 'red').padEnd(10) +
      lastAttempt.padEnd(25) +
      users
    );
  });

  console.log('\n' + colorize('─'.repeat(80), 'dim'));
  console.log(colorize(`⚠️  ${result.rows.length} IPs suspeitos detectados`, 'red'));
}

function printHelp() {
  console.log(colorize('\n📋 Visualizador de Logs de Auditoria - Sistema ALYA\n', 'bright'));
  console.log('Uso: node view-audit-logs.js [comando] [opções]\n');
  console.log(colorize('Comandos:', 'bright'));
  console.log('  recent [N]         Ver os N logs mais recentes (padrão: 20)');
  console.log('  failures [hours]   Ver falhas de login nas últimas N horas (padrão: 24)');
  console.log('  user <username>    Ver atividade de um usuário específico');
  console.log('  stats [days]       Ver estatísticas dos últimos N dias (padrão: 7)');
  console.log('  suspicious         Ver IPs suspeitos com múltiplas falhas');
  console.log('  help               Mostrar esta mensagem\n');
  console.log(colorize('Exemplos:', 'bright'));
  console.log('  node view-audit-logs.js recent 50');
  console.log('  node view-audit-logs.js failures 12');
  console.log('  node view-audit-logs.js user admin');
  console.log('  node view-audit-logs.js stats 30');
  console.log('  node view-audit-logs.js suspicious\n');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'recent';

  try {
    switch (command) {
      case 'recent':
        await viewRecentLogs(parseInt(args[1]) || 20);
        break;

      case 'failures':
        await viewLoginFailures(parseInt(args[1]) || 24);
        break;

      case 'user':
        if (!args[1]) {
          console.log(colorize('❌ Erro: Username é obrigatório', 'red'));
          console.log('Uso: node view-audit-logs.js user <username>');
          process.exit(1);
        }
        await viewUserActivity(args[1]);
        break;

      case 'stats':
        await viewStatistics(parseInt(args[1]) || 7);
        break;

      case 'suspicious':
        await viewSuspiciousIPs();
        break;

      case 'help':
      case '--help':
      case '-h':
        printHelp();
        break;

      default:
        console.log(colorize(`❌ Comando desconhecido: ${command}`, 'red'));
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error(colorize('\n❌ Erro ao buscar logs:', 'red'), error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Executar
main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
