#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Gerador de Chave de Criptografia
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Gera uma chave segura de 256 bits para AES-256-GCM.
 *
 * Uso:
 *   node scripts/generate-encryption-key.js
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const crypto = require('crypto');

console.log('═══════════════════════════════════════════════════════════════');
console.log('         Gerador de Chave de Criptografia (AES-256)');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// Gerar chave aleatória de 256 bits
const key = crypto.randomBytes(32).toString('base64');

// Gerar salt para derivação de chave
const salt = crypto.randomBytes(64).toString('base64');

console.log('✅ Chaves geradas com sucesso!');
console.log('');
console.log('Adicione ao arquivo .env:');
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`ENCRYPTION_KEY=${key}`);
console.log(`ENCRYPTION_SALT=${salt}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('⚠️  IMPORTANTE:');
console.log('   1. NUNCA commite estas chaves no Git!');
console.log('   2. Guarde em local seguro (ex: 1Password, LastPass)');
console.log('   3. Use chaves diferentes em dev/staging/produção');
console.log('   4. Rotacione chaves a cada 90 dias (use reEncrypt)');
console.log('');
console.log('Para rotacionar chaves:');
console.log('   1. Gerar nova chave (este script)');
console.log('   2. Usar função reEncrypt() em utils/encryption.js');
console.log('   3. Migrar todos os dados para nova chave');
console.log('   4. Atualizar .env com nova chave');
console.log('');
