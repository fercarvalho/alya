#!/usr/bin/env node

/**
 * Script de emergência para resetar o primeiro login de um usuário
 * Uso: node reset-first-login.js <username>
 * 
 * Este script reseta o lastLogin do usuário para null,
 * permitindo que ele faça primeiro login novamente.
 */

const Database = require('./database');
const readline = require('readline');

const db = new Database();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function resetFirstLogin(username) {
  try {
    const user = db.getUserByUsername(username);
    
    if (!user) {
      console.error(`❌ Usuário "${username}" não encontrado.`);
      process.exit(1);
    }

    // Resetar lastLogin para null
    db.updateUser(user.id, { lastLogin: null });

    console.log('\n✅ Primeiro login resetado com sucesso!');
    console.log(`\nUsuário: ${username}`);
    console.log('Agora você pode fazer login com qualquer senha.');
    console.log('Uma nova senha será gerada e exibida no modal.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao resetar primeiro login:', error.message);
    process.exit(1);
  }
}

// Obter username dos argumentos da linha de comando
const username = process.argv[2];

if (!username) {
  console.log('Uso: node reset-first-login.js <username>');
  console.log('\nExemplo: node reset-first-login.js admin');
  process.exit(1);
}

// Confirmar ação
rl.question(`⚠️  Tem certeza que deseja resetar o primeiro login do usuário "${username}"? (s/N): `, (answer) => {
  if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'sim') {
    resetFirstLogin(username);
  } else {
    console.log('Operação cancelada.');
    process.exit(0);
  }
  rl.close();
});

