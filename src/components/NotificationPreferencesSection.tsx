// Grid de preferências de notificação (tipo × canal) reutilizável.
//
// Carrega via GET /api/notification-preferences, renderiza tabela tipo ×
// {push, email}, e salva cada toggle individualmente (otimista + reverte
// em erro). Os defaults do servidor já vêm com flag isDefault — sem
// precisar de mapa local.
//
// O tipo especial '_meta:foreground' aparece em uma linha separada (só
// coluna push) — controla se OS-notif aparece quando o app está visível.
//
// Paleta: amber/orange seguindo o design system do Alya.
//   - Toggles ON em amber-500 (assinatura).
//   - CTA "Ativar push" em gradiente amber→orange (botão primário).
//   - Badges de estado seguem cores semânticas (green/red/yellow).

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, BellRing, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { authedFetch } from '../utils/authedFetch'
import {
  isWebPushSupported,
  getCurrentPermissionState,
  requestPermissionAndSubscribe,
  unsubscribe as unsubscribePush,
  getActiveSubscriptionEndpoint,
  getDeniedHelpText,
  type PermissionState,
} from '../pwa/push'

type Channel = 'push' | 'email'

interface Preference {
  notificationType: string
  channel: Channel
  enabled: boolean
  isDefault: boolean
}

// Labels pt-BR pros tipos do Alya. Tipos desconhecidos caem no fallback
// que mostra o type literal.
const TYPE_LABELS: Record<string, { title: string; description?: string }> = {
  transaction_confirm_needed: {
    title: 'Transação pendente de confirmação',
    description: 'Quando uma transação dá match em mais de uma regra automática e precisa decisão.',
  },
}

function labelFor(type: string): { title: string; description?: string } {
  return TYPE_LABELS[type] || { title: type }
}

