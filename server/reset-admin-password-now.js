/**
 * Script para resetar a senha do usuário admin
 * Uso: node reset-admin-password-now.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'alya',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Função para gerar senha forte
function generateStrongPassword(length = 16) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const all = uppercase + lowercase + numbers + special;

  let password = '';
  const randomValues = crypto.randomBytes(length);

  // Garantir pelo menos 1 de cada tipo
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += special[crypto.randomInt(0, special.length)];

  // Preencher o resto
  for (let i = 4; i < length; i++) {
    password += all[randomValues[i] % all.length];
  }

  // Embaralhar
  return password.split('').sort(() => crypto.randomInt(-1, 2)).join('');
}

async function resetAdminPassword() {
  try {
    console.log('🔐 Resetando senha do usuário admin...\n');

    // Verificar se usuário admin existe
    const checkResult = await pool.query(
      "SELECT id, username FROM users WHERE username = 'admin'"
    );

    if (checkResult.rows.length === 0) {
      console.error('❌ Usuário admin não encontrado!');
      console.log('   Criando usuário admin...\n');

      // Criar usuário admin
      const newPassword = generateStrongPassword(16);
      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      const adminId = crypto.randomUUID();

      await pool.query(
        `INSERT INTO users (id, username, password, first_name, last_name, email, role, modules, is_active, last_login)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
        [
          adminId,
          'admin',
          hashedPassword,
          'Administrador',
          'Sistema',
          'admin@alya.com',
          'admin',
          ['dashboard', 'transactions', 'products', 'clients', 'reports', 'metas', 'dre', 'projecao', 'admin'],
          true
        ]
      );

      console.log('✅ Usuário admin criado com sucesso!\n');
      console.log('╔════════════════════════════════════════════════╗');
      console.log('║         CREDENCIAIS DO ADMINISTRADOR          ║');
      console.log('╠════════════════════════════════════════════════╣');
      console.log(`║ Usuário: admin                                ║`);
      console.log(`║ Senha:   ${newPassword.padEnd(36)}║`);
      console.log('╚════════════════════════════════════════════════╝\n');
      console.log('⚠️  IMPORTANTE: Guarde esta senha em local seguro!');
      console.log('⚠️  Esta senha NÃO será mostrada novamente.\n');

    } else {
      // Resetar senha do admin existente
      const newPassword = generateStrongPassword(16);
      const hashedPassword = bcrypt.hashSync(newPassword, 10);

      await pool.query(
        `UPDATE users
         SET password = $1,
             last_login = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE username = 'admin'`,
        [hashedPassword]
      );

      console.log('✅ Senha do admin resetada com sucesso!\n');
      console.log('╔════════════════════════════════════════════════╗');
      console.log('║         NOVA SENHA DO ADMINISTRADOR           ║');
      console.log('╠════════════════════════════════════════════════╣');
      console.log(`║ Usuário: admin                                ║`);
      console.log(`║ Senha:   ${newPassword.padEnd(36)}║`);
      console.log('╚════════════════════════════════════════════════╝\n');
      console.log('⚠️  IMPORTANTE: Guarde esta senha em local seguro!');
      console.log('⚠️  Esta senha NÃO será mostrada novamente.\n');
    }

    console.log('📝 Recomendações:');
    console.log('   1. Copie a senha acima');
    console.log('   2. Faça login no sistema');
    console.log('   3. Altere a senha pelo perfil do usuário');
    console.log('   4. Use uma senha forte e única\n');

  } catch (error) {
    console.error('❌ Erro ao resetar senha:', error);
    console.error('\n💡 Verifique se:');
    console.error('   - PostgreSQL está rodando');
    console.error('   - Arquivo .env está configurado corretamente');
    console.error('   - As credenciais do banco estão corretas\n');
  } finally {
    await pool.end();
  }
}

// Executar
resetAdminPassword();
