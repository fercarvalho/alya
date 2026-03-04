/**
 * Sistema de Auditoria - Fase 2
 * Gerencia logs de auditoria de segurança
 */

const { Pool } = require('pg');

// Pool de conexões dedicado para auditoria (não bloqueia operações principais)
const auditPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'alya_db',
  user: process.env.DB_USER || 'alya_user',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 5, // Pool menor para auditoria
  idleTimeoutMillis: 30000,
});

/**
 * Tipos de operações auditáveis
 */
const AUDIT_OPERATIONS = {
  // Autenticação
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGOUT: 'logout',
  PASSWORD_CHANGE: 'password_change',
  PASSWORD_RESET_REQUEST: 'password_reset_request',
  PASSWORD_RESET_SUCCESS: 'password_reset_success',

  // Usuários
  USER_CREATE: 'user_create',
  USER_UPDATE: 'user_update',
  USER_DELETE: 'user_delete',
  USER_DEACTIVATE: 'user_deactivate',
  USER_ACTIVATE: 'user_activate',

  // Clientes
  CLIENT_CREATE: 'client_create',
  CLIENT_UPDATE: 'client_update',
  CLIENT_DELETE: 'client_delete',

  // Transações
  TRANSACTION_CREATE: 'transaction_create',
  TRANSACTION_UPDATE: 'transaction_update',
  TRANSACTION_DELETE: 'transaction_delete',
  TRANSACTION_EXPORT: 'transaction_export',
  TRANSACTION_IMPORT: 'transaction_import',

  // Módulos e Permissões
  MODULE_UPDATE: 'module_update',
  PERMISSION_CHANGE: 'permission_change',

  // Segurança
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  INVALID_TOKEN: 'invalid_token',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',

  // Uploads
  FILE_UPLOAD: 'file_upload',
  FILE_DELETE: 'file_delete',
};

/**
 * Status das operações
 */
const AUDIT_STATUS = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  BLOCKED: 'blocked',
  WARNING: 'warning',
};

/**
 * Registra um evento de auditoria no banco de dados
 *
 * @param {Object} params - Parâmetros do log
 * @param {string} params.operation - Tipo de operação (usar AUDIT_OPERATIONS)
 * @param {number|null} params.userId - ID do usuário (null para operações anônimas)
 * @param {string|null} params.username - Username do usuário
 * @param {string|null} params.ipAddress - Endereço IP
 * @param {string|null} params.userAgent - User-Agent do navegador
 * @param {Object|null} params.details - Detalhes adicionais em formato JSON
 * @param {string} params.status - Status da operação (usar AUDIT_STATUS)
 * @param {string|null} params.errorMessage - Mensagem de erro (se houver)
 */
async function logAudit({
  operation,
  userId = null,
  username = null,
  ipAddress = null,
  userAgent = null,
  details = {},
  status = AUDIT_STATUS.SUCCESS,
  errorMessage = null,
}) {
  try {
    // Validar operação
    const validOperations = Object.values(AUDIT_OPERATIONS);
    if (!validOperations.includes(operation)) {
      console.warn(`⚠️ Operação de auditoria inválida: ${operation}`);
    }

    // Preparar detalhes (limitar tamanho)
    const sanitizedDetails = sanitizeDetails(details);

    // Limitar tamanho do User-Agent
    const sanitizedUserAgent = userAgent ? userAgent.substring(0, 500) : null;

    // Inserir log
    const query = `
      INSERT INTO audit_logs (
        operation,
        user_id,
        username,
        ip_address,
        user_agent,
        details,
        status,
        error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, timestamp
    `;

    const values = [
      operation,
      userId,
      username,
      ipAddress,
      sanitizedUserAgent,
      JSON.stringify(sanitizedDetails),
      status,
      errorMessage,
    ];

    const result = await auditPool.query(query, values);

    // Log no console para desenvolvimento
    const logLevel = status === AUDIT_STATUS.SUCCESS ? '✅' : '⚠️';
    console.log(`${logLevel} [AUDIT #${result.rows[0].id}] ${operation}:`, {
      user: username || 'anonymous',
      userId,
      ip: ipAddress,
      status,
      timestamp: result.rows[0].timestamp,
    });

    return result.rows[0];
  } catch (error) {
    // Não deixar falha de auditoria quebrar a aplicação
    console.error('❌ Erro ao registrar log de auditoria:', error.message);
    console.error('   Detalhes:', { operation, userId, username, status });
    return null;
  }
}

