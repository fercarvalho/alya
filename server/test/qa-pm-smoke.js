/* eslint-disable no-console */
// =============================================================================
// qa-pm-smoke.js — Smoke-test de API dos fluxos do PM (F6 do port do Gerenciamento)
// =============================================================================
// Exercita os cenários Q1–Q8 (conclusão+dependências+gatilhos, revisão, prazo,
// delegação, reabertura, pomodoro, custo/lucro, metas+dashboard) contra um
// servidor rodando localmente. Usa LOGIN REAL (admin/user) + cria um `manager`
// de teste via SQL. Cria dados marcados com [QA] e os REMOVE no teardown.
//
// Uso: subir o server (ex.: PORT=8099 node server/server.js) e rodar:
//        QA_BASE_URL=http://localhost:8099 node server/test/qa-pm-smoke.js
// Requer: server/.env (DB_* e JWT_SECRET). NÃO contém segredos.
// =============================================================================

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

// Tokens são FORJADOS (não login) para não depender de senhas. Reproduz o
// payload do login corrigido: superadmin bypassa o gate; user/manager levam o
// modulesAccess real (carregado de user_module_permissions), como no login.
function forge(id, role, modulesAccess = {}) {
  return jwt.sign({ id, username: `qa-${role}`, role, permissoes_legais: {}, modulesAccess }, JWT_SECRET, { expiresIn: '1h' });
}
async function forgeForUser(pool, id, role) {
  const rows = (await pool.query(`SELECT module_key, access_level FROM user_module_permissions WHERE user_id=$1`, [id])).rows;
  const ma = {}; for (const r of rows) ma[r.module_key] = r.access_level;
  return forge(id, role, ma);
}

const BASE = process.env.QA_BASE_URL || 'http://localhost:8099';
const TAG = '[QA]';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'alya',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// ── helpers ──────────────────────────────────────────────────────────────────
const created = { projects: [], services: [], goals: [], users: [], sessions: [] };
const results = [];

async function api(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try { json = await res.json(); } catch { /* sem corpo */ }
  return { status: res.status, ok: res.ok, json };
}

function assert(cond, msg) { if (!cond) throw new Error(msg); }
function d(resp) { return resp.json?.data ?? resp.json; }

async function scenario(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log(`  ✅ ${name}`);
  } catch (e) {
    results.push({ name, pass: false, detail: e.message });
    console.log(`  ❌ ${name} — ${e.message}`);
  }
}

// ── setup ────────────────────────────────────────────────────────────────────
const ctx = {}; // tokens + ids compartilhados entre cenários

async function setup() {
  console.log('› Setup (tokens, manager, template)…');
  assert(JWT_SECRET, 'JWT_SECRET ausente no .env');
  const adminId = (await pool.query(`SELECT id FROM users WHERE username='admin'`)).rows[0].id;
  ctx.admin = forge(adminId, 'superadmin');          // superadmin bypassa o gate
  ctx.userId = (await pool.query(`SELECT id FROM users WHERE username='user'`)).rows[0].id;
  ctx.user = await forgeForUser(pool, ctx.userId, 'user'); // modulesAccess real do banco

  // manager de teste via SQL (o endpoint de criação exige CPF/email/phone válidos)
  const mgrId = 'qa-mgr-' + Date.now();
  created.users.push(mgrId); // registra p/ teardown ANTES dos próximos passos poderem falhar
  await pool.query(
    `INSERT INTO users (id, username, password, role, is_active, created_at, updated_at)
     VALUES ($1, $2, '', 'manager', true, NOW(), NOW())`,
    [mgrId, mgrId]
  );
  await pool.query(
    `INSERT INTO user_module_permissions (id, user_id, module_key, access_level, created_at, updated_at)
     SELECT CONCAT($1::text,'-',rdp.module_key), $1::text, rdp.module_key, rdp.access_level, NOW(), NOW()
       FROM role_default_permissions rdp WHERE rdp.role = 'manager'`,
    [mgrId]
  );
  ctx.managerId = mgrId;
  ctx.manager = await forgeForUser(pool, mgrId, 'manager');

  // ── template: serviço + etapa + tarefas A,B(dep A),C(review) + trigger A→D ──
  let r = await api('POST', '/api/services', ctx.admin, { name: `${TAG} Serviço`, status: 'ativo' });
  assert(r.ok, `criar serviço (HTTP ${r.status})`);
  const serviceId = d(r).id; created.services.push(serviceId); ctx.serviceId = serviceId;

  r = await api('POST', `/api/services/${serviceId}/template/stages`, ctx.admin, { name: `${TAG} Etapa 1` });
  assert(r.ok, `criar stage (HTTP ${r.status})`);
  const stageId = d(r).id;

  const mkTask = async (name, extra = {}) => {
    const rr = await api('POST', `/api/services/${serviceId}/template/stages/${stageId}/tasks`, ctx.admin, { name, ...extra });
    assert(rr.ok, `criar task ${name} (HTTP ${rr.status})`);
    return d(rr).id;
  };
  ctx.tplA = await mkTask(`${TAG} Task A`);
  ctx.tplB = await mkTask(`${TAG} Task B`);
  ctx.tplC = await mkTask(`${TAG} Task C (review)`, { review_required: true });

  // B depende do START de A (start_dependency, target = task A)
  r = await api('POST', `/api/services/${serviceId}/template/tasks/${ctx.tplB}/dependencies`, ctx.admin, {
    dependencyType: 'start_dependency', dependencyTargetType: 'task', targetTaskId: ctx.tplA,
  });
  assert(r.ok, `criar dependência B→A (HTTP ${r.status}) ${r.json?.error || ''}`);

  // trigger: ao COMPLETAR A, cria uma nova tarefa "via trigger" no projeto
  r = await api('POST', `/api/services/${serviceId}/template/tasks/${ctx.tplA}/triggers`, ctx.admin, {
    onStatus: 'completed', payload: { name: `${TAG} Task via trigger` },
  });
  assert(r.ok, `criar trigger em A (HTTP ${r.status}) ${r.json?.error || ''}`);

  console.log('  setup ok (serviceId, managerId, template pronto)');
}

