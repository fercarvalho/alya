// ═══════════════════════════════════════════════════════════════════════════
// server/services/pm/notification-service.js
//
// Centraliza o disparo 3-way de notificações do PM (sino + push + e-mail),
// respeitando notification_preferences. Fire-and-forget: nunca propaga erro
// pro caller (falha de push/e-mail não desfaz nada).
//
// Port do IMPGEO adaptado ao Alya (single-origin): dispatcher sem app-scope,
// db.createNotification em camelCase, getNotificationPreference sem scope.
// ═══════════════════════════════════════════════════════════════════════════

'use strict';

const pushDispatcher = require('../push-dispatcher');
const emailService = require('../email');
const strings = require('./notification-strings');

const ALYA_PUBLIC_URL = process.env.ALYA_PUBLIC_URL || '';

function ctaForProject(projectId) {
  if (!projectId || !ALYA_PUBLIC_URL) return null;
  return `${ALYA_PUBLIC_URL}/?subsystem=gerenciamento&module=projects&project=${projectId}`;
}

/**
 * Dispara notificação para 1 usuário.
 * @param {object} db
 * @param {object} p
 * @param {string} p.type        - tipo pm_* (deve existir em NOTIFICATION_DEFAULTS)
 * @param {string} p.userId
 * @param {object} [p.payload]    - dados p/ montar os textos (notification-strings)
 * @param {string} [p.entityType] - related_entity_type (ex.: 'project_task','project')
 * @param {string} [p.entityId]
 * @param {string} [p.ctaProjectId] - se passado, monta CTA pro projeto
 */
async function notify(db, { type, userId, payload = {}, entityType = null, entityId = null, ctaProjectId = null }) {
  if (!userId || !type) return;
  const { title, message } = strings.build(type, payload);

  // 1. Sino (sempre).
  let bellNotif = null;
  try {
    bellNotif = await db.createNotification({
      userId, notificationType: type, title, message,
      relatedEntityType: entityType, relatedEntityId: entityId,
    });
  } catch (e) { console.error('[pm-notify] sino falhou', type, e.message); }

  // 2. Push (push-dispatcher checa preferência internamente).
  try {
    await pushDispatcher.send(db, userId, bellNotif || {
      notificationType: type, title, message,
      relatedEntityType: entityType, relatedEntityId: entityId,
    });
  } catch (e) { /* dispatcher já engole erro; defensivo */ }

  // 3. E-mail (opt-in via preferência).
  try {
    const emailOn = await db.getNotificationPreference(userId, type, 'email').catch(() => false);
    if (emailOn) {
      const r = await db.pool.query('SELECT email FROM users WHERE id = $1', [userId]);
      const toEmail = r.rows[0]?.email;
      if (toEmail) {
        await emailService.enviarEmailPmNotificacao({ toEmail, title, message, ctaUrl: ctaForProject(ctaProjectId) });
      }
    }
  } catch (e) { console.error('[pm-notify] email falhou', type, e.message); }
}

// Notifica todos admins/superadmins ativos (ex.: atraso crítico).
async function notifyAdmins(db, args) {
  return notifyRoles(db, ['admin', 'superadmin'], args);
}

// Notifica todos os usuários ativos de um conjunto de papéis (sem duplicar).
async function notifyRoles(db, roles, args) {
  try {
    const r = await db.pool.query(
      `SELECT id FROM users WHERE role = ANY($1::text[]) AND COALESCE(is_active,true)=true`, [roles]
    );
    for (const row of r.rows) {
      if (args.exceptUserId && row.id === args.exceptUserId) continue;
      await notify(db, { ...args, userId: row.id });
    }
  } catch (e) { console.error('[pm-notify] notifyRoles falhou', e.message); }
}

// Gestores (manager + admin + superadmin) — fluxo de aprovação de excedente.
async function notifyManagersAndAdmins(db, args) {
  return notifyRoles(db, ['manager', 'admin', 'superadmin'], args);
}

module.exports = { notify, notifyAdmins, notifyRoles, notifyManagersAndAdmins };
