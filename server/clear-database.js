#!/usr/bin/env node

/**
 * Script para limpar o banco de dados (transações, produtos e clientes)
 * Uso: node clear-database.js [--transactions] [--products] [--clients] [--all]
 * 
 * Opções:
 *   --transactions  Limpa apenas transações
 *   --products      Limpa apenas produtos
 *   --clients       Limpa apenas clientes
 *   --all           Limpa tudo (transações, produtos e clientes)
 * 
 * Se nenhuma opção for fornecida, limpa tudo por padrão.
 */

const Database = require('./database');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const db = new Database();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function clearTransactions() {
  try {
    fs.writeFileSync(db.transactionsFile, '[]');
    console.log('✅ Transações limpas com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao limpar transações:', error.message);
    return false;
  }
}

function clearProducts() {
  try {
    fs.writeFileSync(db.productsFile, '[]');
    console.log('✅ Produtos limpos com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao limpar produtos:', error.message);
    return false;
  }
}

function clearClients() {
  try {
    fs.writeFileSync(db.clientsFile, '[]');
    console.log('✅ Clientes limpos com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao limpar clientes:', error.message);
    return false;
  }
}

function clearDatabase(options) {
  console.log('\n🔄 Iniciando limpeza do banco de dados...\n');
  
  let success = true;
  let cleared = [];

  if (options.all || (!options.transactions && !options.products && !options.clients)) {
    // Limpar tudo
    if (clearTransactions()) cleared.push('Transações');
    else success = false;
    
    if (clearProducts()) cleared.push('Produtos');
    else success = false;
    
    if (clearClients()) cleared.push('Clientes');
    else success = false;
  } else {
    // Limpar apenas o que foi especificado
    if (options.transactions) {
      if (clearTransactions()) cleared.push('Transações');
      else success = false;
    }
    
    if (options.products) {
      if (clearProducts()) cleared.push('Produtos');
      else success = false;
    }
    
    if (options.clients) {
      if (clearClients()) cleared.push('Clientes');
      else success = false;
    }
  }

  if (success) {
    console.log(`\n✅ Limpeza concluída! ${cleared.length} tabela(s) limpa(s): ${cleared.join(', ')}\n`);
  } else {
    console.log('\n⚠️  Limpeza concluída com alguns erros.\n');
  }
  
  process.exit(success ? 0 : 1);
}

// Parse argumentos da linha de comando
const args = process.argv.slice(2);
const options = {
  transactions: args.includes('--transactions'),
  products: args.includes('--products'),
  clients: args.includes('--clients'),
  all: args.includes('--all')
};

// Se nenhuma opção foi fornecida, limpar tudo
if (!options.transactions && !options.products && !options.clients && !options.all) {
  options.all = true;
}

// Determinar o que será limpo para a mensagem de confirmação
let whatToClear = [];
if (options.all || (!options.transactions && !options.products && !options.clients)) {
  whatToClear = ['Transações', 'Produtos', 'Clientes'];
} else {
  if (options.transactions) whatToClear.push('Transações');
  if (options.products) whatToClear.push('Produtos');
  if (options.clients) whatToClear.push('Clientes');
}

// Confirmar ação
const confirmationMessage = `⚠️  ATENÇÃO: Esta operação é IRREVERSÍVEL!\n\n` +
  `Você está prestes a limpar: ${whatToClear.join(', ')}\n\n` +
  `Tem certeza que deseja continuar? (digite "CONFIRMAR" para prosseguir): `;

rl.question(confirmationMessage, (answer) => {
  if (answer === 'CONFIRMAR') {
    clearDatabase(options);
  } else {
    console.log('\n❌ Operação cancelada. Nenhum dado foi alterado.\n');
    process.exit(0);
  }
  rl.close();
});

