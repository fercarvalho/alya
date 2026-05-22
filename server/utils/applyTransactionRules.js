/**
 * Helper compartilhado: aplica regras automáticas a uma transação já persistida.
 *
 * Uso:
 *   const { applyRulesAndPersist } = require('./utils/applyTransactionRules');
 *   const saved = await db.saveTransaction(...);
 *   const { transaction, applied, matchedRules } = await applyRulesAndPersist(db, saved, { actingUserId });
 *
 * Reusado em server.js (POST manual, importação Excel, extrato) e em
 * nuvemshopSync.js (sincronização de pedidos). Centralizar evita duplicação
 * e garante comportamento consistente entre fluxos.
 *
 * Política:
 *   - 0 matches: nada acontece, retorna a transação como veio
 *   - 1 match: aplica a regra, retorna transação atualizada
 *   - 2+ matches: marca como 'A confirmar', cria candidatos, dispara notificação
 *     para o `actingUserId` (se houver) + fanout para todos os admins/superadmins
 */
function _truncate(s, n = 80) {
  if (!s) return '';
  const str = String(s);
  return str.length > n ? str.slice(0, n) + '…' : str;
}

async function applyRulesAndPersist(db, savedTransaction, { actingUserId = null } = {}) {
  if (!savedTransaction || !savedTransaction.id) {
    return { transaction: savedTransaction, applied: 'none', matchedRules: [] };
  }
  const { matched } = await db.evaluateRulesForTransaction(savedTransaction);

  if (matched.length === 0) {
    return { transaction: savedTransaction, applied: 'none', matchedRules: [] };
  }
  if (matched.length === 1) {
    const updated = await db.applyRuleToTransaction(savedTransaction.id, matched[0].id);
    return { transaction: updated, applied: 'rule', matchedRules: matched, ruleApplied: matched[0] };
  }
  // 2+ matches → pendente
  const updated = await db.markTransactionPendingConfirmation(
    savedTransaction.id,
    matched.map((r) => r.id)
  );
  const title = 'Transação pendente de confirmação';
  const message = `A transação "${_truncate(savedTransaction.description)}" deu match em ${matched.length} regras. Escolha qual aplicar.`;
  const notifPayload = {
    notificationType: 'transaction_confirm_needed',
    title,
    message,
    relatedEntityType: 'transaction',
    relatedEntityId: savedTransaction.id,
  };
  // Lazy require pra evitar ciclo (push-dispatcher → db). Em runtime, o módulo
  // já foi resolvido pelo server.js no boot, então não há custo extra aqui.
  const pushDispatcher = require('../services/push-dispatcher');

  const notified = new Set();
  if (actingUserId) {
    const actorNotif = await db.createNotification({ ...notifPayload, userId: actingUserId });
    pushDispatcher.send(db, actingUserId, actorNotif).catch(() => {});
    notified.add(actingUserId);
  }
  const adminNotifs = await db.fanoutNotificationToAdmins(notifPayload, Array.from(notified));
  for (const n of adminNotifs) {
    pushDispatcher.send(db, n.userId, n).catch(() => {});
  }
  return { transaction: updated, applied: 'pending', matchedRules: matched };
}

module.exports = { applyRulesAndPersist };
