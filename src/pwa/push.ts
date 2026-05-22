// Cliente de Web Push — pede permissão, gerencia subscription do dispositivo
// e sincroniza com o backend via JWT Bearer.
//
// Diferenças vs impgeo (que usa cookies httpOnly):
//   - Alya não tem cookie de sessão — autenticação é só JWT em localStorage.
//   - Cada request manda `Authorization: Bearer <token>` explicitamente.
//   - O SW guarda o token em memória (postAuthTokenToSW) pra
//     pushsubscriptionchange conseguir re-subscrever sem login do usuário.
//
// O Service Worker é responsabilidade de registerSW.ts — este módulo assume
// que ele já está registrado (chama navigator.serviceWorker.ready).

import { postAuthTokenToSW } from './registerSW'

export type PermissionState =
  | 'unsupported'              // browser não tem Push API ou Notification API
  | 'pwa-not-installed-ios'    // iOS Safari sem standalone — precisa instalar pra ativar
  | 'default'                  // user ainda não decidiu
  | 'granted'                  // user permitiu
  | 'denied'                   // user bloqueou (precisa ir nas configs do browser)

interface SubscribeOk { ok: true;  endpoint: string }
interface SubscribeErr { ok: false; error: string }
type SubscribeResult = SubscribeOk | SubscribeErr

interface UnsubscribeOk  { ok: true }
interface UnsubscribeErr { ok: false; error: string }
type UnsubscribeResult = UnsubscribeOk | UnsubscribeErr

const IS_IOS = typeof navigator !== 'undefined'
  && /iPad|iPhone|iPod/.test(navigator.userAgent)
  && !(window as unknown as { MSStream?: unknown }).MSStream

function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true
    // iOS Safari pré-16.4 usa navigator.standalone
    const nav = navigator as unknown as { standalone?: boolean }
    return nav.standalone === true
  } catch {
    return false
  }
}

export function isWebPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  if (!('serviceWorker' in navigator)) return false
  if (!('PushManager' in window)) return false
  if (typeof Notification === 'undefined') return false
  return true
}

export function getCurrentPermissionState(): PermissionState {
  if (!isWebPushSupported()) return 'unsupported'
  // iOS: Push API exige PWA instalada (16.4+). Sem standalone, o subscribe falha.
  if (IS_IOS && !isStandalonePwa()) return 'pwa-not-installed-ios'
  return Notification.permission as PermissionState
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Devolve instrução curta sobre como reativar a permissão quando 'denied'.
// Detecta browser pelo UA — UA sniffing é frágil, mas o pior caso é cair no
// texto genérico (que ainda funciona).
export function getDeniedHelpText(): string {
  if (typeof navigator === 'undefined') {
    return 'Reative em Configurações do site, no seu navegador.'
  }
  const ua = navigator.userAgent
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua)

  if (/Edg\//.test(ua)) {
    return 'Edge: clique no cadeado ao lado da URL → "Permissões" → ative Notificações.'
  }
  if (/Firefox\//.test(ua)) {
    return 'Firefox: clique no escudo/cadeado ao lado da URL → "Permissões" → permita Notificações.'
  }
  if (/Chrome\//.test(ua) && !/OPR\//.test(ua)) {
    if (isMobile) {
      return 'Chrome Android: toque nos 3 pontos no topo → "Configurações do site" → Notificações → Permitir.'
    }
    return 'Chrome: clique no cadeado ao lado da URL → "Notificações" → Permitir, e recarregue.'
  }
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) {
    if (/iPhone|iPad/.test(ua)) {
      return 'Safari iOS: abra Ajustes do iOS → Notificações → este app → ative "Permitir notificações".'
    }
    return 'Safari Mac: menu Safari → Configurações → Sites → Notificações → permita este site.'
  }
  return 'Reative permissão de notificações nas Configurações do site do seu navegador.'
}

// Pede permissão (UI gesture do user) e cria/atualiza a subscription no
// backend. Idempotente: chamar de novo quando já está ativo só renova o
// last_seen_at.
//
// Token é passado explicitamente — o caller (NotificationBell, EditarPerfilModal,
// PushPermissionBanner) tem acesso via useAuth().
export async function requestPermissionAndSubscribe(token: string | null): Promise<SubscribeResult> {
  if (!token) {
    return { ok: false, error: 'Você precisa estar logado para ativar notificações.' }
  }

  const state = getCurrentPermissionState()
  if (state === 'unsupported') return { ok: false, error: 'Navegador não suporta notificações push.' }
  if (state === 'pwa-not-installed-ios') {
    return { ok: false, error: 'Instale o app na tela inicial (Compartilhar → Adicionar à Tela de Início) para receber notificações.' }
  }
  if (state === 'denied') {
    return { ok: false, error: getDeniedHelpText() }
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return { ok: false, error: 'Permissão não concedida.' }
    }

    const reg = await navigator.serviceWorker.ready

    // Posta o token pro SW (pra pushsubscriptionchange depois). Idempotente.
    postAuthTokenToSW(token)

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }

    const vapidResp = await fetch('/api/push/vapid-public-key', { headers })
    if (!vapidResp.ok) {
      return { ok: false, error: `Falha ao buscar chave VAPID (HTTP ${vapidResp.status}).` }
    }
    const vapidJson = await vapidResp.json()
    if (!vapidJson.publicKey) {
      return { ok: false, error: 'Servidor não retornou chave VAPID — Web Push pode estar desabilitado.' }
    }

    // Reusa subscription existente do SW se houver; senão cria nova.
    let subscription = await reg.pushManager.getSubscription()
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast: TS 5 tipa Uint8Array com ArrayBufferLike genérico;
        // pushManager.subscribe quer ArrayBuffer estrito. Em runtime é o mesmo dado.
        applicationServerKey: urlBase64ToUint8Array(vapidJson.publicKey) as BufferSource,
      })
    }

    const subscribeResp = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64Url(subscription.getKey('p256dh')),
          auth:   arrayBufferToBase64Url(subscription.getKey('auth')),
        },
      }),
    })
    if (!subscribeResp.ok) {
      return { ok: false, error: `Falha ao registrar subscription (HTTP ${subscribeResp.status}).` }
    }

    return { ok: true, endpoint: subscription.endpoint }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

// Remove subscription deste dispositivo: backend (DELETE) + browser (unsubscribe).
// Não revoga a permissão — só desliga o envio. Reativar não exige novo prompt.
export async function unsubscribe(token: string | null): Promise<UnsubscribeResult> {
  try {
    if (!isWebPushSupported()) return { ok: true }
    const reg = await navigator.serviceWorker.ready
    const subscription = await reg.pushManager.getSubscription()
    if (!subscription) return { ok: true }

    if (token) {
      try {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
      } catch { /* segue desinscrevendo localmente */ }
    }

    await subscription.unsubscribe()
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

// Endpoint atualmente ativo neste dispositivo (ou null). Pra UI saber se
// mostra "Ativar" ou "Desativar".
export async function getActiveSubscriptionEndpoint(): Promise<string | null> {
  try {
    if (!isWebPushSupported()) return null
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return sub ? sub.endpoint : null
  } catch {
    return null
  }
}
