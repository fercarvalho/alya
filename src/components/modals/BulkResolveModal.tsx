import React, { useCallback, useEffect, useState } from 'react'
import { X, Check, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { authedFetch } from '../../utils/authedFetch'

const API_BASE_URL = '/api'

interface RuleCandidate {
  id: string
  name: string
  actionValue: string | null
  setCategory: string | null
  setSubcategory: string | null
  hideTransaction?: boolean
}

interface PendingTransaction {
  id: string
  date: string
  description: string
  value: number | string
  originalType: string | null
  originalCategory: string | null
  candidates: RuleCandidate[]
}

const describeRuleActions = (c: RuleCandidate): string => {
  const parts = [
    c.actionValue     && `tipo: ${c.actionValue}`,
    c.setCategory     && `cat: ${c.setCategory}`,
    c.setSubcategory  && `subcat: ${c.setSubcategory}`,
    c.hideTransaction && 'ocultar',
  ].filter(Boolean)
  return parts.join(' · ')
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onResolved?: (count: number) => void
}

const BulkResolveModal: React.FC<Props> = ({ isOpen, onClose, onResolved }) => {
  const { token, user } = useAuth()
  const [items, setItems] = useState<PendingTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [decisions, setDecisions] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const r = await authedFetch(token, `${API_BASE_URL}/transactions/pending`)
      const j = await r.json()
      if (j.success) {
        const data: PendingTransaction[] = j.data || []
        setItems(data)
        const defaults: Record<string, string> = {}
        for (const t of data) defaults[t.id] = t.candidates[0]?.id || '__keep__'
        setDecisions(defaults)
      }
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!isOpen) return
    load()
  }, [isOpen, load])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const validCount = items.filter((t) => decisions[t.id] && decisions[t.id] !== '').length

  const submit = async () => {
    setSubmitting(true)
    try {
      const resolutions = items
        .filter((t) => decisions[t.id] && decisions[t.id] !== '')
        .map((t) => ({
          transactionId: t.id,
          ruleId: decisions[t.id] === '__keep__' ? null : decisions[t.id],
        }))
      if (resolutions.length === 0) { onClose(); return }
      const r = await authedFetch(token, `${API_BASE_URL}/transactions/resolve-confirmation-bulk`, {
        method: 'POST',
        body: JSON.stringify({ resolutions }),
      })
      const j = await r.json()
      if (!j.success) { alert(j.error || 'Falha na resolução em lote'); return }
      onResolved?.(j.resolved || 0)
      window.dispatchEvent(new CustomEvent('alya:transactions-changed'))
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const setAll = (mode: 'first' | 'keep' | 'skip') => {
    const next: Record<string, string> = {}
    for (const t of items) {
      if (mode === 'first') next[t.id] = t.candidates[0]?.id || '__keep__'
      else if (mode === 'keep') next[t.id] = '__keep__'
      else next[t.id] = ''
    }
    setDecisions(next)
  }

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Confirmar transações pendentes</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">{items.length} transação(ões) aguardam classificação</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        {items.length > 0 && (
          <div className="px-6 py-2 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-gray-800/50">
            <span className="text-xs text-gray-600 dark:text-gray-400">Aplicar a todas:</span>
            <button onClick={() => setAll('first')} className="text-xs px-2 py-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-200 rounded font-semibold">
              1ª regra candidata
            </button>
            <button onClick={() => setAll('keep')} className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded font-semibold">
              Manter original
            </button>
            <button onClick={() => setAll('skip')} className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded font-semibold">
              Pular (resolver depois)
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {loading && <p className="text-sm text-gray-500 text-center py-8">Carregando...</p>}
          {!loading && items.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="font-semibold">Nenhuma transação pendente</p>
              <p className="text-xs mt-1">Todas as transações já estão classificadas.</p>
            </div>
          )}
          {!loading && items.map((t) => {
            const decision = decisions[t.id] || ''
            return (
              <div key={t.id} className="flex flex-col md:flex-row md:items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-xl mb-2 bg-white dark:bg-gray-800">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate" title={t.description}>{t.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(t.date).toLocaleDateString('pt-BR')} · R$ {Number(t.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    {t.originalType && <> · Original: {t.originalType}</>}
                  </p>
                </div>
                <select
                  value={decision}
                  onChange={(e) => setDecisions((d) => ({ ...d, [t.id]: e.target.value }))}
                  className="w-full md:w-80 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="">— Pular (resolver depois) —</option>
                  {t.candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({describeRuleActions(c)})
                    </option>
                  ))}
                  <option value="__keep__">Manter tipo original</option>
                </select>
              </div>
            )
          })}
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 dark:border-gray-700 gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {validCount} de {items.length} prontas para confirmar
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              Cancelar
            </button>
            <button
              onClick={submit}
              disabled={submitting || validCount === 0}
              className="px-5 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded-lg shadow-sm"
            >
              {submitting ? 'Confirmando...' : `Confirmar ${validCount} transação(ões)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BulkResolveModal
