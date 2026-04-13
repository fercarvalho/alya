import React, { useState, useEffect, useMemo, useRef } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Download, FileText, Filter, BarChart3, ArrowLeftRight } from 'lucide-react'
import { parseLocalDate } from '../utils/dateUtils'
import { API_BASE_URL } from '../config/api'
import { useAuth } from '../contexts/AuthContext'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface Transaction {
  id: string
  date: string
  description: string
  value: number
  type: 'Receita' | 'Despesa'
  category: string
  createdAt?: string
  updatedAt?: string
}

interface DRERow {
  id: string
  description: string
  value: number
  valuePrevious?: number
  variation?: number
  variationPercent?: number
  type: 'receita' | 'despesa' | 'total'
  level: number
  parent?: string
}

const DRE: React.FC = () => {
  const { token, logout } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'mensal' | 'trimestral' | 'anual'>('mensal')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [isLoading, setIsLoading] = useState(true)
  const dreContentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      setIsLoading(true)
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const response = await fetch(`${API_BASE_URL}/transactions`, { headers })
      const result = await response.json()

      if (response.status === 401 || response.status === 403) {
        logout()
        return
      }

      if (result.success) {
        setTransactions(result.data)
      }
    } catch (error) {
      console.error('Erro ao buscar transações:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Função para calcular período anterior
  const getPreviousPeriod = (period: 'mensal' | 'trimestral' | 'anual', month: number, year: number) => {
    if (period === 'mensal') {
      if (month === 0) {
        return { month: 11, year: year - 1 }
      }
      return { month: month - 1, year }
    } else if (period === 'trimestral') {
      const quarterStart = Math.floor(month / 3) * 3
      if (quarterStart === 0) {
        return { month: 9, year: year - 1 } // Q4 do ano anterior
      }
      return { month: quarterStart - 3, year }
    } else {
      return { month: 0, year: year - 1 }
    }
  }

  // Filtrar transações por período
  const filterTransactionsByPeriod = (month: number, year: number, period: 'mensal' | 'trimestral' | 'anual') => {
    const normalizedMonth = period === 'trimestral' ? Math.floor(month / 3) * 3 : month
    const startDate = new Date(year, normalizedMonth, 1)
    let endDate: Date

    if (period === 'mensal') {
      endDate = new Date(year, normalizedMonth + 1, 0)
    } else if (period === 'trimestral') {
      endDate = new Date(year, normalizedMonth + 3, 0)
    } else {
      endDate = new Date(year, 11, 31)
    }

    return transactions.filter(transaction => {
      const transactionDate = parseLocalDate(transaction.date)
      return transactionDate >= startDate && transactionDate <= endDate
    })
  }

  const filteredTransactions = useMemo(() => {
    return filterTransactionsByPeriod(selectedMonth, selectedYear, selectedPeriod)
  }, [transactions, selectedPeriod, selectedMonth, selectedYear])

  const previousPeriod = useMemo(() => {
    return getPreviousPeriod(selectedPeriod, selectedMonth, selectedYear)
  }, [selectedPeriod, selectedMonth, selectedYear])

  const previousPeriodTransactions = useMemo(() => {
    return filterTransactionsByPeriod(previousPeriod.month, previousPeriod.year, selectedPeriod)
  }, [transactions, selectedPeriod, previousPeriod.month, previousPeriod.year])

  // Helpers case-insensitive para tipo de transação (Receita, RECEITA, receita, DESpesAS, etc.)
  const isReceita = (type: string) => /receita/i.test(type || '')
  const isDespesa = (type: string) => /despesa/i.test(type || '')

  // Gerar DRE para um conjunto de transações
  const generateDRE = (transactions: Transaction[]): DRERow[] => {
    const receitas = transactions.filter(t => isReceita(t.type))
    const despesas = transactions.filter(t => isDespesa(t.type))

    const totalReceitas = receitas.reduce((sum, t) => sum + Number(t.value), 0)
    const totalDespesas = despesas.reduce((sum, t) => sum + Number(t.value), 0)
    const resultadoLiquido = totalReceitas - totalDespesas

    // Agrupar receitas por categoria (tratar categoria vazia como "Outros")
    const receitasPorCategoria = receitas.reduce((acc, t) => {
      const categoria = t.category && t.category.trim() ? t.category : 'Outros'
      if (!acc[categoria]) acc[categoria] = 0
      acc[categoria] += Number(t.value)
      return acc
    }, {} as Record<string, number>)

    // Agrupar despesas por categoria (tratar categoria vazia como "Outros")
    const despesasPorCategoria = despesas.reduce((acc, t) => {
      const categoria = t.category && t.category.trim() ? t.category : 'Outros'
      if (!acc[categoria]) acc[categoria] = 0
      acc[categoria] += Number(t.value)
      return acc
    }, {} as Record<string, number>)

    const dreRows: DRERow[] = [
      // Receitas
      {
        id: 'receitas',
        description: 'RECEITAS OPERACIONAIS',
        value: totalReceitas,
        type: 'total',
        level: 0
      }
    ]

    // Adicionar receitas por categoria
    Object.entries(receitasPorCategoria).forEach(([categoria, valor]) => {
      dreRows.push({
        id: `receita-${categoria}`,
        description: categoria,
        value: valor,
        type: 'receita',
        level: 1,
        parent: 'receitas'
      })
    })

    // Despesas
    dreRows.push({
      id: 'despesas',
      description: 'DESPESAS OPERACIONAIS',
      value: totalDespesas,
      type: 'total',
      level: 0
    })

    // Adicionar despesas por categoria
    Object.entries(despesasPorCategoria).forEach(([categoria, valor]) => {
      dreRows.push({
        id: `despesa-${categoria}`,
        description: categoria,
        value: valor,
        type: 'despesa',
        level: 1,
        parent: 'despesas'
      })
    })

    // Resultado
    dreRows.push({
      id: 'resultado',
      description: 'RESULTADO LÍQUIDO',
      value: resultadoLiquido,
      type: resultadoLiquido >= 0 ? 'receita' : 'despesa',
      level: 0
    })

    return dreRows
  }

  const currentDRE = useMemo(() => {
    return generateDRE(filteredTransactions)
  }, [filteredTransactions])

  const previousDRE = useMemo(() => {
    return generateDRE(previousPeriodTransactions)
  }, [previousPeriodTransactions])

  // Combinar DRE atual com anterior para comparação
  const dreWithComparison = useMemo(() => {
    return currentDRE.map(row => {
      const previousRow = previousDRE.find(r => r.id === row.id)
      if (previousRow) {
        const prevVal = Number(previousRow.value) || 0
        const currVal = Number(row.value) || 0
        const variation = currVal - prevVal
        const variationPercent = prevVal !== 0
          ? ((currVal - prevVal) / Math.abs(prevVal)) * 100
          : currVal > 0 ? 100 : (currVal < 0 ? -100 : 0)

        return {
          ...row,
          valuePrevious: previousRow.value,
          variation,
          variationPercent
        }
      }
      return row
    })
  }, [currentDRE, previousDRE])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100)
  }

  const getMonthName = (month: number) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    return months[month]
  }

  const getPeriodLabel = () => {
    if (selectedPeriod === 'mensal') {
      return `${getMonthName(selectedMonth)} ${selectedYear}`
    } else if (selectedPeriod === 'trimestral') {
      const trimestre = Math.floor(selectedMonth / 3) + 1
      return `${trimestre}º Trimestre ${selectedYear}`
    } else {
      return `Ano ${selectedYear}`
    }
  }

  const getPreviousPeriodLabel = () => {
    if (selectedPeriod === 'mensal') {
      return `${getMonthName(previousPeriod.month)} ${previousPeriod.year}`
    } else if (selectedPeriod === 'trimestral') {
      const trimestre = Math.floor(previousPeriod.month / 3) + 1
      return `${trimestre}º Trimestre ${previousPeriod.year}`
    } else {
      return `Ano ${previousPeriod.year}`
    }
  }

  // Exportar DRE em PDF
  const exportarPDF = async () => {
    if (!dreContentRef.current) return

    try {
      const canvas = await html2canvas(dreContentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210 // Largura de uma página A4 em mm
      const pageHeight = 295 // Altura de uma página A4 em mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const filename = `DRE_${getPeriodLabel().replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(filename)
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      alert('Erro ao exportar PDF. Tente novamente.')
    }
  }

  // Exportar DRE em Excel
  const exportarExcel = async () => {
    try {
      // Criar dados para exportação
      const dadosAtual = dreWithComparison.map(row => ({
        'Descrição': row.description,
        'Valor Atual': row.value,
        'Valor Anterior': row.valuePrevious || 0,
        'Variação': row.variation || 0,
        'Variação %': row.variationPercent !== undefined ? `${row.variationPercent.toFixed(2)}%` : '-'
      }))

      const dadosAnterior = previousDRE.map(row => ({
        'Descrição': row.description,
        'Valor': row.value
      }))

      // Converter para CSV (formato simples que funciona em Excel)
      const csvAtual = [
        ['DRE - ' + getPeriodLabel()],
        [''],
        ['Descrição', 'Valor Atual', 'Valor Anterior', 'Variação', 'Variação %'],
        ...dadosAtual.map(row => [
          `"${row['Descrição']}"`,
          row['Valor Atual'].toFixed(2),
          row['Valor Anterior'].toFixed(2),
          row['Variação'].toFixed(2),
          row['Variação %']
        ])
      ].map(row => row.join(',')).join('\n')

      const csvAnterior = [
        ['DRE - ' + getPreviousPeriodLabel()],
        [''],
        ['Descrição', 'Valor'],
        ...dadosAnterior.map(row => [
          `"${row['Descrição']}"`,
          row['Valor'].toFixed(2)
        ])
      ].map(row => row.join(',')).join('\n')

      const csvCompleto = csvAtual + '\n\n' + csvAnterior

      // Criar blob e download
      const blob = new Blob(['\ufeff' + csvCompleto], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `DRE_${getPeriodLabel().replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao exportar Excel:', error)
      alert('Erro ao exportar Excel. Tente novamente.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    )
  }

  const totalReceitas = dreWithComparison.find(r => r.id === 'receitas')?.value || 0
  const totalDespesas = dreWithComparison.find(r => r.id === 'despesas')?.value || 0
  const resultadoLiquido = dreWithComparison.find(r => r.id === 'resultado')?.value || 0

  const receitasAnterior = previousDRE.find(r => r.id === 'receitas')?.value || 0
  const despesasAnterior = previousDRE.find(r => r.id === 'despesas')?.value || 0
  const resultadoAnterior = previousDRE.find(r => r.id === 'resultado')?.value || 0

  const variacaoReceitas = totalReceitas - receitasAnterior
  const variacaoReceitasPercent = (receitasAnterior && Number(receitasAnterior) !== 0)
    ? ((totalReceitas - receitasAnterior) / Math.abs(receitasAnterior)) * 100
    : totalReceitas > 0 ? 100 : 0

  const variacaoDespesas = totalDespesas - despesasAnterior
  const variacaoDespesasPercent = (despesasAnterior && Number(despesasAnterior) !== 0)
    ? ((totalDespesas - despesasAnterior) / Math.abs(despesasAnterior)) * 100
    : totalDespesas > 0 ? 100 : 0

  const variacaoResultado = resultadoLiquido - resultadoAnterior
  const variacaoResultadoPercent = (resultadoAnterior && Number(resultadoAnterior) !== 0)
    ? ((resultadoLiquido - resultadoAnterior) / Math.abs(resultadoAnterior)) * 100
    : resultadoLiquido > 0 ? 100 : (resultadoLiquido < 0 ? -100 : 0)

  return (
    <div className="space-y-6" ref={dreContentRef}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3"><BarChart3 className="w-8 h-8 text-amber-500" />DRE - Demonstrativo de Resultado do Exercício</h1>
          <p className="text-gray-600">Análise de receitas e despesas do período</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportarPDF}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <Download className="h-5 w-5" />
            Exportar PDF
          </button>
          <button
            onClick={exportarExcel}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-green-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <FileText className="h-5 w-5" />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-800 p-4 rounded-2xl border border-amber-200 dark:border-gray-700 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
          {/* Título */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
              FILTRE SEUS ITENS:
            </h2>
          </div>

          {/* Campos de Filtro */}
          <div className="flex items-end gap-1 sm:gap-2 md:gap-3 lg:gap-4 flex-1">
            <div className="flex flex-col flex-1 min-w-0">
              <label htmlFor="dre-period-filter" className="text-xs sm:text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate">
                Período
              </label>
              <select
                id="dre-period-filter"
                name="dre-period-filter"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as 'mensal' | 'trimestral' | 'anual')}
                className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 dark:border-gray-600 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:!bg-gray-700 dark:text-gray-100 w-full"
              >
                <option value="mensal">Mensal</option>
                <option value="trimestral">Trimestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>

            {selectedPeriod !== 'anual' && (
              <div className="flex flex-col flex-1 min-w-0">
                <label htmlFor="dre-month-filter" className="text-xs sm:text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate">
                  Mês
                </label>
                <select
                  id="dre-month-filter"
                  name="dre-month-filter"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 dark:border-gray-600 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:!bg-gray-700 dark:text-gray-100 w-full"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>
                      {getMonthName(i)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col flex-1 min-w-0">
              <label htmlFor="dre-year-filter" className="text-xs sm:text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate">
                Ano
              </label>
              <select
                id="dre-year-filter"
                name="dre-year-filter"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 dark:border-gray-600 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:!bg-gray-700 dark:text-gray-100 w-full"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* DRE Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              DRE
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                {getPeriodLabel()}
              </span>
            </h2>
            {previousPeriodTransactions.length > 0 && (
              <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Comparando com <span className="font-medium text-gray-700">{getPreviousPeriodLabel()}</span>
              </p>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-amber-50 border-b border-amber-200">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-amber-800 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-amber-800 uppercase tracking-wider">
                  Valor Atual
                </th>
                {previousPeriodTransactions.length > 0 && (
                  <>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-amber-800 uppercase tracking-wider">
                      Valor Anterior
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-amber-800 uppercase tracking-wider">
                      Variação
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={previousPeriodTransactions.length > 0 ? 4 : 2} className="px-4 sm:px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <BarChart3 className="w-12 h-12 text-gray-300" />
                      <p className="text-gray-500 font-medium">Nenhuma transação encontrada para o período selecionado</p>
                      <p className="text-gray-400 text-sm">Tente selecionar outro período</p>
                    </div>
                  </td>
                </tr>
              ) : (
                dreWithComparison.map((row) => {
                  const isReceitas = row.id === 'receitas'
                  const isDespesas = row.id === 'despesas'
                  const isResultado = row.id === 'resultado'
                  const borderColor = isReceitas ? 'border-l-4 border-l-emerald-500'
                    : isDespesas ? 'border-l-4 border-l-rose-500'
                    : isResultado ? `border-l-4 ${row.value >= 0 ? 'border-l-amber-500' : 'border-l-red-500'}`
                    : ''
                  const rowBg = isResultado
                    ? row.value >= 0 ? 'bg-green-50' : 'bg-red-50'
                    : row.level === 0 ? 'bg-amber-50' : row.level === 1 ? 'bg-gray-50' : ''

                  return (
                  <tr
                    key={row.id}
                    className={`${rowBg} ${row.level === 0 ? 'font-semibold' : ''} ${borderColor}`}
                    style={isResultado ? { borderTop: '2px solid #D1D5DB' } : undefined}
                  >
                    <td
                      className={`py-3 text-sm ${isResultado ? (row.value >= 0 ? 'text-green-800' : 'text-red-800') : row.level === 0 ? 'text-amber-900' : 'text-gray-900'}`}
                      style={{ paddingLeft: `${row.level * 20 + 16}px`, paddingRight: '24px' }}
                    >
                      {isResultado ? <span className="text-base font-bold">{row.description}</span> : row.description}
                    </td>
                    <td
                      className={`px-4 sm:px-6 py-3 text-right font-medium ${isResultado ? 'text-base' : 'text-sm'} ${row.type === 'receita'
                        ? 'text-green-600'
                        : row.type === 'despesa'
                          ? 'text-red-600'
                          : row.value >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                    >
                      {isResultado ? <span className="text-base font-bold">{formatCurrency(row.value)}</span> : formatCurrency(row.value)}
                    </td>
                    {previousPeriodTransactions.length > 0 && (
                      <>
                        <td className="px-4 sm:px-6 py-3 text-sm text-right text-gray-600">
                          {row.valuePrevious !== undefined ? formatCurrency(row.valuePrevious) : '-'}
                        </td>
                        <td className="px-4 sm:px-6 py-3 text-sm text-right">
                          {row.variation !== undefined && row.variationPercent !== undefined ? (
                            <div className="flex items-center justify-end gap-1">
                              <span
                                className={`inline-flex items-center gap-0.5 font-medium px-2 py-0.5 rounded-full text-xs ${row.variation >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                              >
                                {row.variation >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {formatPercent(row.variationPercent)}
                              </span>
                              <span className="text-xs text-gray-500 hidden sm:inline">
                                {formatCurrency(Math.abs(row.variation))}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-emerald-500 to-green-400 rounded-2xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-white/20 rounded-xl p-2">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-white/80">Total Receitas</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(totalReceitas)}
              </p>
              {previousPeriodTransactions.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-white/90 flex items-center gap-0.5">
                    {variacaoReceitas >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {formatCurrency(Math.abs(variacaoReceitas))}
                  </span>
                  <span className="text-xs text-white/80">
                    ({formatPercent(variacaoReceitasPercent)})
                  </span>
                </div>
              )}
            </div>
          </div>
          {totalReceitas > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-white/70 mb-1">
                <span>Despesas / Receitas</span>
                <span>{Math.min(100, Math.round((totalDespesas / totalReceitas) * 100))}%</span>
              </div>
              <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (totalDespesas / totalReceitas) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-rose-500 to-red-400 rounded-2xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-white/20 rounded-xl p-2">
              <TrendingDown className="h-8 w-8 text-white" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-white/80">Total Despesas</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(totalDespesas)}
              </p>
              {previousPeriodTransactions.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-white/90 flex items-center gap-0.5">
                    {variacaoDespesas <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />} {formatCurrency(Math.abs(variacaoDespesas))}
                  </span>
                  <span className="text-xs text-white/80">
                    ({formatPercent(variacaoDespesasPercent)})
                  </span>
                </div>
              )}
            </div>
          </div>
          {totalReceitas > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-white/70 mb-1">
                <span>Do total de receitas</span>
                <span>{Math.min(100, Math.round((totalDespesas / totalReceitas) * 100))}%</span>
              </div>
              <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${(totalDespesas / totalReceitas) > 0.9 ? 'bg-yellow-300' : 'bg-white'}`}
                  style={{ width: `${Math.min(100, (totalDespesas / totalReceitas) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className={`bg-gradient-to-r ${resultadoLiquido >= 0 ? 'from-amber-500 to-orange-400' : 'from-rose-600 to-red-500'} rounded-2xl shadow-lg p-6`}>
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-white/20 rounded-xl p-2">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-white/80">Resultado Líquido</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(resultadoLiquido)}
              </p>
              {previousPeriodTransactions.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-white/90 flex items-center gap-0.5">
                    {variacaoResultado >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {formatCurrency(Math.abs(variacaoResultado))}
                  </span>
                  <span className="text-xs text-white/80">
                    ({formatPercent(variacaoResultadoPercent)})
                  </span>
                </div>
              )}
            </div>
          </div>
          {totalReceitas > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-white/70 mb-1">
                <span>Margem líquida</span>
                <span>{Math.round((resultadoLiquido / totalReceitas) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, (resultadoLiquido / totalReceitas) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DRE

