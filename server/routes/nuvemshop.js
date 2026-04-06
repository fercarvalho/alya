'use strict';

/**
 * Rotas da integração Nuvemshop.
 *
 * Uso em server.js:
 *   const { createRouter, handleWebhook } = require('./routes/nuvemshop');
 *   // Webhook precisa de express.raw() ANTES do express.json() global:
 *   app.post('/api/nuvemshop/webhook', express.raw({ type: 'application/json' }), handleWebhook(db));
 *   app.use('/api/nuvemshop', createRouter(db, authenticateToken));
 *
 * Variável de ambiente opcional:
 *   NUVEMSHOP_CLIENT_SECRET — client_secret do app Nuvemshop para validar HMAC dos webhooks.
 *   Sem ela, a validação HMAC é pulada (log de aviso emitido).
 */

const express = require('express');
const crypto = require('crypto');
const { decrypt, encrypt } = require('../utils/encryption');
const nuvemshopService = require('../services/nuvemshopService');
const { syncOrders, syncProducts, syncCustomers } = require('../utils/nuvemshopSync');

// Eventos que serão registrados na Nuvemshop ao conectar
const WEBHOOK_EVENTS = [
  'order/paid',
  'order/cancelled',
  'order/updated',
  'product/created',
  'product/updated',
  'customer/created',
  'customer/updated',
];

/**
 * Factory que recebe db e authenticateToken do server.js e retorna o router configurado.
 */
