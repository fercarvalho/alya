/* eslint-disable no-restricted-globals */
// Service Worker do Alya — PRODUÇÃO (não confundir com docs/sw.js, que é o
// mock da API pro modo demo no GitHub Pages).
//
// Responsabilidades:
//   1. Cache do app shell + assets (offline básico).
//   2. Web Push: receber notificações OS-level via VAPID.
//
// __BUILD_HASH__ é substituído pelo plugin do Vite em closeBundle. Em dev
// (se algum dia o SW for ativado lá) fica a string literal — aceita.
//
// Single-origin: Alya não tem split de hostnames como impgeo (tc-public/tc-admin),
// então o SW é único e direto — sem dispatcher por APP_ID.

const VERSION = '__BUILD_HASH__';
const CACHE_PRECACHE = `alya-precache-${VERSION}`;
const CACHE_RUNTIME  = `alya-runtime-${VERSION}`;

// Recursos pré-cacheados em install.
// index.html ENTRA no precache: serve de app-shell pra navegação responder
// instantaneamente no launch (sem isso, PWA standalone com SW "frio" — iOS
// mata o SW agressivamente — pintava branco e exigia abrir duas vezes).
const PRECACHE_URLS = [
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/alya-logo.png',
  '/alya-favicon.ico',
];

// API: network-only. Em offline, devolvemos 503 sintético — o front detecta
// e mostra estado offline (pattern emprestado do impgeo).
function syntheticOfflineResponse() {
  return new Response(
    JSON.stringify({ error: 'offline', message: 'Sem conexão' }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json', 'x-sw-offline': '1' },
    }
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_PRECACHE);
    // Precache INDIVIDUAL (não atômico): cache.addAll rejeita o lote inteiro se
    // um único arquivo faltar — aí nem o index.html entrava. Adicionando um a um
    // com catch próprio, o index.html (crítico pro app-shell) sempre entra. Como
    // o nome do cache inclui a VERSION, o install de cada deploy busca o fresco.
    await Promise.all(
      PRECACHE_URLS.map((u) => cache.add(u).catch(() => {}))
    );
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([CACHE_PRECACHE, CACHE_RUNTIME]);
    const all = await caches.keys();
    await Promise.all(
      all
        .filter((k) => k.startsWith('alya-') && !keep.has(k))
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Mutações (POST/PUT/PATCH/DELETE): network-only com 503 offline.
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    event.respondWith(handleMutation(request));
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // cross-origin: deixa passar

  // Navigation (HTML do app shell).
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Static assets (com hash no nome) — cache-first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // API: network-only (Alya não tem allowlist read-only como o tc-public do impgeo).
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiNetworkOnly(request));
    return;
  }

  // Default: network primeiro, cache como fallback.
  event.respondWith(handleDefault(request));
});

async function handleNavigation(request) {
  // App-shell: a SPA serve sempre o mesmo index.html (o router resolve a rota no
  // cliente lendo window.location). Servimos o shell PRÉ-CACHEADO na hora —
  // paint instantâneo no launch standalone, sem esperar rede fria. Isso elimina
  // a tela branca / "abrir duas vezes" no PWA (iOS/Chrome/macOS/iPadOS).
  //
  // A URL fica preservada na barra (o SW devolver o shell não muda location),
  // então deep-links (?token=, ?source=pwa) continuam legíveis pelo app.
  const precache = await caches.open(CACHE_PRECACHE);
  const cachedShell = await precache.match('/index.html');

  // Revalida em background pra próxima abertura pegar deploys novos.
  const revalidate = fetch('/index.html', { cache: 'no-store' })
    .then((fresh) => {
      if (fresh && fresh.ok) precache.put('/index.html', fresh.clone()).catch(() => {});
      return fresh;
    })
    .catch(() => null);

  if (cachedShell) {
    revalidate.catch(() => {});
    return cachedShell;
  }

  // Sem shell em cache (1ª navegação antes do install concluir) → tenta rede.
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) precache.put('/index.html', fresh.clone()).catch(() => {});
    return fresh;
  } catch {
    const offline = await caches.match('/offline.html');
    if (offline) return offline;
    return new Response('<h1>Sem conexão</h1>', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

async function handleStaticAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(CACHE_RUNTIME);
    cache.put(request, fresh.clone()).catch(() => {});
    return fresh;
  } catch {
    return new Response('', { status: 504 });
  }
}

async function handleApiNetworkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return syntheticOfflineResponse();
  }
}

async function handleMutation(request) {
  try {
    return await fetch(request);
  } catch {
    return syntheticOfflineResponse();
  }
}

async function handleDefault(request) {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('', { status: 504 });
  }
}

