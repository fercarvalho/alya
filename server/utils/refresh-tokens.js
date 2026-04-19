/**
 * Sistema de Refresh Tokens - Fase 3
 * Gerencia tokens de longa duração para renovação de access tokens
 */

const { Pool } = require("pg");
const crypto = require("crypto");

// Pool de conexões dedicado
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "alya_db",
  user: process.env.DB_USER || "alya_user",
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

/**
 * Duração dos tokens
 */
const TOKEN_EXPIRY = {
  ACCESS_TOKEN: "8h", // 8 horas
  ACCESS_TOKEN_MS: 8 * 60 * 60 * 1000,
  REFRESH_TOKEN: "7d", // 7 dias
  REFRESH_TOKEN_MS: 7 * 24 * 60 * 60 * 1000,
};

/**
 * Gera um refresh token único e seguro
 */
function generateRefreshToken() {
  return crypto.randomBytes(64).toString("hex");
}

/**
 * Cria hash SHA-256 do token para armazenamento seguro
 */
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Cria um novo refresh token no banco de dados
 *
 * @param {Object} params
 * @param {string} params.userId - ID do usuário
 * @param {string} params.ipAddress - IP da requisição
 * @param {string} params.userAgent - User-Agent do navegador
 * @returns {Promise<string>} - Refresh token em texto plano (enviar ao cliente)
 */
async function createRefreshToken({
  userId,
  ipAddress = null,
  userAgent = null,
}) {
  try {
    const token = generateRefreshToken();
    const hashedToken = hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY.REFRESH_TOKEN_MS);

    const result = await pool.query(
      `INSERT INTO refresh_tokens (
        token, user_id, expires_at, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id`,
      [hashedToken, userId, expiresAt, ipAddress, userAgent],
    );

    const tokenId = result.rows[0].id;

    console.log(
      `✅ Refresh token criado para user_id: ${userId} (ID: ${tokenId})`,
    );
    return { token, tokenId }; // Retorna token em texto plano e ID
  } catch (error) {
    console.error("❌ Erro ao criar refresh token:", error.message);
    throw new Error("Erro ao criar refresh token");
  }
}

/**
 * Verifica se um refresh token é válido
 *
 * @param {string} token - Refresh token em texto plano
 * @returns {Promise<Object|null>} - Dados do token se válido, null se inválido
 */
async function verifyRefreshToken(token) {
  try {
    const hashedToken = hashToken(token);

    const result = await pool.query(
      `SELECT
        rt.id,
        rt.user_id,
        rt.expires_at,
        rt.revoked,
        rt.ip_address,
        rt.user_agent,
        u.username,
        u.role,
        u.is_active
      FROM refresh_tokens rt
      INNER JOIN users u ON rt.user_id = u.id
      WHERE rt.token = $1`,
      [hashedToken],
    );

    if (result.rows.length === 0) {
      console.warn("⚠️ Refresh token não encontrado");
      return null;
    }

    const tokenData = result.rows[0];

    // Verificar se token foi revogado
    if (tokenData.revoked) {
      console.warn("⚠️ Refresh token foi revogado");
      return null;
    }

    // Verificar se token expirou
    if (new Date(tokenData.expires_at) < new Date()) {
      console.warn("⚠️ Refresh token expirado");
      await revokeRefreshToken(token);
      return null;
    }

    // Verificar se usuário está ativo
    if (!tokenData.is_active) {
      console.warn("⚠️ Usuário desativado");
      return null;
    }

    return {
      id: tokenData.id,
      userId: tokenData.user_id,
      username: tokenData.username,
      role: tokenData.role,
      expiresAt: tokenData.expires_at,
      ipAddress: tokenData.ip_address,
      userAgent: tokenData.user_agent,
    };
  } catch (error) {
    console.error("❌ Erro ao verificar refresh token:", error.message);
    return null;
  }
}

/**
 * Revoga um refresh token (logout ou comprometimento)
 *
 * @param {string} token - Refresh token em texto plano
 * @returns {Promise<boolean>} - True se revogado com sucesso
 */
async function revokeRefreshToken(token) {
  try {
    const hashedToken = hashToken(token);

    const result = await pool.query(
      `UPDATE refresh_tokens
       SET revoked = TRUE, revoked_at = NOW()
       WHERE token = $1 AND revoked = FALSE
       RETURNING id`,
      [hashedToken],
    );

    if (result.rowCount > 0) {
      const tokenId = result.rows[0].id;
      console.log(`✅ Refresh token revogado: ID ${tokenId}`);
      return { success: true, tokenId };
    }

    return { success: false, tokenId: null };
  } catch (error) {
    console.error("❌ Erro ao revogar refresh token:", error.message);
    return { success: false, tokenId: null };
  }
}