function createRouter(db, authenticateToken) {
  const router = express.Router();

  // ─── GET /api/nuvemshop/status ────────────────────────────────────────────────
  router.get('/status', authenticateToken, async (req, res) => {
    try {
      const config = await db.getNuvemshopConfig(req.user.id);
      if (!config || !config.isActive) {
        return res.json({ connected: false });
      }
      return res.json({
        connected: true,
        storeName: config.storeName,
        storeUrl: config.storeUrl,
        storeId: config.storeId,
        webhooksActive: !!(config.webhookIdOrders),
        lastSyncOrders: config.lastSyncOrders,
        lastSyncProducts: config.lastSyncProducts,
        lastSyncCustomers: config.lastSyncCustomers,
        connectedAt: config.connectedAt,
      });
    } catch (err) {
      console.error('[Nuvemshop] Erro ao buscar status:', err.message);
      return res.status(500).json({ error: 'Erro interno ao buscar status da integração' });
    }
  });

  // ─── POST /api/nuvemshop/connect ─────────────────────────────────────────────
  router.post('/connect', authenticateToken, async (req, res) => {
    const { accessToken, storeId } = req.body;

    if (!accessToken || !storeId) {
      return res.status(400).json({ error: 'accessToken e storeId são obrigatórios' });
    }

    try {
      // Valida a conexão buscando informações da loja
      const storeInfo = await nuvemshopService.getStore(accessToken, storeId);

      const encryptedToken = encrypt(accessToken);

      await db.saveNuvemshopConfig(req.user.id, {
        storeId,
        accessToken: encryptedToken,
        storeName: typeof storeInfo.name === 'object'
          ? (storeInfo.name.pt || storeInfo.name.es || Object.values(storeInfo.name)[0] || '')
          : (storeInfo.name || ''),
        storeUrl: storeInfo.original_domain || storeInfo.url || '',
        webhookToken: null, // não usado; autenticação via HMAC-SHA256
      });

      // Registra webhooks se WEBHOOK_BASE_URL estiver configurada
      const webhookBaseUrl = process.env.WEBHOOK_BASE_URL;
      let webhookIdOrders = null;

      if (webhookBaseUrl) {
        const webhookUrl = `${webhookBaseUrl}/api/nuvemshop/webhook`;
        try {
          // Remove webhooks antigos desta loja para evitar duplicatas
          const existing = await nuvemshopService.listWebhooks(accessToken, storeId);
          for (const wh of existing) {
            await nuvemshopService.deleteWebhook(accessToken, storeId, wh.id);
          }

          // Registra todos os eventos necessários
          for (const event of WEBHOOK_EVENTS) {
            try {
              const wh = await nuvemshopService.registerWebhook(accessToken, storeId, event, webhookUrl);
              if (event === 'order/paid') webhookIdOrders = wh.id;
            } catch (evtErr) {
              console.warn(`[Nuvemshop] Webhook '${event}' não registrado:`, evtErr.message);
            }
          }

          await db.updateNuvemshopConfig(req.user.id, { webhookIdOrders });
        } catch (whErr) {
          console.warn('[Nuvemshop] Erro ao gerenciar webhooks:', whErr.message);
        }
      }

      return res.json({
        success: true,
        storeName: storeInfo.name,
        storeUrl: storeInfo.original_domain || '',
        webhooksRegistered: !!(webhookIdOrders),
      });
    } catch (err) {
      console.error('[Nuvemshop] Erro ao conectar:', err.message);
      if (err.response?.status === 401 || err.response?.status === 403) {
        return res.status(401).json({ error: 'Token inválido ou sem permissão para esta loja' });
      }
      return res.status(500).json({ error: 'Erro ao conectar com a Nuvemshop. Verifique o token e o Store ID.' });
    }
  });

  // ─── DELETE /api/nuvemshop/disconnect ────────────────────────────────────────
  router.delete('/disconnect', authenticateToken, async (req, res) => {
    try {
      const config = await db.getNuvemshopConfig(req.user.id);
      if (!config) {
        return res.status(404).json({ error: 'Nenhuma integração encontrada' });
      }

      // Remove todos os webhooks desta loja (lista e deleta, sem depender de IDs salvos)
      try {
        const token = decrypt(config.accessToken);
        const webhooks = await nuvemshopService.listWebhooks(token, config.storeId);
        for (const wh of webhooks) {
          await nuvemshopService.deleteWebhook(token, config.storeId, wh.id);
        }
      } catch (whErr) {
        console.warn('[Nuvemshop] Erro ao remover webhooks:', whErr.message);
      }

      await db.deleteNuvemshopConfig(req.user.id);

      return res.json({ success: true });
    } catch (err) {
      console.error('[Nuvemshop] Erro ao desconectar:', err.message);
      return res.status(500).json({ error: 'Erro interno ao desconectar' });
    }
  });

  // ─── POST /api/nuvemshop/sync/orders ─────────────────────────────────────────
  router.post('/sync/orders', authenticateToken, async (req, res) => {
    try {
      const config = await db.getNuvemshopConfig(req.user.id);
      if (!config || !config.isActive) {
        return res.status(400).json({ error: 'Nenhuma integração Nuvemshop ativa' });
      }

      const token = decrypt(config.accessToken);
      const since = config.lastSyncOrders ? new Date(config.lastSyncOrders) : null;
      const result = await syncOrders(db, req.user.id, token, config.storeId, since);

      await db.updateNuvemshopConfig(req.user.id, { lastSyncOrders: new Date().toISOString() });

      return res.json({ success: true, ...result });
    } catch (err) {
      console.error('[Nuvemshop] Erro ao sincronizar pedidos:', err.message);
      return res.status(500).json({ error: 'Erro ao sincronizar pedidos' });
    }
  });

  // ─── POST /api/nuvemshop/sync/products ───────────────────────────────────────
  router.post('/sync/products', authenticateToken, async (req, res) => {
    try {
      const config = await db.getNuvemshopConfig(req.user.id);
      if (!config || !config.isActive) {
        return res.status(400).json({ error: 'Nenhuma integração Nuvemshop ativa' });
      }

      const token = decrypt(config.accessToken);
      const since = config.lastSyncProducts ? new Date(config.lastSyncProducts) : null;
      const result = await syncProducts(db, req.user.id, token, config.storeId, since);

      await db.updateNuvemshopConfig(req.user.id, { lastSyncProducts: new Date().toISOString() });

      return res.json({ success: true, ...result });
    } catch (err) {
      console.error('[Nuvemshop] Erro ao sincronizar produtos:', err.message);
      return res.status(500).json({ error: 'Erro ao sincronizar produtos' });
    }
  });

  // ─── POST /api/nuvemshop/sync/customers ──────────────────────────────────────
  router.post('/sync/customers', authenticateToken, async (req, res) => {
    try {
      const config = await db.getNuvemshopConfig(req.user.id);
      if (!config || !config.isActive) {
        return res.status(400).json({ error: 'Nenhuma integração Nuvemshop ativa' });
      }

      const token = decrypt(config.accessToken);
      const since = config.lastSyncCustomers ? new Date(config.lastSyncCustomers) : null;
      const result = await syncCustomers(db, req.user.id, token, config.storeId, since);

      await db.updateNuvemshopConfig(req.user.id, { lastSyncCustomers: new Date().toISOString() });

      return res.json({ success: true, ...result });
    } catch (err) {
      console.error('[Nuvemshop] Erro ao sincronizar clientes:', err.message);
      return res.status(500).json({ error: 'Erro ao sincronizar clientes' });
    }
  });

  // ─── GET /api/nuvemshop/dashboard ────────────────────────────────────────────
  router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
      const config = await db.getNuvemshopConfig(req.user.id);
      if (!config || !config.isActive) {
        return res.status(400).json({ error: 'Nenhuma integração Nuvemshop ativa' });
      }

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const metrics = await db.getNuvemshopDashboardMetrics(
        req.user.id,
        firstDayOfMonth,
        lastDayOfMonth
      );

      return res.json(metrics);
    } catch (err) {
      console.error('[Nuvemshop] Erro ao buscar métricas:', err.message);
      return res.status(500).json({ error: 'Erro ao buscar métricas do e-commerce' });
    }
  });

  return router;
}