const NotificationPreferencesSection: React.FC = () => {
  const { token } = useAuth()
  const [prefs, setPrefs] = useState<Preference[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [permission, setPermission] = useState<PermissionState>('unsupported')
  const [subscribed, setSubscribed] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushMessage, setPushMessage] = useState<string | null>(null)

  const refreshPush = useCallback(async () => {
    const p = getCurrentPermissionState()
    setPermission(p)
    if (p === 'granted') {
      const ep = await getActiveSubscriptionEndpoint()
      setSubscribed(!!ep)
    } else {
      setSubscribed(false)
    }
  }, [])

  const loadPrefs = useCallback(async () => {
    if (!token) return
    setLoading(true); setError(null)
    try {
      const r = await authedFetch(token, '/api/notification-preferences')
      const j = await r.json()
      if (!r.ok || !j.success) throw new Error(j.error || `HTTP ${r.status}`)
      setPrefs(j.data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadPrefs(); refreshPush() }, [loadPrefs, refreshPush])

  const togglePref = async (type: string, channel: Channel, nextValue: boolean) => {
    if (!token) return
    const key = `${type}:${channel}`
    setSavingKey(key)
    const prev = prefs
    // Otimista: aplica local, reverte se falhar
    setPrefs((arr) => arr.map((p) =>
      p.notificationType === type && p.channel === channel
        ? { ...p, enabled: nextValue, isDefault: false }
        : p
    ))
    try {
      const r = await authedFetch(token, '/api/notification-preferences', {
        method: 'PUT',
        body: JSON.stringify({ notification_type: type, channel, enabled: nextValue }),
      })
      const j = await r.json()
      if (!r.ok || !j.success) throw new Error(j.error || `HTTP ${r.status}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPrefs(prev) // revert
    } finally {
      setSavingKey(null)
    }
  }

  // Quebra prefs por tipo, separando '_meta:*' (entram em seção própria).
  const { regularTypes, foregroundEnabled } = useMemo(() => {
    const byType = new Map<string, { push?: Preference; email?: Preference }>()
    let foregroundEnabled: boolean | null = null
    for (const p of prefs) {
      if (p.notificationType === '_meta:foreground') {
        if (p.channel === 'push') foregroundEnabled = p.enabled
        continue
      }
      if (!byType.has(p.notificationType)) byType.set(p.notificationType, {})
      const entry = byType.get(p.notificationType)!
      entry[p.channel] = p
    }
    return {
      regularTypes: Array.from(byType.entries()),
      foregroundEnabled,
    }
  }, [prefs])

  const handleEnablePush = async () => {
    if (pushBusy) return
    setPushBusy(true); setPushMessage(null)
    const r = await requestPermissionAndSubscribe(token)
    setPushMessage(r.ok ? 'Notificações ativadas neste dispositivo.' : r.error)
    await refreshPush()
    setPushBusy(false)
  }
  const handleDisablePush = async () => {
    if (pushBusy) return
    setPushBusy(true); setPushMessage(null)
    const r = await unsubscribePush(token)
    setPushMessage(r.ok ? 'Notificações desativadas neste dispositivo.' : r.error)
    await refreshPush()
    setPushBusy(false)
  }

  const permissionBadge = () => {
    const base = 'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold'
    if (permission === 'granted' && subscribed)
      return <span className={`${base} bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300`}>Ativado neste dispositivo</span>
    if (permission === 'granted' && !subscribed)
      return <span className={`${base} bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300`}>Permitido, mas sem subscription</span>
    if (permission === 'default')
      return <span className={`${base} bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300`}>Pendente — ative abaixo</span>
    if (permission === 'denied')
      return <span className={`${base} bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300`}>Bloqueado pelo navegador</span>
    if (permission === 'pwa-not-installed-ios')
      return <span className={`${base} bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300`}>Instale o app na tela inicial</span>
    return <span className={`${base} bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400`}>Não suportado</span>
  }

  // Toggle visual com paleta amber (assinatura Alya).
  const cell = (pref: Preference | undefined, type: string, channel: Channel) => {
    const key = `${type}:${channel}`
    const enabled = pref ? pref.enabled : false
    const saving = savingKey === key
    return (
      <button
        type="button"
        onClick={() => togglePref(type, channel, !enabled)}
        disabled={saving}
        aria-pressed={enabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
        } ${saving ? 'opacity-60 cursor-wait' : ''}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    )
  }

  return (
    <section className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Notificações</h3>
        </div>
        {permissionBadge()}
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-400">
        Escolha como quer ser avisado para cada tipo de evento. As preferências de <strong>push</strong> e
        <strong> e-mail</strong> são independentes — você pode receber só uma das duas.
      </p>

      {/* CTA ativar/desativar push neste dispositivo (espelha o sino) */}
      {isWebPushSupported() && permission !== 'unsupported' && (
        <div className="flex flex-wrap items-center gap-2">
          {permission === 'default' && (
            <button type="button" onClick={handleEnablePush} disabled={pushBusy}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg font-semibold shadow-sm disabled:opacity-60">
              {pushBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <BellRing className="w-3 h-3" />}
              Ativar push neste dispositivo
            </button>
          )}
          {permission === 'granted' && !subscribed && (
            <button type="button" onClick={handleEnablePush} disabled={pushBusy}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg font-semibold shadow-sm disabled:opacity-60">
              {pushBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <BellRing className="w-3 h-3" />}
              Reativar push neste dispositivo
            </button>
          )}
          {permission === 'granted' && subscribed && (
            <button type="button" onClick={handleDisablePush} disabled={pushBusy}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold disabled:opacity-60">
              {pushBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
              Desativar push neste dispositivo
            </button>
          )}
          {permission === 'denied' && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Push bloqueado. {getDeniedHelpText()}
            </p>
          )}
          {permission === 'pwa-not-installed-ios' && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Para receber notificações no iPhone, instale o app: <strong>Compartilhar → Adicionar à Tela de Início</strong>.
            </p>
          )}
          {pushMessage && (
            <span className="text-xs text-gray-600 dark:text-gray-400">{pushMessage}</span>
          )}
        </div>
      )}

      {error && (
        <div className="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-2 py-1">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Loader2 className="w-3 h-3 animate-spin" /> Carregando preferências…
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-amber-50 dark:bg-amber-900/20">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Evento</th>
                <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 w-20 text-center">Push</th>
                <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 w-20 text-center">E-mail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {regularTypes.map(([type, channels]) => {
                const lbl = labelFor(type)
                return (
                  <tr key={type} className="bg-white dark:bg-gray-900/30">
                    <td className="px-3 py-2 align-top">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{lbl.title}</p>
                      {lbl.description && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{lbl.description}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">{cell(channels.push, type, 'push')}</td>
                    <td className="px-3 py-2 text-center">{cell(channels.email, type, 'email')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Toggle especial: foreground show */}
          <div className="bg-amber-50/50 dark:bg-amber-900/10 px-3 py-2 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Mostrar mesmo com o app aberto</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Por padrão, só atualiza o sino. Ative pra ver notificação do sistema enquanto o app estiver visível.
              </p>
            </div>
            <button
              type="button"
              onClick={() => togglePref('_meta:foreground', 'push', !(foregroundEnabled ?? false))}
              disabled={savingKey === '_meta:foreground:push'}
              aria-pressed={!!foregroundEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                foregroundEnabled ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
              } ${savingKey === '_meta:foreground:push' ? 'opacity-60 cursor-wait' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  foregroundEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export default NotificationPreferencesSection
