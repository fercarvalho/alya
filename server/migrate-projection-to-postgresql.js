/**
 * Script para migrar dados de projeção dos arquivos JSON para PostgreSQL.
 * Execute após schema-projection.sql: npm run migrate-projection
 *
 * Ordem: 1) schema.sql, 2) schema-projection.sql, 3) migrate, 4) migrate-projection
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'alya',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const dbPath = path.join(__dirname, 'database');
const schemaPath = path.join(__dirname, 'database', 'schema-projection.sql');

function readJsonSafe(filename, defaultValue = null) {
  const filePath = path.join(dbPath, filename);
  if (!fs.existsSync(filePath)) return defaultValue;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.warn(`Aviso: não foi possível ler ${filename}:`, e.message);
    return defaultValue;
  }
}

/** array[i] no JSON = month_num = i + 1 no PostgreSQL */
function arrayToMonthRows(arr, defaultVal = 0) {
  const a = Array.isArray(arr) ? arr.slice(0, 12) : [];
  return Array.from({ length: 12 }, (_, i) => ({
    month_num: i + 1,
    value: Number(a[i]) || defaultVal,
  }));
}

function arrayToNullableMonthRows(arr) {
  const a = Array.isArray(arr) ? arr.slice(0, 12) : [];
  return Array.from({ length: 12 }, (_, i) => ({
    month_num: i + 1,
    value: a[i] !== null && a[i] !== undefined ? Number(a[i]) : null,
  }));
}

const defaultProjectionConfig = {
  revenueStreams: [
    { id: 'rev_1', name: 'Faturamento', order: 1, isActive: true },
  ],
  mktComponents: [
    { id: 'mkt_1', name: 'Marketing', order: 1, isActive: true },
  ],
};

