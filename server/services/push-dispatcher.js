// Dispatcher de Web Push — orquestra envio pros dispositivos do usuário.
//
// Portado do impgeo (services/push-dispatcher.js), SIMPLIFICADO sem scope
// param (Alya é single-origin: só uma tabela push_subscriptions e uma
// notification_preferences).
//
// Não confundir com services/push.js: aquele é o RUNTIME VAPID (init,
// publicKey, raw sendNotification). Este é a LÓGICA DE NEGÓCIO:
//   1. Lê preferência do user pro tipo de notificação no canal 'push'.
//   2. Lista subscriptions ativas.
//   3. Monta payload (title + message truncados, ids, ts, foreground_show).
//   4. Envia em paralelo (Promise.allSettled) — uma falha não afeta as outras.
//   5. Trata erros:
//      - 404/410 → subscription expirada/cancelada → prune.
//      - Outros  → markFailed; se atingir maxFails, remove a sub.
//
// CONTRATO IMPORTANTE: send() NUNCA propaga erro pro caller. Falha em push
// não pode quebrar criação de notificação in-app. O caller usa fire-and-forget
// com .catch defensivo.
//
// Log estruturado (JSON-ish em uma linha) pra observabilidade no PM2.
// Sem PII no log — só ids, type, contagens, codes.

const push = require('./push');

const MAX_TITLE_LEN = 100;
const MAX_MESSAGE_LEN = 200;
const MAX_FAILS_BEFORE_PRUNE = 5;

// Push services retornam 404 (Mozilla legacy) ou 410 Gone (padrão) quando a
// subscription foi cancelada pelo cliente. Nesses casos a sub NUNCA mais vai
// funcionar — remover imediatamente em vez de incrementar failed_count.
const TERMINAL_STATUS_CODES = new Set([404, 410]);

function truncate(s, max) {
  if (!s) return '';
  const str = String(s);
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function buildPayload(notif, foregroundShow) {
  // notif vem do db.createNotification em camelCase (id, title, message,
  // notificationType, relatedEntityType, relatedEntityId).
  return {
    id: notif.id,
    title: truncate(notif.title, MAX_TITLE_LEN),
    message: truncate(notif.message, MAX_MESSAGE_LEN),
    type: notif.notificationType,
    related_entity_type: notif.relatedEntityType || null,
    related_entity_id: notif.relatedEntityId || null,
    foreground_show: !!foregroundShow,
    ts: Date.now(),
  };
}

function logLine(obj) {
  try {
    console.log('[push]', JSON.stringify(obj));
  } catch {
    console.log('[push] (log fail)', obj);
  }
}

// Envia uma notificação pros dispositivos ATIVOS do usuário.
// `notif` = objeto retornado por db.createNotification (camelCase).
// Retorna { sent, pruned, failed } pra inspeção do caller (opcional).
// NÃO lança — todos os erros são engolidos e logados.
async function send(db, userId, notif) {
  const result = { sent: 0, pruned: 0, failed: 0 };

  try {
    if (!push.isConfigured()) return result;

    if (!notif || !notif.notificationType) {
      logLine({ event: 'skip', reason: 'no_type', recipient: userId });
      return result;
    }

    const enabled = await db.getNotificationPreference(
      userId, notif.notificationType, 'push'
    );
    if (!enabled) {
      logLine({ event: 'skip', reason: 'pref_disabled', type: notif.notificationType, recipient: userId });
      return result;
    }

    const subs = await db.listActivePushSubscriptions(userId);
    if (subs.length === 0) {
      logLine({ event: 'skip', reason: 'no_subs', type: notif.notificationType, recipient: userId });
      return result;
    }

    const foregroundShow = await db.getNotificationPreference(
      userId, '_meta:foreground', 'push'
    ).catch(() => false);

    const payload = buildPayload(notif, foregroundShow);

    const settled = await Promise.allSettled(subs.map(async (s) => {
      try {
        await push.send(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          {
            topic: notif.relatedEntityId
              ? `${notif.notificationType}-${notif.relatedEntityId}`.slice(0, 32)
              : undefined,
          },
        );
        await db.touchPushSubscriptionLastSeen(s.endpoint).catch(() => {});
        return { ok: true, endpoint: s.endpoint };
      } catch (err) {
        return {
          ok: false,
          endpoint: s.endpoint,
          statusCode: err.statusCode,
          body: typeof err.body === 'string' ? err.body.slice(0, 200) : null,
          message: err.message,
        };
      }
    }));

    for (const r of settled) {
      const v = r.status === 'fulfilled' ? r.value : { ok: false, message: String(r.reason) };
      if (v.ok) {
        result.sent++;
        logLine({ event: 'sent', type: notif.notificationType, recipient: userId });
      } else if (v.statusCode && TERMINAL_STATUS_CODES.has(v.statusCode)) {
        await db.pruneInvalidPushSubscription(v.endpoint).catch(() => {});
        result.pruned++;
        logLine({ event: 'pruned', type: notif.notificationType, recipient: userId, statusCode: v.statusCode });
      } else {
        const { removed, failedCount } = await db.markPushSubscriptionFailed(
          v.endpoint, MAX_FAILS_BEFORE_PRUNE
        ).catch(() => ({ removed: false, failedCount: -1 }));
        result.failed++;
        if (removed) result.pruned++;
        logLine({
          event: removed ? 'pruned_max_fails' : 'failed',
          type: notif.notificationType, recipient: userId,
          statusCode: v.statusCode || null,
          failedCount, message: v.message,
        });
      }
    }
  } catch (err) {
    logLine({ event: 'dispatcher_error', message: err.message, stack: err.stack });
  }

  return result;
}

module.exports = { send };
