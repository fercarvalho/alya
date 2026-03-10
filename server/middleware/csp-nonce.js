/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CSP Nonce Middleware
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Gera nonces únicos por request para Content Security Policy.
 * Permite remover 'unsafe-inline' do CSP, aumentando segurança contra XSS.
 *
 * Como funciona:
 *   1. Gera nonce aleatório para cada request
 *   2. Injeta nonce no res.locals para uso em templates
 *   3. Adiciona nonce ao CSP header
 *   4. Frontend usa nonce em <script> e <style> tags
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const crypto = require("crypto");

/**
 * Gera nonce aleatório criptograficamente seguro
 */
function generateNonce() {
  return crypto.randomBytes(16).toString("base64");
}

/**
 * Middleware para gerar e injetar nonce
 */
function cspNonceMiddleware(req, res, next) {
  // Gerar nonce único para este request
  const nonce = generateNonce();

  // Armazenar nonce em res.locals para acesso em templates/rotas
  res.locals.cspNonce = nonce;

  // Também disponibilizar no objeto response para facilitar acesso
  res.nonce = nonce;

  // Adicionar nonce aos headers CSP
  // Nota: Isso substitui o CSP definido em security.js
  // Certifique-se de que este middleware roda DEPOIS do helmet/security middleware

  // Detectar ambiente
  const isDevelopment = process.env.NODE_ENV !== "production";

  const cspDirectives = {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      `'nonce-${nonce}'`,
      // Em desenvolvimento, permitir eval para hot reload do Vite
      ...(isDevelopment ? ["'unsafe-eval'"] : ["'strict-dynamic'"]),
      // strict-dynamic permite scripts carregados por scripts com nonce
    ],
    styleSrc: [
      "'self'",
      `'nonce-${nonce}'`,
      "'unsafe-inline'", // Necessário para styled-components e CSS-in-JS
    ],
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    fontSrc: ["'self'", "data:"],
    connectSrc: [
      "'self'",
      ...(isDevelopment
        ? ["ws:", "wss:", "http://localhost:*", "ws://localhost:*"]
        : []),
    ],
    frameAncestors: ["'self'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    manifestSrc: ["'self'"],
  };

  // Construir header CSP
  const cspHeader = Object.entries(cspDirectives)
    .map(([key, values]) => {
      const directive = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      return `${directive} ${values.join(" ")}`;
    })
    .join("; ");

  res.setHeader("Content-Security-Policy", cspHeader);

  next();
}

/**
 * Helper para gerar tag <script> com nonce
 */
function scriptTag(nonce, content, attributes = {}) {
  const attrs = Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");

  return `<script nonce="${nonce}" ${attrs}>${content}</script>`;
}

/**
 * Helper para gerar tag <style> com nonce
 */
function styleTag(nonce, content, attributes = {}) {
  const attrs = Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");

  return `<style nonce="${nonce}" ${attrs}>${content}</style>`;
}

/**
 * Helper para gerar atributo nonce para uso em JSX/React
 */
function getNonceAttribute(nonce) {
  return `nonce="${nonce}"`;
}

module.exports = {
  cspNonceMiddleware,
  generateNonce,
  scriptTag,
  styleTag,
  getNonceAttribute,
};
