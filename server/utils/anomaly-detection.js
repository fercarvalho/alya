/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Anomaly Detection - Sistema de Detecção de Anomalias
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Detecta comportamentos anômalos usando técnicas básicas de Machine Learning.
 *
 * Anomalias detectadas:
 *   - Login de novo país/cidade
 *   - Horário incomum de acesso
 *   - Volume anormal de requisições
 *   - Padrões suspeitos de navegação
 *   - Mudança abrupta de IP
 *   - Múltiplos dispositivos simultâneos
 *
 * Técnicas utilizadas:
 *   - Z-score (detecção de outliers)
 *   - Moving average (detecção de picos)
 *   - Baseline behavior (comparação com padrão histórico)
 *   - Threshold-based rules (regras simples)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { Pool } = require("pg");
const { alertAnomaly } = require("./security-alerts");

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

// Thresholds de anomalia (ajustáveis via .env)
const THRESHOLDS = {
  MAX_REQUESTS_PER_MINUTE: parseInt(process.env.MAX_REQUESTS_PER_MINUTE) || 60,
  MAX_FAILED_LOGINS_PER_HOUR:
    parseInt(process.env.MAX_FAILED_LOGINS_PER_HOUR) || 10,
  MAX_COUNTRIES_PER_DAY: parseInt(process.env.MAX_COUNTRIES_PER_DAY) || 3,
  MAX_IPS_PER_DAY: parseInt(process.env.MAX_IPS_PER_DAY) || 5,
  UNUSUAL_HOUR_START: parseInt(process.env.UNUSUAL_HOUR_START) || 2, // 2 AM
  UNUSUAL_HOUR_END: parseInt(process.env.UNUSUAL_HOUR_END) || 6, // 6 AM
  Z_SCORE_THRESHOLD: parseFloat(process.env.Z_SCORE_THRESHOLD) || 2.5, // Desvios padrão
};

// Cache de baselines (em produção, usar Redis)
const baselinesCache = new Map();

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES ESTATÍSTICAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcula média
 */
function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calcula desvio padrão
 */
function stdDev(values) {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map((val) => Math.pow(val - avg, 2));
  return Math.sqrt(mean(squaredDiffs));
}

/**
 * Calcula Z-score (quantos desvios padrão da média)
 */
function zScore(value, values) {
  const avg = mean(values);
  const std = stdDev(values);
  if (std === 0) return 0;
  return (value - avg) / std;
}

/**
 * Verifica se valor é outlier usando Z-score
 */
