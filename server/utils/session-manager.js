/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Session Manager - Gerenciamento de Sessões Ativas
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Gerencia sessões ativas dos usuários com rastreamento de dispositivos.
 *
 * Funcionalidades:
 *   - Criar sessão (ao fazer login)
 *   - Listar sessões ativas do usuário
 *   - Revogar sessão específica
 *   - Revogar todas as sessões do usuário
 *   - Detectar novo dispositivo/localização
 *   - Limitar sessões simultâneas
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { Pool } = require("pg");
const UAParser = require("ua-parser-js");
const axios = require("axios");

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Limite de sessões simultâneas por usuário
const MAX_SESSIONS_PER_USER = parseInt(
  process.env.MAX_SESSIONS_PER_USER || "5",
);

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extrai informações do user-agent
 */
function parseUserAgent(userAgent) {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  return {
    browser: result.browser.name || "Unknown",
    browserVersion: result.browser.version || "",
    os: result.os.name || "Unknown",
    osVersion: result.os.version || "",
    device: result.device.type || "desktop",
    deviceVendor: result.device.vendor || "",
    deviceModel: result.device.model || "",
    deviceName: `${result.browser.name || "Unknown"} ${result.browser.version || ""} on ${result.os.name || "Unknown"} ${result.os.version || ""}`,
  };
}

/**
 * Obtém geolocalização via IP (usando ipapi.co - gratuito)
 */
