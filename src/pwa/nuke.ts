// Limpa caches + IndexedDB do PWA no logout.
//
// Single-origin: apaga TUDO do alya. Mantém preferência de tema e
// consent banners (whitelist).
//
// Não desregistra o SW por padrão (ele continua útil pra próxima sessão e
// pra Web Push receber pushsubscriptionchange se subscription expirar).

import { deletePwaDb } from './db'

const STORAGE_KEEP_KEYS = new Set([
  'alya-theme-preference',
  'cookie-consent-accepted',
])

export interface NukeOptions {
  unregisterSW?: boolean
}

export async function nukePwaState(options: NukeOptions = {}): Promise<void> {
  if (typeof caches !== 'undefined') {
    try {
      const all = await caches.keys()
      // Apaga TODOS os caches do origin — alya é single-PWA, sem coexistência
      // com outros apps no mesmo browser que precisem ser preservados.
      await Promise.all(all.map((k) => caches.delete(k)))
    } catch (err) {
      console.warn('[pwa.nuke] falha ao limpar Cache API:', err)
    }
  }

  try {
    await deletePwaDb()
  } catch (err) {
    console.warn('[pwa.nuke] falha ao limpar IndexedDB:', err)
  }

  for (const storage of [sessionStorage, localStorage]) {
    try {
      const toRemove: string[] = []
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key && !STORAGE_KEEP_KEYS.has(key)) toRemove.push(key)
      }
      for (const k of toRemove) storage.removeItem(k)
    } catch {
      // storage bloqueado — ignora
    }
  }

  if (options.unregisterSW && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    } catch (err) {
      console.warn('[pwa.nuke] falha ao desregistrar SW:', err)
    }
  }
}