async function migrateProjection() {
  const client = await pool.connect();

  try {
    await client.query('SELECT 1');
    console.log('Conexão com PostgreSQL estabelecida.\n');
  } catch (err) {
    console.error('Erro ao conectar ao PostgreSQL:', err.message);
    process.exit(1);
  }

  try {
    const tableCheck = await client.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projection_growth')
    `);
    if (!tableCheck.rows[0]?.exists) {
      console.log('Tabelas de projeção não encontradas. Executando schema-projection.sql...');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schemaSql);
        console.log('Schema aplicado.\n');
      } else {
        throw new Error('Arquivo database/schema-projection.sql não encontrado. Execute-o manualmente primeiro.');
      }
    }

    await client.query('BEGIN');
    console.log('Iniciando migração da projeção...\n');

    // ----- 1. Config -----
    const config = readJsonSafe('projection-config.json', defaultProjectionConfig);
    const revenueStreams = config.revenueStreams || defaultProjectionConfig.revenueStreams;
    const mktComponents = config.mktComponents || defaultProjectionConfig.mktComponents;

    console.log(`Migrando ${revenueStreams.length} revenue streams...`);
    for (const s of revenueStreams) {
      if (!s?.id) continue;
      await client.query(`
        INSERT INTO projection_revenue_streams (id, name, "order", is_active)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "order" = EXCLUDED."order", is_active = EXCLUDED.is_active
      `, [s.id, s.name || '', (s.order ?? 1), s.isActive !== false]);
    }

    console.log(`Migrando ${mktComponents.length} mkt components...`);
    for (const c of mktComponents) {
      if (!c?.id) continue;
      await client.query(`
        INSERT INTO projection_mkt_components (id, name, "order", is_active)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "order" = EXCLUDED."order", is_active = EXCLUDED.is_active
      `, [c.id, c.name || '', (c.order ?? 1), c.isActive !== false]);
    }

    // ----- 2. Growth -----
    const base = readJsonSafe('projection-base.json', { growth: { minimo: 0, medio: 0, maximo: 0 } });
    const growth = base.growth || { minimo: 0, medio: 0, maximo: 0 };
    await client.query(`
      INSERT INTO projection_growth (id, minimo, medio, maximo) VALUES (1, $1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET minimo = EXCLUDED.minimo, medio = EXCLUDED.medio, maximo = EXCLUDED.maximo
    `, [Number(growth.minimo) || 0, Number(growth.medio) || 0, Number(growth.maximo) || 0]);
    console.log('Growth migrado.');

    // ----- 3. Base (prevYear) -----
    const prevYear = base.prevYear || {};

    const fixedArr = prevYear.fixedExpenses || new Array(12).fill(0);
    for (const { month_num, value } of arrayToMonthRows(fixedArr)) {
      await client.query(`
        INSERT INTO projection_base_fixed_expenses (month_num, value) VALUES ($1, $2)
        ON CONFLICT (month_num) DO UPDATE SET value = EXCLUDED.value
      `, [month_num, value]);
    }

    const varArr = prevYear.variableExpenses || new Array(12).fill(0);
    for (const { month_num, value } of arrayToMonthRows(varArr)) {
      await client.query(`
        INSERT INTO projection_base_variable_expenses (month_num, value) VALUES ($1, $2)
        ON CONFLICT (month_num) DO UPDATE SET value = EXCLUDED.value
      `, [month_num, value]);
    }

    const invArr = prevYear.investments || new Array(12).fill(0);
    for (const { month_num, value } of arrayToMonthRows(invArr)) {
      await client.query(`
        INSERT INTO projection_base_investments (month_num, value) VALUES ($1, $2)
        ON CONFLICT (month_num) DO UPDATE SET value = EXCLUDED.value
      `, [month_num, value]);
    }

    const revStreams = prevYear.revenueStreams || {};
    for (const s of revenueStreams) {
      if (!s?.id) continue;
      const arr = revStreams[s.id] || new Array(12).fill(0);
      for (const { month_num, value } of arrayToMonthRows(arr)) {
        await client.query(`
          INSERT INTO projection_base_revenue (stream_id, month_num, value) VALUES ($1, $2, $3)
          ON CONFLICT (stream_id, month_num) DO UPDATE SET value = EXCLUDED.value
        `, [s.id, month_num, value]);
      }
    }

    const mktComps = prevYear.mktComponents || {};
    for (const c of mktComponents) {
      if (!c?.id) continue;
      const arr = mktComps[c.id] || new Array(12).fill(0);
      for (const { month_num, value } of arrayToMonthRows(arr)) {
        await client.query(`
          INSERT INTO projection_base_mkt (component_id, month_num, value) VALUES ($1, $2, $3)
          ON CONFLICT (component_id, month_num) DO UPDATE SET value = EXCLUDED.value
        `, [c.id, month_num, value]);
      }
    }
    console.log('Base (prevYear) migrada.');

    // ----- 4. Manual overrides -----
    const overrides = base.manualOverrides || {};

    const overrideMap = [
      ['fixedPrevistoManual', 'fixedMediaManual', 'fixedMaximoManual'],
      ['variablePrevistoManual', 'variableMedioManual', 'variableMaximoManual'],
      ['investimentosPrevistoManual', 'investimentosMedioManual', 'investimentosMaximoManual'],
      ['mktPrevistoManual', 'mktMedioManual', 'mktMaximoManual'],
    ];
    const scenarioNames = ['previsto', 'medio', 'maximo'];
    const tableNames = ['projection_override_fixed', 'projection_override_variable', 'projection_override_investments', 'projection_override_mkt'];

    for (let t = 0; t < tableNames.length; t++) {
      const table = tableNames[t];
      const keys = overrideMap[t];
      for (let s = 0; s < 3; s++) {
        const arr = overrides[keys[s]] || new Array(12).fill(null);
        for (const { month_num, value } of arrayToNullableMonthRows(arr)) {
          await client.query(`
            INSERT INTO ${table} (scenario, month_num, value) VALUES ($1, $2, $3)
            ON CONFLICT (scenario, month_num) DO UPDATE SET value = EXCLUDED.value
          `, [scenarioNames[s], month_num, value]);
        }
      }
    }

    const revenueManual = overrides.revenueManual || {};
    for (const s of revenueStreams) {
      if (!s?.id) continue;
      const rm = revenueManual[s.id] || {};
      for (const scenario of scenarioNames) {
        const key = scenario === 'medio' ? 'medio' : scenario;
        const arr = rm[key] || new Array(12).fill(null);
        for (const { month_num, value } of arrayToNullableMonthRows(arr)) {
          await client.query(`
            INSERT INTO projection_override_revenue (stream_id, scenario, month_num, value) VALUES ($1, $2, $3, $4)
            ON CONFLICT (stream_id, scenario, month_num) DO UPDATE SET value = EXCLUDED.value
          `, [s.id, scenario, month_num, value]);
        }
      }
    }
    console.log('Overrides manuais migrados.');

    // ----- 5. Dados derivados -----
    const fixedExp = readJsonSafe('fixedExpenses.json', { previsto: [], media: [], maximo: [] });
    for (const scenario of ['previsto', 'medio', 'maximo']) {
      const key = scenario === 'medio' ? 'media' : scenario;
      const arr = fixedExp[key] || new Array(12).fill(0);
      for (const { month_num, value } of arrayToMonthRows(arr)) {
        await client.query(`
          INSERT INTO projection_fixed_expenses (scenario, month_num, value) VALUES ($1, $2, $3)
          ON CONFLICT (scenario, month_num) DO UPDATE SET value = EXCLUDED.value
        `, [scenario, month_num, value]);
      }
    }

    const varExp = readJsonSafe('variableExpenses.json', { previsto: [], medio: [], maximo: [] });
    for (const scenario of ['previsto', 'medio', 'maximo']) {
      const arr = varExp[scenario] || new Array(12).fill(0);
      for (const { month_num, value } of arrayToMonthRows(arr)) {
        await client.query(`
          INSERT INTO projection_variable_expenses (scenario, month_num, value) VALUES ($1, $2, $3)
          ON CONFLICT (scenario, month_num) DO UPDATE SET value = EXCLUDED.value
        `, [scenario, month_num, value]);
      }
    }

    const invData = readJsonSafe('investments.json', { previsto: [], medio: [], maximo: [] });
    for (const scenario of ['previsto', 'medio', 'maximo']) {
      const arr = invData[scenario] || new Array(12).fill(0);
      for (const { month_num, value } of arrayToMonthRows(arr)) {
        await client.query(`
          INSERT INTO projection_investments (scenario, month_num, value) VALUES ($1, $2, $3)
          ON CONFLICT (scenario, month_num) DO UPDATE SET value = EXCLUDED.value
        `, [scenario, month_num, value]);
      }
    }

    const budgetData = readJsonSafe('budget.json', { previsto: [], medio: [], maximo: [] });
    for (const scenario of ['previsto', 'medio', 'maximo']) {
      const arr = budgetData[scenario] || new Array(12).fill(0);
      for (const { month_num, value } of arrayToMonthRows(arr)) {
        await client.query(`
          INSERT INTO projection_budget (scenario, month_num, value) VALUES ($1, $2, $3)
          ON CONFLICT (scenario, month_num) DO UPDATE SET value = EXCLUDED.value
        `, [scenario, month_num, value]);
      }
    }

    const resultadoData = readJsonSafe('resultado.json', { previsto: [], medio: [], maximo: [] });
    for (const scenario of ['previsto', 'medio', 'maximo']) {
      const arr = resultadoData[scenario] || new Array(12).fill(0);
      for (const { month_num, value } of arrayToMonthRows(arr)) {
        await client.query(`
          INSERT INTO projection_resultado (scenario, month_num, value) VALUES ($1, $2, $3)
          ON CONFLICT (scenario, month_num) DO UPDATE SET value = EXCLUDED.value
        `, [scenario, month_num, value]);
      }
    }

    // projection_revenue_values e projection_mkt_values - do projection.json se existir
    const snapshot = readJsonSafe('projection.json', null);
    if (snapshot?.revenue?.streams) {
      for (const [streamId, data] of Object.entries(snapshot.revenue.streams)) {
        for (const scenario of ['previsto', 'medio', 'maximo']) {
          const arr = data[scenario] || data.previsto || new Array(12).fill(0);
          for (const { month_num, value } of arrayToMonthRows(arr)) {
            await client.query(`
              INSERT INTO projection_revenue_values (stream_id, scenario, month_num, value) VALUES ($1, $2, $3, $4)
              ON CONFLICT (stream_id, scenario, month_num) DO UPDATE SET value = EXCLUDED.value
            `, [streamId, scenario, month_num, value]);
          }
        }
      }
    }

    if (snapshot?.mktComponents?.components) {
      for (const [compId, data] of Object.entries(snapshot.mktComponents.components)) {
        const arr = data.previsto || new Array(12).fill(0);
        for (const { month_num, value } of arrayToMonthRows(arr)) {
          await client.query(`
            INSERT INTO projection_mkt_values (component_id, scenario, month_num, value) VALUES ($1, 'previsto', $2, $3)
            ON CONFLICT (component_id, scenario, month_num) DO UPDATE SET value = EXCLUDED.value
          `, [compId, month_num, value]);
        }
      }
    }

    console.log('Dados derivados migrados.');

    await client.query('COMMIT');
    console.log('\nMigração da projeção concluída com sucesso.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro durante a migração da projeção:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateProjection().then(() => process.exit(0)).catch(() => process.exit(1));
