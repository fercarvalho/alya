'use strict';

/**
 * Rotas da integração Bling (ERP) — Fase 0 (OAuth/JWT + status).
 *
 * Uso em server.js:
 *   const { createRouter: createBlingRouter } = require('./routes/bling');
 *   app.use('/api/bling', createBlingRouter(db, authenticateToken));
 *
 * Permissão: respeita o módulo 'bling' (role_default_permissions / user_module_permissions).
 * Superadmin tem bypass. Variáveis de ambiente:
 *   BLING_CLIENT_ID, BLING_CLIENT_SECRET, BLING_REDIRECT_URI  (obrigatórias p/ OAuth)
 *   BLING_OAUTH_BASE            (opcional)
 *   BLING_POST_AUTH_REDIRECT    (opcional; destino do navegador após o callback; default '/')
 *   JWT_SECRET                  (usado para assinar o `state` CSRF do OAuth)
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const blingAuth = require('../utils/blingAuth');
const perms = require('../permissions');

const MODULE_KEY = 'bling';
const STATE_PURPOSE = 'bling_oauth';

function createRouter(db, authenticateToken) {
  const router = express.Router();

  // Middleware: exige acesso ao módulo 'bling' no nível pedido ('view' | 'edit').
  // Carrega as permissões do banco (o JWT de sessão não as carrega) e aplica
  // o bypass de superadmin via helpers de permissão.
  function requireModuleAccess(level) {
    return async (req, res, next) => {
      try {
        const sessionUser = req.user;
        if (!sessionUser || !sessionUser.id) {
          return res.status(401).json({ error: 'Não autenticado' });
        }
        let user = sessionUser;
        if (!perms.isSuperadmin(user)) {
          const modulesAccess = await perms.loadUserPermissions(db.pool, sessionUser.id);
          user = { ...sessionUser, modulesAccess };
        }
        const ok = level === 'edit'
          ? perms.hasModuleEdit(user, MODULE_KEY)
          : perms.hasModuleView(user, MODULE_KEY);
        if (!ok) {
          return res.status(403).json({ error: 'Sem permissão para o módulo Bling' });
        }
        next();
      } catch (err) {
        console.error('[Bling] Erro ao verificar permissão:', err.message);
        return res.status(500).json({ error: 'Erro ao verificar permissão' });
      }
    };
  }

  // ─── GET /api/bling/status ──────────────────────────────────────────────────
  router.get('/status', authenticateToken, requireModuleAccess('view'), async (req, res) => {
    try {
      const config = await db.getBlingConfig(req.user.id);
      if (!config || !config.isActive) {
        return res.json({ connected: false });
      }
      return res.json({
        connected: true,
        blingCompanyId: config.blingCompanyId || null,
        scopes: config.scopes || null,
        tokenExpiresAt: config.tokenExpiresAt,
        refreshExpiresAt: config.refreshExpiresAt,
        lastSyncReceivables: config.lastSyncReceivables,
        lastSyncPayables: config.lastSyncPayables,
        lastSyncOrders: config.lastSyncOrders,
        connectedAt: config.connectedAt,
      });
    } catch (err) {
      console.error('[Bling] Erro ao buscar status:', err.message);
      return res.status(500).json({ error: 'Erro interno ao buscar status da integração' });
    }
  });

  // ─── GET /api/bling/connect ───────────────────────────────────────────────
  // Gera a URL de autorização do Bling com um `state` assinado (carrega o userId
  // e expira em 10 min). O frontend redireciona o navegador para essa URL.
  router.get('/connect', authenticateToken, requireModuleAccess('edit'), (req, res) => {
    try {
      if (!process.env.BLING_CLIENT_ID || !process.env.BLING_CLIENT_SECRET) {
        return res.status(500).json({ error: 'Integração Bling não configurada (faltam credenciais no servidor)' });
      }
      const state = jwt.sign(
        { uid: req.user.id, purpose: STATE_PURPOSE },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
      );
      const authorizeUrl = blingAuth.buildAuthorizeUrl(state);
      return res.json({ authorizeUrl });
    } catch (err) {
      console.error('[Bling] Erro ao gerar URL de autorização:', err.message);
      return res.status(500).json({ error: 'Erro ao iniciar a conexão com o Bling' });
    }
  });

  // ─── GET /api/bling/callback ──────────────────────────────────────────────
  // Rota pública (o Bling redireciona o navegador para cá). A identidade do
  // usuário vem do `state` assinado — não do Bearer. Troca o code por tokens,
  // persiste a config cifrada e redireciona o navegador de volta ao app.
  router.get('/callback', async (req, res) => {
    const dest = process.env.BLING_POST_AUTH_REDIRECT || '/';
    const redirectWith = (params) => {
      const sep = dest.includes('?') ? '&' : '?';
      return res.redirect(`${dest}${sep}${new URLSearchParams(params).toString()}`);
    };

    try {
      const { code, state, error } = req.query;
      if (error) {
        return redirectWith({ bling: 'error', reason: 'denied' });
      }
      if (!code || !state) {
        return redirectWith({ bling: 'error', reason: 'missing_params' });
      }

      let payload;
      try {
        payload = jwt.verify(state, process.env.JWT_SECRET);
      } catch {
        return redirectWith({ bling: 'error', reason: 'invalid_state' });
      }
      if (!payload || payload.purpose !== STATE_PURPOSE || !payload.uid) {
        return redirectWith({ bling: 'error', reason: 'invalid_state' });
      }

      const tokenResp = await blingAuth.exchangeCode(code);
      if (!tokenResp.accessToken || !tokenResp.refreshToken) {
        return redirectWith({ bling: 'error', reason: 'token_exchange_failed' });
      }

      // Tenta obter dados básicos da empresa (tolerante a falha) p/ enriquecer a config
      let blingCompanyId = null;
      try {
        const info = await blingAuth.getCompanyInfo(tokenResp.accessToken);
        blingCompanyId = info?.data?.id || info?.id || null;
      } catch { /* ignore */ }

      await blingAuth.persistConfig(db, payload.uid, tokenResp, { blingCompanyId });

      return redirectWith({ bling: 'success' });
    } catch (err) {
      console.error('[Bling] Erro no callback OAuth:', err.message);
      return redirectWith({ bling: 'error', reason: 'server_error' });
    }
  });

  // ─── DELETE /api/bling/disconnect ─────────────────────────────────────────
  router.delete('/disconnect', authenticateToken, requireModuleAccess('edit'), async (req, res) => {
    try {
      const config = await db.getBlingConfig(req.user.id);
      if (!config) {
        return res.status(404).json({ error: 'Nenhuma integração encontrada' });
      }
      // Revoga o token no Bling (tolerante a falha — o importante é apagar localmente)
      try {
        const { decrypt } = require('../utils/encryption');
        await blingAuth.revoke(decrypt(config.accessToken));
      } catch (revErr) {
        console.warn('[Bling] Falha ao revogar token (seguindo com desconexão local):', revErr.message);
      }
      await db.deleteBlingConfig(req.user.id);
      return res.json({ success: true });
    } catch (err) {
      console.error('[Bling] Erro ao desconectar:', err.message);
      return res.status(500).json({ error: 'Erro interno ao desconectar' });
    }
  });

  return router;
}

module.exports = { createRouter };
