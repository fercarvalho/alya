'use strict';

const axios = require('axios');

// Rate limiting: Nuvemshop permite 2 req/s com burst de 40
// Implementado como fila com controle de intervalo
const REQUEST_INTERVAL_MS = 500; // 2 req/s
let lastRequestTime = 0;
const requestQueue = [];
let processingQueue = false;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processQueue() {
  if (processingQueue) return;
  processingQueue = true;

  while (requestQueue.length > 0) {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < REQUEST_INTERVAL_MS) {
      await sleep(REQUEST_INTERVAL_MS - elapsed);
    }

    const { fn, resolve, reject } = requestQueue.shift();
    lastRequestTime = Date.now();
    try {
      resolve(await fn());
    } catch (err) {
      reject(err);
    }
  }

  processingQueue = false;
}

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ fn, resolve, reject });
    processQueue();
  });
}

/**
 * Cria instância Axios configurada para a API Nuvemshop
 */
function createClient(token, storeId) {
  const client = axios.create({
    baseURL: `https://api.nuvemshop.com.br/v1/${storeId}`,
    headers: {
      // Nuvemshop requer "Authentication" (não "Authorization") com "bearer" minúsculo
      Authentication: `bearer ${token}`,
      'User-Agent': 'ALYA Financial System (suporte@alya.com.br)',
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  // Interceptor para retry em caso de 429 (rate limit excedido)
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 429) {
        const resetMs = parseInt(error.response.headers['x-rate-limit-reset'] || '1000', 10);
        await sleep(resetMs);
        return client(error.config);
      }
      throw error;
    }
  );

  return client;
}

/**
 * Busca informações da loja para validar a conexão
 */
async function getStore(token, storeId) {
  return enqueue(async () => {
    const client = createClient(token, storeId);
    const { data } = await client.get('/store');
    return data;
  });
}

/**
 * Busca pedidos da loja
 * @param {object} params - { since: Date, page: number, perPage: number }
 */
async function getOrders(token, storeId, params = {}) {
  return enqueue(async () => {
    const client = createClient(token, storeId);
    const query = {
      per_page: params.perPage || 50,
      page: params.page || 1,
    };
    if (params.since) {
      query.updated_at_min = params.since instanceof Date
        ? params.since.toISOString()
        : params.since;
    }
    const { data } = await client.get('/orders', { params: query });
    return data;
  });
}

/**
 * Busca todos os pedidos com paginação automática
 */
async function getAllOrders(token, storeId, since) {
  const allOrders = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const orders = await getOrders(token, storeId, { page, perPage: 50, since });
    allOrders.push(...orders);
    hasMore = orders.length === 50;
    page++;
  }

  return allOrders;
}

/**
 * Busca produtos da loja
 */
async function getProducts(token, storeId, params = {}) {
  return enqueue(async () => {
    const client = createClient(token, storeId);
    const query = {
      per_page: params.perPage || 50,
      page: params.page || 1,
    };
    if (params.since) {
      query.updated_at_min = params.since instanceof Date
        ? params.since.toISOString()
        : params.since;
    }
    const { data } = await client.get('/products', { params: query });
    return data;
  });
}

/**
 * Busca todos os produtos com paginação automática
 */
async function getAllProducts(token, storeId, since) {
  const allProducts = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const products = await getProducts(token, storeId, { page, perPage: 50, since });
    allProducts.push(...products);
    hasMore = products.length === 50;
    page++;
  }

  return allProducts;
}

/**
 * Busca clientes da loja
 */
async function getCustomers(token, storeId, params = {}) {
  return enqueue(async () => {
    const client = createClient(token, storeId);
    const query = {
      per_page: params.perPage || 50,
      page: params.page || 1,
    };
    if (params.since) {
      query.updated_at_min = params.since instanceof Date
        ? params.since.toISOString()
        : params.since;
    }
    const { data } = await client.get('/customers', { params: query });
    return data;
  });
}

/**
 * Busca todos os clientes com paginação automática
 */
async function getAllCustomers(token, storeId, since) {
  const allCustomers = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const customers = await getCustomers(token, storeId, { page, perPage: 50, since });
    allCustomers.push(...customers);
    hasMore = customers.length === 50;
    page++;
  }

  return allCustomers;
}

/**
 * Registra um webhook na Nuvemshop
 * @param {string} event - ex: 'order/paid', 'product/created'
 * @param {string} url - URL HTTPS que receberá o webhook
 */
async function registerWebhook(token, storeId, event, url) {
  return enqueue(async () => {
    const client = createClient(token, storeId);
    const { data } = await client.post('/webhooks', { event, url });
    return data;
  });
}

/**
 * Remove um webhook da Nuvemshop
 */
async function deleteWebhook(token, storeId, webhookId) {
  return enqueue(async () => {
    const client = createClient(token, storeId);
    const { data } = await client.delete(`/webhooks/${webhookId}`);
    return data;
  });
}

/**
 * Lista webhooks registrados
 */
async function listWebhooks(token, storeId) {
  return enqueue(async () => {
    const client = createClient(token, storeId);
    const { data } = await client.get('/webhooks');
    return data;
  });
}

module.exports = {
  getStore,
  getOrders,
  getAllOrders,
  getProducts,
  getAllProducts,
  getCustomers,
  getAllCustomers,
  registerWebhook,
  deleteWebhook,
  listWebhooks,
};
