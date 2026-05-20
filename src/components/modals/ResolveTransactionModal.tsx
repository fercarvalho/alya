import React, { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Check, X as XIcon } from 'lucide-react'
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

const describeRuleActions = (c: RuleCandidate): string => {
  const parts = [
    c.actionValue     && `tipo: ${c.actionValue}`,
    c.setCategory     && `categoria: ${c.setCategory}`,
    c.setSubcategory  && `subcategoria: ${c.setSubcategory}`,
    c.hideTransaction && 'ocultar',
  ].filter(Boolean)
  return parts.length ? `Aplica ${parts.join(' · ')}` : 'Aplica esta regra'
}

interface Props {
  transactionId: string | null
  description?: string
  onClose: () => void
  onResolved?: () => void
}

const ResolveTransactionModal: React.FC<Props> = ({ transactionId, description, onClose, onResolved }) => {
  const { token } = useAuth()
  const [candidates, setCandidates] = useState<RuleCandidate[] | null>(null)
  const [loading, setLoading] = useState(false)

  const loadCandidates = useCallback(async (txId: string) => {
    if (!token) return
    setLoading(true)
    try {
      const r = await authedFetch(token, `${API_BASE_URL}/transactions/${txId}/candidates`)
      const j = await r.json()
      let list: RuleCandidate[] = (j.success ? j.data : []) || []
      if (list.length === 0) {
        const rr = await authedFetch(token, `${API_BASE_URL}/transaction-rules`)
        const jj = await rr.json()
        if (jj.success) list = (jj.data || []).filter((rule: { isActive: boolean }) => rule.isActive)
      }
      setCandidates(list)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!transactionId) { setCandidates(null); return }
    loadCandidates(transactionId)
  }, [transactionId, loadCandidates])

  useEffect(() => {
    if (!transactionId) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [transactionId, onClose])

  const resolve = async (ruleId: string | null) => {
    if (!transactionId) return
    setLoading(true)
    try {
      const r = await authedFetch(token, `${API_BASE_URL}/transactions/${transactionId}/resolve-confirmation`, {
        method: 'POST',
        body: JSON.stringify({ ruleId }),
      })
      const j = await r.json()
      if (!j.success) { alert(j.error || 'Falha ao resolver'); return }
      onResolved?.()
      onClose()
      window.dispatchEvent(new CustomEvent('alya:transactions-changed'))
    } finally {
      setLoading(false)
    }
  }

  if (!transactionId) return null

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Confirmar transação</h3>
            </div>
            {description && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">{description}</p>}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-lg" aria-label="Fechar">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {loading && <p className="text-sm text-gray-500 text-center py-4">Carregando...</p>}
          {!loading && candidates && candidates.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">Nenhuma regra candidata disponível.</p>
          )}
          {!loading && candidates && candidates.map((c) => (
            <button
              key={c.id}
              disabled={loading}
              onClick={() => resolve(c.id)}
              className="w-full text-left p-3 border-2 border-gray-200 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-colors disabled:opacity-50"
            >
              <p className="text-sm font-semibold">{c.name}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{describeRuleActions(c)}</p>
            </button>
          ))}
          <button
            disabled={loading}
            onClick={() => resolve(null)}
            className="w-full text-left p-3 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors disabled:opacity-50"
          >
            <p className="text-sm font-semibold flex items-center gap-2"><Check className="w-4 h-4 text-blue-600" /> Manter tipo original</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Não aplica nenhuma regra. Volta ao tipo original (Receita/Despesa).</p>
          </button>
        </div>
        <div className="flex justify-end px-6 py-3 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResolveTransactionModal
