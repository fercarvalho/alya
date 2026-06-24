import React, { useCallback, useEffect, useState } from 'react'
import { X, Plus, Edit, Trash2, Settings } from 'lucide-react'

const API_BASE_URL = '/api'

interface RuleRef {
  id: string
  name: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  token: string | null
  /** Notifica o pai que o catálogo mudou (pra recarregar selects). */
  onChanged?: () => void
  /** Abre o modal de Conjunto de Regras (pra editar/excluir regras dependentes). */
  onRequestEditRules?: () => void
}

// Modal de gerenciamento do catálogo de subcategorias: criar, renomear,
// excluir (individual e em massa), respeitando o invariante de que uma
// subcategoria em uso por regra não pode ser excluída até a regra mudar.
const ManageSubcategoriesModal: React.FC<Props> = ({ isOpen, onClose, token, onChanged, onRequestEditRules }) => {
  const [subcategories, setSubcategories] = useState<string[]>([])
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [editingName, setEditingName] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkResult, setBulkResult] = useState<{ deleted: string[]; blocked: { name: string; rules: RuleRef[] }[] } | null>(null)
  const [inUseWarning, setInUseWarning] = useState<{ name: string; rules: RuleRef[] } | null>(null)

  const authHeaders = useCallback(
    (extra: Record<string, string> = {}): Record<string, string> => ({
      ...extra,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  )

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/subcategories`, { headers: authHeaders() })
      const j = await r.json().catch(() => ({} as { success?: boolean; data?: string[] }))
      if (j.success && Array.isArray(j.data)) setSubcategories(j.data)
    } catch {
      /* silencioso */
    }
  }, [authHeaders])

  useEffect(() => {
    if (!isOpen) return
    setNewName(''); setError(''); setEditingName(null); setSelected(new Set()); setBulkResult(null); setInUseWarning(null)
    load()
  }, [isOpen, load])

  if (!isOpen) return null

  const sortPt = (a: string, b: string) => a.localeCompare(b, 'pt-BR')

  const create = async () => {
    const name = newName.trim()
    if (!name) { setError('Digite um nome'); return }
    if (subcategories.includes(name)) { setError('Esta subcategoria já existe'); return }
    setBusy(true); setError('')
    try {
      const r = await fetch(`${API_BASE_URL}/subcategories`, {
        method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name }),
      })
      const j = await r.json().catch(() => ({} as { success?: boolean; error?: string }))
      if (r.ok && j.success) {
        setSubcategories((prev) => [...prev, name].sort(sortPt))
        setNewName('')
        onChanged?.()
      } else setError(j.error || 'Erro ao criar subcategoria')
    } catch { setError('Erro ao criar subcategoria') } finally { setBusy(false) }
  }

  const saveRename = async (oldName: string) => {
    const next = editValue.trim()
    if (!next) { setError('Digite um nome'); return }
    if (next === oldName) { setEditingName(null); return }
    if (subcategories.includes(next)) { setError('Já existe uma subcategoria com esse nome'); return }
    setBusy(true); setError('')
    try {
      const r = await fetch(`${API_BASE_URL}/subcategories/${encodeURIComponent(oldName)}`, {
        method: 'PUT', headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ newName: next }),
      })
      const j = await r.json().catch(() => ({} as { success?: boolean; error?: string }))
      if (r.ok && j.success) {
        setSubcategories((prev) => prev.map((s) => (s === oldName ? next : s)).sort(sortPt))
        setEditingName(null); setEditValue('')
        onChanged?.()
      } else setError(j.error || 'Erro ao renomear subcategoria')
    } catch { setError('Erro ao renomear subcategoria') } finally { setBusy(false) }
  }

  const performDelete = async (name: string): Promise<'ok' | 'in_use' | 'error'> => {
    try {
      const r = await fetch(`${API_BASE_URL}/subcategories/${encodeURIComponent(name)}`, {
        method: 'DELETE', headers: authHeaders(),
      })
      const j = await r.json().catch(() => ({} as { success?: boolean }))
      if (r.ok && j.success) {
        setSubcategories((prev) => prev.filter((s) => s !== name))
        onChanged?.()
        return 'ok'
      }
      if (r.status === 409) return 'in_use'
      return 'error'
    } catch { return 'error' }
  }

  // Gate: checa regras antes. Em uso → aviso; senão, exclui.
  const attemptDelete = async (name: string) => {
    setBusy(true); setError('')
    try {
      let rules: RuleRef[] = []
      try {
        const r = await fetch(`${API_BASE_URL}/subcategories/${encodeURIComponent(name)}/rules`, { headers: authHeaders() })
        const j = await r.json().catch(() => ({} as { success?: boolean; data?: RuleRef[] }))
        if (j.success && Array.isArray(j.data)) rules = j.data
      } catch { /* segue — backend ainda barra se preciso */ }
      if (editingName === name) { setEditingName(null); setEditValue('') }
      if (rules.length > 0) { setInUseWarning({ name, rules }); return }
      await performDelete(name)
    } finally { setBusy(false) }
  }

  const allSelected = subcategories.length > 0 && selected.size === subcategories.length
  const toggleSelected = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }

  const bulkDelete = async () => {
    const names = [...selected]
    if (names.length === 0) return
    setBusy(true); setError(''); setBulkResult(null)
    try {
      const r = await fetch(`${API_BASE_URL}/subcategories/bulk-delete`, {
        method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ names }),
      })
      const j = await r.json().catch(() => ({} as { success?: boolean; error?: string; deleted?: string[]; blocked?: { name: string; rules: RuleRef[] }[] }))
      if (r.ok && j.success) {
        const deleted = j.deleted || []
        const blocked = j.blocked || []
        if (deleted.length) setSubcategories((prev) => prev.filter((s) => !deleted.includes(s)))
        setSelected(new Set())
        if (blocked.length) setBulkResult({ deleted, blocked })
        if (deleted.length) onChanged?.()
      } else setError(j.error || 'Erro ao excluir em massa')
    } catch { setError('Erro ao excluir em massa') } finally { setBusy(false) }
  }

  return (
    <div
      className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center px-4 py-8 z-[60]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><Settings className="w-5 h-5" aria-hidden="true" /> Gerenciar Subcategorias</h2>
          <button onClick={onClose} aria-label="Fechar modal" className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-all"><X className="w-5 h-5" aria-hidden="true" /></button>
        </div>

        <div className="p-6 flex flex-col gap-4 overflow-hidden">
          {/* Criar nova */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Nova subcategoria</label>
            <div className="flex gap-2">
              <input
                type="text" value={newName}
                onChange={(e) => { setNewName(e.target.value); if (error) setError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') create() }}
                placeholder="Nome e clique em Adicionar"
                disabled={busy}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-gray-100"
              />
              <button onClick={create} disabled={busy || !newName.trim()} className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold disabled:opacity-50 flex items-center gap-1.5">
                <Plus className="w-4 h-4" aria-hidden="true" /> Adicionar
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg text-sm" role="alert">{error}</div>
          )}

          {bulkResult && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-sm" role="status">
              <div className="flex items-start justify-between gap-2">
                <p className="text-amber-800 dark:text-amber-300 font-semibold">
                  {bulkResult.deleted.length > 0 ? `${bulkResult.deleted.length} excluída(s).` : 'Nenhuma excluída.'}
                </p>
                <button onClick={() => setBulkResult(null)} aria-label="Fechar aviso" className="text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded p-0.5 flex-shrink-0"><X className="w-3.5 h-3.5" aria-hidden="true" /></button>
              </div>
              <p className="text-amber-700 dark:text-amber-400 mt-1">{bulkResult.blocked.length} não pôde(puderam) ser excluída(s) por estar(em) em uso por regras:</p>
              <p className="text-amber-700 dark:text-amber-400 mt-0.5 font-medium break-words">{bulkResult.blocked.map((b) => b.name).join(', ')}</p>
            </div>
          )}

          {/* Controles de seleção */}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setSelected(new Set(subcategories))} disabled={subcategories.length === 0 || busy || allSelected} className="text-[11px] font-semibold px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-50">Selecionar todas</button>
            {selected.size > 0 && (
              <button type="button" onClick={() => setSelected(new Set())} disabled={busy} className="text-[11px] font-semibold px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-50">Desselecionar</button>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">{selected.size > 0 ? `${selected.size} selecionada(s)` : `${subcategories.length} subcategoria(s)`}</span>
            <button type="button" onClick={bulkDelete} disabled={selected.size === 0 || busy} className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed">
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Excluir selecionadas{selected.size > 0 ? ` (${selected.size})` : ''}
            </button>
          </div>

          {/* Lista */}
          <div className="overflow-y-auto max-h-[40vh] -mx-1 px-1 space-y-1">
            {subcategories.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">Nenhuma subcategoria cadastrada.</p>
            )}
            {subcategories.map((name) => (
              <div key={name} className="flex items-center gap-2 p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                {editingName !== name && (
                  <input type="checkbox" checked={selected.has(name)} onChange={() => toggleSelected(name)} disabled={busy} aria-label={`Selecionar ${name}`} className="w-4 h-4 flex-shrink-0 accent-amber-600 cursor-pointer disabled:opacity-50" />
                )}
                {editingName === name ? (
                  <>
                    <input
                      type="text" value={editValue} autoFocus disabled={busy}
                      onChange={(e) => { setEditValue(e.target.value); if (error) setError('') }}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveRename(name); if (e.key === 'Escape') { setEditingName(null); setError('') } }}
                      className="flex-1 min-w-0 px-2 py-1.5 border border-amber-300 dark:border-amber-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-gray-100 text-sm"
                    />
                    <button onClick={() => saveRename(name)} disabled={busy} className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50">Salvar</button>
                    <button onClick={() => { setEditingName(null); setError('') }} disabled={busy} aria-label="Cancelar" className="px-2 py-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"><X className="w-4 h-4" aria-hidden="true" /></button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 min-w-0 truncate text-sm text-gray-800 dark:text-gray-100" title={name}>{name}</span>
                    <button onClick={() => { setEditingName(name); setEditValue(name); setError('') }} disabled={busy} aria-label={`Renomear ${name}`} className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 disabled:opacity-50"><Edit className="w-4 h-4" aria-hidden="true" /></button>
                    <button onClick={() => attemptDelete(name)} disabled={busy} aria-label={`Excluir ${name}`} className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50"><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
                  </>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Alterações valem para todo o sistema e refletem nas Regras. Renomear atualiza as transações já cadastradas; excluir mantém o valor nas transações antigas, só remove das opções.
          </p>
        </div>
      </div>

      {/* Aviso: subcategoria em uso por regra(s) */}
      {inUseWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 py-8 z-[70]" onClick={(e) => { if (e.target === e.currentTarget) setInUseWarning(null) }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Subcategoria em uso</h3>
              <button onClick={() => setInUseWarning(null)} aria-label="Fechar" className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5"><X className="w-5 h-5" aria-hidden="true" /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700 dark:text-gray-200">
                A subcategoria <strong>"{inUseWarning.name}"</strong> é usada por <strong>{inUseWarning.rules.length} regra(s)</strong>. Para excluí-la, edite essa(s) regra(s) (pra usar outra subcategoria) ou remova-a(s).
              </p>
              <ul className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                {inUseWarning.rules.map((rule) => (
                  <li key={rule.id} className="text-sm text-gray-600 dark:text-gray-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">{rule.name || '(regra sem nome)'}</li>
                ))}
              </ul>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setInUseWarning(null)} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium">Fechar</button>
                {onRequestEditRules && (
                  <button
                    onClick={() => { setInUseWarning(null); onClose(); onRequestEditRules() }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
                  >
                    Abrir Conjunto de Regras
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManageSubcategoriesModal
