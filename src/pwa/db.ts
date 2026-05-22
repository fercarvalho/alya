// Schema do IndexedDB do PWA — pré-definido mesmo sem uso no momento.
//
// Single-origin: 1 DB só (pwa-alya). Stores planejadas:
//
//   - 'cached-responses'  : key = url; value = { body, headers, cachedAt, etag }
//                           Reservada pra quando precisarmos passar dados do SW
//                           pro client além do Cache API (ex: timestamp pra UI
//                           mostrar "dados de hh:mm" em modo read-only offline).
//   - 'pending-mutations' : key = uuid; value = { method, url, body, headers,
//                           createdAt, retries, idempotencyKey }
//                           Vazia até virar full-sync offline (PR futuro).
//                           Quando rolar, basta empilhar mutações offline
//                           sem mexer no schema da DB.
//   - 'sync-state'        : key = scopeKey; value = { lastSyncedAt, cursor }
//                           Estado de sincronização por escopo. Vazia agora.
//
// nuke.ts apaga a DB inteira no logout.

const DB_NAME = 'pwa-alya'
const SCHEMA_VERSION = 1

const STORE_NAMES = ['cached-responses', 'pending-mutations', 'sync-state'] as const
export type StoreName = (typeof STORE_NAMES)[number]

export function openPwaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível neste ambiente'))
      return
    }
    const req = indexedDB.open(DB_NAME, SCHEMA_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const name of STORE_NAMES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name)
        }
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function deletePwaDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      resolve()
      return
    }
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => resolve() // outras abas abertas — deixa passar
  })
}

export const PWA_DB_NAME = DB_NAME