async function getGeolocation(ip) {
  // Skip para IPs locais
  if (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.")
  ) {
    return {
      country: "Local",
      city: "Localhost",
      latitude: null,
      longitude: null,
    };
  }

  try {
    const response = await axios.get(`https://ipapi.co/${ip}/json/`, {
      timeout: 3000, // 3 segundos
    });

    return {
      country: response.data.country_name || null,
      city: response.data.city || null,
      latitude: response.data.latitude || null,
      longitude: response.data.longitude || null,
    };
  } catch (error) {
    console.warn(
      `[SessionManager] Erro ao obter geolocalização para IP ${ip}:`,
      error.message,
    );
    return {
      country: null,
      city: null,
      latitude: null,
      longitude: null,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES PRINCIPAIS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cria nova sessão ativa
 */
async function createSession(userId, refreshTokenId, req) {
  try {
    const userAgent = req.headers["user-agent"] || "Unknown";
    const ip = req.ip || req.connection.remoteAddress || "Unknown";

    // Parse user-agent
    const deviceInfo = parseUserAgent(userAgent);

    // Obter geolocalização
    const geo = await getGeolocation(ip);

    // Verificar limite de sessões
    const countResult = await pool.query(
      "SELECT COUNT(*) as count FROM active_sessions WHERE user_id = $1 AND is_active = TRUE",
      [userId],
    );

    const currentSessions = parseInt(countResult.rows[0].count);

    if (currentSessions >= MAX_SESSIONS_PER_USER) {
      // Revogar sessão mais antiga
      await pool.query(
        `
        UPDATE active_sessions
        SET is_active = FALSE,
            revoked_at = CURRENT_TIMESTAMP,
            revoked_reason = 'Limite de sessões atingido (revogada automaticamente)'
        WHERE id = (
          SELECT id FROM active_sessions
          WHERE user_id = $1 AND is_active = TRUE
          ORDER BY created_at ASC
          LIMIT 1
        )
      `,
        [userId],
      );

      console.log(
        `[SessionManager] Sessão mais antiga de ${userId} revogada (limite atingido)`,
      );
    }

    // Calcular data de expiração (7 dias)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Inserir nova sessão
    const result = await pool.query(
      `
      INSERT INTO active_sessions (
        user_id,
        refresh_token_id,
        ip_address,
        user_agent,
        device_type,
        device_name,
        browser,
        os,
        country,
        city,
        latitude,
        longitude,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `,
      [
        userId,
        refreshTokenId,
        ip,
        userAgent,
        deviceInfo.device,
        deviceInfo.deviceName,
        deviceInfo.browser,
        deviceInfo.os,
        geo.country,
        geo.city,
        geo.latitude,
        geo.longitude,
        expiresAt,
      ],
    );

    console.log(
      `[SessionManager] ✅ Sessão criada: ${result.rows[0].id} (User: ${userId})`,
    );

    return result.rows[0].id;
  } catch (error) {
    console.error("[SessionManager] Erro ao criar sessão:", error);
    throw error;
  }
}

/**
 * Lista todas as sessões ativas do usuário
 */
async function getUserSessions(userId) {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        ip_address,
        device_type,
        device_name,
        browser,
        os,
        country,
        city,
        created_at,
        last_activity_at,
        expires_at,
        is_active
      FROM active_sessions
      WHERE user_id = $1 AND is_active = TRUE
      ORDER BY last_activity_at DESC
    `,
      [userId],
    );

    return result.rows;
  } catch (error) {
    console.error("[SessionManager] Erro ao listar sessões:", error);
    throw error;
  }
}

/**
 * Obtém detalhes de uma sessão específica
 */
async function getSessionById(sessionId) {
  try {
    const result = await pool.query(
      `
      SELECT * FROM active_sessions WHERE id = $1
    `,
      [sessionId],
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error("[SessionManager] Erro ao obter sessão:", error);
    throw error;
  }
}

/**
 * Revoga uma sessão específica
 */
async function revokeSession(sessionId, reason = "Revogada pelo usuário") {
  try {
    const result = await pool.query(
      `
      UPDATE active_sessions
      SET is_active = FALSE,
          revoked_at = CURRENT_TIMESTAMP,
          revoked_reason = $2
      WHERE id = $1
      RETURNING user_id, refresh_token_id
    `,
      [sessionId, reason],
    );

    if (result.rows.length === 0) {
      throw new Error("Sessão não encontrada");
    }

    // Também revogar o refresh token associado
    await pool.query(
      `
      UPDATE refresh_tokens
      SET revoked = TRUE,
          revoked_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
      [result.rows[0].refresh_token_id],
    );

    console.log(`[SessionManager] ✅ Sessão revogada: ${sessionId}`);

    return result.rows[0];
  } catch (error) {
    console.error("[SessionManager] Erro ao revogar sessão:", error);
    throw error;
  }
}

/**
 * Revoga todas as sessões de um usuário
 */
async function revokeAllUserSessions(
  userId,
  reason = "Todas as sessões revogadas pelo usuário",
) {
  try {
    const result = await pool.query(
      `
      UPDATE active_sessions
      SET is_active = FALSE,
          revoked_at = CURRENT_TIMESTAMP,
          revoked_reason = $2
      WHERE user_id = $1 AND is_active = TRUE
      RETURNING id
    `,
      [userId, reason],
    );

    // Também revogar todos os refresh tokens
    await pool.query(
      `
      UPDATE refresh_tokens
      SET revoked = TRUE,
          revoked_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND revoked = FALSE
    `,
      [userId],
    );

    console.log(
      `[SessionManager] ✅ Todas as sessões revogadas: ${userId} (${result.rows.length} sessões)`,
    );

    return result.rows.length;
  } catch (error) {
    console.error("[SessionManager] Erro ao revogar todas as sessões:", error);
    throw error;
  }
}

/**
 * Revoga sessão pelo refresh_token_id
 */
async function revokeSessionByRefreshTokenId(
  refreshTokenId,
  reason = "Logout",
) {
  try {
    const result = await pool.query(
      `
      UPDATE active_sessions
      SET is_active = FALSE,
          revoked_at = CURRENT_TIMESTAMP,
          revoked_reason = $2
      WHERE refresh_token_id = $1 AND is_active = TRUE
      RETURNING id, user_id
    `,
      [refreshTokenId, reason],
    );

    if (result.rows.length > 0) {
      console.log(
        `[SessionManager] ✅ Sessão revogada via refresh_token_id: ${refreshTokenId}`,
      );
      return result.rows[0];
    }

    return null;
  } catch (error) {
    console.error(
      "[SessionManager] Erro ao revogar sessão por refresh_token_id:",
      error,
    );
    throw error;
  }
}

/**
 * Atualiza última atividade de uma sessão
 */
async function updateSessionActivity(refreshTokenId) {
  try {
    await pool.query(
      `
      UPDATE active_sessions
      SET last_activity_at = CURRENT_TIMESTAMP
      WHERE refresh_token_id = $1 AND is_active = TRUE
    `,
      [refreshTokenId],
    );
  } catch (error) {
    console.error("[SessionManager] Erro ao atualizar atividade:", error);
  }
}

/**
 * Limpa sessões expiradas
 */
async function cleanupExpiredSessions() {
  try {
    const result = await pool.query(`
      UPDATE active_sessions
      SET is_active = FALSE,
          revoked_at = CURRENT_TIMESTAMP,
          revoked_reason = 'Expirada automaticamente'
      WHERE is_active = TRUE AND expires_at < CURRENT_TIMESTAMP
      RETURNING id
    `);

    console.log(
      `[SessionManager] 🧹 Sessões expiradas limpas: ${result.rows.length}`,
    );

    return result.rows.length;
  } catch (error) {
    console.error("[SessionManager] Erro ao limpar sessões:", error);
    return 0;
  }
}

/**
 * Detecta se sessão é de novo dispositivo
 */
async function isNewDevice(userId, req) {
  try {
    const userAgent = req.headers["user-agent"] || "Unknown";
    const deviceInfo = parseUserAgent(userAgent);

    const result = await pool.query(
      `
      SELECT COUNT(*) as count
      FROM active_sessions
      WHERE user_id = $1
        AND device_name = $2
    `,
      [userId, deviceInfo.deviceName],
    );

    return parseInt(result.rows[0].count) === 0;
  } catch (error) {
    console.error(
      "[SessionManager] Erro ao verificar novo dispositivo:",
      error,
    );
    return false;
  }
}

/**
 * Detecta se sessão é de nova localização
 */
async function isNewLocation(userId, req) {
  try {
    const ip = req.ip || req.connection.remoteAddress || "Unknown";
    const geo = await getGeolocation(ip);

    if (!geo.country) {
      return false;
    }

    const result = await pool.query(
      `
      SELECT COUNT(*) as count
      FROM active_sessions
      WHERE user_id = $1
        AND country = $2
    `,
      [userId, geo.country],
    );

    return parseInt(result.rows[0].count) === 0;
  } catch (error) {
    console.error(
      "[SessionManager] Erro ao verificar nova localização:",
      error,
    );
    return false;
  }
}

/**
 * Obtém estatísticas de sessões
 */
async function getSessionStats(userId) {
  try {
    const result = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE is_active = TRUE) as active_sessions,
        COUNT(*) as total_sessions,
        COUNT(DISTINCT country) as countries_accessed,
        COUNT(DISTINCT device_type) as device_types_used,
        MAX(created_at) as last_login,
        MIN(created_at) as first_login
      FROM active_sessions
      WHERE user_id = $1
    `,
      [userId],
    );

    return result.rows[0];
  } catch (error) {
    console.error("[SessionManager] Erro ao obter estatísticas:", error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  createSession,
  getUserSessions,
  getSessionById,
  revokeSession,
  revokeSessionByRefreshTokenId,
  revokeAllUserSessions,
  updateSessionActivity,
  cleanupExpiredSessions,
  isNewDevice,
  isNewLocation,
  getSessionStats,

  // Helpers
  parseUserAgent,
  getGeolocation,
};