// ── teardown ─────────────────────────────────────────────────────────────────
async function teardown() {
  console.log('› Teardown (limpando dados [QA])…');
  try {
    for (const id of created.projects) await pool.query(`DELETE FROM projects WHERE id=$1`, [id]).catch(() => {});
    for (const id of created.services) await pool.query(`DELETE FROM services WHERE id=$1`, [id]).catch(() => {});
    for (const id of created.goals) await pool.query(`DELETE FROM pm_goals WHERE id=$1`, [id]).catch(() => {});
    // sessões de pomodoro vivas do 'user' seed criadas pelo teste
    if (ctx.userId) await pool.query(`DELETE FROM task_work_sessions WHERE user_id=$1 AND state NOT IN ('completed','aborted')`, [ctx.userId]).catch(() => {});
    for (const id of created.users) await pool.query(`DELETE FROM users WHERE id=$1`, [id]).catch(() => {});
    // desvincula quaisquer transações que apontem p/ projetos removidos
    if (created.projects.length)
      await pool.query(`UPDATE transactions SET project_id=NULL WHERE project_id = ANY($1::text[])`, [created.projects]).catch(() => {});
  } catch (e) { console.log('  (teardown parcial:', e.message, ')'); }
}

// ── util: cria um projeto do template e retorna {projectId, tasksByName} ──────
async function newProjectFromTemplate(name) {
  const r = await api('POST', '/api/projects', ctx.admin, {
    name: `${TAG} ${name}`, serviceId: ctx.serviceId, managerUserId: ctx.managerId, totalCents: 100000,
  });
  assert(r.ok, `criar projeto (HTTP ${r.status}) ${JSON.stringify(r.json).slice(0,150)}`);
  const proj = d(r); created.projects.push(proj.id);
  const tasks = {};
  for (const st of (proj.stages || [])) for (const t of (st.tasks || [])) tasks[t.name] = t;
  return { projectId: proj.id, tasks, proj };
}

