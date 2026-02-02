// Service Worker para modo demo do Alya
// Intercepta requisições /api/* e retorna dados mock
// Versão: 1.0.4 - Projeção impgeo-style (base + overrides) no demo

const SW_VERSION = '1.0.4';
const DEMO_TOKEN = 'demo-token-alya-2024';
const DEMO_USER = {
  id: 'demo-1',
  username: 'demo',
  role: 'user',
  modules: ['dashboard', 'transactions', 'products', 'clients', 'reports', 'metas', 'projecao', 'dre'],
  isActive: true
};

// Banco de dados mock em memória
// IMPORTANTE: Todos os arrays começam vazios - o usuário cria seus próprios dados
const MOCK_DB = {
  transactions: [], // Vazio - usuário cria suas próprias transações
  products: [],     // Vazio - usuário cria seus próprios produtos
  clients: [],      // Vazio - usuário cria seus próprios clientes
  metas: [],        // Vazio - usuário cria suas próprias metas
  modules: [
    {
      id: 'mjx45q91lkhoelmuru',
      name: 'Dashboard',
      key: 'dashboard',
      icon: 'Home',
      description: 'Painel principal com visão geral do sistema',
      route: null,
      isActive: true,
      isSystem: true,
      createdAt: '2026-01-02T16:54:04.069Z',
      updatedAt: '2026-01-02T16:54:04.072Z'
    },
    {
      id: 'mjx45q9475z4pbd5gy9',
      name: 'Transações',
      key: 'transactions',
      icon: 'DollarSign',
      description: 'Gerenciamento de transações financeiras',
      route: null,
      isActive: true,
      isSystem: true,
      createdAt: '2026-01-02T16:54:04.072Z',
      updatedAt: '2026-01-02T16:54:04.072Z'
    },
    {
      id: 'mjx45q94091pcvs57jgx',
      name: 'Produtos',
      key: 'products',
      icon: 'Package',
      description: 'Gerenciamento de produtos e estoque',
      route: null,
      isActive: true,
      isSystem: true,
      createdAt: '2026-01-02T16:54:04.072Z',
      updatedAt: '2026-01-02T16:54:04.072Z'
    },
    {
      id: 'mjx45q94rlt92s9bbjo',
      name: 'Clientes',
      key: 'clients',
      icon: 'Users',
      description: 'Gerenciamento de clientes',
      route: null,
      isActive: true,
      isSystem: true,
      createdAt: '2026-01-02T16:54:04.072Z',
      updatedAt: '2026-01-02T16:54:04.072Z'
    },
    {
      id: 'mjx45q94xe3pzawvgw',
      name: 'Relatórios',
      key: 'reports',
      icon: 'BarChart3',
      description: 'Relatórios e análises',
      route: null,
      isActive: true,
      isSystem: true,
      createdAt: '2026-01-02T16:54:04.072Z',
      updatedAt: '2026-01-02T16:54:04.072Z'
    },
    {
      id: 'mjx45q94wspg0te9rqo',
      name: 'Metas',
      key: 'metas',
      icon: 'Target',
      description: 'Gerenciamento de metas',
      route: null,
      isActive: true,
      isSystem: true,
      createdAt: '2026-01-02T16:54:04.072Z',
      updatedAt: '2026-01-02T16:54:04.072Z'
    },
    {
      id: 'mjx45q94proj2026alya',
      name: 'Projeção',
      key: 'projecao',
      icon: 'Calculator',
      description: 'Planejamento anual (tabelas e gráficos)',
      route: null,
      isActive: true,
      isSystem: true,
      createdAt: '2026-01-02T16:54:04.072Z',
      updatedAt: '2026-01-02T16:54:04.072Z'
    },
    {
      id: 'mjx45q94dre2024alya',
      name: 'DRE',
      key: 'dre',
      icon: 'BarChart3',
      description: 'Demonstrativo de Resultado do Exercício',
      route: null,
      isActive: true,
      isSystem: true,
      createdAt: '2026-01-02T16:54:04.072Z',
      updatedAt: '2026-01-02T16:54:04.072Z'
    },
    {
      id: 'mjx45q94onj5v4u5vx',
      name: 'Administração',
      key: 'admin',
      icon: 'Shield',
      description: 'Painel administrativo',
      route: null,
      isActive: true,
      isSystem: true,
      createdAt: '2026-01-02T16:54:04.072Z',
      updatedAt: '2026-01-02T16:54:04.072Z'
    }
  ],

  // ===== PROJEÇÃO (mock em memória) =====
  projectionConfig: {
    revenueStreams: [
      { id: 'rev_1', name: 'Faturamento A', order: 1, isActive: true },
      { id: 'rev_2', name: 'Faturamento B', order: 2, isActive: true }
    ],
    mktComponents: [
      { id: 'mkt_1', name: 'Tráfego', order: 1, isActive: true },
      { id: 'mkt_2', name: 'Social Media', order: 2, isActive: true },
      { id: 'mkt_3', name: 'Conteúdo', order: 3, isActive: true }
    ],
    updatedAt: new Date(0).toISOString()
  },
  revenue: {
    streams: {
      rev_1: { previsto: new Array(12).fill(0) },
      rev_2: { previsto: new Array(12).fill(0) }
    },
    updatedAt: new Date(0).toISOString()
  },
  mktComponentsData: {
    components: {
      mkt_1: { previsto: new Array(12).fill(0) },
      mkt_2: { previsto: new Array(12).fill(0) },
      mkt_3: { previsto: new Array(12).fill(0) }
    },
    updatedAt: new Date(0).toISOString()
  },
  fixedExpenses: { previsto: new Array(12).fill(0), media: new Array(12).fill(0), maximo: new Array(12).fill(0), updatedAt: new Date(0).toISOString() },
  variableExpenses: { previsto: new Array(12).fill(0), medio: new Array(12).fill(0), maximo: new Array(12).fill(0), updatedAt: new Date(0).toISOString() },
  investments: { previsto: new Array(12).fill(0), medio: new Array(12).fill(0), maximo: new Array(12).fill(0), updatedAt: new Date(0).toISOString() },
  budget: { previsto: new Array(12).fill(0), medio: new Array(12).fill(0), maximo: new Array(12).fill(0), updatedAt: new Date(0).toISOString() },
  resultado: { previsto: new Array(12).fill(0), medio: new Array(12).fill(0), maximo: new Array(12).fill(0), updatedAt: new Date(0).toISOString() },
  projectionSnapshot: {
    growth: { minimo: 0, medio: 0, maximo: 0 },
    updatedAt: new Date(0).toISOString()
  },
  // Base impgeo-style (Resultado do Ano Anterior + overrides)
  projectionBase: {
    growth: { minimo: 0, medio: 0, maximo: 0 },
    prevYear: {
      fixedExpenses: new Array(12).fill(0),
      variableExpenses: new Array(12).fill(0),
      investments: new Array(12).fill(0),
      revenueStreams: {
        rev_1: new Array(12).fill(0),
        rev_2: new Array(12).fill(0)
      },
      mktComponents: {
        mkt_1: new Array(12).fill(0),
        mkt_2: new Array(12).fill(0),
        mkt_3: new Array(12).fill(0)
      }
    },
    manualOverrides: {
      fixedPrevistoManual: new Array(12).fill(null),
      fixedMediaManual: new Array(12).fill(null),
      fixedMaximoManual: new Array(12).fill(null),
      variablePrevistoManual: new Array(12).fill(null),
      variableMedioManual: new Array(12).fill(null),
      variableMaximoManual: new Array(12).fill(null),
      investimentosPrevistoManual: new Array(12).fill(null),
      investimentosMedioManual: new Array(12).fill(null),
      investimentosMaximoManual: new Array(12).fill(null),
      mktPrevistoManual: new Array(12).fill(null),
      mktMedioManual: new Array(12).fill(null),
      mktMaximoManual: new Array(12).fill(null),
      revenueManual: {
        rev_1: { previsto: new Array(12).fill(null), medio: new Array(12).fill(null), maximo: new Array(12).fill(null) },
        rev_2: { previsto: new Array(12).fill(null), medio: new Array(12).fill(null), maximo: new Array(12).fill(null) }
      }
    },
    updatedAt: new Date(0).toISOString()
  }
};

