'use strict';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * blingAuth — fluxo OAuth 2.0 (Authorization Code) + JWT da API v3 do Bling
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * - authorize/token/revoke do Bling.
 * - JWT obrigatório: header `enable-jwt: 1` no /oauth/token (e mantido nas
 *   chamadas à API por blingService).
 * - access_token ~6h; refresh_token ~30d. Renova só perto de expirar (margem
 *   de 5 min) por causa do limite de 20 req/60s no /oauth/token.
 * - Tokens são cifrados (AES-256-GCM) antes de ir ao banco; este módulo é o
 *   único ponto que cifra/decifra os tokens do Bling.
 *
 * Credenciais da aplicação ficam no .env (NUNCA no banco):
 *   BLING_CLIENT_ID, BLING_CLIENT_SECRET, BLING_REDIRECT_URI
 *   BLING_OAUTH_BASE (opcional; default https://www.bling.com.br/Api/v3/oauth)
 * ═══════════════════════════════════════════════════════════════════════════
 */

const axios = require('axios');
const { encrypt, decrypt } = require('./encryption');
const blingService = require('../services/blingService');

const OAUTH_BASE = process.env.BLING_OAUTH_BASE || 'https://www.bling.com.br/Api/v3/oauth';
const REFRESH_MARGIN_MS = 5 * 60 * 1000;   // renova 5 min antes de expirar
const ACCESS_TTL_FALLBACK_S = 21600;       // 6h (caso a resposta não traga expires_in)
const REFRESH_TTL_S = 30 * 24 * 3600;      // 30 dias

function getCredentials() {
  const clientId = process.env.BLING_CLIENT_ID;
  const clientSecret = process.env.BLING_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('BLING_CLIENT_ID/BLING_CLIENT_SECRET não configurados no .env');
  }
  return { clientId, clientSecret };
}

function basicAuthHeader() {
  const { clientId, clientSecret } = getCredentials();
  const token = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  return `Basic ${token}`;
}

/**
 * Monta a URL de autorização para redirecionar o usuário ao Bling.
 * redirect_uri e scope são opcionais (o Bling usa os valores do cadastro do app).
 * @param {string} state - token CSRF gerado pela rota /connect
 */
function buildAuthorizeUrl(state) {
  const { clientId } = getCredentials();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    state,
  });
  const redirectUri = process.env.BLING_REDIRECT_URI;
  if (redirectUri) params.set('redirect_uri', redirectUri);
  return `${OAUTH_BASE}/authorize?${params.toString()}`;
}

/**
 * POST /oauth/token (Basic auth + enable-jwt:1). Usado por exchangeCode e refresh.
 * @returns {Promise<{accessToken, refreshToken, expiresIn, scope}>}
 */
async function requestToken(bodyParams) {
  const body = new URLSearchParams(bodyParams).toString();
  const resp = await axios.post(`${OAUTH_BASE}/token`, body, {
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'enable-jwt': '1',
    },
    timeout: 30000,
  });
  const d = resp.data || {};
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    expiresIn: d.expires_in,
    scope: d.scope,
  };
}

/** Troca o authorization_code por tokens (válido por 1 min, uso único). */
async function exchangeCode(code) {
  return requestToken({ grant_type: 'authorization_code', code });
}

/** Renova os tokens a partir de um refresh_token (em claro). */
async function refreshTokens(refreshTokenPlain) {
  return requestToken({ grant_type: 'refresh_token', refresh_token: refreshTokenPlain });
}

/** Calcula as expirações absolutas (ISO) a partir da resposta do token. */
function computeExpiries(tokenResp) {
  const now = Date.now();
  return {
    tokenExpiresAt: new Date(now + (tokenResp.expiresIn || ACCESS_TTL_FALLBACK_S) * 1000).toISOString(),
    refreshExpiresAt: new Date(now + REFRESH_TTL_S * 1000).toISOString(),
  };
}

/**
 * Persiste a config inicial (após o callback do OAuth). Cifra os tokens.
 * @param {object} db
 * @param {string} userId
 * @param {object} tokenResp - retorno de exchangeCode
 * @param {object} [extra] - { blingCompanyId }
 */
async function persistConfig(db, userId, tokenResp, extra = {}) {
  const { tokenExpiresAt, refreshExpiresAt } = computeExpiries(tokenResp);
  await db.saveBlingConfig(userId, {
    blingCompanyId: extra.blingCompanyId || null,
    accessToken: encrypt(tokenResp.accessToken),
    refreshToken: encrypt(tokenResp.refreshToken),
    tokenExpiresAt,
    refreshExpiresAt,
    scopes: tokenResp.scope || null,
  });
}

/**
 * Garante um access_token válido para a config dada, renovando se faltar < 5min.
 * @returns {Promise<string>} access_token em claro, pronto para uso
 */
async function refreshIfNeeded(db, config) {
  const expiresAtMs = config.tokenExpiresAt ? new Date(config.tokenExpiresAt).getTime() : 0;
  const stillValid = expiresAtMs - REFRESH_MARGIN_MS > Date.now();
  if (stillValid) {
    return decrypt(config.accessToken);
  }

  // Renova
  const refreshPlain = decrypt(config.refreshToken);
  const tokenResp = await refreshTokens(refreshPlain);
  const { tokenExpiresAt, refreshExpiresAt } = computeExpiries(tokenResp);
  await db.updateBlingTokens(config.userId, {
    accessToken: encrypt(tokenResp.accessToken),
    // o Bling pode rotacionar o refresh_token; se vier um novo, atualiza
    refreshToken: tokenResp.refreshToken ? encrypt(tokenResp.refreshToken) : null,
    tokenExpiresAt,
    refreshExpiresAt: tokenResp.refreshToken ? refreshExpiresAt : null,
    scopes: tokenResp.scope || null,
  });
  return tokenResp.accessToken;
}

/**
 * Carrega a config do usuário e devolve um access_token válido (renovando se
 * preciso). Retorna null se não houver integração ativa.
 */
async function getValidAccessToken(db, userId) {
  const config = await db.getBlingConfig(userId);
  if (!config) return null;
  return refreshIfNeeded(db, config);
}

/** Revoga um token (access ou refresh) no Bling. */
async function revoke(tokenPlain) {
  const body = new URLSearchParams({ token: tokenPlain }).toString();
  await axios.post(`${OAUTH_BASE}/revoke`, body, {
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    timeout: 30000,
  });
}

module.exports = {
  buildAuthorizeUrl,
  exchangeCode,
  refreshTokens,
  persistConfig,
  refreshIfNeeded,
  getValidAccessToken,
  revoke,
  // exposto para reuso pontual
  getCompanyInfo: blingService.getCompanyInfo,
};
