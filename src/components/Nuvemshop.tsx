import React, { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import axios from 'axios'
import { API_BASE_URL } from '../config/api'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface NuvemshopStatus {
  connected: boolean
  storeName?: string
  storeUrl?: string
  storeId?: string
  webhooksActive?: boolean
  lastSyncOrders?: string | null
  lastSyncProducts?: string | null
  lastSyncCustomers?: string | null
  connectedAt?: string
}

interface DashboardMetrics {
  orderCount: number
  totalRevenue: number
  avgTicket: number
  totalWithdrawals: number
  pendingBalance: number
  syncedProductCount: number
  recentOrders: RecentOrder[]
}

interface RecentOrder {
  id: string
  date: string
  description: string
  value: number
  nuvemshopId: string
}

interface SyncResult {
  imported?: number
  updated?: number
  skipped?: number
  errors?: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Componente principal ─────────────────────────────────────────────────────

const NuvemshopIntegration: React.FC = () => {
  const [status, setStatus] = useState<NuvemshopStatus | null>(null)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncing, setSyncing] = useState<'orders' | 'products' | 'customers' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Formulário de conexão
  const [accessToken, setAccessToken] = useState('')
  const [storeId, setStoreId] = useState('')

  // Saque modal
  const [showWithdrawalInfo, setShowWithdrawalInfo] = useState(false)

  // Pedidos: expandir/recolher
  const [showOrders, setShowOrders] = useState(false)

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const loadStatus = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/nuvemshop/status`)
      setStatus(data)
      if (data.connected) {
        const { data: m } = await axios.get(`${API_BASE_URL}/nuvemshop/dashboard`)
        setMetrics(m)
      }
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

  // ── Conectar ────────────────────────────────────────────────────────────────
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken.trim() || !storeId.trim()) {
      setError('Preencha o Access Token e o Store ID')
      return
    }
    setConnecting(true)
    setError(null)
    try {
      await axios.post(`${API_BASE_URL}/nuvemshop/connect`, {
        accessToken: accessToken.trim(),
        storeId: storeId.trim(),
      })
      setAccessToken('')
      setStoreId('')
      showSuccess('Loja conectada com sucesso!')
      await loadStatus()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg || 'Erro ao conectar. Verifique o token e o Store ID.')
    } finally {
      setConnecting(false)
    }
  }

  // ── Desconectar ─────────────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar a loja Nuvemshop?\nO histórico de pedidos importados será mantido.')) return
    setDisconnecting(true)
    setError(null)
    try {
      await axios.delete(`${API_BASE_URL}/nuvemshop/disconnect`)
      setStatus({ connected: false })
      setMetrics(null)
      showSuccess('Integração desconectada.')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg || 'Erro ao desconectar')
    } finally {
      setDisconnecting(false)
    }
  }

  // ── Sincronizar ─────────────────────────────────────────────────────────────
  const handleSync = async (type: 'orders' | 'products' | 'customers') => {
    setSyncing(type)
    setError(null)
    try {
      const { data }: { data: SyncResult } = await axios.post(`${API_BASE_URL}/nuvemshop/sync/${type}`)
      const labels: Record<string, string> = { orders: 'pedidos', products: 'produtos', customers: 'clientes' }
      showSuccess(
        `Sincronização de ${labels[type]} concluída! ` +
        `${data.imported ?? 0} importados, ${data.updated ?? 0} atualizados, ${data.errors ?? 0} erros.`
      )
      await loadStatus()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg || `Erro ao sincronizar ${type}`)
    } finally {
      setSyncing(null)
    }
  }

  // ── Renderização ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-500">Carregando integração...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShoppingBag className="w-7 h-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuvemshop</h1>
          <p className="text-sm text-gray-500">Integração com sua loja virtual</p>
        </div>
      </div>

      {/* Mensagens de feedback */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{successMsg}</span>
        </div>
      )}

      {/* ── Formulário de conexão (quando desconectado) ── */}
      {!status?.connected && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Conectar loja</h2>
          <p className="text-sm text-gray-500 mb-4">
            Insira as credenciais da sua loja Nuvemshop para começar a sincronizar pedidos, produtos e clientes.
          </p>

          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Access Token
              </label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Seu access token da Nuvemshop"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Store ID
              </label>
              <input
                type="text"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                placeholder="Ex: 123456"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Encontre o Store ID no painel da Nuvemshop em{' '}
                <span className="font-medium">Minha conta → Informações da loja</span>.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={connecting}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connecting && <Loader2 className="w-4 h-4 animate-spin" />}
                {connecting ? 'Conectando...' : 'Conectar loja'}
              </button>
              <a
                href="https://dev.nuvemshop.com.br/docs/developer-tools/nuvemshop-api"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Como obter as credenciais?
              </a>
            </div>
          </form>
        </div>
      )}

      {/* ── Status da integração (quando conectado) ── */}
      {status?.connected && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <div>
                  <h2 className="text-base font-semibold text-gray-800">{status.storeName}</h2>
                  {status.storeUrl && (
                    <a
                      href={`https://${status.storeUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                    >
                      {status.storeUrl} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                {disconnecting && <Loader2 className="w-3 h-3 animate-spin" />}
                Desconectar
              </button>
            </div>

            {/* Webhooks */}
            <div className="flex items-center gap-2 text-sm mb-4">
              <span className="text-gray-500">Webhooks:</span>
              {status.webhooksActive
                ? <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" /> Ativos (tempo real)</span>
                : <span className="flex items-center gap-1 text-amber-500"><AlertCircle className="w-4 h-4" /> Não configurados (apenas sync manual)</span>
              }
            </div>

            {/* Últimas sincronizações */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-500 border-t pt-4">
              <div>
                <span className="font-medium text-gray-700 block mb-0.5">Última sync de pedidos</span>
                {formatDate(status.lastSyncOrders)}
              </div>
              <div>
                <span className="font-medium text-gray-700 block mb-0.5">Última sync de produtos</span>
                {formatDate(status.lastSyncProducts)}
              </div>
              <div>
                <span className="font-medium text-gray-700 block mb-0.5">Última sync de clientes</span>
                {formatDate(status.lastSyncCustomers)}
              </div>
            </div>

            {/* Botões de sync manual */}
            <div className="flex flex-wrap gap-2 mt-4">
              {(
                [
                  { type: 'orders', label: 'Sincronizar Pedidos', icon: ShoppingCart },
                  { type: 'products', label: 'Sincronizar Produtos', icon: ShoppingBag },
                  { type: 'customers', label: 'Sincronizar Clientes', icon: Users },
                ] as const
              ).map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => handleSync(type)}
                  disabled={syncing !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncing === type
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <RefreshCw className="w-4 h-4 text-gray-500" />
                  }
                  {syncing === type ? 'Sincronizando...' : label}
                  {syncing !== type && <Icon className="w-3.5 h-3.5 text-gray-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* ── Dashboard E-commerce ── */}
          {metrics && (
            <>
              {/* Cards de métricas */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  icon={<TrendingUp className="w-5 h-5 text-green-600" />}
                  label="Faturamento do mês"
                  value={formatCurrency(metrics.totalRevenue)}
                  bg="bg-green-50"
                />
                <MetricCard
                  icon={<ShoppingCart className="w-5 h-5 text-blue-600" />}
                  label="Pedidos importados"
                  value={String(metrics.orderCount)}
                  bg="bg-blue-50"
                />
                <MetricCard
                  icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
                  label="Ticket médio"
                  value={formatCurrency(metrics.avgTicket)}
                  bg="bg-purple-50"
                />
                <MetricCard
                  icon={<ShoppingBag className="w-5 h-5 text-amber-600" />}
                  label="Produtos sincronizados"
                  value={String(metrics.syncedProductCount)}
                  bg="bg-amber-50"
                />
              </div>

              {/* Card de saldo / saques */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-800">Saldo na Nuvemshop</h3>
                  </div>
                  <button
                    onClick={() => setShowWithdrawalInfo(!showWithdrawalInfo)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showWithdrawalInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Receitas Nuvemshop</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(metrics.totalRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Saques registrados</p>
                    <p className="text-lg font-bold text-red-500">{formatCurrency(metrics.totalWithdrawals)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Saldo pendente</p>
                    <p className={`text-lg font-bold ${metrics.pendingBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatCurrency(metrics.pendingBalance)}
                    </p>
                  </div>
                </div>

                {showWithdrawalInfo && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                    <p className="mb-2">
                      A API da Nuvemshop não fornece os saques diretamente. Para registrar um saque
                      (retirada do saldo), vá em <strong>Transações</strong> e crie uma nova despesa com
                      categoria <strong>"Saque Nuvemshop"</strong> — o valor aparecerá aqui automaticamente.
                    </p>
                    <a
                      href="#"
                      className="text-blue-600 hover:underline text-xs"
                      onClick={(e) => {
                        e.preventDefault()
                        // Sinaliza para o App.tsx navegar para Transações
                        window.dispatchEvent(new CustomEvent('alya:navigate', { detail: { tab: 'transactions' } }))
                      }}
                    >
                      → Ir para Transações
                    </a>
                  </div>
                )}
              </div>

              {/* Últimos pedidos */}
              {metrics.recentOrders.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setShowOrders(!showOrders)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50"
                  >
                    <h3 className="font-semibold text-gray-800">
                      Últimos pedidos importados ({metrics.recentOrders.length})
                    </h3>
                    {showOrders ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showOrders && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                          <tr>
                            <th className="px-5 py-2 text-left">Descrição</th>
                            <th className="px-5 py-2 text-left">Data</th>
                            <th className="px-5 py-2 text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {metrics.recentOrders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50">
                              <td className="px-5 py-2 text-gray-700">{order.description}</td>
                              <td className="px-5 py-2 text-gray-500">
                                {order.date ? new Date(order.date).toLocaleDateString('pt-BR') : '—'}
                              </td>
                              <td className="px-5 py-2 text-right font-medium text-green-600">
                                {formatCurrency(order.value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

// ─── Sub-componente: card de métrica ──────────────────────────────────────────

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  bg: string
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, bg }) => (
  <div className={`${bg} rounded-xl p-4 flex items-start gap-3`}>
    <div className="mt-0.5">{icon}</div>
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
)

export default NuvemshopIntegration
