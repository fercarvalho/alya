const Database = require('./database');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database();

// Resetar senha do admin para uma senha conhecida
function resetAdminPassword() {
  try {
    const admin = db.getUserByUsername('admin');
    
    if (!admin) {
      console.error('❌ Usuário admin não encontrado!');
      return;
    }
    
    // Criar hash placeholder que aceita qualquer senha no primeiro login
    const placeholderPassword = bcrypt.hashSync('FIRST_LOGIN_PLACEHOLDER', 10);
    
    // Resetar lastLogin para null para permitir primeiro login novamente
    db.updateUser(admin.id, {
      password: placeholderPassword,
      lastLogin: null
    });
    
    console.log('✅ Senha do admin resetada com sucesso!');
    console.log('⚠️  Agora você pode fazer login com qualquer senha');
    console.log('⚠️  Uma nova senha será gerada após o primeiro login');
  } catch (error) {
    console.error('❌ Erro ao resetar senha:', error);
  }
}

resetAdminPassword();
