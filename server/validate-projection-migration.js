/**
 * Valida a migração dos dados de projeção de JSON para PostgreSQL.
 * Compara contagens e amostras entre as fontes.
 * Retorna 0 se válido, 1 se houver divergências.
 *
 * Uso: npm run validate-projection-migration
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'alya',
  user: process.env.DB_USER || 'fernandocarvalho',
  password: process.env.DB_PASSWORD || 'Korjup-qahwev-9tydbe',
});

const dbPath = path.join(__dirname, 'database');

function readJsonSafe(filename, defaultValue = null) {
  const filePath = path.join(dbPath, filename);
  if (!fs.existsSync(filePath)) return defaultValue;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return defaultValue;
  }
}

function arraySum(arr) {
  return (arr || []).reduce((a, b) => a + (Number(b) || 0), 0);
}

async function validate() {
  const errors = [];
  let client;

  try {
    client = await pool.connect();
  } catch (err) {
    console.error('Erro ao conectar ao PostgreSQL:', err.message);
    process.exit(1);
  }

  try {
    // Verificar se as tabelas de projeção existem
    const tableCheck = await client.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projection_growth')
    `);
    if (!tableCheck.rows[0]?.exists) {
      console.error('Tabelas de projeção não encontradas. Execute schema-projection.sql primeiro.');
      process.exit(1);
    }

    const config = readJsonSafe('projection-config.json', { revenueStreams: [], mktComponents: [] });
    const base = readJsonSafe('projection-base.json', { growth: {}, prevYear: {}, manualOverrides: {} });

    // 1. Revenue streams
    const jsonStreams = (config.revenueStreams || []).length;
    const pgStreams = await client.query('SELECT COUNT(*) FROM projection_revenue_streams');
    const pgStreamCount = parseInt(pgStreams.rows[0].count, 10);
    if (pgStreamCount !== jsonStreams) {
      errors.push(`revenue_streams: JSON=${jsonStreams}, PostgreSQL=${pgStreamCount}`);
    } else {
      console.log(`revenue_streams: OK (${pgStreamCount})`);
    }

    // 2. MKT components
    const jsonMkt = (config.mktComponents || []).length;
    const pgMkt = await client.query('SELECT COUNT(*) FROM projection_mkt_components');
    const pgMktCount = parseInt(pgMkt.rows[0].count, 10);
    if (pgMktCount !== jsonMkt) {
      errors.push(`mkt_components: JSON=${jsonMkt}, PostgreSQL=${pgMktCount}`);
    } else {
      console.log(`mkt_components: OK (${pgMktCount})`);
    }

    // 3. Growth
    const jsonGrowth = base.growth || {};
    const pgGrowth = await client.query('SELECT minimo, medio, maximo FROM projection_growth WHERE id = 1');
    const row = pgGrowth.rows[0];
    if (row) {
      const gMin = Math.abs((Number(row.minimo) || 0) - (Number(jsonGrowth.minimo) || 0));
      const gMed = Math.abs((Number(row.medio) || 0) - (Number(jsonGrowth.medio) || 0));
      const gMax = Math.abs((Number(row.maximo) || 0) - (Number(jsonGrowth.maximo) || 0));
      if (gMin > 0.01 || gMed > 0.01 || gMax > 0.01) {
        errors.push(`growth: divergência minimo=${gMin}, medio=${gMed}, maximo=${gMax}`);
      } else {
        console.log('growth: OK');
      }
    } else {
      errors.push('growth: nenhuma linha em projection_growth');
    }

    // 4. Base fixed expenses - amostra (soma dos 12 meses)
    const jsonFixed = arraySum(base.prevYear?.fixedExpenses);
    const pgFixed = await client.query('SELECT COALESCE(SUM(value), 0) as s FROM projection_base_fixed_expenses');
    const pgFixedSum = parseFloat(pgFixed.rows[0]?.s || 0);
    if (Math.abs(pgFixedSum - jsonFixed) > 0.01) {
      errors.push(`base_fixed_expenses: JSON soma=${jsonFixed}, PostgreSQL soma=${pgFixedSum}`);
    } else {
      console.log('base_fixed_expenses: OK');
    }

    // 5. Derived fixed expenses
    const fixedExp = readJsonSafe('fixedExpenses.json', { previsto: [], media: [], maximo: [] });
    const jsonFixedDerived = arraySum(fixedExp.previsto) + arraySum(fixedExp.media) + arraySum(fixedExp.maximo);
    const pgFixedDerived = await client.query('SELECT COALESCE(SUM(value), 0) as s FROM projection_fixed_expenses');
    const pgFixedDerivedSum = parseFloat(pgFixedDerived.rows[0]?.s || 0);
    if (Math.abs(pgFixedDerivedSum - jsonFixedDerived) > 0.01) {
      errors.push(`projection_fixed_expenses: JSON soma=${jsonFixedDerived}, PostgreSQL soma=${pgFixedDerivedSum}`);
    } else {
      console.log('projection_fixed_expenses: OK');
    }

    // 6. Budget
    const budget = readJsonSafe('budget.json', { previsto: [], medio: [], maximo: [] });
    const jsonBudget = arraySum(budget.previsto) + arraySum(budget.medio) + arraySum(budget.maximo);
    const pgBudget = await client.query('SELECT COALESCE(SUM(value), 0) as s FROM projection_budget');
    const pgBudgetSum = parseFloat(pgBudget.rows[0]?.s || 0);
    if (Math.abs(pgBudgetSum - jsonBudget) > 0.01) {
      errors.push(`projection_budget: JSON soma=${jsonBudget}, PostgreSQL soma=${pgBudgetSum}`);
    } else {
      console.log('projection_budget: OK');
    }

    if (errors.length > 0) {
      console.error('\nDivergências encontradas:');
      errors.forEach(e => console.error('  -', e));
      process.exit(1);
    }

    console.log('\nValidação da projeção concluída com sucesso.');
    process.exit(0);
  } catch (err) {
    console.error('Erro na validação:', err);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

validate();