/**
 * Revoga todos os refresh tokens de um usuário (logout de todos os dispositivos)
 *
 * @param {string} userId - ID do usuário
 * @returns {Promise<number>} - Número de tokens revogados
 */
async function revokeAllUserTokens(userId) {
  try {
    const result = await pool.query(
      `UPDATE refresh_tokens
       SET revoked = TRUE, revoked_at = NOW()
       WHERE user_id = $1 AND revoked = FALSE
       RETURNING id`,
      [userId],
    );

    console.log(
      `✅ ${result.rowCount} refresh tokens revogados para user_id: ${userId}`,
    );
    return result.rowCount;
  } catch (error) {
    console.error("❌ Erro ao revogar tokens do usuário:", error.message);
    return 0;
  }
}

/**
 * Rotaciona um refresh token (cria novo e revoga o antigo)
 * Melhora segurança ao detectar roubo de tokens
 *
 * @param {string} oldToken - Refresh token antigo
 * @param {string} ipAddress - IP da requisição
 * @param {string} userAgent - User-Agent do navegador
 * @returns {Promise<string|null>} - Novo refresh token ou null se erro
 */
async function rotateRefreshToken(
  oldToken,
  ipAddress = null,
  userAgent = null,
) {
  try {
    // Verificar token antigo
    const tokenData = await verifyRefreshToken(oldToken);
    if (!tokenData) {
      return null;
    }

    // Criar novo token
    const newToken = await createRefreshToken({
      userId: tokenData.userId,
      ipAddress,
      userAgent,
    });

    // Marcar token antigo como substituído
    const hashedOldToken = hashToken(oldToken);
    const hashedNewToken = hashToken(newToken);

    await pool.query(
      `UPDATE refresh_tokens
       SET revoked = TRUE,
           revoked_at = NOW(),
           replaced_by_token = $1
       WHERE token = $2`,
      [hashedNewToken, hashedOldToken],
    );

    console.log(
      `✅ Refresh token rotacionado para user_id: ${tokenData.userId}`,
    );
    return newToken;
  } catch (error) {
    console.error("❌ Erro ao rotacionar refresh token:", error.message);
    return null;
  }
}

/**
 * Lista todos os refresh tokens ativos de um usuário
 * Útil para mostrar "sessões ativas" no perfil do usuário
 *
 * @param {string} userId - ID do usuário
 * @returns {Promise<Array>} - Lista de tokens ativos
 */
async function getUserActiveTokens(userId) {
  try {
    const result = await pool.query(
      `SELECT
        id,
        created_at,
        expires_at,
        ip_address,
        user_agent,
        CASE
          WHEN expires_at < NOW() THEN 'expired'
          ELSE 'active'
        END as status
      FROM refresh_tokens
      WHERE user_id = $1 AND revoked = FALSE
      ORDER BY created_at DESC`,
      [userId],
    );

    return result.rows;
  } catch (error) {
    console.error("❌ Erro ao buscar tokens ativos:", error.message);
    return [];
  }
}

/**
 * Remove refresh tokens expirados do banco (manutenção)
 * Deve ser executado periodicamente via cron
 *
 * @returns {Promise<number>} - Número de tokens removidos
 */
async function cleanupExpiredTokens() {
  try {
    const result = await pool.query(
      `DELETE FROM refresh_tokens
       WHERE expires_at < NOW()
          OR (revoked = TRUE AND revoked_at < NOW() - INTERVAL '30 days')
       RETURNING id`,
    );

    console.log(`✅ ${result.rowCount} refresh tokens expirados removidos`);
    return result.rowCount;
  } catch (error) {
    console.error("❌ Erro ao limpar tokens expirados:", error.message);
    return 0;
  }
}

/**
 * Estatísticas de refresh tokens (monitoramento)
 */
async function getTokenStats() {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE revoked = FALSE AND expires_at > NOW()) as active_tokens,
        COUNT(*) FILTER (WHERE revoked = TRUE) as revoked_tokens,
        COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_tokens,
        COUNT(DISTINCT user_id) FILTER (WHERE revoked = FALSE AND expires_at > NOW()) as active_users,
        MIN(created_at) as oldest_token,
        MAX(created_at) as newest_token
      FROM refresh_tokens
    `);

    return result.rows[0];
  } catch (error) {
    console.error("❌ Erro ao buscar estatísticas:", error.message);
    return null;
  }
}

module.exports = {
  TOKEN_EXPIRY,
  generateRefreshToken,
  createRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  rotateRefreshToken,
  getUserActiveTokens,
  cleanupExpiredTokens,
  getTokenStats,
};
