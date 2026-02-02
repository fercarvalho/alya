import type { MonthlyScenarioPoint } from './ThreeScenarioLineChart'

export function buildMonthlyScenarioData(params: {
  months: string[]
  calcPrevisto: (monthIndex: number) => number
  calcMedio: (monthIndex: number) => number
  calcMaximo: (monthIndex: number) => number
}): MonthlyScenarioPoint[] {
  const { months, calcPrevisto, calcMedio, calcMaximo } = params
  return months.map((m, i) => ({
    month: m,
    previsto: Number(calcPrevisto(i) ?? 0),
    medio: Number(calcMedio(i) ?? 0),
    maximo: Number(calcMaximo(i) ?? 0)
  }))
}

export function buildMonthlyBaseSeries(months: string[], values: number[]): { month: string; value: number }[] {
  return months.map((m, i) => ({
    month: m,
    value: Number(values?.[i] ?? 0)
  }))
}

