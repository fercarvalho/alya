import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, Calculator, RefreshCw, Settings, Table, Trash2 } from 'lucide-react'
import { API_BASE_URL } from '../config/api'
import { useAuth } from '../contexts/AuthContext'
import { ChartCard } from './projection/charts/ChartCard'
import { GrowthPercentBarChart } from './projection/charts/GrowthPercentBarChart'
import { ThreeScenarioLineChart, type MonthlyScenarioPoint } from './projection/charts/ThreeScenarioLineChart'
import { StackedMktChart } from './projection/charts/StackedMktChart'
import { computeSeriesKpis, formatCurrencyBRL, formatPercentBR } from './projection/charts/formatters'

type ProjectionSectionId =
  | 'prevYear'
  | 'growth'
  | 'revenueTotal'
  | `revenue-${string}`
  | 'mktTotals'
  | 'fixedExpenses'
  | 'variableExpenses'
  | 'investments'
  | 'budget'
  | 'resultado'

type Growth = { minimo: number; medio: number; maximo: number }
type RevenueStream = { id: string; name: string; order: number; isActive: boolean }
type MktComponent = { id: string; name: string; order: number; isActive: boolean }

type ProjectionConfig = {
  revenueStreams: RevenueStream[]
  mktComponents: MktComponent[]
  updatedAt?: string | null
}

type Scenario3 = { previsto: number[]; medio: number[]; maximo: number[] }

type ProjectionSnapshot = {
  growth: Growth
  config: ProjectionConfig
  fixedExpenses: { previsto: number[]; media: number[]; maximo: number[] }
  variableExpenses: Scenario3
  investments: Scenario3
  mktTotals: Scenario3
  revenueTotals: Scenario3
  budget: Scenario3
  resultado: Scenario3
  updatedAt?: string
}

type NullableMonthArr = Array<number | null>
type RevenueManual = { previsto: NullableMonthArr; medio: NullableMonthArr; maximo: NullableMonthArr }

type ProjectionBase = {
  growth: Growth
  prevYear: {
    fixedExpenses: number[]
    variableExpenses: number[]
    investments: number[]
    revenueStreams: Record<string, number[]>
    mktComponents: Record<string, number[]>
  }
  manualOverrides: {
    fixedPrevistoManual: NullableMonthArr
    fixedMediaManual: NullableMonthArr
    fixedMaximoManual: NullableMonthArr
    variablePrevistoManual: NullableMonthArr
    variableMedioManual: NullableMonthArr
    variableMaximoManual: NullableMonthArr
    investimentosPrevistoManual: NullableMonthArr
    investimentosMedioManual: NullableMonthArr
    investimentosMaximoManual: NullableMonthArr
    mktPrevistoManual: NullableMonthArr
    mktMedioManual: NullableMonthArr
    mktMaximoManual: NullableMonthArr
    revenueManual: Record<string, RevenueManual>
  }
  updatedAt?: string | null
}

const MONTHS_LONG = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
]
const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

type MonthOrQuarterCol =
  | { kind: 'month'; monthIndex: number }
  | { kind: 'quarter'; startMonthIndex: number; label: string }

const MONTHS_WITH_QUARTERS: MonthOrQuarterCol[] = (() => {
  // IMPORTANTE: o total do trimestre vem ANTES do 1º mês (T1 antes de Jan, T2 antes de Abr, etc.)
  return [
    { kind: 'quarter', startMonthIndex: 0, label: 'T1' },
    { kind: 'month', monthIndex: 0 },
    { kind: 'month', monthIndex: 1 },
    { kind: 'month', monthIndex: 2 },
    { kind: 'quarter', startMonthIndex: 3, label: 'T2' },
    { kind: 'month', monthIndex: 3 },
    { kind: 'month', monthIndex: 4 },
    { kind: 'month', monthIndex: 5 },
    { kind: 'quarter', startMonthIndex: 6, label: 'T3' },
    { kind: 'month', monthIndex: 6 },
    { kind: 'month', monthIndex: 7 },
    { kind: 'month', monthIndex: 8 },
    { kind: 'quarter', startMonthIndex: 9, label: 'T4' },
    { kind: 'month', monthIndex: 9 },
    { kind: 'month', monthIndex: 10 },
    { kind: 'month', monthIndex: 11 }
  ]
})()

function asNumber(v: any): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function ensure12(arr: any): number[] {
  const out = new Array(12).fill(0)
  if (!Array.isArray(arr)) return out
  for (let i = 0; i < 12; i++) out[i] = asNumber(arr[i])
  return out
}

function ensure12Nullable(arr: any): NullableMonthArr {
  const out: NullableMonthArr = new Array(12).fill(null)
  if (!Array.isArray(arr)) return out
  for (let i = 0; i < 12; i++) {
    const v = arr[i]
    if (v === null || v === undefined || v === '') out[i] = null
    else out[i] = Number.isFinite(Number(v)) ? Number(v) : null
  }
  return out
}

function sumMany(arrs: number[][]): number[] {
  return arrs.reduce((acc, cur) => {
    const a = ensure12(acc)
    const b = ensure12(cur)
    return a.map((v, i) => v + (b[i] ?? 0))
  }, new Array(12).fill(0))
}

function mkScenarioPoints(prev: number[], med: number[], max: number[]): MonthlyScenarioPoint[] {
  const p = ensure12(prev)
  const m = ensure12(med)
  const x = ensure12(max)
  return MONTHS_SHORT.map((month, i) => ({ month, previsto: p[i], medio: m[i], maximo: x[i] }))
}

function sumQuarter(values: number[], startMonthIndex: number): number {
  const v = ensure12(values)
  return (v[startMonthIndex] || 0) + (v[startMonthIndex + 1] || 0) + (v[startMonthIndex + 2] || 0)
}

function formatMoneyCompact(n: number): string {
  try {
    return `R$ ${Number(n).toLocaleString('pt-BR', { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 })}`
  } catch {
    return formatCurrencyBRL(n)
  }
}

function applyGrowthPct(base: number[], pct: number): number[] {
  const factor = 1 + (Number.isFinite(pct) ? pct : 0) / 100
  return ensure12(base).map(v => v * factor)
}

function applyOverrides(autoArr: number[], overrides: NullableMonthArr): number[] {
  const a = ensure12(autoArr)
  const o = ensure12Nullable(overrides)
  return a.map((v, i) => (o[i] === null ? v : Number(o[i])))
}

const CalculatedCell: React.FC<{ value: number; className?: string }> = ({ value, className }) => {
  const n = asNumber(value)
  const isNeg = n < 0
  return (
    <div className={`text-right font-semibold ${isNeg ? 'text-red-600' : 'text-gray-900'} ${className || ''}`}>
      {formatCurrencyBRL(n)}
    </div>
  )
}

const NumberCell: React.FC<{
  value: number
  onChange: (v: number) => void
  disabled?: boolean
}> = ({ value, onChange, disabled }) => {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      disabled={disabled}
      onChange={e => onChange(asNumber(e.target.value))}
      className={`w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-right ${
        disabled ? 'bg-gray-100 text-gray-500' : 'bg-white'
      }`}
    />
  )
}

const OverrideCell: React.FC<{
  valueEffective: number
  overrideValue: number | null
  onSet: (v: number) => void
  onClear: () => void
  disabled?: boolean
}> = ({ valueEffective, overrideValue, onSet, onClear, disabled }) => {
  const hasOverride = overrideValue !== null && overrideValue !== undefined
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={Number.isFinite(valueEffective) ? valueEffective : 0}
        disabled={disabled}
        onChange={e => onSet(asNumber(e.target.value))}
        className={`w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-right ${
          disabled ? 'bg-gray-100 text-gray-500' : hasOverride ? 'bg-amber-50 border-amber-300' : 'bg-white'
        }`}
        title={hasOverride ? 'Valor com override manual' : 'Valor calculado automaticamente'}
      />
      {hasOverride && (
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          className="px-2 py-1 text-xs rounded border border-amber-300 bg-white text-amber-800 hover:bg-amber-50 disabled:opacity-50"
          title="Limpar override (voltar ao automático)"
        >
          ↺
        </button>
      )}
    </div>
  )
}

