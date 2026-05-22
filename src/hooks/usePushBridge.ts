// Bridge entre Service Worker e componentes React.
//
// O SW envia postMessage({ type: 'push-notification', payload }) sempre que
// recebe um push — INDEPENDENTE de mostrar OS-notification ou não. Esse
// hook captura essas mensagens e dispara um callback do componente, o que
// permite atualizar UI (sino, badge) imediatamente, sem esperar o próximo
// polling de 30s.
//
// Também captura 'push-notification-click' (quando o user clica numa
// OS-notif e o SW foca um cliente já aberto), pra UI navegar/abrir modal
// apropriado.
//
// Sem efeito se o browser não tem serviceWorker (ex: SSR).

import { useEffect, useRef } from 'react'

interface PushBridgePayload {
  id?: string
  title?: string
  message?: string
  type?: string
  related_entity_type?: string | null
  related_entity_id?: string | null
  foreground_show?: boolean
  ts?: number
}

interface UsePushBridgeOptions {
  /** Disparado a cada push recebido pelo SW (mesmo OS-notif suprimida). */
  onPush?: (payload: PushBridgePayload) => void
  /** Disparado quando o user clica numa OS-notification deste app. */
  onClick?: (payload: PushBridgePayload, url?: string) => void
}

export function usePushBridge(options: UsePushBridgeOptions = {}): void {
  // Refs evitam re-attach do listener a cada render.
  const optsRef = useRef(options)
  optsRef.current = options

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    const handler = (event: MessageEvent) => {
      const data = event.data
      if (!data || typeof data !== 'object') return
      const payload = (data.payload || {}) as PushBridgePayload

      if (data.type === 'push-notification' && optsRef.current.onPush) {
        optsRef.current.onPush(payload)
      } else if (data.type === 'push-notification-click' && optsRef.current.onClick) {
        optsRef.current.onClick(payload, data.url as string | undefined)
      }
    }

    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [])
}
