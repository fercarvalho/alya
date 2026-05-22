// Registro do Service Worker do Alya.
//
// IMPORTANTE: o Alya tem 2 contextos com Service Worker distintos:
//
//   1. **Modo demo** (GitHub Pages, `alya.fercarvalho.com`, `*.github.io`):
//      o SW vive em `docs/sw.js` e serve pra MOCKAR a API (intercepta
//      `/api/*` e retorna dados em memória). O `main.tsx` já registra esse
//      e ele continua existindo. NÃO mexer.
//
//   2. **Modo produção** (`alya.sistemas.viverdepj.com.br` e demais hosts
//      reais com backend): o SW vive em `public/sw.js` (compilado pra
//      `dist/sw.js`). Cuida de cache do app shell + Web Push.
//
// Esta função registra **apenas o SW de produção**. A lógica de registro
// do mock continua no `main.tsx`, dentro do bloco condicional original
// que verifica hostname de demo. Os dois SWs nunca convivem no mesmo host.

export const DEMO_HOSTS = ['alya.fercarvalho.com', 'github.io', 'demo'];

export function isDemoHost(): boolean {
  if (typeof window === 'undefined') return false;
  const h = (window.location.hostname || '').toLowerCase();
  return DEMO_HOSTS.some((d) => h.includes(d));
}

export interface RegisterSWOptions {
  /** Não registra em dev (Vite HMR briga com cache do SW). */
  skipInDev?: boolean;
  /** Callback quando uma nova versão está pronta pra ativar. */
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
  /** Callback quando o SW assume controle pela 1ª vez. */
  onReady?: (registration: ServiceWorkerRegistration) => void;
}

export async function registerProductionSW(
  options: RegisterSWOptions = {}
): Promise<ServiceWorkerRegistration | null> {
  const { skipInDev = true, onUpdateAvailable, onReady } = options;

  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  if (isDemoHost()) {
    // Demo tem o seu próprio SW de mock — não registrar o de produção aqui.
    return null;
  }

  // Vite expõe import.meta.env.DEV em build. Em prod fica false.
  const isDev = Boolean(
    (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV
  );
  if (skipInDev && isDev) return null;

  const buildHash =
    (window as unknown as { __BUILD_HASH__?: string }).__BUILD_HASH__ ?? 'dev';

  try {
    const registration = await navigator.serviceWorker.register(
      `/sw.js?v=${encodeURIComponent(buildHash)}`,
      { scope: '/' }
    );

    if (registration.waiting && navigator.serviceWorker.controller) {
      onUpdateAvailable?.(registration);
    }

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          onUpdateAvailable?.(registration);
        }
      });
    });

    if (registration.active) {
      onReady?.(registration);
    }

    return registration;
  } catch (err) {
    console.error('[pwa] registerProductionSW falhou:', err);
    return null;
  }
}

/**
 * Posta o token JWT pro SW (necessário pra pushsubscriptionchange — o SW
 * não tem como ler localStorage). Chamado pelo AuthContext após login.
 * Volátil: o SW guarda em memória; restart limpa.
 */
export function postAuthTokenToSW(token: string | null): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then((reg) => {
    try {
      if (token) {
        reg.active?.postMessage({ type: 'SET_AUTH_TOKEN', token });
      } else {
        reg.active?.postMessage({ type: 'CLEAR_AUTH_TOKEN' });
      }
    } catch {
      /* ok */
    }
  }).catch(() => { /* SW não pronto — ok */ });
}