// Função auxiliar para gerar IDs únicos
function generateId(prefix = 'id') {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

// Função auxiliar para validar token
function getTokenFromRequest(req) {
  const authHeader = req.headers.get('Authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

function isValidToken(token) {
  return token === DEMO_TOKEN;
}

// Função para criar resposta JSON com delay simulado
async function jsonResponse(data, status = 200, delayMs = 300) {
  await new Promise(resolve => setTimeout(resolve, delayMs));
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function notFound(message = 'Not found') {
  return jsonResponse({ success: false, error: message }, 404);
}

function unauthorized(message = 'Unauthorized') {
  return jsonResponse({ success: false, error: message }, 401);
}

// ===== Helpers Projeção (demo) =====
function normalizeMonthArray(arr, fallbackValue = 0) {
  const out = new Array(12).fill(fallbackValue);
  if (!Array.isArray(arr)) return out;
  for (let i = 0; i < 12; i++) {
    const v = Number(arr[i]);
    out[i] = Number.isFinite(v) ? v : fallbackValue;
  }
  return out;
}

function applyGrowthArr(baseArr, percent) {
  const p = Number(percent);
  const factor = Number.isFinite(p) ? (1 + p / 100) : 1;
  return normalizeMonthArray(baseArr, 0).map(v => v * factor);
}

function syncProjectionDataDemo() {
  const cfg = MOCK_DB.projectionConfig || { revenueStreams: [], mktComponents: [] };
  const base = MOCK_DB.projectionBase || {};
  const growth = base.growth || { minimo: 0, medio: 0, maximo: 0 };

  const factor = (pct) => {
    const p = Number(pct);
    return Number.isFinite(p) ? (1 + p / 100) : 1;
  };

  const normalizeNullableMonthArray = (arr) => {
    const out = new Array(12).fill(null);
    if (!Array.isArray(arr)) return out;
    for (let i = 0; i < 12; i++) {
      const raw = arr[i];
      if (raw === null || raw === undefined || raw === '') out[i] = null;
      else {
        const v = Number(raw);
        out[i] = Number.isFinite(v) ? v : null;
      }
    }
    return out;
  };

  const applyOverride = (autoArr, overrideArr) => {
    const a = normalizeMonthArray(autoArr, 0);
    const o = normalizeNullableMonthArray(overrideArr);
    return a.map((v, i) => (o[i] === null ? v : Number(o[i])));
  };

  // Fixas (impgeo): previsto por blocos baseado em Dez anterior + overrides
  const dezAnterior = Number(base?.prevYear?.fixedExpenses?.[11]) || 0;
  const fixedAuto = (() => {
    const out = new Array(12).fill(0);
    const jan = dezAnterior * 1.10;
    out[0] = jan;
    out[1] = jan;
    out[2] = jan;
    const abr = jan * 1.10;
    out[3] = abr;
    out[4] = abr;
    out[5] = abr;
    const jul = abr * 1.10;
    out[6] = jul;
    out[7] = jul;
    out[8] = jul;
    const outVal = jul * 1.10;
    out[9] = outVal;
    out[10] = outVal;
    out[11] = outVal;
    return out;
  })();
  const fixedPrevisto = applyOverride(fixedAuto, base?.manualOverrides?.fixedPrevistoManual);
  const fixedMedio = applyOverride(fixedPrevisto.map(v => v * 1.10), base?.manualOverrides?.fixedMediaManual);
  const fixedMaximo = applyOverride(fixedMedio.map(v => v * 1.10), base?.manualOverrides?.fixedMaximoManual);

  // Variáveis
  const prevVariable = normalizeMonthArray(base?.prevYear?.variableExpenses, 0);
  const variablePrevisto = applyOverride(prevVariable.map(v => v * factor(growth.minimo)), base?.manualOverrides?.variablePrevistoManual);
  const variableMedio = applyOverride(prevVariable.map(v => v * factor(growth.medio)), base?.manualOverrides?.variableMedioManual);
  const variableMaximo = applyOverride(prevVariable.map(v => v * factor(growth.maximo)), base?.manualOverrides?.variableMaximoManual);

  // Investimentos
  const prevInvest = normalizeMonthArray(base?.prevYear?.investments, 0);
  const investmentsPrevisto = applyOverride(prevInvest.map(v => v * factor(growth.minimo)), base?.manualOverrides?.investimentosPrevistoManual);
  const investmentsMedio = applyOverride(prevInvest.map(v => v * factor(growth.medio)), base?.manualOverrides?.investimentosMedioManual);
  const investmentsMaximo = applyOverride(prevInvest.map(v => v * factor(growth.maximo)), base?.manualOverrides?.investimentosMaximoManual);

  // Revenue totals (somatório de streams ativos; cada stream com overrides por cenário)
  const activeStreams = (cfg.revenueStreams || []).filter(s => s && s.isActive !== false && s.id);
  const revenueTotalsPrevisto = new Array(12).fill(0);
  const revenueTotalsMedio = new Array(12).fill(0);
  const revenueTotalsMaximo = new Array(12).fill(0);
  for (const s of activeStreams) {
    const prevStream = normalizeMonthArray(base?.prevYear?.revenueStreams?.[s.id], 0);
    const rm = base?.manualOverrides?.revenueManual?.[s.id] || {};
    const prevEff = applyOverride(prevStream.map(v => v * factor(growth.minimo)), rm.previsto);
    const medEff = applyOverride(prevStream.map(v => v * factor(growth.medio)), rm.medio);
    const maxEff = applyOverride(prevStream.map(v => v * factor(growth.maximo)), rm.maximo);
    for (let i = 0; i < 12; i++) {
      revenueTotalsPrevisto[i] += prevEff[i];
      revenueTotalsMedio[i] += medEff[i];
      revenueTotalsMaximo[i] += maxEff[i];
    }
  }

  // MKT totals: soma componentes (Previsto sem growth.minimo)
  const activeMkt = (cfg.mktComponents || []).filter(c => c && c.isActive !== false && c.id);
  const mktTotalsBase = new Array(12).fill(0);
  for (const c of activeMkt) {
    const arr = normalizeMonthArray(base?.prevYear?.mktComponents?.[c.id], 0);
    for (let i = 0; i < 12; i++) mktTotalsBase[i] += arr[i];
  }
  const mktPrevAuto = normalizeMonthArray(mktTotalsBase, 0);
  const mktMedAuto = mktTotalsBase.map(v => v * factor(growth.medio));
  const mktMaxAuto = mktTotalsBase.map(v => v * factor(growth.maximo));

  const mktTotalsPrevisto = applyOverride(mktPrevAuto, base?.manualOverrides?.mktPrevistoManual);
  const mktTotalsMedio = applyOverride(mktMedAuto, base?.manualOverrides?.mktMedioManual);
  const mktTotalsMaximo = applyOverride(mktMaxAuto, base?.manualOverrides?.mktMaximoManual);

  // Budget / Resultado
  const budgetPrev = new Array(12).fill(0).map((_, i) => fixedPrevisto[i] + variablePrevisto[i] + investmentsPrevisto[i] + mktTotalsPrevisto[i]);
  const budgetMedio = new Array(12).fill(0).map((_, i) => fixedMedio[i] + variableMedio[i] + investmentsMedio[i] + mktTotalsMedio[i]);
  const budgetMax = new Array(12).fill(0).map((_, i) => fixedMaximo[i] + variableMaximo[i] + investmentsMaximo[i] + mktTotalsMaximo[i]);

  const resultadoPrev = new Array(12).fill(0).map((_, i) => revenueTotalsPrevisto[i] - budgetPrev[i]);
  const resultadoMedio = new Array(12).fill(0).map((_, i) => revenueTotalsMedio[i] - budgetMedio[i]);
  const resultadoMax = new Array(12).fill(0).map((_, i) => revenueTotalsMaximo[i] - budgetMax[i]);

  // Atualizar caches mock (para endpoints derivados)
  MOCK_DB.fixedExpenses = { previsto: fixedPrevisto, media: fixedMedio, maximo: fixedMaximo, updatedAt: new Date().toISOString() };
  MOCK_DB.variableExpenses = { previsto: variablePrevisto, medio: variableMedio, maximo: variableMaximo, updatedAt: new Date().toISOString() };
  MOCK_DB.investments = { previsto: investmentsPrevisto, medio: investmentsMedio, maximo: investmentsMaximo, updatedAt: new Date().toISOString() };
  MOCK_DB.budget = { previsto: budgetPrev, medio: budgetMedio, maximo: budgetMax, updatedAt: new Date().toISOString() };
  MOCK_DB.resultado = { previsto: resultadoPrev, medio: resultadoMedio, maximo: resultadoMax, updatedAt: new Date().toISOString() };

  // Espelhar base para endpoints legados (revenue/mkt-components)
  const revenueStreamsMirror = (cfg.revenueStreams || []).reduce((acc, s) => {
    if (s?.id) acc[s.id] = { previsto: normalizeMonthArray(base?.prevYear?.revenueStreams?.[s.id], 0) };
    return acc;
  }, {});
  MOCK_DB.revenue = { streams: revenueStreamsMirror, updatedAt: new Date().toISOString() };

  const mktComponentsMirror = (cfg.mktComponents || []).reduce((acc, c) => {
    if (c?.id) acc[c.id] = { previsto: normalizeMonthArray(base?.prevYear?.mktComponents?.[c.id], 0) };
    return acc;
  }, {});
  MOCK_DB.mktComponentsData = { components: mktComponentsMirror, updatedAt: new Date().toISOString() };

  const newSnapshot = {
    growth: {
      minimo: Number(growth.minimo) || 0,
      medio: Number(growth.medio) || 0,
      maximo: Number(growth.maximo) || 0
    },
    config: {
      revenueStreams: cfg.revenueStreams || [],
      mktComponents: cfg.mktComponents || []
    },
    fixedExpenses: { previsto: fixedPrevisto, media: fixedMedio, maximo: fixedMaximo },
    variableExpenses: { previsto: variablePrevisto, medio: variableMedio, maximo: variableMaximo },
    investments: { previsto: investmentsPrevisto, medio: investmentsMedio, maximo: investmentsMaximo },
    mktComponents: MOCK_DB.mktComponentsData,
    mktTotals: { previsto: mktTotalsPrevisto, medio: mktTotalsMedio, maximo: mktTotalsMaximo },
    revenue: MOCK_DB.revenue,
    revenueTotals: { previsto: revenueTotalsPrevisto, medio: revenueTotalsMedio, maximo: revenueTotalsMaximo },
    budget: { previsto: budgetPrev, medio: budgetMedio, maximo: budgetMax },
    resultado: { previsto: resultadoPrev, medio: resultadoMedio, maximo: resultadoMax },
    updatedAt: new Date().toISOString()
  };

  MOCK_DB.projectionSnapshot = newSnapshot;
  return newSnapshot;
}

// Handler para autenticação
async function handleAuth(req) {
  const url = new URL(req.url);
  let path = url.pathname;
  
  // Normalizar path removendo /app/ se presente
  if (path.startsWith('/app/api/')) {
    path = path.replace('/app', '');
  }

  if (path === '/api/auth/login' && req.method === 'POST') {
    try {
      const body = await req.json();
      const { username, password } = body;

      console.log('[SW] Login attempt:', { username, password: '***' });

      if (username === 'demo' && password === 'demo123') {
        console.log('[SW] Login demo válido, retornando token');
        return jsonResponse({
          success: true,
          token: DEMO_TOKEN,
          user: DEMO_USER
          // NÃO incluir firstLogin - login direto no demo
        });
      }

      console.log('[SW] Credenciais inválidas');
      return jsonResponse({ success: false, error: 'Credenciais inválidas' }, 401);
    } catch (error) {
      console.error('[SW] Erro ao processar login:', error);
      return jsonResponse({ success: false, error: 'Erro ao processar login' }, 400);
    }
  }

  if (path === '/api/auth/verify' && req.method === 'POST') {
    const token = getTokenFromRequest(req);
    if (token && isValidToken(token)) {
      return jsonResponse({
        success: true,
        user: DEMO_USER
      });
    }
    return unauthorized('Token inválido');
  }

  if (path === '/api/auth/logout' && req.method === 'POST') {
    return jsonResponse({ success: true, message: 'Logout realizado com sucesso' });
  }

  return notFound();
}

// Handler para projeção (mock)
async function handleProjection(req) {
  const url = new URL(req.url);
  let path = url.pathname;
  const token = getTokenFromRequest(req);

  // Normalizar path removendo /app/ se presente
  if (path.startsWith('/app/api/')) {
    path = path.replace('/app', '');
  }

  if (!token || !isValidToken(token)) {
    return unauthorized('Token de acesso requerido');
  }

  // GET/PUT /api/projection/base (base impgeo-style)
  if (path === '/api/projection/base' && req.method === 'GET') {
    // garantir snapshot atualizado para UI consistente
    if (!MOCK_DB.projectionSnapshot?.config) syncProjectionDataDemo();
    return jsonResponse({ success: true, data: MOCK_DB.projectionBase });
  }
  if (path === '/api/projection/base' && req.method === 'PUT') {
    try {
      const body = await req.json();
      const current = MOCK_DB.projectionBase || {};

      const merged = {
        ...current,
        ...body,
        growth: { ...(current.growth || {}), ...(body.growth || {}) },
        prevYear: {
          ...(current.prevYear || {}),
          ...(body.prevYear || {}),
          revenueStreams: { ...(current.prevYear?.revenueStreams || {}), ...(body.prevYear?.revenueStreams || {}) },
          mktComponents: { ...(current.prevYear?.mktComponents || {}), ...(body.prevYear?.mktComponents || {}) }
        },
        manualOverrides: {
          ...(current.manualOverrides || {}),
          ...(body.manualOverrides || {}),
          revenueManual: { ...(current.manualOverrides?.revenueManual || {}), ...(body.manualOverrides?.revenueManual || {}) }
        },
        updatedAt: new Date().toISOString()
      };

      // merge por streamId para não perder campos
      if (body?.manualOverrides?.revenueManual && typeof body.manualOverrides.revenueManual === 'object') {
        for (const [streamId, v] of Object.entries(body.manualOverrides.revenueManual)) {
          const prev = current.manualOverrides?.revenueManual?.[streamId] || {};
          merged.manualOverrides.revenueManual[streamId] = { ...prev, ...(v || {}) };
        }
      }

      MOCK_DB.projectionBase = merged;
      const snap = syncProjectionDataDemo();
      return jsonResponse({ success: true, data: MOCK_DB.projectionBase, projection: snap });
    } catch (error) {
      return jsonResponse({ success: false, error: 'Erro ao atualizar base' }, 400);
    }
  }

  // GET /api/projection (snapshot)
  if (path === '/api/projection' && req.method === 'GET') {
    const snap = MOCK_DB.projectionSnapshot?.config ? MOCK_DB.projectionSnapshot : syncProjectionDataDemo();
    return jsonResponse({ success: true, data: snap });
  }

  // POST /api/projection/sync (admin-only no backend)
  if (path === '/api/projection/sync' && req.method === 'POST') {
    if (DEMO_USER.role !== 'admin') {
      return jsonResponse({ success: false, error: 'Acesso negado. Apenas administradores podem acessar esta rota.' }, 403);
    }
    const snap = syncProjectionDataDemo();
    return jsonResponse({ success: true, data: snap });
  }

  // Growth
  if (path === '/api/projection/growth' && req.method === 'GET') {
    const snap = MOCK_DB.projectionSnapshot?.config ? MOCK_DB.projectionSnapshot : syncProjectionDataDemo();
    return jsonResponse({ success: true, data: snap.growth || { minimo: 0, medio: 0, maximo: 0 } });
  }
  if (path === '/api/projection/growth' && req.method === 'PUT') {
    try {
      const body = await req.json();
      MOCK_DB.projectionBase = MOCK_DB.projectionBase || {};
      MOCK_DB.projectionBase.growth = {
        minimo: Number(body?.minimo) || 0,
        medio: Number(body?.medio) || 0,
        maximo: Number(body?.maximo) || 0
      };
      MOCK_DB.projectionBase.updatedAt = new Date().toISOString();
      const snap = syncProjectionDataDemo();
      return jsonResponse({ success: true, data: MOCK_DB.projectionBase.growth, projection: snap });
    } catch (error) {
      return jsonResponse({ success: false, error: 'Erro ao atualizar growth' }, 400);
    }
  }

  // Config
  if (path === '/api/projection/config' && req.method === 'GET') {
    return jsonResponse({ success: true, data: MOCK_DB.projectionConfig });
  }
  if (path === '/api/projection/config' && req.method === 'PUT') {
    // admin-only no backend
    if (DEMO_USER.role !== 'admin') {
      return jsonResponse({ success: false, error: 'Acesso negado. Apenas administradores podem acessar esta rota.' }, 403);
    }
    try {
      const body = await req.json();
      MOCK_DB.projectionConfig = { ...body, updatedAt: new Date().toISOString() };
      const snap = syncProjectionDataDemo();
      return jsonResponse({ success: true, data: MOCK_DB.projectionConfig, projection: snap });
    } catch (error) {
      return jsonResponse({ success: false, error: 'Erro ao atualizar config' }, 400);
    }
  }

  // Revenue
  if (path === '/api/projection/revenue' && req.method === 'GET') {
    // mirror do projectionBase.prevYear.revenueStreams
    if (!MOCK_DB.projectionSnapshot?.config) syncProjectionDataDemo();
    return jsonResponse({ success: true, data: MOCK_DB.revenue });
  }
  if (path === '/api/projection/revenue' && req.method === 'PUT') {
    try {
      const body = await req.json();
      // compat: escrever na base (prevYear)
      const cfg = MOCK_DB.projectionConfig || { revenueStreams: [] };
      MOCK_DB.projectionBase = MOCK_DB.projectionBase || {};
      MOCK_DB.projectionBase.prevYear = MOCK_DB.projectionBase.prevYear || {};
      MOCK_DB.projectionBase.prevYear.revenueStreams = MOCK_DB.projectionBase.prevYear.revenueStreams || {};
      for (const s of (cfg.revenueStreams || [])) {
        if (!s?.id) continue;
        const arr = body?.streams?.[s.id]?.previsto;
        MOCK_DB.projectionBase.prevYear.revenueStreams[s.id] = normalizeMonthArray(arr, 0);
      }
      MOCK_DB.projectionBase.updatedAt = new Date().toISOString();
      const snap = syncProjectionDataDemo();
      return jsonResponse({ success: true, data: MOCK_DB.revenue, projection: snap });
    } catch (error) {
      return jsonResponse({ success: false, error: 'Erro ao atualizar revenue' }, 400);
    }
  }
  if (path === '/api/projection/revenue' && req.method === 'DELETE') {
    const cfg = MOCK_DB.projectionConfig || { revenueStreams: [] };
    MOCK_DB.projectionBase = MOCK_DB.projectionBase || {};
    MOCK_DB.projectionBase.prevYear = MOCK_DB.projectionBase.prevYear || {};
    MOCK_DB.projectionBase.prevYear.revenueStreams = MOCK_DB.projectionBase.prevYear.revenueStreams || {};
    MOCK_DB.projectionBase.manualOverrides = MOCK_DB.projectionBase.manualOverrides || {};
    MOCK_DB.projectionBase.manualOverrides.revenueManual = MOCK_DB.projectionBase.manualOverrides.revenueManual || {};
    for (const s of (cfg.revenueStreams || [])) {
      if (!s?.id) continue;
      MOCK_DB.projectionBase.prevYear.revenueStreams[s.id] = new Array(12).fill(0);
      MOCK_DB.projectionBase.manualOverrides.revenueManual[s.id] = {
        previsto: new Array(12).fill(null),
        medio: new Array(12).fill(null),
        maximo: new Array(12).fill(null)
      };
    }
    MOCK_DB.projectionBase.updatedAt = new Date().toISOString();
    const snap = syncProjectionDataDemo();
    return jsonResponse({ success: true, message: 'Revenue resetado', data: MOCK_DB.revenue, projection: snap });
  }

  // MKT components
  if (path === '/api/projection/mkt-components' && req.method === 'GET') {
    if (!MOCK_DB.projectionSnapshot?.config) syncProjectionDataDemo();
    return jsonResponse({ success: true, data: MOCK_DB.mktComponentsData });
  }
  if (path === '/api/projection/mkt-components' && req.method === 'PUT') {
    try {
      const body = await req.json();
      // compat: escrever na base (prevYear)
      const cfg = MOCK_DB.projectionConfig || { mktComponents: [] };
      MOCK_DB.projectionBase = MOCK_DB.projectionBase || {};
      MOCK_DB.projectionBase.prevYear = MOCK_DB.projectionBase.prevYear || {};
      MOCK_DB.projectionBase.prevYear.mktComponents = MOCK_DB.projectionBase.prevYear.mktComponents || {};
      for (const c of (cfg.mktComponents || [])) {
        if (!c?.id) continue;
        const arr = body?.components?.[c.id]?.previsto;
        MOCK_DB.projectionBase.prevYear.mktComponents[c.id] = normalizeMonthArray(arr, 0);
      }
      MOCK_DB.projectionBase.updatedAt = new Date().toISOString();
      const snap = syncProjectionDataDemo();
      return jsonResponse({ success: true, data: MOCK_DB.mktComponentsData, projection: snap });
    } catch (error) {
      return jsonResponse({ success: false, error: 'Erro ao atualizar mkt-components' }, 400);
    }
  }
  if (path === '/api/projection/mkt-components' && req.method === 'DELETE') {
    const cfg = MOCK_DB.projectionConfig || { mktComponents: [] };
    MOCK_DB.projectionBase = MOCK_DB.projectionBase || {};
    MOCK_DB.projectionBase.prevYear = MOCK_DB.projectionBase.prevYear || {};
    MOCK_DB.projectionBase.prevYear.mktComponents = MOCK_DB.projectionBase.prevYear.mktComponents || {};
    MOCK_DB.projectionBase.manualOverrides = MOCK_DB.projectionBase.manualOverrides || {};
    for (const c of (cfg.mktComponents || [])) {
      if (!c?.id) continue;
      MOCK_DB.projectionBase.prevYear.mktComponents[c.id] = new Array(12).fill(0);
    }
    MOCK_DB.projectionBase.manualOverrides.mktPrevistoManual = new Array(12).fill(null);
    MOCK_DB.projectionBase.manualOverrides.mktMedioManual = new Array(12).fill(null);
    MOCK_DB.projectionBase.manualOverrides.mktMaximoManual = new Array(12).fill(null);
    MOCK_DB.projectionBase.updatedAt = new Date().toISOString();
    const snap = syncProjectionDataDemo();
    return jsonResponse({ success: true, message: 'MKT resetado', data: MOCK_DB.mktComponentsData, projection: snap });
  }

  // Fixed expenses
  if (path === '/api/projection/fixed-expenses' && req.method === 'GET') {
    return jsonResponse({ success: true, data: MOCK_DB.fixedExpenses });
  }
  if (path === '/api/projection/fixed-expenses' && req.method === 'PUT') {
    try {
      const body = await req.json();
      MOCK_DB.projectionBase = MOCK_DB.projectionBase || {};
      MOCK_DB.projectionBase.prevYear = MOCK_DB.projectionBase.prevYear || {};
      MOCK_DB.projectionBase.prevYear.fixedExpenses = normalizeMonthArray(body?.previsto, 0);
      MOCK_DB.projectionBase.updatedAt = new Date().toISOString();
      const snap = syncProjectionDataDemo();
      return jsonResponse({ success: true, data: MOCK_DB.fixedExpenses, projection: snap });
    } catch (error) {
      return jsonResponse({ success: false, error: 'Erro ao atualizar fixed-expenses' }, 400);
    }
  }
  if (path === '/api/projection/fixed-expenses' && req.method === 'DELETE') {
    MOCK_DB.fixedExpenses = { previsto: new Array(12).fill(0), media: new Array(12).fill(0), maximo: new Array(12).fill(0), updatedAt: new Date().toISOString() };
    const snap = syncProjectionDataDemo();
    return jsonResponse({ success: true, message: 'Fixed resetado', data: MOCK_DB.fixedExpenses, projection: snap });
  }

  // Variable expenses
  if (path === '/api/projection/variable-expenses' && req.method === 'GET') {
    return jsonResponse({ success: true, data: MOCK_DB.variableExpenses });
  }
  if (path === '/api/projection/variable-expenses' && req.method === 'PUT') {
    try {
      const body = await req.json();
      MOCK_DB.projectionBase = MOCK_DB.projectionBase || {};
      MOCK_DB.projectionBase.prevYear = MOCK_DB.projectionBase.prevYear || {};
      MOCK_DB.projectionBase.prevYear.variableExpenses = normalizeMonthArray(body?.previsto, 0);
      MOCK_DB.projectionBase.updatedAt = new Date().toISOString();
      const snap = syncProjectionDataDemo();
      return jsonResponse({ success: true, data: MOCK_DB.variableExpenses, projection: snap });
    } catch (error) {
      return jsonResponse({ success: false, error: 'Erro ao atualizar variable-expenses' }, 400);
    }
  }
  if (path === '/api/projection/variable-expenses' && req.method === 'DELETE') {
    MOCK_DB.variableExpenses = { previsto: new Array(12).fill(0), medio: new Array(12).fill(0), maximo: new Array(12).fill(0), updatedAt: new Date().toISOString() };
    const snap = syncProjectionDataDemo();
    return jsonResponse({ success: true, message: 'Variable resetado', data: MOCK_DB.variableExpenses, projection: snap });
  }

  // Investments
  if (path === '/api/projection/investments' && req.method === 'GET') {
    return jsonResponse({ success: true, data: MOCK_DB.investments });
  }
  if (path === '/api/projection/investments' && req.method === 'PUT') {
    try {
      const body = await req.json();
      MOCK_DB.projectionBase = MOCK_DB.projectionBase || {};
      MOCK_DB.projectionBase.prevYear = MOCK_DB.projectionBase.prevYear || {};
      MOCK_DB.projectionBase.prevYear.investments = normalizeMonthArray(body?.previsto, 0);
      MOCK_DB.projectionBase.updatedAt = new Date().toISOString();
      const snap = syncProjectionDataDemo();
      return jsonResponse({ success: true, data: MOCK_DB.investments, projection: snap });
    } catch (error) {
      return jsonResponse({ success: false, error: 'Erro ao atualizar investments' }, 400);
    }
  }
  if (path === '/api/projection/investments' && req.method === 'DELETE') {
    MOCK_DB.investments = { previsto: new Array(12).fill(0), medio: new Array(12).fill(0), maximo: new Array(12).fill(0), updatedAt: new Date().toISOString() };
    const snap = syncProjectionDataDemo();
    return jsonResponse({ success: true, message: 'Investments resetado', data: MOCK_DB.investments, projection: snap });
  }

  return notFound();
}

// Handler genérico para CRUD de recursos
async function handleResource(req, resourceName) {
  const url = new URL(req.url);
  const path = url.pathname;
  const token = getTokenFromRequest(req);

  if (!token || !isValidToken(token)) {
    return unauthorized('Token de acesso requerido');
  }

  const collection = MOCK_DB[resourceName];
  if (!collection) {
    return notFound(`Recurso ${resourceName} não encontrado`);
  }

  // GET /api/resource
  if (path === `/api/${resourceName}` && req.method === 'GET') {
    return jsonResponse({ success: true, data: collection });
  }

  // POST /api/resource
  if (path === `/api/${resourceName}` && req.method === 'POST') {
    try {
      const body = await req.json();
      const newItem = {
        id: generateId(resourceName[0]),
        ...body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      collection.push(newItem);
      return jsonResponse({ success: true, data: newItem }, 201);
    } catch (error) {
      return jsonResponse({ success: false, error: 'Erro ao criar item' }, 400);
    }
  }

  // PUT /api/resource/:id
  if (path.startsWith(`/api/${resourceName}/`) && req.method === 'PUT') {
    try {
      const id = path.split('/').pop();
      const body = await req.json();
      const index = collection.findIndex(item => item.id === id);
      
      if (index === -1) {
        return notFound('Item não encontrado');
      }

      collection[index] = {
        ...collection[index],
        ...body,
        updatedAt: new Date().toISOString()
      };
      return jsonResponse({ success: true, data: collection[index] });
    } catch (error) {
      return jsonResponse({ success: false, error: 'Erro ao atualizar item' }, 400);
    }
  }

  // DELETE /api/resource/:id
  if (path.startsWith(`/api/${resourceName}/`) && req.method === 'DELETE') {
    const id = path.split('/').pop();
    const index = collection.findIndex(item => item.id === id);
    
    if (index === -1) {
      return notFound('Item não encontrado');
    }

    collection.splice(index, 1);
    return jsonResponse({ success: true, message: 'Item deletado com sucesso' });
  }

  // DELETE /api/resource (múltiplos)
  if (path === `/api/${resourceName}` && req.method === 'DELETE') {
    try {
      const body = await req.json();
      const { ids } = body;
      
      if (!Array.isArray(ids)) {
        return jsonResponse({ success: false, error: 'IDs devem ser um array' }, 400);
      }

      ids.forEach(id => {
        const index = collection.findIndex(item => item.id === id);
        if (index !== -1) {
          collection.splice(index, 1);
        }
      });

      return jsonResponse({ success: true, message: 'Itens deletados com sucesso' });
    } catch (error) {
      return jsonResponse({ success: false, error: 'Erro ao deletar itens' }, 400);
    }
  }

  return notFound();
}

// Handler para módulos
async function handleModules(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  const token = getTokenFromRequest(req);

  if (!token || !isValidToken(token)) {
    return unauthorized('Token de acesso requerido');
  }

  if (path === '/api/modules' && req.method === 'GET') {
    return jsonResponse({ success: true, data: MOCK_DB.modules });
  }

  return notFound();
}

// Handler para admin
async function handleAdmin(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  const token = getTokenFromRequest(req);

  if (!token || !isValidToken(token)) {
    return unauthorized('Token de acesso requerido');
  }

  // Usuário demo não é admin, então retornar 403 para rotas admin
  if (DEMO_USER.role !== 'admin') {
    return jsonResponse({ success: false, error: 'Acesso negado. Apenas administradores podem acessar esta rota.' }, 403);
  }

  // Rotas admin (caso usuário seja admin no futuro)
  if (path === '/api/admin/users' && req.method === 'GET') {
    return jsonResponse({ success: true, data: [DEMO_USER] });
  }

  if (path === '/api/admin/modules' && req.method === 'GET') {
    return jsonResponse({ success: true, data: MOCK_DB.modules });
  }

  if (path === '/api/admin/statistics' && req.method === 'GET') {
    return jsonResponse({
      success: true,
      data: {
        totalUsers: 1,
        totalTransactions: MOCK_DB.transactions.length,
        totalProducts: MOCK_DB.products.length,
        totalClients: MOCK_DB.clients.length
      }
    });
  }

  if (path.startsWith('/api/admin/activity-log') && req.method === 'GET') {
    return jsonResponse({ success: true, data: [] });
  }

  return notFound();
}

// Handler para import/export
async function handleImportExport(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  const token = getTokenFromRequest(req);

  if (!token || !isValidToken(token)) {
    return unauthorized('Token de acesso requerido');
  }

  if (path === '/api/import' && req.method === 'POST') {
    // Simular importação - em um caso real, processaria o arquivo
    // Por enquanto, apenas retornar sucesso
    try {
      const formData = await req.formData();
      const file = formData.get('file');
      const type = formData.get('type') || 'transactions';
      
      // Simular processamento
      return jsonResponse({
        success: true,
        message: `Dados importados com sucesso!`,
        count: 0,
        type
      });
    } catch (error) {
      return jsonResponse({ success: false, error: 'Erro ao importar dados' }, 400);
    }
  }

  if (path === '/api/export' && req.method === 'POST') {
    try {
      const body = await req.json();
      const { type, data } = body;
      
      // Simular exportação - retornar dados para download
      return jsonResponse({
        success: true,
        message: 'Exportação realizada com sucesso',
        data: data || []
      });
    } catch (error) {
      return jsonResponse({ success: false, error: 'Erro ao exportar dados' }, 400);
    }
  }

  return notFound();
}

// Handler para modelos
async function handleModelo(req) {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path.startsWith('/api/modelo/') && req.method === 'GET') {
    const type = path.split('/').pop();
    
    // Retornar um arquivo Excel mockado (vazio ou com estrutura básica)
    // Por enquanto, retornar sucesso - o frontend pode gerar o modelo localmente
    return jsonResponse({
      success: true,
      message: `Modelo ${type} disponível`,
      type
    });
  }

  return notFound();
}

// Event listeners do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker versão', SW_VERSION);
  // Forçar ativação imediata, mesmo se houver outras instâncias ativas
  // Isso garante que a nova versão seja ativada imediatamente
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker');
  event.waitUntil(
    Promise.all([
      // Assumir controle de todas as páginas imediatamente
      self.clients.claim(),
      // Limpar caches antigos se necessário
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Não limpar caches aqui, apenas logar
            console.log('[SW] Cache encontrado:', cacheName);
            return Promise.resolve();
          })
        );
      })
    ])
  );
  console.log('[SW] Service Worker ativado e controlando todas as páginas');
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  let path = url.pathname;

  // Interceptar imagens/logos na raiz e redirecionar para /app/
  const imageAliases = [
    '/alya-logo.png',
    '/logo_rodape.png',
    '/logo_rodape.PNG',
    '/alya-favicon.ico',
    '/favicon.ico'
  ];
  
  if (imageAliases.includes(path) || 
      (path.match(/\.(png|jpg|jpeg|gif|svg|ico)$/i) && !path.startsWith('/app/') && !path.startsWith('/assets/'))) {
    const newPath = '/app' + path;
    const newUrl = new URL(newPath, url.origin);
    console.log('[SW] Redirecionando imagem:', path, '→', newPath);
    event.respondWith(fetch(newUrl).catch(() => {
      console.warn('[SW] Falha ao carregar imagem:', newPath);
      return new Response('Image not found', { status: 404 });
    }));
    return;
  }

  // Interceptar APENAS requisições de API (incluindo /app/api/)
  // Todas as outras requisições (assets, HTML, etc) passam direto sem interceptação
  if (path.startsWith('/api/') || path.startsWith('/app/api/')) {
    // Normalizar path para /api/ removendo /app/ se presente
    const normalizedPath = path.startsWith('/app/api/') ? path.replace('/app', '') : path;
    console.log('[SW] Interceptando requisição API:', normalizedPath, event.request.method, 'URL original:', url.pathname);
    
    event.respondWith((async () => {
      try {
        // Autenticação - usar requisição original (o body já está disponível)
        if (normalizedPath.startsWith('/api/auth/')) {
          console.log('[SW] Roteando para handleAuth');
          return await handleAuth(event.request);
        }

        // Módulos
        if (normalizedPath.startsWith('/api/modules')) {
          return await handleModules(event.request);
        }

        // Admin
        if (normalizedPath.startsWith('/api/admin/')) {
          return await handleAdmin(event.request);
        }

        // Import/Export
        if (normalizedPath === '/api/import' || normalizedPath === '/api/export') {
          return await handleImportExport(event.request);
        }

        // Modelos
        if (normalizedPath.startsWith('/api/modelo/')) {
          return await handleModelo(event.request);
        }

        // Projeção
        if (normalizedPath.startsWith('/api/projection')) {
          return await handleProjection(event.request);
        }

        // Limpar tudo da projeção (admin-only no backend)
        if (normalizedPath === '/api/clear-all-projection-data') {
          if (DEMO_USER.role !== 'admin') {
            return jsonResponse({ success: false, error: 'Acesso negado. Apenas administradores podem acessar esta rota.' }, 403);
          }
          const cfg = MOCK_DB.projectionConfig || { revenueStreams: [], mktComponents: [] };
          // Reset completo via projectionBase
          const streamsBase = (cfg.revenueStreams || []).reduce((acc, s) => {
            if (s?.id) acc[s.id] = new Array(12).fill(0);
            return acc;
          }, {});
          const revenueManual = (cfg.revenueStreams || []).reduce((acc, s) => {
            if (s?.id) acc[s.id] = { previsto: new Array(12).fill(null), medio: new Array(12).fill(null), maximo: new Array(12).fill(null) };
            return acc;
          }, {});
          const mktBase = (cfg.mktComponents || []).reduce((acc, c) => {
            if (c?.id) acc[c.id] = new Array(12).fill(0);
            return acc;
          }, {});
          MOCK_DB.projectionBase = {
            growth: { minimo: 0, medio: 0, maximo: 0 },
            prevYear: {
              fixedExpenses: new Array(12).fill(0),
              variableExpenses: new Array(12).fill(0),
              investments: new Array(12).fill(0),
              revenueStreams: streamsBase,
              mktComponents: mktBase
            },
            manualOverrides: {
              fixedPrevistoManual: new Array(12).fill(null),
              fixedMediaManual: new Array(12).fill(null),
              fixedMaximoManual: new Array(12).fill(null),
              variablePrevistoManual: new Array(12).fill(null),
              variableMedioManual: new Array(12).fill(null),
              variableMaximoManual: new Array(12).fill(null),
              investimentosPrevistoManual: new Array(12).fill(null),
              investimentosMedioManual: new Array(12).fill(null),
              investimentosMaximoManual: new Array(12).fill(null),
              mktPrevistoManual: new Array(12).fill(null),
              mktMedioManual: new Array(12).fill(null),
              mktMaximoManual: new Array(12).fill(null),
              revenueManual
            },
            updatedAt: new Date().toISOString()
          };
          syncProjectionDataDemo();
          return jsonResponse({ success: true, message: 'Projeção limpa com sucesso' });
        }

        // Recursos CRUD
        if (normalizedPath.startsWith('/api/transactions')) {
          return await handleResource(event.request, 'transactions');
        }

        if (normalizedPath.startsWith('/api/products')) {
          return await handleResource(event.request, 'products');
        }

        if (normalizedPath.startsWith('/api/clients')) {
          return await handleResource(event.request, 'clients');
        }

        // Endpoint não encontrado
        return notFound('Endpoint não encontrado');
      } catch (error) {
        console.error('[SW] Erro ao processar requisição:', error);
        return jsonResponse({ success: false, error: 'Erro interno do servidor' }, 500);
      }
    })());
    return;
  }

  // Para outras requisições, usar comportamento padrão
  event.respondWith(fetch(event.request));
});

