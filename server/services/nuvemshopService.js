'use strict';

const axios = require('axios');

// Rate limiting: Nuvemshop permite 2 req/s com burst de 40
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

  // Interceptor para retry em 429 (rate limit) e erros 5xx
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const status = error.response?.status;
      const config = error.config;

      // Rate limit: aguarda o reset informado pelo header
      if (status === 429) {
        const resetMs = parseInt(error.response.headers['x-rate-limit-reset'] || '1000', 10);
        await sleep(resetMs);
        return client(config);
      }

      // Erros de servidor (5xx): retry com backoff exponencial, até 3 tentativas
      config._retryCount = (config._retryCount || 0) + 1;
      if (status >= 500 && config._retryCount <= 3) {
        await sleep(Math.pow(2, config._retryCount) * 1000);
        return client(config);
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
 * Busca uma página de pedidos.
 * @param {object} params - { since, page, perPage, paymentStatus }
 */
async function getOrders(token, storeId, params = {}) {
  return enqueue(async () => {
    const client = createClient(token, storeId);
    const query = {
      per_page: params.perPage || 200,
      page: params.page || 1,
    };
    if (params.since) {
      query.updated_at_min = params.since instanceof Date
        ? params.since.toISOString()
        : params.since;
    }
    // Filtragem server-side por status de pagamento (evita trafegar pedidos desnecessários)
    if (params.paymentStatus) {
      query.payment_status = params.paymentStatus;
    }
    const { data } = await client.get('/orders', { params: query });
    return data;
  });
}

/**
 * Busca todos os pedidos com paginação automática via header Link.
 * @param {string} paymentStatus - Filtro opcional: 'paid', 'authorized', etc.
 */
async function getAllOrders(token, storeId, since, paymentStatus) {
  const allOrders = [];
  let page = 1;

  while (true) {
    const { orders, hasNext } = await enqueue(async () => {
      const client = createClient(token, storeId);
      const query = { per_page: 200, page };
      if (since) {
        query.updated_at_min = since instanceof Date ? since.toISOString() : since;
      }
      if (paymentStatus) {
        query.payment_status = paymentStatus;
      }
      const response = await client.get('/orders', { params: query });
      // Usa header Link para detectar próxima página (mais confiável que comparar length)
      const linkHeader = response.headers['link'] || '';
      return { orders: response.data, hasNext: linkHeader.includes('rel="next"') };
    });

    allOrders.push(...orders);
    if (!hasNext) break;
    page++;
  }

  return allOrders;
}

/**
 * Busca uma página de produtos.
 */
async function getProducts(token, storeId, params = {}) {
  return enqueue(async () => {
    const client = createClient(token, storeId);
    const query = {
      per_page: params.perPage || 200,
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
 * Busca todos os produtos com paginação automática via header Link.
 */
async function getAllProducts(token, storeId, since) {
  const allProducts = [];
  let page = 1;

  while (true) {
    const { products, hasNext } = await enqueue(async () => {
      const client = createClient(token, storeId);
      const query = { per_page: 200, page };
      if (since) {
        query.updated_at_min = since instanceof Date ? since.toISOString() : since;
      }
      const response = await client.get('/products', { params: query });
      const linkHeader = response.headers['link'] || '';
      return { products: response.data, hasNext: linkHeader.includes('rel="next"') };
    });

    allProducts.push(...products);
    if (!hasNext) break;
    page++;
  }

  return allProducts;
}

/**
 * Busca uma página de clientes.
 */
async function getCustomers(token, storeId, params = {}) {
  return enqueue(async () => {
    const client = createClient(token, storeId);
    const query = {
      per_page: params.perPage || 200,
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
 * Busca todos os clientes com paginação automática via header Link.
 */
async function getAllCustomers(token, storeId, since) {
  const allCustomers = [];
  let page = 1;

  while (true) {
    const { customers, hasNext } = await enqueue(async () => {
      const client = createClient(token, storeId);
      const query = { per_page: 200, page };
      if (since) {
        query.updated_at_min = since instanceof Date ? since.toISOString() : since;
      }
      const response = await client.get('/customers', { params: query });
      const linkHeader = response.headers['link'] || '';
      return { customers: response.data, hasNext: linkHeader.includes('rel="next"') };
    });

    allCustomers.push(...customers);
    if (!hasNext) break;
    page++;
  }

  return allCustomers;
}

/**
 * Registra um webhook na Nuvemshop.
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
 * Lista todos os webhooks registrados para a loja
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
