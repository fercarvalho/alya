// Service Worker para modo demo do Alya
// Intercepta requisições /api/* e retorna dados mock

const DEMO_TOKEN = 'demo-token-alya-2024';
const DEMO_USER = {
  id: 'demo-1',
  username: 'demo',
  role: 'user',
  modules: ['dashboard', 'transactions', 'products', 'clients', 'reports', 'metas', 'dre'],
  isActive: true
};

// Banco de dados mock em memória
const MOCK_DB = {
  transactions: [
    // Transações do mês atual (para demonstração)
    {
      id: 'demo_tx_1',
      date: new Date().toISOString().split('T')[0], // Data de hoje
      description: 'Venda de Produto A',
      value: 1500.00,
      type: 'Receita',
      category: 'Varejo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'demo_tx_2',
      date: new Date().toISOString().split('T')[0],
      description: 'Venda de Produto B',
      value: 800.00,
      type: 'Receita',
      category: 'Varejo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'demo_tx_3',
      date: new Date().toISOString().split('T')[0],
      description: 'Serviço de Consultoria',
      value: 2500.00,
      type: 'Receita',
      category: 'Serviços',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'demo_tx_4',
      date: new Date().toISOString().split('T')[0],
      description: 'Aluguel do Escritório',
      value: 2000.00,
      type: 'Despesa',
      category: 'Fixo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'demo_tx_5',
      date: new Date().toISOString().split('T')[0],
      description: 'Compra de Material',
      value: 450.00,
      type: 'Despesa',
      category: 'Variavel',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'demo_tx_6',
      date: new Date().toISOString().split('T')[0],
      description: 'Salários',
      value: 5000.00,
      type: 'Despesa',
      category: 'Fixo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    // Transações do mês anterior (para comparação)
    {
      id: 'demo_tx_7',
      date: (() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
      })(),
      description: 'Venda de Produto A',
      value: 1200.00,
      type: 'Receita',
      category: 'Varejo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'demo_tx_8',
      date: (() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
      })(),
      description: 'Serviço de Consultoria',
      value: 2000.00,
      type: 'Receita',
      category: 'Serviços',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'demo_tx_9',
      date: (() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
      })(),
      description: 'Aluguel do Escritório',
      value: 2000.00,
      type: 'Despesa',
      category: 'Fixo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'demo_tx_10',
      date: (() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
      })(),
      description: 'Salários',
      value: 5000.00,
      type: 'Despesa',
      category: 'Fixo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  products: [],
  clients: [],
  metas: [],
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
  ]
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
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  let path = url.pathname;

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

