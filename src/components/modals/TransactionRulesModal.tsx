import React, { useCallback, useEffect, useState } from 'react'
import { X, Plus, Edit, Trash2, ToggleLeft, ToggleRight, ArrowRight, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { authedFetch } from '../../utils/authedFetch'
import { CATEGORIES_BY_TYPE } from '@/config/categorias'

const API_BASE_URL = '/api'

type RuleActionType = 'change_type'

interface TransactionRule {
  id: string
  name: string
  descriptionContains: string
  actionType: RuleActionType
  actionValue: string | null
  setCategory: string | null
  setSubcategory: string | null
  hideTransaction: boolean
  minValue: number | string | null
  maxValue: number | string | null
  matchType: string | null
  isActive: boolean
  sortOrder: number
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

interface RulePermissions {
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  isAdminBypass?: boolean
}

interface RetroactivePreviewTx {
  id: string
  date: string
  description: string
  value: number | string
  type: string
  category: string
  originalType?: string | null
  appliedRuleId: string | null
  existingRuleId: string | null
  existingRuleName: string | null
}

interface DeleteAffectedTx { id: string }

interface Props {
  isOpen: boolean
  onClose: () => void
  onRulesChanged?: () => void
}

const VALID_ACTION_VALUES = ['Receita', 'Despesa', 'Reforço de caixa', 'Retirada de caixa', 'Transferência entre contas']

interface FormState {
  name: string
  descriptionContains: string
  applyType: boolean
  applyCategory: boolean
  applySubcategory: boolean
  applyHide: boolean
  actionValue: string
  setCategory: string
  setSubcategory: string
  minValue: string
  maxValue: string
  matchType: string
  isActive: boolean
}

const emptyForm: FormState = {
  name: '', descriptionContains: '',
  applyType: true, applyCategory: false, applySubcategory: false, applyHide: false,
  actionValue: 'Transferência entre contas', setCategory: '', setSubcategory: '',
  minValue: '', maxValue: '', matchType: '',
  isActive: true,
}

const TransactionRulesModal: React.FC<Props> = ({ isOpen, onClose, onRulesChanged }) => {
  const { token, user } = useAuth()
  const [rules, setRules] = useState<TransactionRule[]>([])
  const [perms, setPerms] = useState<RulePermissions>({ canCreate: false, canEdit: false, canDelete: false })
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'list' | 'edit'>('list')
  const [editing, setEditing] = useState<TransactionRule | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const [retroPreview, setRetroPreview] = useState<{ ruleId: string; matches: RetroactivePreviewTx[]; excluded: Set<string>; orphans: RetroactivePreviewTx[]; orphansToRevert: Set<string> } | null>(null)
  const [deletePrompt, setDeletePrompt] = useState<{ rule: TransactionRule; affected: DeleteAffectedTx[] } | null>(null)
  // Catálogo de subcategorias (fonte única). Alimenta o <select> de "Subcategorizar como".
  const [availableSubcategories, setAvailableSubcategories] = useState<string[]>([])

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const r = await authedFetch(token, `${API_BASE_URL}/transaction-rules`)
      const j = await r.json()
      if (j.success) {
        setRules(j.data || [])
        if (j.permissions) setPerms(j.permissions)
      }
    } finally { setLoading(false) }
  }, [token])

  useEffect(() => { if (isOpen) refresh() }, [isOpen, refresh])

  // Carrega o catálogo de subcategorias ao abrir (mesma fonte do modal de
  // Gerenciar e do modal de transação).
  useEffect(() => {
    if (!isOpen) return
    authedFetch(token, `${API_BASE_URL}/subcategories`)
      .then((r) => r.json())
      .then((j) => { if (j.success && Array.isArray(j.data)) setAvailableSubcategories(j.data) })
      .catch(() => {})
  }, [isOpen, token])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (retroPreview) { setRetroPreview(null); return }
      if (deletePrompt) { setDeletePrompt(null); return }
      if (view === 'edit') { setView('list'); setEditing(null); setErrors({}); return }
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, retroPreview, deletePrompt, view, onClose])

  if (!isOpen) return null

  const startCreate = () => {
    if (!perms.canCreate) return
    setEditing(null); setForm(emptyForm); setErrors({}); setView('edit')
  }

  const startEdit = (rule: TransactionRule) => {
    if (!perms.canEdit) return
    setEditing(rule)
    setForm({
      name: rule.name,
      descriptionContains: rule.descriptionContains,
      applyType: !!rule.actionValue,
      applyCategory: !!rule.setCategory,
      applySubcategory: !!rule.setSubcategory,
      applyHide: !!rule.hideTransaction,
      actionValue: rule.actionValue || 'Transferência entre contas',
      setCategory: rule.setCategory || '',
      setSubcategory: rule.setSubcategory || '',
      minValue: rule.minValue != null ? String(rule.minValue) : '',
      maxValue: rule.maxValue != null ? String(rule.maxValue) : '',
      matchType: rule.matchType || '',
      isActive: rule.isActive,
    })
    setErrors({}); setView('edit')
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Nome obrigatório'
    if (!form.descriptionContains.trim()) e.descriptionContains = 'Trecho da descrição obrigatório'
    if (!form.applyType && !form.applyCategory && !form.applySubcategory && !form.applyHide) {
      e.actions = 'Marque ao menos uma ação'
    }
    if (form.applyType && !VALID_ACTION_VALUES.includes(form.actionValue)) e.actionValue = 'Tipo destino inválido'
    if (form.applyCategory && !form.setCategory.trim()) e.setCategory = 'Informe a categoria'
    if (form.applySubcategory && !form.setSubcategory.trim()) e.setSubcategory = 'Informe a subcategoria'
    if (form.minValue && form.maxValue) {
      const mn = parseFloat(form.minValue); const mx = parseFloat(form.maxValue)
      if (!isNaN(mn) && !isNaN(mx) && mn > mx) e.valueRange = 'Mínimo deve ser ≤ máximo'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submitForm = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        descriptionContains: form.descriptionContains.trim(),
        actionType: 'change_type',
        actionValue:     form.applyType        ? form.actionValue           : null,
        setCategory:     form.applyCategory    ? form.setCategory.trim()    : null,
        setSubcategory:  form.applySubcategory ? form.setSubcategory.trim() : null,
        hideTransaction: form.applyHide,
        minValue: form.minValue === '' ? null : parseFloat(form.minValue),
        maxValue: form.maxValue === '' ? null : parseFloat(form.maxValue),
        matchType: form.matchType || null,
        isActive: form.isActive,
      }
      const body = JSON.stringify(payload)
      let savedRule: TransactionRule | null = null
      if (editing) {
        const r = await authedFetch(token, `${API_BASE_URL}/transaction-rules/${editing.id}`, {
          method: 'PUT', body,
        })
        const j = await r.json()
        if (!j.success) { alert(j.error || 'Falha ao salvar regra'); return }
        savedRule = j.data
      } else {
        const r = await authedFetch(token, `${API_BASE_URL}/transaction-rules`, {
          method: 'POST', body,
        })
        const j = await r.json()
        if (!j.success) { alert(j.error || 'Falha ao criar regra'); return }
        savedRule = j.data
      }
      const wasEditing = !!editing
      await refresh()
      setView('list'); setEditing(null)

      if (savedRule) {
        const newDesc = (savedRule.descriptionContains || '').toLowerCase()

        // Em paralelo: transações novas que se encaixam (preview) e, se for edição,
        // as já governadas pela regra (affected) para detectar órfãs.
        const [pj, affj] = await Promise.all([
          authedFetch(token, `${API_BASE_URL}/transaction-rules/preview`, {
            method: 'POST',
            body: JSON.stringify({
              descriptionContains: savedRule.descriptionContains,
              minValue: savedRule.minValue,
              maxValue: savedRule.maxValue,
              matchType: savedRule.matchType,
              ruleId: savedRule.id,
            }),
          }).then((r) => r.json()),
          wasEditing
            ? authedFetch(token, `${API_BASE_URL}/transaction-rules/${savedRule.id}/affected`).then((r) => r.json())
            : Promise.resolve({ success: true, data: [] }),
        ])

        const matches: RetroactivePreviewTx[] = (pj.success ? (pj.data || []) : [])
          .filter((t: RetroactivePreviewTx) => !t.existingRuleId || t.existingRuleId === savedRule!.id)
          .filter((t: RetroactivePreviewTx) => t.appliedRuleId !== savedRule!.id)

        // Órfãs: governadas pela regra que NÃO satisfazem mais a condição
        // COMPLETA da regra (descrição + faixa de valor + tipo casado), não só
        // a descrição. Espelha o evaluateRulesForTransaction do backend. O tipo
        // casado é comparado com o tipo de ENTRADA da transação (originalType,
        // antes da regra mexer no tipo); descrição e valor não são alterados por
        // regra, então usam os valores atuais.
        const stillMatchesRule = (t: RetroactivePreviewTx) => {
          if (!(t.description || '').toLowerCase().includes(newDesc)) return false
          const absVal = Math.abs(Number(t.value) || 0)
          if (savedRule!.minValue != null && absVal < Number(savedRule!.minValue)) return false
          if (savedRule!.maxValue != null && absVal > Number(savedRule!.maxValue)) return false
          if (savedRule!.matchType) {
            const incomingType = t.originalType ?? t.type
            if (savedRule!.matchType !== incomingType) return false
          }
          return true
        }
        const orphans: RetroactivePreviewTx[] = (affj.success ? (affj.data || []) : [])
          .filter((t: RetroactivePreviewTx) => !stillMatchesRule(t))

        if (matches.length > 0 || orphans.length > 0) {
          setRetroPreview({
            ruleId: savedRule.id,
            matches,
            excluded: new Set(),
            orphans,
            orphansToRevert: new Set(orphans.map((t) => t.id)),
          })
        }
      }
    } finally { setSubmitting(false) }
  }

  const toggleActive = async (rule: TransactionRule) => {
    if (!perms.canEdit) return
    const r = await authedFetch(token, `${API_BASE_URL}/transaction-rules/${rule.id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: !rule.isActive }),
    })
    const j = await r.json()
    if (j.success) await refresh()
  }

  const moveRule = async (index: number, direction: -1 | 1) => {
    if (!perms.canEdit) return
    const target = index + direction
    if (target < 0 || target >= rules.length) return
    const reordered = [...rules]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(target, 0, moved)
    setRules(reordered)
    try {
      const r = await authedFetch(token, `${API_BASE_URL}/transaction-rules/reorder`, {
        method: 'POST',
        body: JSON.stringify({ orderedIds: reordered.map((rr) => rr.id) }),
      })
      const j = await r.json()
      if (!j.success) { alert(j.error || 'Falha ao reordenar'); await refresh() }
    } catch { await refresh() }
  }

  const startDelete = async (rule: TransactionRule) => {
    if (!perms.canDelete) return
    const r = await authedFetch(token, `${API_BASE_URL}/transaction-rules/preview`, {
      method: 'POST',
      body: JSON.stringify({
        descriptionContains: rule.descriptionContains,
        minValue: rule.minValue,
        maxValue: rule.maxValue,
        matchType: rule.matchType,
      }),
    })
    const j = await r.json()
    const affected: DeleteAffectedTx[] = ((j.data as RetroactivePreviewTx[]) || []).filter((t) => t.appliedRuleId === rule.id)
    setDeletePrompt({ rule, affected })
  }

  const confirmDelete = async (transactionAction: 'delete' | 'revert' | 'keep') => {
    if (!deletePrompt) return
    setSubmitting(true)
    try {
      const r = await authedFetch(token, `${API_BASE_URL}/transaction-rules/${deletePrompt.rule.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ transactionAction }),
      })
      const j = await r.json()
      if (!j.success) { alert(j.error || 'Falha ao excluir'); return }
      setDeletePrompt(null)
      await refresh()
      onRulesChanged?.()
    } finally { setSubmitting(false) }
  }

  const applyRetroactive = async () => {
    if (!retroPreview) return
    setSubmitting(true)
    try {
      // 1. Aplica a regra nas transações novas que se encaixam.
      if (retroPreview.matches.length > 0) {
        const r = await authedFetch(token, `${API_BASE_URL}/transaction-rules/${retroPreview.ruleId}/apply-retroactive`, {
          method: 'POST',
          body: JSON.stringify({ excludedTransactionIds: Array.from(retroPreview.excluded) }),
        })
        const j = await r.json()
        if (!j.success) { alert(j.error || 'Falha na aplicação retroativa'); return }
      }
      // 2. Reverte as órfãs marcadas — transações que não se encaixam mais na regra.
      if (retroPreview.orphansToRevert.size > 0) {
        const r2 = await authedFetch(token, `${API_BASE_URL}/transaction-rules/${retroPreview.ruleId}/revert`, {
          method: 'POST',
          body: JSON.stringify({ transactionIds: Array.from(retroPreview.orphansToRevert) }),
        })
        const j2 = await r2.json()
        if (!j2.success) { alert(j2.error || 'Falha ao reverter transações órfãs'); return }
      }
      setRetroPreview(null)
      onRulesChanged?.()
    } finally { setSubmitting(false) }
  }

  const markAllPending = async () => {
    if (!retroPreview) return
    if (retroPreview.matches.length === 0) { setRetroPreview(null); return }
    setSubmitting(true)
    try {
      const r = await authedFetch(token, `${API_BASE_URL}/transaction-rules/${retroPreview.ruleId}/mark-pending-retroactive`, {
        method: 'POST',
        body: JSON.stringify({ transactionIds: retroPreview.matches.map((t) => t.id) }),
      })
      const j = await r.json()
      if (!j.success) { alert(j.error || 'Falha ao marcar como pendente'); return }
      setRetroPreview(null)
      onRulesChanged?.()
    } finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Conjunto de Regras</h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">Classifique transações automaticamente por trecho da descrição</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {view === 'list' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">{rules.length} regra(s)</span>
                <button
                  disabled={!perms.canCreate}
                  onClick={startCreate}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm"
                  title={perms.canCreate ? 'Criar nova regra' : 'Você não tem permissão para criar regras'}
                >
                  <Plus className="w-4 h-4" /> Nova Regra
                </button>
              </div>

              {loading && <p className="text-sm text-gray-500">Carregando...</p>}

              {!loading && rules.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p className="mb-2">Nenhuma regra cadastrada ainda.</p>
                  <p className="text-xs">As regras aplicam automaticamente classificações a transações cuja descrição contém um trecho específico.</p>
                </div>
              )}

              {!loading && rules.length > 0 && (
                <ul className="space-y-2">
                  {rules.map((rule, index) => (
                    <li
                      key={rule.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border ${rule.isActive ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800/40' : 'border-gray-200 bg-gray-50 dark:bg-gray-700/30 dark:border-gray-600 opacity-70'}`}
                    >
                      <div className="flex flex-col -my-1">
                        <button
                          onClick={() => moveRule(index, -1)}
                          disabled={!perms.canEdit || index === 0}
                          title="Mover para cima"
                          className="p-0.5 text-gray-500 hover:text-amber-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveRule(index, 1)}
                          disabled={!perms.canEdit || index === rules.length - 1}
                          title="Mover para baixo"
                          className="p-0.5 text-gray-500 hover:text-amber-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                      <button onClick={() => toggleActive(rule)} disabled={!perms.canEdit} title={perms.canEdit ? (rule.isActive ? 'Desativar' : 'Ativar') : 'Sem permissão'} className="disabled:cursor-not-allowed">
                        {rule.isActive
                          ? <ToggleRight className="w-7 h-7 text-amber-600" />
                          : <ToggleLeft className="w-7 h-7 text-gray-400" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{rule.name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                          Se descrição contém <span className="font-mono px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700">{rule.descriptionContains}</span>
                          {(rule.minValue != null || rule.maxValue != null) && (
                            <>
                              {' · '}valor
                              {rule.minValue != null && ` ≥ R$ ${Number(rule.minValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                              {rule.maxValue != null && ` ≤ R$ ${Number(rule.maxValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                            </>
                          )}
                          {rule.matchType && <> · tipo atual: <span className="font-semibold">{rule.matchType}</span></>}
                          <ArrowRight className="inline w-3 h-3 mx-1" />
                          {[
                            rule.actionValue && `tipo: ${rule.actionValue}`,
                            rule.setCategory && `categoria: ${rule.setCategory}`,
                            rule.setSubcategory && `subcat: ${rule.setSubcategory}`,
                            rule.hideTransaction && 'ocultar',
                          ].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <button onClick={() => startEdit(rule)} disabled={!perms.canEdit} className="p-2 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed" title="Editar">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => startDelete(rule)} disabled={!perms.canDelete} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!perms.canCreate && !perms.canEdit && !perms.canDelete && (
                <div className="mt-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                  Você só pode visualizar as regras. Peça a um administrador para conceder permissão.
                </div>
              )}
            </>
          )}

          {view === 'edit' && (
            <div className="space-y-4">
              <button onClick={() => { setView('list'); setEditing(null); setErrors({}) }} className="text-sm text-amber-600 hover:underline mb-2">← Voltar</button>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{editing ? 'Editar regra' : 'Nova regra'}</h3>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nome da regra *</label>
                <input
                  type="text" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder='Ex: "PIX recorrente fornecedor X"'
                  className={`w-full px-3 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Condições para casar a transação</p>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Descrição contém *</label>
                  <input
                    type="text" value={form.descriptionContains}
                    onChange={(e) => setForm((f) => ({ ...f, descriptionContains: e.target.value }))}
                    placeholder='Ex: "FORNECEDOR XYZ LTDA"'
                    className={`w-full px-3 py-2 border rounded-xl font-mono text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${errors.descriptionContains ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  <p className="text-xs text-gray-500 mt-1">Comparação é case-insensitive.</p>
                  {errors.descriptionContains && <p className="text-xs text-red-500 mt-1">{errors.descriptionContains}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Valor mínimo (opcional)</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={form.minValue}
                      onChange={(e) => setForm((f) => ({ ...f, minValue: e.target.value }))}
                      placeholder="0,00"
                      className={`w-full px-3 py-2 border rounded-xl text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${errors.valueRange ? 'border-red-500' : 'border-gray-300'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Valor máximo (opcional)</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={form.maxValue}
                      onChange={(e) => setForm((f) => ({ ...f, maxValue: e.target.value }))}
                      placeholder="Sem limite"
                      className={`w-full px-3 py-2 border rounded-xl text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${errors.valueRange ? 'border-red-500' : 'border-gray-300'}`}
                    />
                  </div>
                </div>
                {errors.valueRange && <p className="text-xs text-red-500 -mt-2">{errors.valueRange}</p>}
                <p className="text-xs text-gray-500">A faixa compara o valor absoluto da transação.</p>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Apenas se o tipo atual for</label>
                  <select
                    value={form.matchType}
                    onChange={(e) => setForm((f) => ({ ...f, matchType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  >
                    <option value="">Qualquer tipo</option>
                    <option value="Receita">Receita</option>
                    <option value="Despesa">Despesa</option>
                    <option value="Reforço de caixa">Reforço de caixa</option>
                    <option value="Retirada de caixa">Retirada de caixa</option>
                    <option value="Transferência entre contas">Transferência entre contas</option>
                  </select>
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">O que a regra faz *</p>
                {errors.actions && <p className="text-xs text-red-500">{errors.actions}</p>}

                <div>
                  <label className="flex items-center gap-2 select-none">
                    <input type="checkbox" checked={form.applyType} onChange={(e) => setForm((f) => ({ ...f, applyType: e.target.checked, applyCategory: e.target.checked && f.actionValue === 'Transferência entre contas' ? false : f.applyCategory }))} />
                    <span className="text-sm font-medium">Mudar tipo para</span>
                  </label>
                  {form.applyType && (
                    <select
                      value={form.actionValue}
                      onChange={(e) => setForm((f) => ({ ...f, actionValue: e.target.value, applyCategory: e.target.value === 'Transferência entre contas' ? false : f.applyCategory }))}
                      className={`mt-2 ml-6 w-[calc(100%-1.5rem)] px-3 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${errors.actionValue ? 'border-red-500' : 'border-gray-300'}`}
                    >
                      {VALID_ACTION_VALUES.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  )}
                </div>

                {/* Categoria não se aplica quando a regra muda o tipo para
                    Transferência entre contas (tipo sem categoria). */}
                {!(form.applyType && form.actionValue === 'Transferência entre contas') && (
                <div>
                  <label className="flex items-center gap-2 select-none">
                    <input type="checkbox" checked={form.applyCategory} onChange={(e) => setForm((f) => ({ ...f, applyCategory: e.target.checked }))} />
                    <span className="text-sm font-medium">Categorizar como</span>
                  </label>
                  {form.applyCategory && (
                    <select
                      value={form.setCategory}
                      onChange={(e) => setForm((f) => ({ ...f, setCategory: e.target.value }))}
                      className={`mt-2 ml-6 w-[calc(100%-1.5rem)] px-3 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${errors.setCategory ? 'border-red-500' : 'border-gray-300'}`}
                    >
                      <option value="">Selecione uma categoria</option>
                      {form.setCategory && ![...CATEGORIES_BY_TYPE.Receita, ...CATEGORIES_BY_TYPE.Despesa].includes(form.setCategory) && (
                        <option value={form.setCategory}>{form.setCategory} (fora do catálogo)</option>
                      )}
                      <optgroup label="Receita">
                        {CATEGORIES_BY_TYPE.Receita.map((c) => <option key={`r-${c}`} value={c}>{c}</option>)}
                      </optgroup>
                      <optgroup label="Despesa">
                        {CATEGORIES_BY_TYPE.Despesa.map((c) => <option key={`d-${c}`} value={c}>{c}</option>)}
                      </optgroup>
                    </select>
                  )}
                  {form.applyCategory && errors.setCategory && <p className="text-xs text-red-500 mt-1 ml-6">{errors.setCategory}</p>}
                </div>
                )}

                <div>
                  <label className="flex items-center gap-2 select-none">
                    <input type="checkbox" checked={form.applySubcategory} onChange={(e) => setForm((f) => ({ ...f, applySubcategory: e.target.checked }))} />
                    <span className="text-sm font-medium">Subcategorizar como</span>
                  </label>
                  {form.applySubcategory && (
                    <>
                      <select
                        value={form.setSubcategory}
                        onChange={(e) => setForm((f) => ({ ...f, setSubcategory: e.target.value }))}
                        className={`mt-2 ml-6 w-[calc(100%-1.5rem)] px-3 py-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${errors.setSubcategory ? 'border-red-500' : 'border-gray-300'}`}
                      >
                        <option value="">Selecione uma subcategoria</option>
                        {/* Se a regra já referencia uma subcategoria que saiu do catálogo, ainda mostra a opção atual */}
                        {form.setSubcategory && !availableSubcategories.includes(form.setSubcategory) && (
                          <option value={form.setSubcategory}>{form.setSubcategory} (fora do catálogo)</option>
                        )}
                        {availableSubcategories.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 ml-6">
                        Para criar/editar subcategorias, use o menu Ações → Gerenciar Subcategorias.
                      </p>
                    </>
                  )}
                  {form.applySubcategory && errors.setSubcategory && <p className="text-xs text-red-500 mt-1 ml-6">{errors.setSubcategory}</p>}
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                  <label className="flex items-center gap-2 select-none">
                    <input type="checkbox" checked={form.applyHide} onChange={(e) => setForm((f) => ({ ...f, applyHide: e.target.checked }))} />
                    <span className="text-sm font-medium">Ignorar / ocultar a transação</span>
                  </label>
                  {form.applyHide && (
                    <p className="text-xs text-gray-500 mt-1 ml-6">A transação some das listas e dos totais (DRE, Dashboard, relatórios). Útil para duplicatas, taxas irrelevantes ou estornos automáticos.</p>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-2 select-none">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                <span className="text-sm">Regra ativa</span>
              </label>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button onClick={() => { setView('list'); setEditing(null); setErrors({}) }} className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  Cancelar
                </button>
                <button onClick={submitForm} disabled={submitting} className="px-5 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded-lg shadow-sm">
                  {submitting ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar regra'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview retroativo */}
      {retroPreview && (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Revisar alterações da regra</h3>
              {retroPreview.matches.length > 0 && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {retroPreview.matches.length} transação(ões) anteriores se encaixam. Desmarque as que você NÃO quer alterar.
                </p>
              )}
              {retroPreview.orphans.length > 0 && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {retroPreview.orphans.length} transação(ões) deixaram de se encaixar após a edição. Marque as que deseja reverter ao estado original.
                </p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {retroPreview.matches.map((t) => {
                const isExcluded = retroPreview.excluded.has(t.id)
                return (
                  <label key={t.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${isExcluded ? 'opacity-50' : 'bg-gray-50 dark:bg-gray-700/30'}`}>
                    <input
                      type="checkbox"
                      checked={!isExcluded}
                      onChange={() => setRetroPreview((p) => {
                        if (!p) return p
                        const excluded = new Set(p.excluded)
                        if (excluded.has(t.id)) excluded.delete(t.id); else excluded.add(t.id)
                        return { ...p, excluded }
                      })}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.description}</p>
                      <p className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString('pt-BR')} · {t.type} · R$ {Number(t.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </label>
                )
              })}

              {retroPreview.orphans.length > 0 && (
                <div className={retroPreview.matches.length > 0 ? 'mt-3 pt-3 border-t border-gray-200 dark:border-gray-700' : ''}>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 px-1">Não se encaixam mais — reverter ao original?</p>
                  {retroPreview.orphans.map((t) => {
                    const willRevert = retroPreview.orphansToRevert.has(t.id)
                    return (
                      <label key={t.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${willRevert ? 'bg-gray-50 dark:bg-gray-700/30' : 'opacity-50'}`}>
                        <input
                          type="checkbox"
                          checked={willRevert}
                          onChange={() => setRetroPreview((p) => {
                            if (!p) return p
                            const orphansToRevert = new Set(p.orphansToRevert)
                            if (orphansToRevert.has(t.id)) orphansToRevert.delete(t.id); else orphansToRevert.add(t.id)
                            return { ...p, orphansToRevert }
                          })}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.description}</p>
                          <p className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString('pt-BR')} · {t.type} · R$ {Number(t.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-end sm:items-center px-6 py-4 border-t border-gray-200 dark:border-gray-700 gap-2">
              <button onClick={() => setRetroPreview(null)} className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                Cancelar
              </button>
              {retroPreview.matches.length > 0 && (
                <button
                  onClick={markAllPending}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 rounded-lg"
                  title="Marca todas as transações como 'A confirmar' para você decidir depois"
                >
                  {submitting ? 'Aguarde...' : `Decidir depois (${retroPreview.matches.length})`}
                </button>
              )}
              <button onClick={applyRetroactive} disabled={submitting} className="px-5 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded-lg shadow-sm">
                {submitting ? 'Aplicando...' : (() => {
                  const applyCount = retroPreview.matches.length - retroPreview.excluded.size
                  const revertCount = retroPreview.orphansToRevert.size
                  if (retroPreview.orphans.length === 0) return `Aplicar em ${applyCount} transação(ões)`
                  if (retroPreview.matches.length === 0) return `Reverter ${revertCount} transação(ões)`
                  return `Aplicar (${applyCount}) e reverter (${revertCount})`
                })()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exclusão de regra com 3 opções */}
      {deletePrompt && (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Excluir regra "{deletePrompt.rule.name}"</h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Esta regra já modificou {deletePrompt.affected.length} transação(ões). O que fazer com elas?
              </p>
            </div>
            <div className="p-6 space-y-3">
              <button onClick={() => confirmDelete('revert')} disabled={submitting} className="w-full text-left p-4 border-2 border-gray-200 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-colors">
                <p className="font-semibold">Reverter ao tipo original</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Volta as transações ao tipo antes da regra.</p>
              </button>
              <button onClick={() => confirmDelete('keep')} disabled={submitting} className="w-full text-left p-4 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors">
                <p className="font-semibold">Manter como está</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Transações mantêm os valores atuais, mas perdem a referência à regra.</p>
              </button>
              <button onClick={() => confirmDelete('delete')} disabled={submitting} className="w-full text-left p-4 border-2 border-red-200 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                <p className="font-semibold text-red-700 dark:text-red-400">Excluir as transações</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Remove permanentemente as {deletePrompt.affected.length} transação(ões). Esta ação não pode ser desfeita.</p>
              </button>
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setDeletePrompt(null)} className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TransactionRulesModal