export default function ProjectionImpgeo() {
  const { token, user, logout } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isChartView, setIsChartView] = useState(false)
  const [pendingScrollSectionId, setPendingScrollSectionId] = useState<ProjectionSectionId | null>(null)

  const [config, setConfig] = useState<ProjectionConfig>({ revenueStreams: [], mktComponents: [] })
  const [base, setBase] = useState<ProjectionBase | null>(null)
  const [snapshot, setSnapshot] = useState<ProjectionSnapshot | null>(null)

  const isAdmin = user?.role === 'admin'

  const apiFetch = useCallback(
    async (path: string, init: RequestInit = {}) => {
      if (!token) throw new Error('Token ausente')
      const headers: HeadersInit = {
        ...(init.headers || {}),
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
      const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
      if (res.status === 401 || res.status === 403) {
        logout()
        throw new Error('Sessão expirada. Faça login novamente.')
      }
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || json?.message || `HTTP ${res.status}`)
      return json
    },
    [token, logout]
  )

  const refreshAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [cfgRes, baseRes, snapRes] = await Promise.all([apiFetch('/projection/config'), apiFetch('/projection/base'), apiFetch('/projection')])
      setConfig(cfgRes.data || { revenueStreams: [], mktComponents: [] })
      setBase(baseRes.data)
      setSnapshot(snapRes.data)
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar Projeção')
    } finally {
      setIsLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    if (!token) return
    refreshAll()
  }, [token, refreshAll])

  useEffect(() => {
    if (!pendingScrollSectionId) return
    if (isChartView) return
    const id = `projection-section-${pendingScrollSectionId}`
    const t = window.setTimeout(() => {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setPendingScrollSectionId(null)
    }, 0)
    return () => window.clearTimeout(t)
  }, [pendingScrollSectionId, isChartView])

  const handleEditSection = (id: ProjectionSectionId) => {
    setPendingScrollSectionId(id)
    setIsChartView(false)
  }

  const syncNow = async () => {
    setIsSaving(true)
    setError(null)
    try {
      await apiFetch('/projection/sync', { method: 'POST' })
      await refreshAll()
    } catch (e: any) {
      setError(e?.message || 'Erro ao sincronizar')
    } finally {
      setIsSaving(false)
    }
  }

  const clearAll = async () => {
    if (!confirm('Tem certeza que deseja limpar TODOS os dados da Projeção?')) return
    setIsSaving(true)
    setError(null)
    try {
      await apiFetch('/clear-all-projection-data', { method: 'DELETE' })
      await refreshAll()
    } catch (e: any) {
      setError(e?.message || 'Erro ao limpar')
    } finally {
      setIsSaving(false)
    }
  }

  const saveGrowth = async (next: Growth) => {
    setIsSaving(true)
    setError(null)
    try {
      await apiFetch('/projection/growth', { method: 'PUT', body: JSON.stringify(next) })
      await refreshAll()
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar percentuais')
    } finally {
      setIsSaving(false)
    }
  }

  const saveBase = async (nextBase: ProjectionBase) => {
    setIsSaving(true)
    setError(null)
    try {
      await apiFetch('/projection/base', { method: 'PUT', body: JSON.stringify(nextBase) })
      await refreshAll()
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar base')
    } finally {
      setIsSaving(false)
    }
  }

  const saveConfig = async (next: ProjectionConfig) => {
    setIsSaving(true)
    setError(null)
    try {
      setConfig(next)
      await apiFetch('/projection/config', { method: 'PUT', body: JSON.stringify(next) })
      await refreshAll()
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar configuração')
    } finally {
      setIsSaving(false)
    }
  }

  const sortedStreams = useMemo(
    () => [...(config.revenueStreams || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [config.revenueStreams]
  )
  const sortedComponents = useMemo(
    () => [...(config.mktComponents || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [config.mktComponents]
  )

  const growth = base?.growth || snapshot?.growth || { minimo: 0, medio: 0, maximo: 0 }

  const baseRevenueTotals = useMemo(() => {
    if (!base) return new Array(12).fill(0)
    const active = sortedStreams.filter(s => s.isActive !== false)
    const arrs = active.map(s => ensure12(base.prevYear?.revenueStreams?.[s.id]))
    return sumMany(arrs)
  }, [base, sortedStreams])

  const baseMktTotals = useMemo(() => {
    if (!base) return new Array(12).fill(0)
    const active = sortedComponents.filter(c => c.isActive !== false)
    const arrs = active.map(c => ensure12(base.prevYear?.mktComponents?.[c.id]))
    return sumMany(arrs)
  }, [base, sortedComponents])

  const prevYearFixed = useMemo(() => ensure12(base?.prevYear?.fixedExpenses), [base])
  const prevYearVariable = useMemo(() => ensure12(base?.prevYear?.variableExpenses), [base])
  const prevYearInvestments = useMemo(() => ensure12(base?.prevYear?.investments), [base])

  const prevYearDespesasTotais = useMemo(() => prevYearFixed.map((v, i) => v + (prevYearVariable[i] ?? 0)), [prevYearFixed, prevYearVariable])

  const prevYearTotal = useMemo(() => {
    // Total = Faturamento total - Despesas totais - Investimentos - Total MKT
    return baseRevenueTotals.map((fat, i) => fat - (prevYearDespesasTotais[i] ?? 0) - (prevYearInvestments[i] ?? 0) - (baseMktTotals[i] ?? 0))
  }, [baseRevenueTotals, prevYearDespesasTotais, prevYearInvestments, baseMktTotals])

  const mktStackChartData = useMemo(() => {
    const active = sortedComponents.filter(c => c.isActive !== false)
    return MONTHS_SHORT.map((m, i) => {
      const row: Record<string, any> = { month: m }
      let total = 0
      for (const c of active) {
        const v = asNumber(base?.prevYear?.mktComponents?.[c.id]?.[i])
        row[c.name] = v
        total += v
      }
      row.total = total
      return row
    })
  }, [sortedComponents, base])

  const chartKpis = (values: number[]) => {
    const k = computeSeriesKpis(values, MONTHS_SHORT)
    return [
      { label: 'Total anual', value: formatMoneyCompact(k.total) },
      { label: 'Média mensal', value: formatCurrencyBRL(k.average) },
      { label: 'Melhor mês', value: `${k.best.month}: ${formatCurrencyBRL(k.best.value)}` },
      { label: 'Pior mês', value: `${k.worst.month}: ${formatCurrencyBRL(k.worst.value)}` }
    ]
  }

  const buildRevenueStreamSeries = useCallback(
    (streamId: string) => {
      const prevYear = ensure12(base?.prevYear?.revenueStreams?.[streamId])
      const rm = base?.manualOverrides?.revenueManual?.[streamId]
      const prevAuto = applyGrowthPct(prevYear, growth.minimo)
      const medAuto = applyGrowthPct(prevYear, growth.medio)
      const maxAuto = applyGrowthPct(prevYear, growth.maximo)
      const prev = applyOverrides(prevAuto, rm?.previsto || new Array(12).fill(null))
      const med = applyOverrides(medAuto, rm?.medio || new Array(12).fill(null))
      const max = applyOverrides(maxAuto, rm?.maximo || new Array(12).fill(null))
      return { prev, med, max }
    },
    [base, growth]
  )

  // UI: modal de limpeza seletiva (admin)
  const [showSelectiveClear, setShowSelectiveClear] = useState(false)
  const [selectedClearIds, setSelectedClearIds] = useState<string[]>([])
  const clearMap = useMemo(
    () => [
      { id: 'revenue', label: 'Faturamento (streams)' },
      { id: 'mkt', label: 'Dados de MKT (base do ano anterior)' },
      { id: 'fixed', label: 'Despesas Fixas' },
      { id: 'variable', label: 'Despesas Variáveis' },
      { id: 'investments', label: 'Investimentos' }
    ],
    []
  )

  const runSelectiveClear = async () => {
    if (selectedClearIds.length === 0) return
    if (!confirm(`Limpar ${selectedClearIds.length} item(ns) da Projeção?`)) return
    setIsSaving(true)
    try {
      for (const id of selectedClearIds) {
        if (id === 'revenue') await apiFetch('/projection/revenue', { method: 'DELETE' })
        if (id === 'mkt') await apiFetch('/projection/mkt-components', { method: 'DELETE' })
        if (id === 'fixed') await apiFetch('/projection/fixed-expenses', { method: 'DELETE' })
        if (id === 'variable') await apiFetch('/projection/variable-expenses', { method: 'DELETE' })
        if (id === 'investments') await apiFetch('/projection/investments', { method: 'DELETE' })
      }
      setShowSelectiveClear(false)
      setSelectedClearIds([])
      await refreshAll()
    } catch (e: any) {
      setError(e?.message || 'Erro ao limpar')
    } finally {
      setIsSaving(false)
    }
  }

  if (!token) {
    return (
      <div className="p-6">
        <p className="text-gray-700">Você precisa estar logado para acessar a Projeção.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold flex items-center gap-3 text-amber-900">
            <Calculator className="w-8 h-8 text-amber-600" />
            Projeção
          </h1>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <>
                <button
                  onClick={syncNow}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-300 transition-colors"
                  title="Forçar sincronização e recálculo do snapshot"
                >
                  <RefreshCw className="w-4 h-4" />
                  Sincronizar
                </button>
                <button
                  onClick={() => setShowSelectiveClear(true)}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 transition-colors"
                  title="Limpeza seletiva"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar seletivo
                </button>
                <button
                  onClick={clearAll}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 transition-colors"
                  title="Limpar tudo"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar tudo
                </button>
              </>
            )}

            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${!isChartView ? 'text-amber-700' : 'text-gray-500'}`}>
                <Table className="inline w-4 h-4 mr-1" />
                Tabelas
              </span>
              <button
                onClick={() => setIsChartView(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isChartView ? 'bg-amber-600' : 'bg-gray-300'}`}
                title="Alternar visualização"
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isChartView ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className={`text-sm font-medium ${isChartView ? 'text-amber-700' : 'text-gray-500'}`}>
                <BarChart3 className="inline w-4 h-4 mr-1" />
                Gráficos
              </span>
            </div>
          </div>
        </div>

        <p className="text-sm text-amber-700/80">
          Modelo impgeo: você preenche o <b>Resultado do Ano Anterior</b> e o ano corrente é calculado automaticamente (com overrides manuais por cenário).
        </p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3">{error}</div>}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 text-gray-600">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600" />
          Carregando projeção…
        </div>
      ) : !base || !snapshot ? (
        <div className="text-gray-700">Não foi possível carregar a base/snapshot da projeção.</div>
      ) : isChartView ? (
        <div className="space-y-6">
          <ChartCard
            title="Percentual de Crescimento (cenários)"
            subtitle="Define os percentuais para Variáveis/Investimentos/Faturamento"
            onEditSection={() => handleEditSection('growth')}
            kpis={[
              { label: 'Previsto', value: formatPercentBR(growth.minimo) },
              { label: 'Médio', value: formatPercentBR(growth.medio) },
              { label: 'Máximo', value: formatPercentBR(growth.maximo) }
            ]}
          >
            <GrowthPercentBarChart data={[{ name: 'Previsto', value: growth.minimo }, { name: 'Médio', value: growth.medio }, { name: 'Máximo', value: growth.maximo }]} />
          </ChartCard>

          <ChartCard
            title="Faturamento Total"
            subtitle="Somatório de todos os streams (com overrides)"
            onEditSection={() => handleEditSection('revenueTotal')}
            kpis={chartKpis(snapshot.revenueTotals.previsto)}
          >
            <ThreeScenarioLineChart data={mkScenarioPoints(snapshot.revenueTotals.previsto, snapshot.revenueTotals.medio, snapshot.revenueTotals.maximo)} />
          </ChartCard>

          {sortedStreams
            .filter(s => s.isActive !== false)
            .map(s => {
              const series = buildRevenueStreamSeries(s.id)
              return (
                <ChartCard
                  key={s.id}
                  title={`Faturamento — ${s.name}`}
                  subtitle="Derivado do ano anterior + crescimento + overrides"
                  onEditSection={() => handleEditSection(`revenue-${s.id}`)}
                  kpis={chartKpis(series.prev)}
                >
                  <ThreeScenarioLineChart data={mkScenarioPoints(series.prev, series.med, series.max)} />
                </ChartCard>
              )
            })}

          <ChartCard title="Composição MKT (Ano anterior)" subtitle="Componentes empilhados (inputs manuais)" onEditSection={() => handleEditSection('prevYear')}>
            <StackedMktChart data={mktStackChartData as any} stackKeys={sortedComponents.filter(c => c.isActive !== false).map(c => c.name)} />
          </ChartCard>

          <ChartCard title="MKT (Total)" subtitle="Previsto = base; Médio/Máximo aplicam crescimento" onEditSection={() => handleEditSection('mktTotals')} kpis={chartKpis(snapshot.mktTotals.previsto)}>
            <ThreeScenarioLineChart data={mkScenarioPoints(snapshot.mktTotals.previsto, snapshot.mktTotals.medio, snapshot.mktTotals.maximo)} />
          </ChartCard>

          <ChartCard title="Despesas Fixas" onEditSection={() => handleEditSection('fixedExpenses')} kpis={chartKpis(snapshot.fixedExpenses.previsto)}>
            <ThreeScenarioLineChart data={mkScenarioPoints(snapshot.fixedExpenses.previsto, snapshot.fixedExpenses.media, snapshot.fixedExpenses.maximo)} />
          </ChartCard>

          <ChartCard title="Despesas Variáveis" onEditSection={() => handleEditSection('variableExpenses')} kpis={chartKpis(snapshot.variableExpenses.previsto)}>
            <ThreeScenarioLineChart data={mkScenarioPoints(snapshot.variableExpenses.previsto, snapshot.variableExpenses.medio, snapshot.variableExpenses.maximo)} />
          </ChartCard>

          <ChartCard title="Investimentos" onEditSection={() => handleEditSection('investments')} kpis={chartKpis(snapshot.investments.previsto)}>
            <ThreeScenarioLineChart data={mkScenarioPoints(snapshot.investments.previsto, snapshot.investments.medio, snapshot.investments.maximo)} />
          </ChartCard>

          <ChartCard title="Orçamento (Total de Gastos)" onEditSection={() => handleEditSection('budget')} kpis={chartKpis(snapshot.budget.previsto)}>
            <ThreeScenarioLineChart data={mkScenarioPoints(snapshot.budget.previsto, snapshot.budget.medio, snapshot.budget.maximo)} showZeroReferenceLine />
          </ChartCard>

          <ChartCard title="Resultado" onEditSection={() => handleEditSection('resultado')} kpis={chartKpis(snapshot.resultado.previsto)}>
            <ThreeScenarioLineChart data={mkScenarioPoints(snapshot.resultado.previsto, snapshot.resultado.medio, snapshot.resultado.maximo)} showZeroReferenceLine />
          </ChartCard>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Config (admin) */}
          {isAdmin && (
            <div className="bg-white rounded-xl border border-amber-200 shadow-sm">
              <div className="p-4 border-b border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-amber-700" />
                  <h2 className="text-lg font-bold text-amber-900">Configuração (Admin)</h2>
                </div>
                <button
                  onClick={() => saveConfig(config)}
                  disabled={isSaving}
                  className="px-3 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 disabled:bg-gray-300 transition-colors"
                >
                  Salvar configuração
                </button>
              </div>

              <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">Streams de Faturamento</h3>
                    <button
                      onClick={() =>
                        setConfig(prev => ({
                          ...prev,
                          revenueStreams: [
                            ...(prev.revenueStreams || []),
                            { id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, name: 'Novo Stream', order: (prev.revenueStreams?.length || 0) + 1, isActive: true }
                          ]
                        }))
                      }
                      className="text-sm px-3 py-1.5 bg-amber-100 text-amber-800 rounded hover:bg-amber-200"
                    >
                      + Adicionar
                    </button>
                  </div>

                  <div className="space-y-2">
                    {sortedStreams.map(s => (
                      <div key={s.id} className="flex items-center gap-2">
                        <input
                          value={s.name}
                          onChange={e => setConfig(prev => ({ ...prev, revenueStreams: (prev.revenueStreams || []).map(x => (x.id === s.id ? { ...x, name: e.target.value } : x)) }))}
                          className="flex-1 px-2 py-1 border rounded"
                        />
                        <input
                          type="number"
                          value={s.order}
                          onChange={e => setConfig(prev => ({ ...prev, revenueStreams: (prev.revenueStreams || []).map(x => (x.id === s.id ? { ...x, order: asNumber(e.target.value) } : x)) }))}
                          className="w-20 px-2 py-1 border rounded text-right"
                          title="Ordem"
                        />
                        <label className="text-sm flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={s.isActive !== false}
                            onChange={e => setConfig(prev => ({ ...prev, revenueStreams: (prev.revenueStreams || []).map(x => (x.id === s.id ? { ...x, isActive: e.target.checked } : x)) }))}
                          />
                          Ativo
                        </label>
                        <button onClick={() => setConfig(prev => ({ ...prev, revenueStreams: (prev.revenueStreams || []).filter(x => x.id !== s.id) }))} className="p-2 text-red-600 hover:text-red-800" title="Remover">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">Componentes de MKT</h3>
                    <button
                      onClick={() =>
                        setConfig(prev => ({
                          ...prev,
                          mktComponents: [
                            ...(prev.mktComponents || []),
                            { id: `mkt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, name: 'Novo Componente', order: (prev.mktComponents?.length || 0) + 1, isActive: true }
                          ]
                        }))
                      }
                      className="text-sm px-3 py-1.5 bg-amber-100 text-amber-800 rounded hover:bg-amber-200"
                    >
                      + Adicionar
                    </button>
                  </div>

                  <div className="space-y-2">
                    {sortedComponents.map(c => (
                      <div key={c.id} className="flex items-center gap-2">
                        <input
                          value={c.name}
                          onChange={e => setConfig(prev => ({ ...prev, mktComponents: (prev.mktComponents || []).map(x => (x.id === c.id ? { ...x, name: e.target.value } : x)) }))}
                          className="flex-1 px-2 py-1 border rounded"
                        />
                        <input
                          type="number"
                          value={c.order}
                          onChange={e => setConfig(prev => ({ ...prev, mktComponents: (prev.mktComponents || []).map(x => (x.id === c.id ? { ...x, order: asNumber(e.target.value) } : x)) }))}
                          className="w-20 px-2 py-1 border rounded text-right"
                          title="Ordem"
                        />
                        <label className="text-sm flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={c.isActive !== false}
                            onChange={e => setConfig(prev => ({ ...prev, mktComponents: (prev.mktComponents || []).map(x => (x.id === c.id ? { ...x, isActive: e.target.checked } : x)) }))}
                          />
                          Ativo
                        </label>
                        <button onClick={() => setConfig(prev => ({ ...prev, mktComponents: (prev.mktComponents || []).filter(x => x.id !== c.id) }))} className="p-2 text-red-600 hover:text-red-800" title="Remover">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Resultado do Ano Anterior */}
          <div id="projection-section-prevYear" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Resultado do Ano Anterior (base manual)</h2>
                <p className="text-sm text-gray-600 mt-1">Esses valores são a base para calcular o ano corrente.</p>
              </div>
              <button
                onClick={() => saveBase(base)}
                disabled={isSaving}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-300 transition-colors"
              >
                Salvar base
              </button>
            </div>

            <div className="p-4 overflow-x-auto">
              <table className="min-w-[1100px] w-full">
                <thead className="bg-amber-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left sticky left-0 z-10 bg-amber-600">Linha</th>
                    {MONTHS_WITH_QUARTERS.map(col =>
                      col.kind === 'month' ? (
                        <th key={`m-${col.monthIndex}`} className="px-3 py-3 text-right">
                          {MONTHS_LONG[col.monthIndex]}
                        </th>
                      ) : (
                        <th key={`q-${col.startMonthIndex}`} className="px-3 py-3 text-right bg-amber-700">
                          {col.label}
                        </th>
                      )
                    )}
                    <th className="px-3 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    { key: 'fixed', label: 'Despesas Fixas', get: () => ensure12(base.prevYear.fixedExpenses), set: (arr: number[]) => setBase(b => (b ? { ...b, prevYear: { ...b.prevYear, fixedExpenses: arr } } : b)) },
                    { key: 'variable', label: 'Despesas Variáveis', get: () => ensure12(base.prevYear.variableExpenses), set: (arr: number[]) => setBase(b => (b ? { ...b, prevYear: { ...b.prevYear, variableExpenses: arr } } : b)) },
                    { key: 'invest', label: 'Investimentos', get: () => ensure12(base.prevYear.investments), set: (arr: number[]) => setBase(b => (b ? { ...b, prevYear: { ...b.prevYear, investments: arr } } : b)) }
                  ].map(row => {
                    const arr = row.get()
                    return (
                      <tr key={row.key}>
                        <td className="px-4 py-2 font-semibold sticky left-0 z-10 bg-white">{row.label}</td>
                        {MONTHS_WITH_QUARTERS.map(col =>
                          col.kind === 'month' ? (
                            <td key={`m-${col.monthIndex}`} className="px-3 py-2">
                              <NumberCell
                                value={arr[col.monthIndex]}
                                onChange={nv => {
                                  const next = [...arr]
                                  next[col.monthIndex] = nv
                                  row.set(next)
                                }}
                                disabled={isSaving}
                              />
                            </td>
                          ) : (
                            <td key={`q-${col.startMonthIndex}`} className="px-3 py-2 bg-amber-50/40">
                              <CalculatedCell value={sumQuarter(arr, col.startMonthIndex)} />
                            </td>
                          )
                        )}
                        <td className="px-3 py-2">
                          <CalculatedCell value={arr.reduce((s, v) => s + v, 0)} />
                        </td>
                      </tr>
                    )
                  })}

                  {/* Despesas totais (não editável): Fixas + Variáveis */}
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2 font-bold sticky left-0 z-10 bg-gray-50">DESPESAS TOTAIS (Fixas + Variáveis)</td>
                    {MONTHS_WITH_QUARTERS.map(col =>
                      col.kind === 'month' ? (
                        <td key={`m-${col.monthIndex}`} className="px-3 py-2">
                          <CalculatedCell value={prevYearDespesasTotais[col.monthIndex]} />
                        </td>
                      ) : (
                        <td key={`q-${col.startMonthIndex}`} className="px-3 py-2 bg-amber-50/40">
                          <CalculatedCell value={sumQuarter(prevYearDespesasTotais, col.startMonthIndex)} />
                        </td>
                      )
                    )}
                    <td className="px-3 py-2">
                      <CalculatedCell value={prevYearDespesasTotais.reduce((s, v) => s + v, 0)} />
                    </td>
                  </tr>

                  {/* Revenue streams do ano anterior */}
                  {sortedStreams.map(s => {
                    const arr = ensure12(base.prevYear.revenueStreams?.[s.id])
                    return (
                      <tr key={`rev-${s.id}`}>
                        <td className="px-4 py-2 font-semibold sticky left-0 z-10 bg-white">Faturamento — {s.name}</td>
                        {MONTHS_WITH_QUARTERS.map(col =>
                          col.kind === 'month' ? (
                            <td key={`m-${col.monthIndex}`} className="px-3 py-2">
                              <NumberCell
                                value={arr[col.monthIndex]}
                                onChange={nv =>
                                  setBase(b => {
                                    if (!b) return b
                                    const nextArr = ensure12(b.prevYear.revenueStreams?.[s.id])
                                    nextArr[col.monthIndex] = nv
                                    return { ...b, prevYear: { ...b.prevYear, revenueStreams: { ...b.prevYear.revenueStreams, [s.id]: nextArr } } }
                                  })
                                }
                                disabled={isSaving || s.isActive === false}
                              />
                            </td>
                          ) : (
                            <td key={`q-${col.startMonthIndex}`} className="px-3 py-2 bg-amber-50/40">
                              <CalculatedCell value={sumQuarter(arr, col.startMonthIndex)} />
                            </td>
                          )
                        )}
                        <td className="px-3 py-2">
                          <CalculatedCell value={arr.reduce((acc, v) => acc + v, 0)} />
                        </td>
                      </tr>
                    )
                  })}

                  {/* MKT components do ano anterior */}
                  {sortedComponents.map(c => {
                    const arr = ensure12(base.prevYear.mktComponents?.[c.id])
                    return (
                      <tr key={`mkt-${c.id}`} className="bg-gray-50/50">
                        <td className="px-4 py-2 font-semibold sticky left-0 z-10 bg-gray-50/50">MKT — {c.name}</td>
                        {MONTHS_WITH_QUARTERS.map(col =>
                          col.kind === 'month' ? (
                            <td key={`m-${col.monthIndex}`} className="px-3 py-2">
                              <NumberCell
                                value={arr[col.monthIndex]}
                                onChange={nv =>
                                  setBase(b => {
                                    if (!b) return b
                                    const nextArr = ensure12(b.prevYear.mktComponents?.[c.id])
                                    nextArr[col.monthIndex] = nv
                                    return { ...b, prevYear: { ...b.prevYear, mktComponents: { ...b.prevYear.mktComponents, [c.id]: nextArr } } }
                                  })
                                }
                                disabled={isSaving || c.isActive === false}
                              />
                            </td>
                          ) : (
                            <td key={`q-${col.startMonthIndex}`} className="px-3 py-2 bg-amber-50/40">
                              <CalculatedCell value={sumQuarter(arr, col.startMonthIndex)} />
                            </td>
                          )
                        )}
                        <td className="px-3 py-2">
                          <CalculatedCell value={arr.reduce((acc, v) => acc + v, 0)} />
                        </td>
                      </tr>
                    )
                  })}

                  <tr className="bg-amber-50/30">
                    <td className="px-4 py-2 font-bold sticky left-0 z-10 bg-amber-50/30">TOTAL Faturamento (base)</td>
                    {MONTHS_WITH_QUARTERS.map(col =>
                      col.kind === 'month' ? (
                        <td key={`m-${col.monthIndex}`} className="px-3 py-2">
                          <CalculatedCell value={baseRevenueTotals[col.monthIndex]} />
                        </td>
                      ) : (
                        <td key={`q-${col.startMonthIndex}`} className="px-3 py-2 bg-amber-50/40">
                          <CalculatedCell value={sumQuarter(baseRevenueTotals, col.startMonthIndex)} />
                        </td>
                      )
                    )}
                    <td className="px-3 py-2">
                      <CalculatedCell value={baseRevenueTotals.reduce((s, v) => s + v, 0)} />
                    </td>
                  </tr>
                  <tr className="bg-amber-50/30">
                    <td className="px-4 py-2 font-bold sticky left-0 z-10 bg-amber-50/30">TOTAL MKT (base)</td>
                    {MONTHS_WITH_QUARTERS.map(col =>
                      col.kind === 'month' ? (
                        <td key={`m-${col.monthIndex}`} className="px-3 py-2">
                          <CalculatedCell value={baseMktTotals[col.monthIndex]} />
                        </td>
                      ) : (
                        <td key={`q-${col.startMonthIndex}`} className="px-3 py-2 bg-amber-50/40">
                          <CalculatedCell value={sumQuarter(baseMktTotals, col.startMonthIndex)} />
                        </td>
                      )
                    )}
                    <td className="px-3 py-2">
                      <CalculatedCell value={baseMktTotals.reduce((s, v) => s + v, 0)} />
                    </td>
                  </tr>

                  {/* Total final (não editável): Faturamento - DespesasTotais - Investimentos - MKT */}
                  <tr className="bg-amber-100/60">
                    <td className="px-4 py-2 font-bold sticky left-0 z-10 bg-amber-100/60">TOTAL (Faturamento − Despesas − Investimentos − MKT)</td>
                    {MONTHS_WITH_QUARTERS.map(col =>
                      col.kind === 'month' ? (
                        <td key={`m-${col.monthIndex}`} className="px-3 py-2">
                          <CalculatedCell value={prevYearTotal[col.monthIndex]} />
                        </td>
                      ) : (
                        <td key={`q-${col.startMonthIndex}`} className="px-3 py-2 bg-amber-50/40">
                          <CalculatedCell value={sumQuarter(prevYearTotal, col.startMonthIndex)} />
                        </td>
                      )
                    )}
                    <td className="px-3 py-2">
                      <CalculatedCell value={prevYearTotal.reduce((s, v) => s + v, 0)} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Growth */}
          <div id="projection-section-growth" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Percentual de Crescimento (cenários)</h2>
              <p className="text-sm text-gray-600 mt-1">Usado em Variáveis, Investimentos e Faturamento (ano corrente).</p>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['minimo', 'medio', 'maximo'] as const).map(k => (
                <div key={k} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-800 uppercase">{k === 'minimo' ? 'Previsto' : k}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      value={growth[k]}
                      onChange={e => setBase(b => (b ? { ...b, growth: { ...b.growth, [k]: asNumber(e.target.value) } } : b))}
                      className="w-full px-2 py-1 border rounded text-right focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                    <span className="text-sm font-semibold text-amber-900">%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4">
              <button
                onClick={() => saveGrowth(base.growth)}
                disabled={isSaving}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-300 transition-colors"
              >
                Salvar percentuais
              </button>
            </div>
          </div>

          {/* Revenue total (read-only) */}
          <div id="projection-section-revenueTotal" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Faturamento Total (ano corrente)</h2>
              <p className="text-sm text-gray-600 mt-1">Somatório dos streams ativos (com overrides).</p>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="min-w-[1100px] w-full">
                <thead className="bg-amber-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left sticky left-0 z-10 bg-amber-600">Cenário</th>
                    {MONTHS_WITH_QUARTERS.map(col =>
                      col.kind === 'month' ? (
                        <th key={`m-${col.monthIndex}`} className="px-3 py-3 text-right">
                          {MONTHS_LONG[col.monthIndex]}
                        </th>
                      ) : (
                        <th key={`q-${col.startMonthIndex}`} className="px-3 py-3 text-right bg-amber-700">
                          {col.label}
                        </th>
                      )
                    )}
                    <th className="px-3 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    { label: 'Previsto', arr: snapshot.revenueTotals.previsto },
                    { label: 'Médio', arr: snapshot.revenueTotals.medio },
                    { label: 'Máximo', arr: snapshot.revenueTotals.maximo }
                  ].map(row => (
                    <tr key={row.label}>
                      <td className="px-4 py-2 font-semibold sticky left-0 z-10 bg-white">{row.label}</td>
                      {MONTHS_WITH_QUARTERS.map(col =>
                        col.kind === 'month' ? (
                          <td key={`m-${col.monthIndex}`} className="px-3 py-2">
                            <CalculatedCell value={ensure12(row.arr)[col.monthIndex]} />
                          </td>
                        ) : (
                          <td key={`q-${col.startMonthIndex}`} className="px-3 py-2 bg-amber-50/40">
                            <CalculatedCell value={sumQuarter(row.arr, col.startMonthIndex)} />
                          </td>
                        )
                      )}
                      <td className="px-3 py-2">
                        <CalculatedCell value={ensure12(row.arr).reduce((s, v) => s + v, 0)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Revenue streams (derived + overrides) */}
          {sortedStreams.map(stream => {
            const series = buildRevenueStreamSeries(stream.id)
            const overrides = base.manualOverrides?.revenueManual?.[stream.id] || {
              previsto: new Array(12).fill(null),
              medio: new Array(12).fill(null),
              maximo: new Array(12).fill(null)
            }

            return (
              <div key={stream.id} id={`projection-section-revenue-${stream.id}`} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Faturamento — {stream.name} (ano corrente)</h2>
                    <p className="text-sm text-gray-600 mt-1">Derivado do ano anterior + crescimento. Você pode fazer override manual por cenário/mês.</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${stream.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {stream.isActive !== false ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="p-4 overflow-x-auto">
                  <table className="min-w-[1100px] w-full">
                    <thead className="bg-gray-800 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left sticky left-0 z-10 bg-gray-800">Cenário</th>
                        {MONTHS_WITH_QUARTERS.map(col =>
                          col.kind === 'month' ? (
                            <th key={`m-${col.monthIndex}`} className="px-3 py-3 text-right">
                              {MONTHS_LONG[col.monthIndex]}
                            </th>
                          ) : (
                            <th key={`q-${col.startMonthIndex}`} className="px-3 py-3 text-right bg-gray-700">
                              {col.label}
                            </th>
                          )
                        )}
                        <th className="px-3 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {([
                        { key: 'previsto', label: 'Previsto', arr: series.prev, ov: overrides.previsto },
                        { key: 'medio', label: 'Médio', arr: series.med, ov: overrides.medio },
                        { key: 'maximo', label: 'Máximo', arr: series.max, ov: overrides.maximo }
                      ] as const).map(row => (
                        <tr key={row.key} className="bg-amber-50/30">
                          <td className="px-4 py-2 font-semibold sticky left-0 z-10 bg-amber-50/30">{row.label}</td>
                          {MONTHS_WITH_QUARTERS.map(col =>
                            col.kind === 'month' ? (
                              <td key={`m-${col.monthIndex}`} className="px-3 py-2">
                                <OverrideCell
                                  valueEffective={ensure12(row.arr)[col.monthIndex]}
                                  overrideValue={row.ov[col.monthIndex] ?? null}
                                  onSet={nv => {
                                    setBase(b => {
                                      if (!b) return b
                                      const cur = b.manualOverrides.revenueManual?.[stream.id] || {
                                        previsto: new Array(12).fill(null),
                                        medio: new Array(12).fill(null),
                                        maximo: new Array(12).fill(null)
                                      }
                                      const nextArr = ensure12Nullable(cur[row.key])
                                      nextArr[col.monthIndex] = nv
                                      return {
                                        ...b,
                                        manualOverrides: {
                                          ...b.manualOverrides,
                                          revenueManual: {
                                            ...b.manualOverrides.revenueManual,
                                            [stream.id]: { ...cur, [row.key]: nextArr }
                                          }
                                        }
                                      }
                                    })
                                  }}
                                  onClear={() => {
                                    setBase(b => {
                                      if (!b) return b
                                      const cur = b.manualOverrides.revenueManual?.[stream.id]
                                      if (!cur) return b
                                      const nextArr = ensure12Nullable(cur[row.key])
                                      nextArr[col.monthIndex] = null
                                      return {
                                        ...b,
                                        manualOverrides: {
                                          ...b.manualOverrides,
                                          revenueManual: {
                                            ...b.manualOverrides.revenueManual,
                                            [stream.id]: { ...cur, [row.key]: nextArr }
                                          }
                                        }
                                      }
                                    })
                                  }}
                                  disabled={isSaving || stream.isActive === false}
                                />
                              </td>
                            ) : (
                              <td key={`q-${col.startMonthIndex}`} className="px-3 py-2 bg-amber-50/40">
                                <CalculatedCell value={sumQuarter(row.arr, col.startMonthIndex)} />
                              </td>
                            )
                          )}
                          <td className="px-3 py-2">
                            <CalculatedCell value={ensure12(row.arr).reduce((s, x) => s + x, 0)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 pb-4">
                  <button
                    onClick={() => saveBase(base)}
                    disabled={isSaving}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-300 transition-colors"
                  >
                    Salvar overrides de faturamento
                  </button>
                </div>
              </div>
            )
          })}

          {/* MKT totals (read-only) */}
          <div id="projection-section-mktTotals" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">MKT (Total) — ano corrente</h2>
              <p className="text-sm text-gray-600 mt-1">Previsto = base (sem crescimento). Médio/Máximo aplicam crescimento. Você pode fazer override manual por cenário/mês.</p>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="min-w-[1100px] w-full">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left sticky left-0 z-10 bg-gray-800">Cenário</th>
                    {MONTHS_WITH_QUARTERS.map(col =>
                      col.kind === 'month' ? (
                        <th key={`m-${col.monthIndex}`} className="px-3 py-3 text-right">
                          {MONTHS_LONG[col.monthIndex]}
                        </th>
                      ) : (
                        <th key={`q-${col.startMonthIndex}`} className="px-3 py-3 text-right bg-gray-700">
                          {col.label}
                        </th>
                      )
                    )}
                    <th className="px-3 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {([
                    { key: 'mktPrevistoManual', label: 'Previsto', arr: snapshot.mktTotals.previsto, ov: base.manualOverrides.mktPrevistoManual },
                    { key: 'mktMedioManual', label: 'Médio', arr: snapshot.mktTotals.medio, ov: base.manualOverrides.mktMedioManual },
                    { key: 'mktMaximoManual', label: 'Máximo', arr: snapshot.mktTotals.maximo, ov: base.manualOverrides.mktMaximoManual }
                  ] as const).map(row => (
                    <tr key={row.key} className="bg-amber-50/30">
                      <td className="px-4 py-2 font-semibold sticky left-0 z-10 bg-amber-50/30">{row.label}</td>
                      {MONTHS_WITH_QUARTERS.map(col =>
                        col.kind === 'month' ? (
                          <td key={`m-${col.monthIndex}`} className="px-3 py-2">
                            <OverrideCell
                              valueEffective={ensure12(row.arr)[col.monthIndex]}
                              overrideValue={row.ov[col.monthIndex] ?? null}
                              onSet={nv => {
                                setBase(b =>
                                  b
                                    ? {
                                        ...b,
                                        manualOverrides: {
                                          ...b.manualOverrides,
                                          [row.key]: ensure12Nullable(b.manualOverrides[row.key]).map((x, idx) => (idx === col.monthIndex ? nv : x))
                                        }
                                      }
                                    : b
                                )
                              }}
                              onClear={() => {
                                setBase(b =>
                                  b
                                    ? {
                                        ...b,
                                        manualOverrides: {
                                          ...b.manualOverrides,
                                          [row.key]: ensure12Nullable(b.manualOverrides[row.key]).map((x, idx) => (idx === col.monthIndex ? null : x))
                                        }
                                      }
                                    : b
                                )
                              }}
                              disabled={isSaving}
                            />
                          </td>
                        ) : (
                          <td key={`q-${col.startMonthIndex}`} className="px-3 py-2 bg-amber-50/40">
                            <CalculatedCell value={sumQuarter(row.arr, col.startMonthIndex)} />
                          </td>
                        )
                      )}
                      <td className="px-3 py-2">
                        <CalculatedCell value={ensure12(row.arr).reduce((s, v) => s + v, 0)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 pb-4">
              <button
                onClick={() => saveBase(base)}
                disabled={isSaving}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-300 transition-colors"
              >
                Salvar MKT (overrides)
              </button>
            </div>
          </div>

          {/* Fixed expenses (derived + overrides) */}
          <div id="projection-section-fixedExpenses" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Despesas Fixas (ano corrente)</h2>
                <p className="text-sm text-gray-600 mt-1">Previsto segue a regra impgeo baseada no Dezembro do ano anterior. Overrides por cenário/mês.</p>
              </div>
              <button onClick={() => saveBase(base)} disabled={isSaving} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-300 transition-colors">
                Salvar overrides
              </button>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="min-w-[1100px] w-full">
                <thead className="bg-amber-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left sticky left-0 z-10 bg-amber-600">Cenário</th>
                    {MONTHS_WITH_QUARTERS.map(col =>
                      col.kind === 'month' ? (
                        <th key={`m-${col.monthIndex}`} className="px-3 py-3 text-right">
                          {MONTHS_LONG[col.monthIndex]}
                        </th>
                      ) : (
                        <th key={`q-${col.startMonthIndex}`} className="px-3 py-3 text-right bg-amber-700">
                          {col.label}
                        </th>
                      )
                    )}
                    <th className="px-3 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {([
                    { key: 'fixedPrevistoManual', label: 'Previsto', arr: snapshot.fixedExpenses.previsto, ov: base.manualOverrides.fixedPrevistoManual },
                    { key: 'fixedMediaManual', label: 'Médio', arr: snapshot.fixedExpenses.media, ov: base.manualOverrides.fixedMediaManual },
                    { key: 'fixedMaximoManual', label: 'Máximo', arr: snapshot.fixedExpenses.maximo, ov: base.manualOverrides.fixedMaximoManual }
                  ] as const).map(row => (
                    <tr key={row.key} className="bg-amber-50/30">
                      <td className="px-4 py-2 font-semibold sticky left-0 z-10 bg-amber-50/30">{row.label}</td>
                      {MONTHS_WITH_QUARTERS.map(col =>
                        col.kind === 'month' ? (
                          <td key={`m-${col.monthIndex}`} className="px-3 py-2">
                            <OverrideCell
                              valueEffective={ensure12(row.arr)[col.monthIndex]}
                              overrideValue={row.ov[col.monthIndex] ?? null}
                              onSet={nv => {
                                setBase(b =>
                                  b
                                    ? {
                                        ...b,
                                        manualOverrides: {
                                          ...b.manualOverrides,
                                          [row.key]: ensure12Nullable(b.manualOverrides[row.key]).map((x, idx) => (idx === col.monthIndex ? nv : x))
                                        }
                                      }
                                    : b
                                )
                              }}
                              onClear={() => {
                                setBase(b =>
                                  b
                                    ? {
                                        ...b,
                                        manualOverrides: {
                                          ...b.manualOverrides,
                                          [row.key]: ensure12Nullable(b.manualOverrides[row.key]).map((x, idx) => (idx === col.monthIndex ? null : x))
                                        }
                                      }
                                    : b
                                )
                              }}
                              disabled={isSaving}
                            />
                          </td>
                        ) : (
                          <td key={`q-${col.startMonthIndex}`} className="px-3 py-2 bg-amber-50/40">
                            <CalculatedCell value={sumQuarter(row.arr, col.startMonthIndex)} />
                          </td>
                        )
                      )}
                      <td className="px-3 py-2">
                        <CalculatedCell value={ensure12(row.arr).reduce((s, v) => s + v, 0)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Variable expenses (derived + overrides) */}
          <div id="projection-section-variableExpenses" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Despesas Variáveis (ano corrente)</h2>
                <p className="text-sm text-gray-600 mt-1">Base do ano anterior + crescimento + overrides por cenário/mês.</p>
              </div>
              <button onClick={() => saveBase(base)} disabled={isSaving} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-300 transition-colors">
                Salvar overrides
              </button>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="min-w-[1100px] w-full">
                <thead className="bg-amber-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left sticky left-0 z-10 bg-amber-600">Cenário</th>
                    {MONTHS_WITH_QUARTERS.map(col =>
                      col.kind === 'month' ? (
                        <th key={`m-${col.monthIndex}`} className="px-3 py-3 text-right">
                          {MONTHS_LONG[col.monthIndex]}
                        </th>
                      ) : (
                        <th key={`q-${col.startMonthIndex}`} className="px-3 py-3 text-right bg-amber-700">
                          {col.label}
                        </th>
                      )
                    )}
                    <th className="px-3 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {([
                    { key: 'variablePrevistoManual', label: 'Previsto', arr: snapshot.variableExpenses.previsto, ov: base.manualOverrides.variablePrevistoManual },
                    { key: 'variableMedioManual', label: 'Médio', arr: snapshot.variableExpenses.medio, ov: base.manualOverrides.variableMedioManual },
                    { key: 'variableMaximoManual', label: 'Máximo', arr: snapshot.variableExpenses.maximo, ov: base.manualOverrides.variableMaximoManual }
                  ] as const).map(row => (
                    <tr key={row.key} className="bg-amber-50/30">
                      <td className="px-4 py-2 font-semibold sticky left-0 z-10 bg-amber-50/30">{row.label}</td>
                      {MONTHS_WITH_QUARTERS.map(col =>
                        col.kind === 'month' ? (
                          <td key={`m-${col.monthIndex}`} className="px-3 py-2">
                            <OverrideCell
                              valueEffective={ensure12(row.arr)[col.monthIndex]}
                              overrideValue={row.ov[col.monthIndex] ?? null}
                              onSet={nv => {
                                setBase(b =>
                                  b
                                    ? {
                                        ...b,
                                        manualOverrides: {
                                          ...b.manualOverrides,
                                          [row.key]: ensure12Nullable(b.manualOverrides[row.key]).map((x, idx) => (idx === col.monthIndex ? nv : x))
                                        }
                                      }
                                    : b
                                )
                              }}
                              onClear={() => {
                                setBase(b =>
                                  b
                                    ? {
                                        ...b,
                                        manualOverrides: {
                                          ...b.manualOverrides,
                                          [row.key]: ensure12Nullable(b.manualOverrides[row.key]).map((x, idx) => (idx === col.monthIndex ? null : x))
                                        }
                                      }
                                    : b
                                )
                              }}
                              disabled={isSaving}
                            />
                          </td>
                        ) : (
                          <td key={`q-${col.startMonthIndex}`} className="px-3 py-2 bg-amber-50/40">
                            <CalculatedCell value={sumQuarter(row.arr, col.startMonthIndex)} />
                          </td>
                        )
                      )}
                      <td className="px-3 py-2">
                        <CalculatedCell value={ensure12(row.arr).reduce((s, v) => s + v, 0)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Investments (derived + overrides) */}
          <div id="projection-section-investments" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Investimentos (ano corrente)</h2>
                <p className="text-sm text-gray-600 mt-1">Base do ano anterior + crescimento + overrides por cenário/mês.</p>
              </div>
              <button onClick={() => saveBase(base)} disabled={isSaving} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-300 transition-colors">
                Salvar overrides
              </button>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="min-w-[1100px] w-full">
                <thead className="bg-amber-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left sticky left-0 z-10 bg-amber-600">Cenário</th>
                    {MONTHS_WITH_QUARTERS.map(col =>
                      col.kind === 'month' ? (
                        <th key={`m-${col.monthIndex}`} className="px-3 py-3 text-right">
                          {MONTHS_LONG[col.monthIndex]}
                        </th>
                      ) : (
                        <th key={`q-${col.startMonthIndex}`} className="px-3 py-3 text-right bg-amber-700">
                          {col.label}
                        </th>
                      )
                    )}
                    <th className="px-3 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {([
                    { key: 'investimentosPrevistoManual', label: 'Previsto', arr: snapshot.investments.previsto, ov: base.manualOverrides.investimentosPrevistoManual },
                    { key: 'investimentosMedioManual', label: 'Médio', arr: snapshot.investments.medio, ov: base.manualOverrides.investimentosMedioManual },
                    { key: 'investimentosMaximoManual', label: 'Máximo', arr: snapshot.investments.maximo, ov: base.manualOverrides.investimentosMaximoManual }
                  ] as const).map(row => (
                    <tr key={row.key} className="bg-amber-50/30">
                      <td className="px-4 py-2 font-semibold sticky left-0 z-10 bg-amber-50/30">{row.label}</td>
                      {MONTHS_WITH_QUARTERS.map(col =>
                        col.kind === 'month' ? (
                          <td key={`m-${col.monthIndex}`} className="px-3 py-2">
                            <OverrideCell
                              valueEffective={ensure12(row.arr)[col.monthIndex]}
                              overrideValue={row.ov[col.monthIndex] ?? null}
                              onSet={nv => {
                                setBase(b =>
                                  b
                                    ? {
                                        ...b,
                                        manualOverrides: {
                                          ...b.manualOverrides,
                                          [row.key]: ensure12Nullable(b.manualOverrides[row.key]).map((x, idx) => (idx === col.monthIndex ? nv : x))
                                        }
                                      }
                                    : b
                                )
                              }}
                              onClear={() => {
                                setBase(b =>
                                  b
                                    ? {
                                        ...b,
                                        manualOverrides: {
                                          ...b.manualOverrides,
                                          [row.key]: ensure12Nullable(b.manualOverrides[row.key]).map((x, idx) => (idx === col.monthIndex ? null : x))
                                        }
                                      }
                                    : b
                                )
                              }}
                              disabled={isSaving}
                            />
                          </td>
                        ) : (
                          <td key={`q-${col.startMonthIndex}`} className="px-3 py-2 bg-amber-50/40">
                            <CalculatedCell value={sumQuarter(row.arr, col.startMonthIndex)} />
                          </td>
                        )
                      )}
                      <td className="px-3 py-2">
                        <CalculatedCell value={ensure12(row.arr).reduce((s, v) => s + v, 0)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Budget */}
          <div id="projection-section-budget" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Orçamento (Total de Gastos)</h2>
              <p className="text-sm text-gray-600 mt-1">Somatório (Fixas + Variáveis + Investimentos + MKT), por cenário.</p>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="min-w-[1100px] w-full">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left sticky left-0 z-10 bg-gray-800">Cenário</th>
                    {MONTHS_WITH_QUARTERS.map(col =>
                      col.kind === 'month' ? (
                        <th key={`m-${col.monthIndex}`} className="px-3 py-3 text-right">
                          {MONTHS_LONG[col.monthIndex]}
                        </th>
                      ) : (
                        <th key={`q-${col.startMonthIndex}`} className="px-3 py-3 text-right bg-gray-700">
                          {col.label}
                        </th>
                      )
                    )}
                    <th className="px-3 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    { label: 'Previsto', arr: snapshot.budget.previsto },
                    { label: 'Médio', arr: snapshot.budget.medio },
                    { label: 'Máximo', arr: snapshot.budget.maximo }
                  ].map(row => (
                    <tr key={row.label}>
                      <td className="px-4 py-2 font-semibold sticky left-0 z-10 bg-white">{row.label}</td>
                      {MONTHS_WITH_QUARTERS.map(col =>
                        col.kind === 'month' ? (
                          <td key={`m-${col.monthIndex}`} className="px-3 py-2">
                            <CalculatedCell value={ensure12(row.arr)[col.monthIndex]} />
                          </td>
                        ) : (
                          <td key={`q-${col.startMonthIndex}`} className="px-3 py-2 bg-amber-50/40">
                            <CalculatedCell value={sumQuarter(row.arr, col.startMonthIndex)} />
                          </td>
                        )
                      )}
                      <td className="px-3 py-2">
                        <CalculatedCell value={ensure12(row.arr).reduce((s, v) => s + v, 0)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resultado */}
          <div id="projection-section-resultado" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Resultado</h2>
              <p className="text-sm text-gray-600 mt-1">Faturamento Total − Orçamento, por cenário.</p>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="min-w-[1100px] w-full">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left sticky left-0 z-10 bg-gray-800">Cenário</th>
                    {MONTHS_WITH_QUARTERS.map(col =>
                      col.kind === 'month' ? (
                        <th key={`m-${col.monthIndex}`} className="px-3 py-3 text-right">
                          {MONTHS_LONG[col.monthIndex]}
                        </th>
                      ) : (
                        <th key={`q-${col.startMonthIndex}`} className="px-3 py-3 text-right bg-gray-700">
                          {col.label}
                        </th>
                      )
                    )}
                    <th className="px-3 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    { label: 'Previsto', arr: snapshot.resultado.previsto },
                    { label: 'Médio', arr: snapshot.resultado.medio },
                    { label: 'Máximo', arr: snapshot.resultado.maximo }
                  ].map(row => (
                    <tr key={row.label}>
                      <td className="px-4 py-2 font-semibold sticky left-0 z-10 bg-white">{row.label}</td>
                      {MONTHS_WITH_QUARTERS.map(col =>
                        col.kind === 'month' ? (
                          <td key={`m-${col.monthIndex}`} className="px-3 py-2">
                            <CalculatedCell value={ensure12(row.arr)[col.monthIndex]} />
                          </td>
                        ) : (
                          <td key={`q-${col.startMonthIndex}`} className="px-3 py-2 bg-amber-50/40">
                            <CalculatedCell value={sumQuarter(row.arr, col.startMonthIndex)} />
                          </td>
                        )
                      )}
                      <td className="px-3 py-2">
                        <CalculatedCell value={ensure12(row.arr).reduce((s, v) => s + v, 0)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal limpeza seletiva */}
      {showSelectiveClear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSelectiveClear(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-amber-900">Limpeza seletiva</h3>
            <p className="text-sm text-gray-600 mt-1">Selecione o que deseja limpar (apenas admin).</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {clearMap.map(it => (
                <label key={it.id} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedClearIds.includes(it.id)}
                    onChange={() => setSelectedClearIds(prev => (prev.includes(it.id) ? prev.filter(x => x !== it.id) : [...prev, it.id]))}
                  />
                  <span className="text-sm font-medium text-gray-800">{it.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowSelectiveClear(false)} className="flex-1 px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">
                Cancelar
              </button>
              <button
                onClick={runSelectiveClear}
                disabled={isSaving || selectedClearIds.length === 0}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300"
              >
                {isSaving ? 'Limpando…' : 'Limpar selecionados'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

