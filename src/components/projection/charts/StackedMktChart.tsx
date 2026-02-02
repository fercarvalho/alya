import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrencyBRL } from './formatters'

export type MonthlyMktPoint = {
  month: string
  // Observação: no Alya os componentes são dinâmicos; este chart aceita keys genéricas,
  // mas mantém compatibilidade com o modelo do impgeo se necessário.
  [key: string]: any
}

type Props = {
  data: MonthlyMktPoint[]
  height?: number
  showTotalLine?: boolean
  // enabled por chave (quando usado em modo compat)
  enabled?: Record<string, boolean>
  // chaves empilhadas; se omitido, tenta inferir do primeiro item (exceto month/total)
  stackKeys?: string[]
}

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#111827']

export function StackedMktChart({ data, height = 340, showTotalLine = true, enabled, stackKeys }: Props) {
  const keys =
    stackKeys && stackKeys.length
      ? stackKeys
      : Object.keys(data?.[0] || {}).filter(k => k !== 'month' && k !== 'total')

  const colorsByKey: Record<string, string> = {}
  keys.forEach((k, idx) => {
    colorsByKey[k] = DEFAULT_COLORS[idx % DEFAULT_COLORS.length]
  })

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null

    const byKey: Record<string, number> = {}
    for (const p of payload) {
      if (p?.dataKey) byKey[p.dataKey] = p.value
    }

    const total = keys.reduce((sum, k) => sum + Number(byKey[k] ?? 0), 0)

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="font-semibold text-gray-800 mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          {keys.map(k => (
            <div key={k} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorsByKey[k] }} />
                {k}
              </span>
              <span className="font-semibold text-gray-800">{formatCurrencyBRL(Number(byKey[k] ?? 0))}</span>
            </div>
          ))}
          <div className="border-t border-gray-200 pt-2 mt-2 flex items-center justify-between gap-4">
            <span className="font-semibold text-gray-700">Total</span>
            <span className="font-bold text-gray-900">{formatCurrencyBRL(total)}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis
            tickFormatter={(v: any) => {
              const n = Number(v)
              try {
                return n.toLocaleString('pt-BR', { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 })
              } catch {
                return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
              }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {keys.map(k => {
            const isEnabled = enabled ? enabled[k] ?? true : true
            if (!isEnabled) return null
            return <Bar key={k} dataKey={k} name={k} stackId="mkt" fill={colorsByKey[k]} />
          })}

          {showTotalLine && (enabled ? enabled.total ?? true : true) && (
            <Line type="monotone" dataKey="total" name="Total" stroke="#111827" strokeWidth={2} dot={false} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

