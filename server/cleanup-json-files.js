/**
 * Remove arquivos JSON originais após migração e validação bem-sucedida.
 * Mantém pastas de backup (backup-*).
 * Use --dry-run para ver o que seria removido sem deletar.
 *
 * Uso: node cleanup-json-files.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database');
const dryRun = process.argv.includes('--dry-run');

const FILES_TO_REMOVE = [
  'users.json',
  'transactions.json',
  'products.json',
  'clients.json',
  'modules.json',
  'activity-logs.json',
  // Projeção (após migração e validação)
  'projection-base.json',
  'projection-config.json',
  'projection.json',
  'revenue.json',
  'mkt-components.json',
  'fixedExpenses.json',
  'variableExpenses.json',
  'investments.json',
  'budget.json',
  'resultado.json',
  'projection-base-backup.json',
  'projection-config-backup.json',
  'projection-backup.json',
  'revenue-backup.json',
  'mkt-components-backup.json',
  'fixedExpenses-backup.json',
  'variableExpenses-backup.json',
  'investments-backup.json',
  'budget-backup.json',
  'resultado-backup.json',
];

function cleanup() {
  if (dryRun) {
    console.log('Modo dry-run: nenhum arquivo será removido.\n');
  }

  let removed = 0;
  for (const file of FILES_TO_REMOVE) {
    const filePath = path.join(dbPath, file);
    if (fs.existsSync(filePath)) {
      if (dryRun) {
        console.log(`Seria removido: ${file}`);
      } else {
        fs.unlinkSync(filePath);
        console.log(`Removido: ${file}`);
      }
      removed++;
    }
  }

  if (removed === 0) {
    console.log('Nenhum arquivo para remover.');
  } else if (!dryRun) {
    console.log(`\n${removed} arquivo(s) removido(s). Backups em database/backup-* foram mantidos.`);
  }
}

cleanup();