function isOutlier(value, values, threshold = THRESHOLDS.Z_SCORE_THRESHOLD) {
  const z = Math.abs(zScore(value, values));
  return z > threshold;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÕES DE BASELINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtém baseline (padrão histórico) do usuário
 */
async function getUserBaseline(userId) {
  // Verificar cache
  const cached = baselinesCache.get(userId);
  if (cached && Date.now() - cached.timestamp < 3600000) {
    // 1 hora
    return cached.data;
  }

  try {
    // Buscar dados dos últimos 30 dias
    const result = await pool.query(
      `
      SELECT
        ARRAY_AGG(DISTINCT country) as countries,
        ARRAY_AGG(DISTINCT city) as cities,
        ARRAY_AGG(DISTINCT EXTRACT(HOUR FROM created_at)) as access_hours,
        COUNT(*) as total_logins,
        COUNT(DISTINCT DATE(created_at)) as active_days,
        AVG(
          (SELECT COUNT(*)
           FROM active_sessions s2
           WHERE s2.user_id = s1.user_id
             AND s2.created_at BETWEEN s1.created_at - INTERVAL '1 minute'
                                    AND s1.created_at + INTERVAL '1 minute')
        ) as avg_requests_per_minute
      FROM active_sessions s1
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY user_id
    `,
      [userId],
    );

    if (result.rows.length === 0) {
      return null; // Usuário novo, sem histórico
    }

    const baseline = {
      countries: result.rows[0].countries || [],
      cities: result.rows[0].cities || [],
      accessHours: (result.rows[0].access_hours || []).map((h) => parseInt(h)),
      totalLogins: parseInt(result.rows[0].total_logins),
      activeDays: parseInt(result.rows[0].active_days),
      avgRequestsPerMinute:
        parseFloat(result.rows[0].avg_requests_per_minute) || 0,
    };

    // Cachear
    baselinesCache.set(userId, {
      data: baseline,
      timestamp: Date.now(),
    });

    return baseline;
  } catch (error) {
    console.error("[AnomalyDetection] Erro ao obter baseline:", error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECÇÕES ESPECÍFICAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detecta login de novo país
 */
async function detectNewCountry(userId, country) {
  if (!country) return { anomaly: false };

  const baseline = await getUserBaseline(userId);
  if (!baseline || baseline.totalLogins < 5) {
    return { anomaly: false, reason: "Usuário novo, sem baseline" };
  }

  const isNew = !baseline.countries.includes(country);

  if (isNew) {
    const score = 80; // Alto score para novo país

    await alertAnomaly(
      userId,
      "Login de Novo País",
      `Usuário geralmente acessa de: ${baseline.countries.join(", ")}\nLogin detectado de: ${country}`,
      score,
    );

    return {
      anomaly: true,
      type: "new_country",
      score,
      baseline: baseline.countries,
      detected: country,
    };
  }

  return { anomaly: false };
}

/**
 * Detecta login em horário incomum
 */
async function detectUnusualHour(userId, hour) {
  const baseline = await getUserBaseline(userId);
  if (!baseline || baseline.totalLogins < 10) {
    return { anomaly: false, reason: "Usuário novo, sem baseline" };
  }

  // Verificar se horário está fora do padrão
  const isUnusual = !baseline.accessHours.includes(hour);

  // Verificar se é horário de madrugada (2-6 AM)
  const isLateNight =
    hour >= THRESHOLDS.UNUSUAL_HOUR_START &&
    hour <= THRESHOLDS.UNUSUAL_HOUR_END;

  if (isUnusual && isLateNight) {
    const score = 65;

    await alertAnomaly(
      userId,
      "Horário Incomum de Acesso",
      `Usuário geralmente acessa entre ${Math.min(...baseline.accessHours)}h-${Math.max(...baseline.accessHours)}h\n` +
        `Login detectado às ${hour}h (madrugada)`,
      score,
    );

    return {
      anomaly: true,
      type: "unusual_hour",
      score,
      baseline: baseline.accessHours,
      detected: hour,
    };
  }

  return { anomaly: false };
}

/**
 * Detecta volume anormal de requisições
 */
async function detectAbnormalVolume(userId) {
  try {
    // Contar requisições do último minuto
    const result = await pool.query(
      `
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE user_id = $1
        AND timestamp > NOW() - INTERVAL '1 minute'
    `,
      [userId],
    );

    const recentRequests = parseInt(result.rows[0].count);

    // Obter baseline
    const baseline = await getUserBaseline(userId);
    if (!baseline || baseline.totalLogins < 20) {
      // Apenas verificar threshold absoluto
      if (recentRequests > THRESHOLDS.MAX_REQUESTS_PER_MINUTE) {
        const score = 90;

        await alertAnomaly(
          userId,
          "Volume Anormal de Requisições",
          `${recentRequests} requisições no último minuto (limite: ${THRESHOLDS.MAX_REQUESTS_PER_MINUTE})`,
          score,
        );

        return {
          anomaly: true,
          type: "abnormal_volume",
          score,
          detected: recentRequests,
          threshold: THRESHOLDS.MAX_REQUESTS_PER_MINUTE,
        };
      }
      return { anomaly: false };
    }

    // Comparar com baseline usando Z-score
    const historicalCounts = await getHistoricalRequestCounts(userId, 30);
    if (isOutlier(recentRequests, historicalCounts)) {
      const score = 75;

      await alertAnomaly(
        userId,
        "Volume Anormal de Requisições (Outlier)",
        `${recentRequests} requisições/min (média histórica: ${mean(historicalCounts).toFixed(1)})`,
        score,
      );

      return {
        anomaly: true,
        type: "abnormal_volume",
        score,
        detected: recentRequests,
        baseline: mean(historicalCounts),
      };
    }

    return { anomaly: false };
  } catch (error) {
    console.error("[AnomalyDetection] Erro ao detectar volume:", error);
    return { anomaly: false, error: error.message };
  }
}

/**
 * Detecta múltiplos IPs em curto período
 */
async function detectMultipleIPs(userId) {
  try {
    const result = await pool.query(
      `
      SELECT COUNT(DISTINCT ip_address) as ip_count
      FROM active_sessions
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '1 hour'
        AND is_active = TRUE
    `,
      [userId],
    );

    const ipCount = parseInt(result.rows[0].ip_count);

    if (ipCount >= 3) {
      const score = 70;

      await alertAnomaly(
        userId,
        "Múltiplos IPs Detectados",
        `${ipCount} IPs diferentes na última hora (possível compartilhamento de conta)`,
        score,
      );

      return {
        anomaly: true,
        type: "multiple_ips",
        score,
        detected: ipCount,
      };
    }

    return { anomaly: false };
  } catch (error) {
    console.error("[AnomalyDetection] Erro ao detectar múltiplos IPs:", error);
    return { anomaly: false, error: error.message };
  }
}

/**
 * Detecta múltiplos dispositivos simultâneos
 */
async function detectMultipleDevices(userId) {
  try {
    const result = await pool.query(
      `
      SELECT
        COUNT(DISTINCT device_name) as device_count,
        ARRAY_AGG(DISTINCT device_name) as devices
      FROM active_sessions
      WHERE user_id = $1
        AND is_active = TRUE
        AND last_activity_at > NOW() - INTERVAL '5 minutes'
    `,
      [userId],
    );

    const deviceCount = parseInt(result.rows[0].device_count);

    if (deviceCount >= 3) {
      const score = 60;

      await alertAnomaly(
        userId,
        "Múltiplos Dispositivos Simultâneos",
        `${deviceCount} dispositivos ativos nos últimos 5 minutos`,
        score,
      );

      return {
        anomaly: true,
        type: "multiple_devices",
        score,
        detected: deviceCount,
        devices: result.rows[0].devices,
      };
    }

    return { anomaly: false };
  } catch (error) {
    console.error(
      "[AnomalyDetection] Erro ao detectar múltiplos dispositivos:",
      error,
    );
    return { anomaly: false, error: error.message };
  }
}

/**
 * Detecta padrão de tentativas de força bruta
 */
async function detectBruteForce(userId) {
  try {
    const result = await pool.query(
      `
      SELECT COUNT(*) as failed_count
      FROM audit_logs
      WHERE user_id = $1
        AND operation = 'login_failure'
        AND timestamp > NOW() - INTERVAL '1 hour'
    `,
      [userId],
    );

    const failedCount = parseInt(result.rows[0].failed_count);

    if (failedCount >= THRESHOLDS.MAX_FAILED_LOGINS_PER_HOUR) {
      const score = 95; // Crítico

      await alertAnomaly(
        userId,
        "Possível Ataque de Força Bruta",
        `${failedCount} tentativas de login falhadas na última hora`,
        score,
      );

      return {
        anomaly: true,
        type: "brute_force",
        score,
        detected: failedCount,
        threshold: THRESHOLDS.MAX_FAILED_LOGINS_PER_HOUR,
      };
    }

    return { anomaly: false };
  } catch (error) {
    console.error("[AnomalyDetection] Erro ao detectar força bruta:", error);
    return { anomaly: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtém contagem histórica de requisições por minuto
 */
async function getHistoricalRequestCounts(userId, days = 30) {
  try {
    const result = await pool.query(
      `
      SELECT
        DATE_TRUNC('minute', timestamp) as minute,
        COUNT(*) as count
      FROM audit_logs
      WHERE user_id = $1
        AND timestamp > NOW() - INTERVAL '${days} days'
      GROUP BY minute
      ORDER BY minute
    `,
      [userId],
    );

    return result.rows.map((row) => parseInt(row.count));
  } catch (error) {
    console.error("[AnomalyDetection] Erro ao obter histórico:", error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Executa todas as verificações de anomalia para um usuário
 */
async function detectAnomalies(userId, sessionData = {}) {
  console.log(`[AnomalyDetection] Verificando anomalias para: ${userId}`);

  const results = {
    userId,
    timestamp: new Date(),
    anomalies: [],
    totalScore: 0,
  };

  try {
    // Executar todas as detecções em paralelo
    const [
      newCountry,
      unusualHour,
      abnormalVolume,
      multipleIPs,
      multipleDevices,
      bruteForce,
    ] = await Promise.all([
      detectNewCountry(userId, sessionData.country),
      detectUnusualHour(userId, new Date().getHours()),
      detectAbnormalVolume(userId),
      detectMultipleIPs(userId),
      detectMultipleDevices(userId),
      detectBruteForce(userId),
    ]);

    // Coletar anomalias detectadas
    [
      newCountry,
      unusualHour,
      abnormalVolume,
      multipleIPs,
      multipleDevices,
      bruteForce,
    ].forEach((result) => {
      if (result.anomaly) {
        results.anomalies.push(result);
        results.totalScore += result.score || 0;
      }
    });

    // Normalizar score (0-100)
    if (results.anomalies.length > 0) {
      results.totalScore = Math.min(
        100,
        results.totalScore / results.anomalies.length,
      );

      // Registrar no audit_logs para o dashboard
      for (const anomaly of results.anomalies) {
        try {
          await pool.query(
            `
            INSERT INTO audit_logs (user_id, username, action, details, ip_address, status)
            VALUES ($1, $1, 'anomaly_detected', $2, $3, 'warning')
          `,
            [userId, JSON.stringify(anomaly), sessionData.ip || "Unknown"],
          );
        } catch (logError) {
          console.error(
            "[AnomalyDetection] Erro ao registrar no audit_logs:",
            logError,
          );
        }
      }
    }

    console.log(
      `[AnomalyDetection] ${results.anomalies.length} anomalias detectadas (score: ${results.totalScore.toFixed(1)})`,
    );

    return results;
  } catch (error) {
    console.error("[AnomalyDetection] Erro ao detectar anomalias:", error);
    return {
      userId,
      timestamp: new Date(),
      anomalies: [],
      totalScore: 0,
      error: error.message,
    };
  }
}

/**
 * Monitoramento contínuo de anomalias
 */
async function startAnomalyMonitoring(intervalMinutes = 15) {
  console.log(
    `[AnomalyDetection] 🚀 Monitoramento iniciado (intervalo: ${intervalMinutes}min)`,
  );

  setInterval(
    async () => {
      try {
        console.log(
          "[AnomalyDetection] 🔍 Executando verificação periódica...",
        );

        // Buscar usuários ativos nas últimas 24h
        const result = await pool.query(`
        SELECT DISTINCT user_id
        FROM active_sessions
        WHERE last_activity_at > NOW() - INTERVAL '24 hours'
      `);

        for (const row of result.rows) {
          await detectAnomalies(row.user_id);
        }

        console.log(
          `[AnomalyDetection] ✅ Verificação concluída (${result.rows.length} usuários)`,
        );
      } catch (error) {
        console.error("[AnomalyDetection] ❌ Erro no monitoramento:", error);
      }
    },
    intervalMinutes * 60 * 1000,
  );

  // Executar imediatamente também
  setTimeout(async () => {
    const result = await pool.query(`
      SELECT DISTINCT user_id
      FROM active_sessions
      WHERE last_activity_at > NOW() - INTERVAL '24 hours'
    `);

    for (const row of result.rows) {
      await detectAnomalies(row.user_id);
    }
  }, 5000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  // Detecções individuais
  detectNewCountry,
  detectUnusualHour,
  detectAbnormalVolume,
  detectMultipleIPs,
  detectMultipleDevices,
  detectBruteForce,

  // Função principal
  detectAnomalies,

  // Monitoramento
  startAnomalyMonitoring,

  // Helpers
  getUserBaseline,

  // Funções estatísticas
  mean,
  stdDev,
  zScore,
  isOutlier,
};