/**
 * Handler de webhook — recebe eventos da Nuvemshop em tempo real.
 *
 * Autenticação: HMAC-SHA256 via header 'x-linkedstore-hmac-sha256'.
 * Requer variável de ambiente NUVEMSHOP_CLIENT_SECRET para validar a assinatura.
 * Sem ela, a validação é pulada e um aviso é emitido.
 *
 * O store_id e o event são lidos do payload JSON (conforme documentação oficial).
 */
function handleWebhook(db) {
  return async (req, res) => {
    try {
      const bodyBuffer = req.body; // Buffer (express.raw)

      // ── Validação HMAC-SHA256 ──────────────────────────────────────────────
      const clientSecret = process.env.NUVEMSHOP_CLIENT_SECRET;
      if (clientSecret) {
        const receivedHmac = req.headers['x-linkedstore-hmac-sha256'];
        if (!receivedHmac) {
          return res.status(401).json({ error: 'Assinatura do webhook ausente' });
        }
        const expectedHmac = crypto
          .createHmac('sha256', clientSecret)
          .update(bodyBuffer)
          .digest('hex');
        // Comparação de tempo constante para evitar timing attacks
        const expectedBuf = Buffer.from(expectedHmac, 'utf8');
        const receivedBuf = Buffer.from(receivedHmac, 'utf8');
        const isValid = expectedBuf.length === receivedBuf.length &&
          crypto.timingSafeEqual(expectedBuf, receivedBuf);
        if (!isValid) {
          console.warn('[Nuvemshop Webhook] Assinatura HMAC inválida');
          return res.status(401).json({ error: 'Assinatura do webhook inválida' });
        }
      } else {
        console.warn('[Nuvemshop Webhook] NUVEMSHOP_CLIENT_SECRET não configurado — validação HMAC desabilitada');
      }

      // ── Parse do payload ───────────────────────────────────────────────────
      const payload = JSON.parse(bodyBuffer.toString('utf8'));

      // store_id e event vêm do payload (não de headers customizados)
      const storeId = String(payload.store_id);
      const event = payload.event;

      if (!storeId) {
        return res.status(400).json({ error: 'store_id ausente no payload' });
      }

      const config = await db.getNuvemshopConfigByStoreId(storeId);
      if (!config) {
        return res.status(404).json({ error: 'Loja não encontrada' });
      }

      // Responde 200 imediatamente — Nuvemshop considera timeout após 3 segundos
      res.status(200).json({ received: true });

      // ── Processamento assíncrono do evento ────────────────────────────────
      const token = decrypt(config.accessToken);

      if (event === 'order/paid' || event === 'order/updated') {
        const existing = await db.getSyncMap(config.userId, 'order', payload.id);
        if (!existing && (payload.payment_status === 'paid' || payload.payment_status === 'authorized')) {
          await syncOrders(db, config.userId, token, storeId, null);
        }
      } else if (event === 'order/cancelled') {
        const existing = await db.getSyncMap(config.userId, 'order', payload.id);
        if (existing) {
          await db.saveTransaction({
            date: new Date().toISOString().split('T')[0],
            description: `Cancelamento Pedido #${payload.number} - Nuvemshop`,
            value: parseFloat(payload.total || 0),
            type: 'Despesa',
            category: 'Estorno Nuvemshop',
          });
        }
      } else if (event === 'product/created' || event === 'product/updated') {
        await syncProducts(db, config.userId, token, storeId, null);
      } else if (event === 'customer/created' || event === 'customer/updated') {
        await syncCustomers(db, config.userId, token, storeId, null);

      // ── Eventos obrigatórios LGPD/GDPR ────────────────────────────────────
      } else if (event === 'store/redact') {
        // Solicitação de exclusão de todos os dados da loja (ex: desinstalação do app)
        console.log(`[Nuvemshop Webhook] store/redact para loja ${storeId} — removendo integração`);
        await db.deleteNuvemshopConfig(config.userId);
      } else if (event === 'customers/redact') {
        // Solicitação de exclusão de dados de um cliente específico (LGPD/GDPR)
        const customerId = payload.customer?.id;
        if (customerId) {
          const map = await db.getSyncMap(config.userId, 'customer', customerId);
          if (map) {
            await db.updateClient(map.localId, { email: null, phone: null, cpf: null });
            console.log(`[Nuvemshop Webhook] customers/redact — dados do cliente ${customerId} anonimizados`);
          }
        }
      } else if (event === 'customers/data_request') {
        // Solicitação de exportação de dados do cliente (LGPD/GDPR)
        // O processamento real deve ser feito manualmente pelo administrador da loja
        console.log(`[Nuvemshop Webhook] customers/data_request para cliente ${payload.customer?.id} — revisar no painel admin`);
      }
    } catch (err) {
      console.error('[Nuvemshop Webhook] Erro ao processar evento:', err.message);
      if (!res.headersSent) {
        res.status(200).json({ received: true });
      }
    }
  };
}

module.exports = { createRouter, handleWebhook };
