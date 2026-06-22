import { useCallback, useEffect, useState } from 'react'
import {
  Boxes,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Link2,
  Unplug,
} from 'lucide-react'
import axios from 'axios'
import { API_BASE_URL } from '@/config/api'

interface BlingStatus {
  connected: boolean
  blingCompanyId?: string | null
  scopes?: string | null
  tokenExpiresAt?: string
  refreshExpiresAt?: string
  lastSyncReceivables?: string | null
  lastSyncPayables?: string | null
  lastSyncOrders?: string | null
  connectedAt?: string
}

function fmtDate(value?: string | null): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('pt-BR')
  } catch {
    return '—'
  }
}

const CALLBACK_REASONS: Record<string, string> = {
  denied: 'Você cancelou a autorização no Bling.',
  missing_params: 'Retorno inválido do Bling (parâmetros ausentes).',
  invalid_state: 'Sessão de autorização expirada ou inválida. Tente conectar novamente.',
  token_exchange_failed: 'Não foi possível obter os tokens do Bling.',
  server_error: 'Erro interno ao concluir a conexão.',
}

export default function BlingIntegration() {
  const [status, setStatus] = useState<BlingStatus>({ connected: false })
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const loadStatus = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/bling/status`)
      setStatus(data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg || 'Erro ao carregar status da integração')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  // Lê o resultado do callback OAuth (?bling=success|error&reason=...) e limpa a URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const result = params.get('bling')
    if (!result) return
    if (result === 'success') {
      showSuccess('Conta Bling conectada com sucesso!')
    } else if (result === 'error') {
      const reason = params.get('reason') || ''
      setError(CALLBACK_REASONS[reason] || 'Não foi possível concluir a conexão com o Bling.')
    }
    params.delete('bling')
    params.delete('reason')
    const qs = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''))
  }, [])

  // ── Conectar (inicia o fluxo OAuth) ─────────────────────────────────────────
  const handleConnect = async () => {
    setConnecting(true)
    setError(null)
    try {
      const { data } = await axios.get(`${API_BASE_URL}/bling/connect`)
      if (data?.authorizeUrl) {
        window.location.href = data.authorizeUrl
      } else {
        setError('Resposta inválida ao iniciar a conexão.')
        setConnecting(false)
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg || 'Erro ao iniciar a conexão com o Bling.')
      setConnecting(false)
    }
  }

  // ── Desconectar ──────────────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    if (!window.confirm('Desconectar a conta Bling?\nOs dados já importados serão mantidos.')) return
    setDisconnecting(true)
    setError(null)
    try {
      await axios.delete(`${API_BASE_URL}/bling/disconnect`)
      setStatus({ connected: false })
      showSuccess('Integração Bling desconectada.')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg || 'Erro ao desconectar')
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
          <Boxes className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Integração Bling</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ERP Bling — financeiro, pedidos, notas fiscais e cadastros
          </p>
        </div>
      </div>

      {/* Mensagens */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
        </div>
      ) : status.connected ? (
        /* ── Conectado ── */
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> Conectado
            </span>
          </div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Empresa (companyId)</dt>
              <dd className="text-sm font-bold text-gray-900 dark:text-white">{status.blingCompanyId || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Conectado em</dt>
              <dd className="text-sm font-bold text-gray-900 dark:text-white">{fmtDate(status.connectedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Token expira em</dt>
              <dd className="text-sm font-bold text-gray-900 dark:text-white">{fmtDate(status.tokenExpiresAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Autorização expira em</dt>
              <dd className="text-sm font-bold text-gray-900 dark:text-white">{fmtDate(status.refreshExpiresAt)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-gray-400">
            O token de acesso é renovado automaticamente. Reconecte se a autorização expirar.
          </p>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
            Desconectar
          </button>
        </div>
      ) : (
        /* ── Não conectado ── */
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Conectar ao Bling</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Você será redirecionado ao Bling para autorizar o acesso. Após autorizar, voltará
            automaticamente para o Alya.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:shadow-xl disabled:opacity-50"
          >
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            {connecting ? 'Redirecionando…' : 'Conectar ao Bling'}
          </button>
        </div>
      )}
    </div>
  )
}