/**
 * Sanitiza detalhes para evitar armazenar dados sensíveis
 */
function sanitizeDetails(details) {
  if (!details || typeof details !== 'object') {
    return {};
  }

  // Clonar objeto
  const sanitized = { ...details };

  // Remover campos sensíveis
  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'secret',
    'apiKey',
    'creditCard',
    'ssn',
    'tempPassword',
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Limitar tamanho total do JSON (max 10KB)
  const jsonString = JSON.stringify(sanitized);
  if (jsonString.length > 10240) {
    return {
      _truncated: true,
      _originalSize: jsonString.length,
      summary: 'Detalhes truncados devido ao tamanho',
    };
  }

  return sanitized;
}

/**
 * Busca logs de auditoria com filtros
 */
async function getAuditLogs({
  userId = null,
  operation = null,
  status = null,
  startDate = null,
  endDate = null,
  limit = 100,
  offset = 0,
}) {
  try {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (userId) {
      query += ` AND user_id = $${paramCount}`;
      values.push(userId);
      paramCount++;
    }

    if (operation) {
      query += ` AND operation = $${paramCount}`;
      values.push(operation);
      paramCount++;
    }

    if (status) {
      query += ` AND status = $${paramCount}`;
      values.push(status);
      paramCount++;
    }

    if (startDate) {
      query += ` AND timestamp >= $${paramCount}`;
      values.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND timestamp <= $${paramCount}`;
      values.push(endDate);
      paramCount++;
    }

    query += ` ORDER BY timestamp DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await auditPool.query(query, values);
    return result.rows;
  } catch (error) {
    console.error('Erro ao buscar logs de auditoria:', error);
    throw error;
  }
}

/**
 * Estatísticas de auditoria
 */
async function getAuditStats({ startDate = null, endDate = null } = {}) {
  try {
    let query = `
      SELECT
        operation,
        status,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users
      FROM audit_logs
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (startDate) {
      query += ` AND timestamp >= $${paramCount}`;
      values.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND timestamp <= $${paramCount}`;
      values.push(endDate);
      paramCount++;
    }

    query += ' GROUP BY operation, status ORDER BY count DESC';

    const result = await auditPool.query(query, values);
    return result.rows;
  } catch (error) {
    console.error('Erro ao buscar estatísticas de auditoria:', error);
    throw error;
  }
}

/**
 * Middleware Express para logging automático
 */
function auditMiddleware(operation, extractDetails = null) {
  return async (req, res, next) => {
    // Capturar informações da requisição
    const originalSend = res.send;
    const originalJson = res.json;

    res.send = function (data) {
      logAuditFromResponse(req, res, operation, data, extractDetails);
      originalSend.call(this, data);
    };

    res.json = function (data) {
      logAuditFromResponse(req, res, operation, data, extractDetails);
      originalJson.call(this, data);
    };

    next();
  };
}

function logAuditFromResponse(req, res, operation, responseData, extractDetails) {
  const status = res.statusCode >= 200 && res.statusCode < 300
    ? AUDIT_STATUS.SUCCESS
    : AUDIT_STATUS.FAILURE;

  const details = extractDetails ? extractDetails(req, responseData) : {
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
  };

  logAudit({
    operation,
    userId: req.user?.id,
    username: req.user?.username,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent'],
    details,
    status,
    errorMessage: status === AUDIT_STATUS.FAILURE ? responseData?.error : null,
  });
}

module.exports = {
  logAudit,
  getAuditLogs,
  getAuditStats,
  auditMiddleware,
  AUDIT_OPERATIONS,
  AUDIT_STATUS,
};
