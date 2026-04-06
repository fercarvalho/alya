'use strict';

/**
 * Rotas da integração Nuvemshop.
 *
 * Uso em server.js:
 *   const nuvemshopRouter = require('./routes/nuvemshop');
 *   app.use('/api/nuvemshop', nuvemshopRouter(db, authenticateToken));
 *
 * O endpoint de webhook é registrado separadamente em server.js (precisa de raw body):
 *   const { handleWebhook } = require('./routes/nuvemshop');
 *   app.post('/api/nuvemshop/webhook', express.raw({ type: 'application/json' }), handleWebhook(db));
 */

const express = require('express');
const crypto = require('crypto');
const { decrypt } = require('../utils/encryption');
const { encrypt } = require('../utils/encryption');
const nuvemshopService = require('../services/nuvemshopService');
const { syncOrders, syncProducts, syncCustomers } = require('../utils/nuvemshopSync');

/**
 * Factory que recebe db e authenticateToken do server.js e retorna o router configurado.
 */
function createRouter(db, authenticateToken) {
  const router = express.Router();

  // ─── GET /api/nuvemshop/status ────────────────────────────────────────────────
  // Retorna se o usuário já conectou uma loja Nuvemshop
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
  // Salva o token e store ID, valida a conexão e registra webhooks
  router.post('/connect', authenticateToken, async (req, res) => {
    const { accessToken, storeId } = req.body;

    if (!accessToken || !storeId) {
      return res.status(400).json({ error: 'accessToken e storeId são obrigatórios' });
    }

    try {
      // Valida a conexão buscando informações da loja
      const storeInfo = await nuvemshopService.getStore(accessToken, storeId);

      // Criptografa o token antes de salvar
      const encryptedToken = encrypt(accessToken);

      // Gera um token secreto para validar webhooks recebidos
      const webhookToken = crypto.randomBytes(32).toString('hex');

      // Salva a configuração no banco
      await db.saveNuvemshopConfig(req.user.id, {
        storeId,
        accessToken: encryptedToken,
        storeName: storeInfo.name && typeof storeInfo.name === 'object'
          ? (storeInfo.name.pt || storeInfo.name.es || Object.values(storeInfo.name)[0] || '')
          : (storeInfo.name || ''),
        storeUrl: storeInfo.original_domain || storeInfo.url || '',
        webhookToken,
      });

      // Registra webhooks na Nuvemshop (se a aplicação tiver URL pública configurada)
      const webhookBaseUrl = process.env.WEBHOOK_BASE_URL;
      let webhookIdOrders = null;
      let webhookIdProducts = null;
      let webhookIdCustomers = null;

      if (webhookBaseUrl) {
        const webhookUrl = `${webhookBaseUrl}/api/nuvemshop/webhook`;
        try {
          const whOrders = await nuvemshopService.registerWebhook(
            accessToken, storeId, 'order/paid', webhookUrl
          );
          webhookIdOrders = whOrders.id;

          const whProducts = await nuvemshopService.registerWebhook(
            accessToken, storeId, 'product/updated', webhookUrl
          );
          webhookIdProducts = whProducts.id;

          const whCustomers = await nuvemshopService.registerWebhook(
            accessToken, storeId, 'customer/created', webhookUrl
          );
          webhookIdCustomers = whCustomers.id;

          await db.updateNuvemshopConfig(req.user.id, {
            webhookIdOrders,
            webhookIdProducts,
            webhookIdCustomers,
          });
        } catch (whErr) {
          // Falha ao registrar webhooks não impede a conexão
          console.warn('[Nuvemshop] Webhooks não registrados:', whErr.message);
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
  // Remove webhooks e limpa a configuração
  router.delete('/disconnect', authenticateToken, async (req, res) => {
    try {
      const config = await db.getNuvemshopConfig(req.user.id);
      if (!config) {
        return res.status(404).json({ error: 'Nenhuma integração encontrada' });
      }

      // Tenta remover webhooks da Nuvemshop
      try {
        const token = decrypt(config.accessToken);
        if (config.webhookIdOrders) {
          await nuvemshopService.deleteWebhook(token, config.storeId, config.webhookIdOrders);
        }
        if (config.webhookIdProducts) {
          await nuvemshopService.deleteWebhook(token, config.storeId, config.webhookIdProducts);
        }
        if (config.webhookIdCustomers) {
          await nuvemshopService.deleteWebhook(token, config.storeId, config.webhookIdCustomers);
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
  // Métricas de e-commerce para o painel Nuvemshop
  router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
      const config = await db.getNuvemshopConfig(req.user.id);
      if (!config || !config.isActive) {
        return res.status(400).json({ error: 'Nenhuma integração Nuvemshop ativa' });
      }

      // Busca transações do mês atual originadas da Nuvemshop
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
 * Registrado em server.js com express.raw() para acesso ao body bruto (necessário para validação HMAC).
 *
 * Nota: A Nuvemshop envia o header 'x-linkedstore-token' com o token configurado no webhook.
 */
function handleWebhook(db) {
  return async (req, res) => {
    try {
      // O body chega como Buffer quando usando express.raw()
      const bodyBuffer = req.body;
      const receivedToken = req.headers['x-linkedstore-token'];

      // Extrai o store_id do header ou da URL para buscar a config
      const storeId = req.headers['x-store-id'] || req.query.store_id;

      if (!storeId) {
        return res.status(400).json({ error: 'Store ID não identificado' });
      }

      // Busca a configuração pelo storeId para validar o token do webhook
      const config = await db.getNuvemshopConfigByStoreId(storeId);
      if (!config) {
        return res.status(404).json({ error: 'Loja não encontrada' });
      }

      // Valida o token do webhook
      if (receivedToken && config.webhookToken && receivedToken !== config.webhookToken) {
        console.warn('[Nuvemshop Webhook] Token inválido para loja:', storeId);
        return res.status(401).json({ error: 'Token de webhook inválido' });
      }

      // Parseia o payload
      const payload = JSON.parse(bodyBuffer.toString('utf8'));
      const event = req.headers['x-store-event'] || payload.event;

      // Responde 200 imediatamente (Nuvemshop considera timeout após 10s)
      res.status(200).json({ received: true });

      // Processa o evento assincronamente
      const token = decrypt(config.accessToken);

      if (event === 'order/paid') {
        const order = payload;
        // Verifica se já foi importado
        const existing = await db.getSyncMap(config.userId, 'order', order.id);
        if (!existing) {
          const { syncOrders: syncOneOrder } = require('../utils/nuvemshopSync');
          // Importa apenas este pedido
          await syncOneOrder(db, config.userId, token, storeId, null);
        }
      } else if (event === 'order/cancelled') {
        const existing = await db.getSyncMap(config.userId, 'order', payload.id);
        if (existing) {
          // Cria uma transação de estorno
          await db.saveTransaction({
            date: new Date().toISOString().split('T')[0],
            description: `Cancelamento Pedido #${payload.number} - Nuvemshop`,
            value: parseFloat(payload.total || 0),
            type: 'Despesa',
            category: 'Estorno Nuvemshop',
          });
        }
      } else if (event === 'product/updated' || event === 'product/created') {
        const { syncProducts: syncOneProduct } = require('../utils/nuvemshopSync');
        await syncOneProduct(db, config.userId, token, storeId, null);
      } else if (event === 'customer/created' || event === 'customer/updated') {
        const { syncCustomers: syncOneCustomer } = require('../utils/nuvemshopSync');
        await syncOneCustomer(db, config.userId, token, storeId, null);
      }
    } catch (err) {
      console.error('[Nuvemshop Webhook] Erro ao processar evento:', err.message);
      // Se ainda não respondeu, manda 200 mesmo assim (evitar reenvio da Nuvemshop)
      if (!res.headersSent) {
        res.status(200).json({ received: true });
      }
    }
  };
}

module.exports = { createRouter, handleWebhook };
