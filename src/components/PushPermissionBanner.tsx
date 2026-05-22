// Banner discreto convidando o user a ativar Web Push neste dispositivo.
//
// Paleta amber/orange seguindo o design system do Alya:
//   - Fundo gradient amber-50 → orange-50 (combina com header do app).
//   - CTA "Ativar" em gradient amber-500 → orange-500 (assinatura).
//   - Borda amber-200, sombra suave.
//
// Visível APENAS quando o user PODE ativar (e ainda não ativou):
//   - permission='default'                  → CTA "Ativar notificações"
//   - permission='granted' && !subscribed   → CTA "Reativar push"
//                                              (caso raro: user revogou via OS)
//   - 'pwa-not-installed-ios'               → mensagem orientando install
//
// ESCONDIDO quando: subscribed | denied | unsupported.
//
// Dispensável: "X" persiste timestamp em localStorage; banner some por 7 dias.
//
// Reativa quando o user troca de estado (ex: instalou o PWA no iOS).

import React, { useCallback, useEffect, useState } from 'react'
import { Bell, X, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  isWebPushSupported,
  getCurrentPermissionState,
  requestPermissionAndSubscribe,
  getActiveSubscriptionEndpoint,
  type PermissionState,
} from '../pwa/push'

const DISMISS_KEY = 'alya-push-banner-dismissed-at'
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 dias

function wasRecentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const at = parseInt(raw, 10)
    if (!at || Number.isNaN(at)) return false
    return Date.now() - at < DISMISS_TTL_MS
  } catch {
    return false
  }
}

function markDismissed(): void {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* ignore */ }
}

function clearDismissed(): void {
  try { localStorage.removeItem(DISMISS_KEY) } catch { /* ignore */ }
}

const PushPermissionBanner: React.FC = () => {
  const { token } = useAuth()
  const [permission, setPermission] = useState<PermissionState>('unsupported')
  const [subscribed, setSubscribed] = useState(false)
  const [dismissed, setDismissed] = useState<boolean>(() => wasRecentlyDismissed())
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const evaluate = useCallback(async () => {
    if (!isWebPushSupported()) {
      setPermission('unsupported')
      setSubscribed(false)
      return
    }
    const p = getCurrentPermissionState()
    setPermission(p)
    if (p === 'granted') {
      const ep = await getActiveSubscriptionEndpoint()
      setSubscribed(!!ep)
    } else {
      setSubscribed(false)
    }
  }, [])

  useEffect(() => { evaluate() }, [evaluate])

  // Reavalia ao voltar foco (user pode ter instalado PWA, aceitado permissão
  // por outra rota, mudado config no OS, etc.).
  useEffect(() => {
    const onFocus = () => evaluate()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [evaluate])

  const handleActivate = async () => {
    if (busy) return
    setBusy(true); setErrorMsg(null)
    const r = await requestPermissionAndSubscribe(token)
    if (r.ok) {
      clearDismissed()
      setDismissed(false)
      await evaluate()
    } else {
      setErrorMsg(r.error)
      await evaluate()
    }
    setBusy(false)
  }

  const handleDismiss = () => {
    markDismissed()
    setDismissed(true)
  }

  // Decisão de exibição.
  if (dismissed) return null
  if (!isWebPushSupported() || permission === 'unsupported') return null
  if (permission === 'denied') return null
  if (permission === 'granted' && subscribed) return null
  // Aqui: 'default' OU ('granted' && !subscribed) OU 'pwa-not-installed-ios'

  const isIosNotInstalled = permission === 'pwa-not-installed-ios'

  return (
    <div
      role="region"
      aria-label="Ativar notificações no navegador"
      className="bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-900/30 dark:via-orange-900/30 dark:to-yellow-900/30 border border-amber-200 dark:border-amber-800/50 rounded-xl shadow-sm"
    >
      <div className="px-4 py-2.5 flex items-center gap-3">
        <Bell className="w-5 h-5 text-amber-600 dark:text-amber-300 flex-shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          {isIosNotInstalled ? (
            <p className="text-sm text-gray-800 dark:text-gray-200">
              <strong>Receba notificações no iPhone:</strong> toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong> para instalar o app.
            </p>
          ) : (
            <p className="text-sm text-gray-800 dark:text-gray-200">
              <strong>Ative as notificações</strong> para receber avisos importantes no seu dispositivo, mesmo com o app fechado.
            </p>
          )}
          {errorMsg && (
            <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{errorMsg}</p>
          )}
        </div>

        {!isIosNotInstalled && (
          <button
            type="button"
            onClick={handleActivate}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg font-semibold shadow-sm disabled:opacity-60 disabled:cursor-wait whitespace-nowrap transition-all duration-200"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Bell className="w-4 h-4" aria-hidden="true" />}
            {busy ? 'Ativando…' : 'Ativar notificações'}
          </button>
        )}

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dispensar este aviso por 7 dias"
          title="Agora não (volta em 7 dias)"
          className="flex-shrink-0 p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-white/40 dark:hover:bg-white/5 rounded transition-colors"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export default PushPermissionBanner
