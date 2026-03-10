#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Script de Teste - Sistema de Alertas de Segurança (SendGrid)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Testa todos os tipos de alertas de segurança via SendGrid Email
 *
 * Uso:
 *   node scripts/test-alerts.js all                  # Testa todos os alertas
 *   node scripts/test-alerts.js suspicious-login     # Testa alerta específico
 *   node scripts/test-alerts.js token-theft          # Testa roubo de token
 *   node scripts/test-alerts.js brute-force          # Testa brute force
 *   node scripts/test-alerts.js sql-injection        # Testa SQL injection
 *   node scripts/test-alerts.js xss                  # Testa XSS
 *   node scripts/test-alerts.js new-country          # Testa novo país
 *   node scripts/test-alerts.js multiple-ips         # Testa múltiplos IPs
 *   node scripts/test-alerts.js multiple-devices     # Testa múltiplos dispositivos
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const securityAlerts = require('../utils/security-alerts');

// Cores para output no terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '═'.repeat(80));
  log(title, 'bright');
  console.log('═'.repeat(80));
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES INDIVIDUAIS
// ═══════════════════════════════════════════════════════════════════════════════

async function testSuspiciousLogin() {
  log('🔐 Testando: Tentativa de Login Suspeita', 'cyan');
  const result = await securityAlerts.alertSuspiciousLogin(
    'admin',
    '192.168.1.100',
    'Horário incomum (3:00 AM) + novo dispositivo'
  );
  return result;
}

async function testMultipleIPs() {
  log('🌐 Testando: Múltiplos IPs Detectados', 'cyan');
  const result = await securityAlerts.alertMultipleIPs(
    'usuario_teste',
    ['192.168.1.100', '203.0.113.45', '198.51.100.78', '10.0.0.50'],
    '5 minutos'
  );
  return result;
}

async function testTokenTheft() {
  log('🚨 Testando: Roubo de Token Detectado', 'cyan');
  const result = await securityAlerts.alertTokenTheft(
    'admin',
    '203.0.113.45',
    'abc123def456ghi789jkl012mno345pqr678stu901'
  );
  return result;
}

async function testSQLInjection() {
  log('💉 Testando: Tentativa de SQL Injection', 'cyan');
  const result = await securityAlerts.alertSQLInjection(
    '198.51.100.42',
    '/api/clients?id=1',
    "1' OR '1'='1' UNION SELECT username, password FROM users--"
  );
  return result;
}

async function testXSS() {
  log('⚠️  Testando: Tentativa de XSS', 'cyan');
  const result = await securityAlerts.alertXSS(
    '203.0.113.78',
    '/api/clients',
    '<script>alert(document.cookie)</script><img src=x onerror=alert(1)>'
  );
  return result;
}

async function testBruteForce() {
  log('🔨 Testando: Ataque de Brute Force', 'cyan');
  const result = await securityAlerts.alertBruteForce(
    'admin',
    15,
    '198.51.100.123',
    '10 minutos'
  );
  return result;
}

async function testNewCountry() {
  log('🌍 Testando: Login de Novo País', 'cyan');
  const result = await securityAlerts.alertNewCountry(
    'usuario_teste',
    'Rússia',
    '198.51.100.234'
  );
  return result;
}

async function testMultipleDevices() {
  log('📱 Testando: Múltiplos Dispositivos', 'cyan');
  const result = await securityAlerts.alertMultipleDevices(
    'usuario_teste',
    ['iPhone 14 Pro', 'Windows Desktop', 'MacBook Pro', 'Android Phone'],
    '5 minutos'
  );
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

const tests = {
  'suspicious-login': { name: 'Login Suspeito', fn: testSuspiciousLogin },
  'multiple-ips': { name: 'Múltiplos IPs', fn: testMultipleIPs },
  'token-theft': { name: 'Roubo de Token', fn: testTokenTheft },
  'sql-injection': { name: 'SQL Injection', fn: testSQLInjection },
  'xss': { name: 'XSS', fn: testXSS },
  'brute-force': { name: 'Brute Force', fn: testBruteForce },
  'new-country': { name: 'Novo País', fn: testNewCountry },
  'multiple-devices': { name: 'Múltiplos Dispositivos', fn: testMultipleDevices }
};

async function runTests(testName) {
  logSection('🧪 TESTE DE ALERTAS DE SEGURANÇA - SENDGRID');

  // Verificar configuração
  if (!process.env.SENDGRID_API_KEY) {
    log('❌ ERRO: SENDGRID_API_KEY não configurada no .env', 'red');
    log('   Configure antes de executar os testes:', 'yellow');
    log('   SENDGRID_API_KEY=SG.xxx...', 'yellow');
    process.exit(1);
  }

  if (!process.env.ALERT_EMAIL_TO) {
    log('⚠️  AVISO: ALERT_EMAIL_TO não configurado, usando default', 'yellow');
  }

  log(`📧 Email de destino: ${process.env.ALERT_EMAIL_TO || 'admin@alya.com'}`, 'blue');
  log(`📤 Email de origem: ${process.env.ALERT_EMAIL_FROM || 'security@alya.com'}`, 'blue');

  let results = [];
  let testsToRun = [];

  if (testName === 'all') {
    testsToRun = Object.entries(tests);
    log(`\n🚀 Executando TODOS os ${testsToRun.length} testes...\n`, 'bright');
  } else if (tests[testName]) {
    testsToRun = [[testName, tests[testName]]];
    log(`\n🚀 Executando teste: ${tests[testName].name}\n`, 'bright');
  } else {
    log(`\n❌ Teste desconhecido: ${testName}`, 'red');
    log('\nTestes disponíveis:', 'yellow');
    Object.entries(tests).forEach(([key, value]) => {
      log(`  - ${key.padEnd(20)} # ${value.name}`, 'cyan');
    });
    log('  - all                  # Todos os testes', 'cyan');
    process.exit(1);
  }

  // Executar testes
  for (const [key, test] of testsToRun) {
    try {
      const success = await test.fn();
      results.push({ name: test.name, success });

      if (success) {
        log(`✅ ${test.name} - Email enviado com sucesso\n`, 'green');
      } else {
        log(`❌ ${test.name} - Falha ao enviar email\n`, 'red');
      }

      // Delay entre testes para não sobrecarregar SendGrid
      if (testsToRun.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      log(`❌ ${test.name} - Erro: ${error.message}\n`, 'red');
      results.push({ name: test.name, success: false, error: error.message });
    }
  }

  // Resumo
  logSection('📊 RESUMO DOS TESTES');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  log(`\nTotal de testes: ${results.length}`, 'bright');
  log(`✅ Sucessos: ${successful}`, 'green');
  if (failed > 0) {
    log(`❌ Falhas: ${failed}`, 'red');
  }

  console.log('\n' + '─'.repeat(80));
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    log(`${icon} ${result.name}`, color);
    if (result.error) {
      log(`   Erro: ${result.error}`, 'red');
    }
  });
  console.log('─'.repeat(80));

  if (successful === results.length) {
    log('\n🎉 Todos os testes passaram!', 'green');
    log('📧 Verifique sua caixa de entrada de emails.', 'cyan');
  } else {
    log('\n⚠️  Alguns testes falharam. Verifique a configuração do SendGrid.', 'yellow');
  }

  console.log('\n' + '═'.repeat(80));
  log('✨ Teste concluído', 'bright');
  console.log('═'.repeat(80) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const testName = process.argv[2] || 'all';
runTests(testName).catch(error => {
  log(`\n❌ Erro fatal: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
