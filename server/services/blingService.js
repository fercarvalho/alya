'use strict';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * blingService — cliente HTTP da API v3 do Bling (ERP)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Espelha o padrão de server/services/nuvemshopService.js (fila + throttle +
 * retry), adaptado ao Bling:
 *   - baseURL https://api.bling.com.br/Api/v3
 *   - autenticação: Authorization: Bearer <access_token>
 *   - JWT obrigatório: header `enable-jwt: 1` em TODAS as requisições
 *   - rate limit do Bling: 3 req/s, 120.000/dia → intervalo mínimo ~350ms
 *   - retry: 429 (respeita Retry-After) e 5xx (backoff exponencial, até 3x)
 *
 * Expõe um `apiRequest(accessToken, config)` genérico (reutilizado por todas as
 * fases) + helpers pontuais. Os tokens são fornecidos JÁ descriptografados pela
 * camada de auth (blingAuth.js) — este módulo não cifra/decifra nada.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const axios = require('axios');

const BASE_URL = 'https://api.bling.com.br/Api/v3';

// Rate limit do Bling: 3 req/s. 350ms ≈ 2,85 req/s (margem de segurança).
const REQUEST_INTERVAL_MS = 350;
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
 * Instância Axios autenticada para a API v3 do Bling.
 * @param {string} accessToken - access_token (JWT) já descriptografado
 */
function createClient(accessToken) {
  const client = axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      // JWT obrigatório — mantém os tokens em formato JWT em toda a comunicação
      'enable-jwt': '1',
      'User-Agent': 'ALYA Financial System (suporte@alya.com.br)',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: 30000,
  });

  // Retry em 429 (rate limit) e 5xx
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const status = error.response?.status;
      const config = error.config;
      if (!config) throw error;

      // 429: respeita Retry-After (segundos) se presente; senão backoff
      if (status === 429) {
        config._retryCount = (config._retryCount || 0) + 1;
        if (config._retryCount <= 3) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '', 10);
          const waitMs = Number.isFinite(retryAfter)
            ? retryAfter * 1000
            : Math.pow(2, config._retryCount) * 1000;
          await sleep(waitMs);
          return client(config);
        }
      }

      // 5xx: backoff exponencial, até 3 tentativas
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
 * Requisição genérica à API v3 (passa pela fila/throttle).
 * @param {string} accessToken - access_token (JWT) descriptografado
 * @param {object} config - config Axios: { method, url, params, data }
 * @returns {Promise<any>} - corpo da resposta (response.data)
 */
async function apiRequest(accessToken, config) {
  return enqueue(async () => {
    const client = createClient(accessToken);
    const { data } = await client.request(config);
    return data;
  });
}

/**
 * Dados básicos da empresa autenticada — usado para validar a conexão e obter
 * o companyId. Tolerante a variações do endpoint (não derruba o fluxo de OAuth).
 * @returns {Promise<object|null>}
 */
async function getCompanyInfo(accessToken) {
  try {
    return await apiRequest(accessToken, { method: 'GET', url: '/empresas/me/dados-basicos' });
  } catch (err) {
    return null;
  }
}

module.exports = {
  BASE_URL,
  createClient,
  apiRequest,
  getCompanyInfo,
};
