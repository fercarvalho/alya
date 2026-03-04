/**
 * Middleware de Segurança - Fase 2
 * Implementa headers de segurança, rate limiting e validações
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

/**
 * Configuração do Helmet para headers HTTP seguros
 * Remove headers que expõem tecnologias e adiciona proteções
 */
function configureHelmet() {
  return helmet({
    // Content Security Policy - FASE 3
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline necessário para React (ver CSP-ANALYSIS.md)
        styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline necessário para styled-components
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"], // Previne injeção de <base> tag
        formAction: ["'self'"], // Previne forms apontando para sites maliciosos
        manifestSrc: ["'self'"], // Para PWA
        upgradeInsecureRequests: [],
      },
    },
    // Strict Transport Security (força HTTPS por 1 ano)
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    // Previne clickjacking
    frameguard: {
      action: 'deny',
    },
    // Previne MIME type sniffing
    noSniff: true,
    // Desabilita X-Powered-By header
    hidePoweredBy: true,
    // XSS Protection (legacy, mas ainda útil)
    xssFilter: true,
    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
  });
}

/**
 * Rate limiter geral para todas as requisições da API
 * Previne ataques de DoS
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // 1000 requisições por IP
  message: {
    error: 'Muitas requisições deste IP. Por favor, tente novamente mais tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter estrito para rotas de autenticação
 * Previne ataques de força bruta
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 tentativas por IP
  skipSuccessfulRequests: true, // Não contar requisições bem-sucedidas
  message: {
    error: 'Muitas tentativas de login. Por favor, tente novamente após 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter para criação de recursos
 * Previne spam e abuso
 */
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 100, // 100 criações por hora
  message: {
    error: 'Muitas operações de criação. Por favor, tente novamente mais tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter para uploads de arquivo
 * Previne abuso de armazenamento
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // 20 uploads por hora
  message: {
    error: 'Muitos uploads. Por favor, tente novamente mais tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter para recuperação de senha
 * Já existente, mantido para compatibilidade
 */
const passwordRecoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: {
    error: 'Muitas tentativas de recuperação. Tente novamente após 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordTokenValidationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 tentativas
  message: {
    error: 'Muitas tentativas de validação. Tente novamente após 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: {
    error: 'Muitas tentativas de reset. Tente novamente após 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Middleware de sanitização de dados
 * Previne NoSQL injection e poluição de parâmetros HTTP
 */
function configureSanitization() {
  return [
    // Sanitiza dados contra NoSQL injection
    mongoSanitize({
      replaceWith: '_',
      onSanitize: ({ req, key }) => {
        console.warn(`⚠️ Tentativa de NoSQL injection detectada: ${key} em ${req.path}`);
      },
    }),
    // Previne HTTP Parameter Pollution
    hpp(),
  ];
}

/**
 * Middleware de log de segurança
 * Registra eventos importantes de segurança
 */
function securityLogger(req, res, next) {
  // Log de tentativas de acesso a rotas sensíveis
  const sensitivePaths = ['/api/auth/login', '/api/auth/register', '/api/user/profile'];

  if (sensitivePaths.some(path => req.path.includes(path))) {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    console.log(`🔐 [${timestamp}] Security Event:`, {
      method: req.method,
      path: req.path,
      ip,
      userAgent: userAgent.substring(0, 100), // Limitar tamanho
    });
  }

  next();
}

/**
 * Middleware de auditoria para operações críticas
 * Registra operações importantes no banco de dados
 */
async function auditLogger(operation, userId, details, db) {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      operation,
      userId: userId || 'anonymous',
      details: JSON.stringify(details),
      ip: details.ip || 'unknown',
    };

    // Log no console para desenvolvimento
    console.log(`📋 [AUDIT] ${operation}:`, logEntry);

    // TODO: Implementar gravação em tabela de auditoria no PostgreSQL
    // await db.query('INSERT INTO audit_logs (timestamp, operation, user_id, details, ip) VALUES ($1, $2, $3, $4, $5)',
    //   [timestamp, operation, userId, JSON.stringify(details), details.ip]);

  } catch (error) {
    console.error('Erro ao registrar log de auditoria:', error);
  }
}

/**
 * Middleware para adicionar headers de segurança customizados
 */
function customSecurityHeaders(req, res, next) {
  // Remove headers que expõem informações do servidor
  res.removeHeader('X-Powered-By');

  // Adiciona headers customizados
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
}

module.exports = {
  configureHelmet,
  generalLimiter,
  authLimiter,
  createLimiter,
  uploadLimiter,
  passwordRecoveryLimiter,
  passwordTokenValidationLimiter,
  passwordResetLimiter,
  configureSanitization,
  securityLogger,
  auditLogger,
  customSecurityHeaders,
};