// postMessage do client → SW (forçar skipWaiting numa update; passar token JWT
// pra o SW conseguir re-subscribe em pushsubscriptionchange).
let _cachedAuthToken = null;
self.addEventListener('message', (event) => {
  if (!event.data || typeof event.data !== 'object') return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'SET_AUTH_TOKEN') {
    // Cliente posta o token JWT depois do login — SW guarda em memória pra
    // usar em pushsubscriptionchange (não tem como ler localStorage do SW).
    // Token volátil: some no restart do SW (esperado — cliente reposta).
    _cachedAuthToken = typeof event.data.token === 'string' ? event.data.token : null;
  } else if (event.data.type === 'CLEAR_AUTH_TOKEN') {
    _cachedAuthToken = null;
  }
});

// ─── Web Push handlers ──────────────────────────────────────────────────────
//
// Payload esperado (montado pelo push-dispatcher.js do backend):
//   {
//     id, title, message, type,
//     related_entity_type, related_entity_id,
//     foreground_show: boolean,  // user pediu OS-notif mesmo com app aberto?
//     ts
//   }
//
// Regra de foreground:
//   - Se houver clients visible E foreground_show=false → suprime OS-notif,
//     manda postMessage pro app atualizar o sino imediatamente.
//   - Caso contrário → showNotification.

const NOTIF_ICON  = '/alya-logo.png';
const NOTIF_BADGE = '/alya-logo.png';

function buildNotifTag(payload) {
  if (payload.related_entity_id && payload.related_entity_type) {
    return `${payload.type}-${payload.related_entity_type}-${payload.related_entity_id}`.slice(0, 60);
  }
  return `${payload.type || 'notif'}-${payload.id || 'noid'}`.slice(0, 60);
}

// URL a abrir/focar ao clicar. Hoje só temos `transaction_confirm_needed` —
// expandir aqui conforme novos tipos forem introduzidos.
function buildClickUrl(payload) {
  if (payload.type === 'transaction_confirm_needed') {
    // Abre app no módulo Transações; o sino do front mostra o item pra resolver.
    return '/?tab=transactions';
  }
  return '/';
}

self.addEventListener('push', (event) => {
  let payload = null;
  try {
    payload = event.data ? event.data.json() : null;
  } catch {
    payload = event.data ? { title: 'Nova notificação', message: event.data.text() } : null;
  }
  if (!payload) return;

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const hasVisibleClient = allClients.some((c) => c.visibilityState === 'visible' && c.focused);

    // Sempre manda postMessage — quem tiver listener (NotificationBell) pode
    // atualizar a UI sem esperar polling.
    for (const c of allClients) {
      try { c.postMessage({ type: 'push-notification', payload }); } catch { /* ok */ }
    }

    if (hasVisibleClient && !payload.foreground_show) {
      return; // foreground-quiet: só atualizou o sino, sem OS-notif.
    }

    await self.registration.showNotification(payload.title || 'Nova notificação', {
      body: payload.message || '',
      icon: NOTIF_ICON,
      badge: NOTIF_BADGE,
      tag: buildNotifTag(payload),
      renotify: false,
      data: {
        url: buildClickUrl(payload),
        payload,
      },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    // 1. Tenta achar um client deste origin já aberto — foca e manda mensagem.
    for (const c of allClients) {
      try {
        await c.focus();
        c.postMessage({
          type: 'push-notification-click',
          payload: event.notification.data && event.notification.data.payload,
          url: targetUrl,
        });
        return;
      } catch { /* tenta o próximo */ }
    }

    // 2. Sem clients abertos → abre janela nova.
    try {
      await self.clients.openWindow(targetUrl);
    } catch { /* navegador bloqueou — ok */ }
  })());
});

// O browser pode invalidar a subscription periodicamente. Quando isso acontece,
// re-subscribe usando o token JWT que o client postou pro SW após login.
//
// Se não há token (SW restart sem cliente ativo), falha silenciosa — user
// reativa manualmente pelo sino/perfil. Aceito esse trade-off.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      if (!_cachedAuthToken) return;

      const headers = {
        'Authorization': `Bearer ${_cachedAuthToken}`,
        'Content-Type': 'application/json',
      };

      const vapidResp = await fetch('/api/push/vapid-public-key', { headers });
      if (!vapidResp.ok) return;
      const { publicKey } = await vapidResp.json();
      if (!publicKey) return;

      const newSub = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          endpoint: newSub.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(newSub.getKey('p256dh')),
            auth: arrayBufferToBase64(newSub.getKey('auth')),
          },
        }),
      });
    } catch {
      /* silencioso — user reativa manualmente */
    }
  })());
});

// Helpers VAPID — base64url ↔ Uint8Array.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function arrayBufferToBase64(buffer) {
  if (!buffer) return null;
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