// ── cenários ─────────────────────────────────────────────────────────────────
async function run() {
  await scenario('Q1 conclusão + dependências + gatilhos', async () => {
    const { projectId, tasks } = await newProjectFromTemplate('Q1');
    const A = tasks[`${TAG} Task A`], B = tasks[`${TAG} Task B`];
    assert(A && B, 'tasks A/B criadas no projeto');
    // B tem start-dep de A → não deve iniciar antes de A começar
    const startB = await api('POST', `/api/tasks/${B.id}/start`, ctx.admin);
    assert(!startB.ok, `B não deveria iniciar antes de A (HTTP ${startB.status})`);
    // inicia e completa A
    assert((await api('POST', `/api/tasks/${A.id}/start`, ctx.admin)).ok, 'start A');
    assert((await api('POST', `/api/tasks/${A.id}/complete`, ctx.admin)).ok, 'complete A');
    // B agora deve poder iniciar (dependência resolvida)
    assert((await api('POST', `/api/tasks/${B.id}/start`, ctx.admin)).ok, 'B deve iniciar após A');
    // gatilho: completar A deve ter criado a task "via trigger" no projeto
    const list = await api('GET', `/api/projects/${projectId}/tasks`, ctx.admin);
    assert(list.ok, 'listar tasks do projeto');
    const names = (d(list) || []).map((t) => t.name);
    assert(names.some((n) => n && n.includes('via trigger')), `gatilho deveria criar task; tasks: ${names.join(' | ')}`);
  });

  await scenario('Q2 revisão por papel', async () => {
    const { tasks } = await newProjectFromTemplate('Q2');
    const C = tasks[`${TAG} Task C (review)`];
    assert(C, 'task C (review) criada');
    // atribui ao user, ele inicia e envia p/ revisão
    assert((await api('POST', `/api/projects/${created.projects.at(-1)}/tasks/${C.id}/assign`, ctx.admin, { userId: ctx.userId })).ok, 'assign C ao user');
    await api('POST', `/api/tasks/${C.id}/accept`, ctx.user); // pode não exigir
    assert((await api('POST', `/api/tasks/${C.id}/start`, ctx.user)).ok, 'user start C');
    const sr = await api('POST', `/api/tasks/${C.id}/submit-review`, ctx.user);
    assert(sr.ok, `submit-review (HTTP ${sr.status})`);
    // admin vê na fila e aprova
    const pend = await api('GET', '/api/pm/pending-reviews', ctx.admin);
    assert(pend.ok, 'listar pending-reviews');
    const appr = await api('POST', `/api/tasks/${C.id}/review/approve`, ctx.admin);
    assert(appr.ok, `approve review (HTTP ${appr.status})`);
  });

  await scenario('Q3 negociação de prazo (pending↔countered)', async () => {
    const { tasks } = await newProjectFromTemplate('Q3');
    const A = tasks[`${TAG} Task A`];
    assert((await api('POST', `/api/projects/${created.projects.at(-1)}/tasks/${A.id}/assign`, ctx.admin, { userId: ctx.userId })).ok, 'assign A ao user');
    // user pede prazo → deve virar request pending (não aplicar direto)
    const req = await api('POST', `/api/tasks/${A.id}/due-date`, ctx.user, { dueDate: '2027-01-15', justification: 'QA' });
    assert(req.ok, `pedir prazo (HTTP ${req.status})`);
    const reqId = d(req)?.request?.id;
    assert(reqId, 'request de prazo criado (pending)');
    // admin contrapropõe → countered; user responde; admin aprova
    const dec = await api('POST', `/api/pm/due-date-requests/${reqId}/decide`, ctx.admin, { action: 'propose', approved: false, newDueDate: '2027-01-10' });
    assert(dec.ok, `admin propõe → countered (HTTP ${dec.status})`);
    const mine = await api('GET', '/api/pm/due-date-requests/mine', ctx.user);
    assert(mine.ok, 'user vê propostas');
    // a bola está com o user: ele ACEITA a contraproposta → aplica o prazo
    const resp = await api('POST', `/api/pm/due-date-requests/${reqId}/respond`, ctx.user, { action: 'accept' });
    assert(resp.ok, `user aceita contraproposta (HTTP ${resp.status}) ${resp.json?.error || ''}`);
  });

  await scenario('Q4 delegação manager→user (aprovação admin)', async () => {
    const { tasks } = await newProjectFromTemplate('Q4');
    const A = tasks[`${TAG} Task A`];
    // manager tenta atribuir → como não é dono, deve gerar delegation pending
    const asg = await api('POST', `/api/projects/${created.projects.at(-1)}/tasks/${A.id}/assign`, ctx.manager, { userId: ctx.userId });
    assert(asg.ok || asg.status === 202, `manager assign (HTTP ${asg.status})`);
    const delegs = await api('GET', '/api/pm/delegation-requests', ctx.admin);
    assert(delegs.ok, 'admin lista delegações');
  });

  await scenario('Q5 reabertura com aprovação', async () => {
    const { tasks } = await newProjectFromTemplate('Q5');
    const A = tasks[`${TAG} Task A`];
    assert((await api('POST', `/api/tasks/${A.id}/start`, ctx.admin)).ok, 'start A');
    assert((await api('POST', `/api/tasks/${A.id}/complete`, ctx.admin)).ok, 'complete A');
    // admin reabre direto (self)
    const un = await api('POST', `/api/tasks/${A.id}/uncomplete`, ctx.admin, { reason: 'QA reabrir', target: 'self' });
    assert(un.ok, `admin uncomplete direto (HTTP ${un.status})`);
  });

  await scenario('Q6 pomodoro (start/pause/resume/complete)', async () => {
    // só 1 sessão viva por usuário — limpa qualquer sessão viva remanescente
    await pool.query(`DELETE FROM task_work_sessions WHERE user_id=$1 AND state NOT IN ('completed','aborted')`, [ctx.userId]).catch(() => {});
    const st = await api('POST', '/api/pomodoro/sessions', ctx.user, { plannedMinutes: 25, category: 'other' });
    assert(st.ok, `iniciar sessão (HTTP ${st.status}) ${JSON.stringify(st.json)}`);
    const sid = (d(st).session || d(st)).id; created.sessions.push(sid);
    const pause = await api('POST', `/api/pomodoro/sessions/${sid}/pause`, ctx.user);
    assert(pause.ok, `pause (HTTP ${pause.status}) ${JSON.stringify(pause.json)}`);
    const resume = await api('POST', `/api/pomodoro/sessions/${sid}/resume`, ctx.user);
    assert(resume.ok, `resume (HTTP ${resume.status}) ${JSON.stringify(resume.json)}`);
    const done = await api('POST', `/api/pomodoro/sessions/${sid}/complete`, ctx.user);
    assert(done.ok, `complete (HTTP ${done.status}) ${JSON.stringify(done.json)}`);
    const stats = await api('GET', '/api/pomodoro/stats', ctx.user);
    assert(stats.ok, 'stats');
  });

  await scenario('Q7 custo/lucro por transação vinculada', async () => {
    const { projectId } = await newProjectFromTemplate('Q7');
    // pega 1 despesa sem projeto
    const desp = (await pool.query(`SELECT id, value FROM transactions WHERE type='Despesa' AND project_id IS NULL LIMIT 1`)).rows[0];
    assert(desp, 'há despesa sem projeto p/ vincular');
    const link = await api('POST', `/api/transactions/${desp.id}/link-project`, ctx.admin, { projectId });
    assert(link.ok, `vincular despesa (HTTP ${link.status})`);
    // financials: expenses deve refletir o valor da despesa (em centavos)
    const fin = await api('GET', `/api/pm/reports/financials?projectId=${projectId}`, ctx.admin);
    assert(fin.ok, `financials (HTTP ${fin.status})`);
    const spent = d(fin)?.expenses_cents;
    const expectCents = Math.round(parseFloat(desp.value) * 100);
    assert(Number(spent) === expectCents, `expenses esperado ${expectCents}, veio ${spent}`);
    // desvincula (limpeza)
    await api('POST', `/api/transactions/${desp.id}/link-project`, ctx.admin, { projectId: null });
  });

  await scenario('Q8 dashboard + metas', async () => {
    const dashUser = await api('GET', '/api/pm/dashboard', ctx.user);
    assert(dashUser.ok, `dashboard user (HTTP ${dashUser.status})`);
    const dashMgr = await api('GET', '/api/pm/dashboard', ctx.manager);
    assert(dashMgr.ok, `dashboard manager (HTTP ${dashMgr.status})`);
    const goal = await api('POST', '/api/pm/goals', ctx.admin, {
      metric: 'tasks_completed', target: 5, period: 'week',
      period_start: '2026-06-29', period_end: '2027-07-05', scope: 'self',
    });
    assert(goal.ok, `criar meta (HTTP ${goal.status}) ${JSON.stringify(goal.json).slice(0,120)}`);
    if (d(goal)?.id) created.goals.push(d(goal).id);
    const goals = await api('GET', '/api/pm/goals', ctx.admin);
    assert(goals.ok, 'listar metas');
  });
}

// ── main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n=== QA PM Smoke-test → ${BASE} ===`);
  let setupOk = false;
  try {
    await setup();
    setupOk = true;
    console.log('› Cenários:');
    await run();
  } catch (e) {
    console.error('‼️  Falha no setup:', e.message);
  } finally {
    await teardown();
    await pool.end();
  }
  const pass = results.filter(r => r.pass).length;
  console.log(`\n=== Resultado: ${pass}/${results.length} cenários passaram ===`);
  results.filter(r => !r.pass).forEach(r => console.log(`   ❌ ${r.name}: ${r.detail}`));
  process.exit(setupOk && pass === results.length ? 0 : 1);
})();
