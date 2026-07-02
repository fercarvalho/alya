// ═══════════════════════════════════════════════════════════════════════════
// server/services/email.js
//
// Helper de e-mail para as notificações e relatórios do subsistema Gerenciamento
// (PM). Usa SendGrid. Espelha o padrão de utils/security-alerts.js (checa a
// API key e nunca deixa a falha de e-mail derrubar o fluxo do caller).
//
// Consumido por services/pm/notification-service.js e services/pm/report-service.js.
// ═══════════════════════════════════════════════════════════════════════════

'use strict';

const sgMail = require('@sendgrid/mail');

let _configured = false;
function ensureSendGridConfigured() {
  if (_configured) return;
  const key = process.env.SENDGRID_API_KEY;
  if (!key) throw new Error('SENDGRID_API_KEY não configurado');
  sgMail.setApiKey(key);
  _configured = true;
}

function escapeHtmlPm(s) {
  return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function _sender() {
  const email = process.env.SENDGRID_FROM_EMAIL || 'naoresponda@viverdepj.com.br';
  const name = process.env.SENDGRID_FROM_NAME || 'Alya Sistemas';
  return { email, name };
}

// E-mail simples de notificação de projetos/tarefas.
async function enviarEmailPmNotificacao({ toEmail, title, message, ctaUrl }) {
  ensureSendGridConfigured();
  if (!toEmail) throw new Error('Email de destino não informado');
  const from = _sender();

  const cta = ctaUrl
    ? `<p style="margin:24px 0"><a href="${escapeHtmlPm(ctaUrl)}" style="background:linear-gradient(90deg,#7c3aed,#4f46e5);color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Abrir no Alya</a></p>`
    : '';
  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
    <h2 style="color:#4f46e5">${escapeHtmlPm(title)}</h2>
    <p style="font-size:15px;line-height:1.5">${escapeHtmlPm(message || '')}</p>${cta}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
    <p style="font-size:12px;color:#9ca3af">Alya · Gerenciamento de Projetos</p>
  </div>`;
  const [response] = await sgMail.send({
    to: toEmail, from: { email: from.email, name: from.name },
    subject: title, html, text: `${title}\n\n${message || ''}${ctaUrl ? `\n\n${ctaUrl}` : ''}`,
  });
  return { messageId: response.headers?.['x-message-id'] || null };
}

// Relatório administrativo por período (HTML já montado pelo report-service).
async function enviarEmailRelatorioPm({ toEmail, subject, html }) {
  ensureSendGridConfigured();
  if (!toEmail) throw new Error('Email de destino não informado');
  const from = _sender();
  const [response] = await sgMail.send({
    to: toEmail, from: { email: from.email, name: from.name }, subject, html,
  });
  return { messageId: response.headers?.['x-message-id'] || null };
}

module.exports = {
  enviarEmailPmNotificacao,
  enviarEmailRelatorioPm,
};
