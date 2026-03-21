/**
 * Script para resetar a senha do usuário admin
 * Uso: node scripts/reset-admin-password.js [nova-senha]
 * Se não fornecer senha, será usada a senha padrão: admin123
 */

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'alya',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function resetAdminPassword() {
  const client = await pool.connect();

  try {
    // Nova senha (da linha de comando ou padrão)
    const newPassword = process.argv[2] || 'admin123';

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║        RESET DE SENHA DO ADMINISTRADOR - ALYA             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    // 1. Verificar se usuário admin existe
    console.log('🔍 Procurando usuário admin...');
    const checkAdmin = await client.query(
      "SELECT id, username, email FROM users WHERE username = 'admin' OR email = 'admin@alya.com'"
    );

    if (checkAdmin.rows.length === 0) {
      console.log('❌ Usuário admin não encontrado!');
      console.log('');
      console.log('📝 Criando novo usuário admin...');

      // Criar novo usuário admin
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const result = await client.query(
        `INSERT INTO users (username, password, email, role, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id, username, email, role`,
        ['admin', hashedPassword, 'admin@alya.com', 'admin']
      );

      console.log('✅ Usuário admin criado com sucesso!');
      console.log('');
      console.log('📋 Detalhes do usuário:');
      console.log(`   ID:       ${result.rows[0].id}`);
      console.log(`   Username: ${result.rows[0].username}`);
      console.log(`   Email:    ${result.rows[0].email}`);
      console.log(`   Role:     ${result.rows[0].role}`);

    } else {
      // Atualizar senha do admin existente
      const admin = checkAdmin.rows[0];
      console.log(`✅ Usuário admin encontrado (ID: ${admin.id})`);
      console.log('');
      console.log('🔐 Gerando nova senha criptografada...');

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      console.log('💾 Atualizando senha no banco de dados...');
      await client.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, admin.id]
      );

      console.log('✅ Senha atualizada com sucesso!');
      console.log('');
      console.log('📋 Detalhes do usuário:');
      console.log(`   ID:       ${admin.id}`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Email:    ${admin.email || 'Não definido'}`);
    }

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    CREDENCIAIS DE ACESSO                   ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Username: admin                                           ║`);
    console.log(`║  Senha:    ${newPassword.padEnd(48)} ║`);
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('⚠️  IMPORTANTE: Anote estas credenciais em local seguro!');
    console.log('');
    console.log('🔒 Recomendações de segurança:');
    console.log('   1. Altere esta senha após o primeiro login');
    console.log('   2. Use uma senha forte (mín. 12 caracteres)');
    console.log('   3. Não compartilhe suas credenciais');
    console.log('');

  } catch (error) {
    console.error('❌ Erro ao resetar senha:', error.message);
    console.error('');
    console.error('💡 Possíveis soluções:');
    console.error('   1. Verifique se o PostgreSQL está rodando');
    console.error('   2. Confirme as credenciais do banco no .env');
    console.error('   3. Verifique se a tabela users existe');
    console.error('');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar script
resetAdminPassword();
