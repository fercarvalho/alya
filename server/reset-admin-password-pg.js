#!/usr/bin/env node

/**
 * Reset da senha do usuário admin no PostgreSQL.
 * Use após migração para PG ou quando não conseguir mais logar.
 *
 * Uso na VPS (na pasta do projeto, onde está o .env):
 *   cd /var/www/alya/server
 *   node reset-admin-password-pg.js
 *
 * Opção 1 - Primeiro login de novo (qualquer senha no próximo login):
 *   node reset-admin-password-pg.js
 *   → Define senha placeholder + last_login = null.
 *   → No próximo login, qualquer senha é aceita e você define a nova no modal.
 *
 * Opção 2 - Definir uma senha fixa (ex.: senha123):
 *   ADMIN_NEW_PASSWORD=senha123 node reset-admin-password-pg.js
 *   → A senha do admin passa a ser exatamente a que você passou.
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'alya',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function resetAdminPassword() {
  const client = await pool.connect();
  try {
    const r = await client.query("SELECT id, username FROM users WHERE username = $1", ['admin']);
    if (!r.rows || r.rows.length === 0) {
      console.error('❌ Usuário "admin" não encontrado no banco.');
      process.exit(1);
    }
    const admin = r.rows[0];

    const newPassword = process.env.ADMIN_NEW_PASSWORD;
    let hash;
    let message;

    if (newPassword && newPassword.trim()) {
      hash = bcrypt.hashSync(newPassword.trim(), 10);
      await client.query(
        'UPDATE users SET password = $1, last_login = COALESCE(last_login, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [hash, admin.id]
      );
      message = 'Senha do admin alterada para a nova senha informada (ADMIN_NEW_PASSWORD). Faça login com ela.';
    } else {
      hash = bcrypt.hashSync('FIRST_LOGIN_PLACEHOLDER', 10);
      await client.query(
        'UPDATE users SET password = $1, last_login = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [hash, admin.id]
      );
      message = 'No próximo login use qualquer senha; o sistema pedirá para você definir a nova senha.';
    }

    console.log('✅ Senha do admin resetada com sucesso.');
    console.log('   ' + message);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

resetAdminPassword();
