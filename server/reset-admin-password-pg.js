/**
 * Reseta a senha do usuário admin no PostgreSQL.
 * Coloca um placeholder de primeiro login: ao entrar, qualquer senha é aceita
 * e o usuário é obrigado a definir uma nova senha.
 *
 * Uso: node reset-admin-password-pg.js
 * Requer .env com DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD.
 */

require('dotenv').config();
const Database = require('./database-pg');
const bcrypt = require('bcryptjs');

const db = new Database();

async function resetAdminPassword() {
  try {
    const admin = await db.getUserByUsername('admin');

    if (!admin) {
      console.error('❌ Usuário admin não encontrado!');
      process.exit(1);
    }

    const placeholderPassword = bcrypt.hashSync('FIRST_LOGIN_PLACEHOLDER', 10);

    await db.updateUser(admin.id, {
      password: placeholderPassword,
      lastLogin: null,
    });

    console.log('✅ Senha do admin resetada com sucesso!');
    console.log('⚠️  Agora você pode fazer login com qualquer senha');
    console.log('⚠️  Uma nova senha será gerada após o primeiro login');
  } catch (error) {
    console.error('❌ Erro ao resetar senha:', error.message);
    process.exit(1);
  } finally {
    if (db.pool) await db.pool.end();
  }
}

resetAdminPassword();
