import React, { useState, useEffect, useMemo, useRef } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Download, FileText } from 'lucide-react'
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
    const startDate = new Date(year, month, 1)
    let endDate: Date

    if (period === 'mensal') {
      endDate = new Date(year, month + 1, 0)
    } else if (period === 'trimestral') {
      endDate = new Date(year, month + 3, 0)
    } else {
      endDate = new Date(year, 11, 31)
    }

    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date)
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

  // Gerar DRE para um conjunto de transações
  const generateDRE = (transactions: Transaction[]): DRERow[] => {
    const receitas = transactions.filter(t => t.type === 'Receita')
    const despesas = transactions.filter(t => t.type === 'Despesa')

    const totalReceitas = receitas.reduce((sum, t) => sum + t.value, 0)
    const totalDespesas = despesas.reduce((sum, t) => sum + t.value, 0)
    const resultadoLiquido = totalReceitas - totalDespesas

    // Agrupar receitas por categoria (tratar categoria vazia como "Outros")
    const receitasPorCategoria = receitas.reduce((acc, t) => {
      const categoria = t.category && t.category.trim() ? t.category : 'Outros'
      if (!acc[categoria]) acc[categoria] = 0
      acc[categoria] += t.value
      return acc
    }, {} as Record<string, number>)

    // Agrupar despesas por categoria (tratar categoria vazia como "Outros")
    const despesasPorCategoria = despesas.reduce((acc, t) => {
      const categoria = t.category && t.category.trim() ? t.category : 'Outros'
      if (!acc[categoria]) acc[categoria] = 0
      acc[categoria] += t.value
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
        const variation = row.value - previousRow.value
        const variationPercent = previousRow.value !== 0
          ? ((row.value - previousRow.value) / previousRow.value) * 100
          : row.value > 0 ? 100 : (row.value < 0 ? -100 : 0)
        
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
        'Variação %': row.variationPercent ? `${row.variationPercent.toFixed(2)}%` : '-'
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
          row['Descrição'],
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
          row['Descrição'],
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
  const variacaoReceitasPercent = receitasAnterior !== 0
    ? ((totalReceitas - receitasAnterior) / receitasAnterior) * 100
    : totalReceitas > 0 ? 100 : 0

  const variacaoDespesas = totalDespesas - despesasAnterior
  const variacaoDespesasPercent = despesasAnterior !== 0
    ? ((totalDespesas - despesasAnterior) / despesasAnterior) * 100
    : totalDespesas > 0 ? 100 : 0

  const variacaoResultado = resultadoLiquido - resultadoAnterior
  const variacaoResultadoPercent = resultadoAnterior !== 0
    ? ((resultadoLiquido - resultadoAnterior) / resultadoAnterior) * 100
    : resultadoLiquido > 0 ? 100 : (resultadoLiquido < 0 ? -100 : 0)

  return (
    <div className="space-y-6" ref={dreContentRef}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DRE - Demonstrativo de Resultado do Exercício</h1>
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
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <FileText className="h-5 w-5" />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Período</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as 'mensal' | 'trimestral' | 'anual')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="mensal">Mensal</option>
              <option value="trimestral">Trimestral</option>
              <option value="anual">Anual</option>
            </select>
          </div>

          {selectedPeriod !== 'anual' && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">Mês</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>
                    {getMonthName(i)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Ano</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
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

      {/* DRE Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            DRE - {getPeriodLabel()}
          </h2>
          {previousPeriodTransactions.length > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              Comparação com {getPreviousPeriodLabel()}
            </p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor Atual
                </th>
                {previousPeriodTransactions.length > 0 && (
                  <>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Anterior
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Variação
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dreWithComparison.length === 0 ? (
                <tr>
                  <td colSpan={previousPeriodTransactions.length > 0 ? 4 : 2} className="px-4 sm:px-6 py-8 text-center text-gray-500">
                    Nenhuma transação encontrada para o período selecionado
                  </td>
                </tr>
              ) : (
                dreWithComparison.map((row) => (
                  <tr
                    key={row.id}
                    className={`${
                      row.level === 0
                        ? 'bg-amber-50 font-semibold'
                        : row.level === 1
                        ? 'bg-gray-50'
                        : ''
                    } ${
                      row.id === 'resultado' ? 'border-t-2 border-gray-300' : ''
                    }`}
                  >
                    <td
                      className={`px-4 sm:px-6 py-3 text-sm ${
                        row.level === 0 ? 'text-amber-900' : 'text-gray-900'
                      }`}
                      style={{ paddingLeft: `${row.level * 20 + 16}px` }}
                    >
                      {row.description}
                    </td>
                    <td
                      className={`px-4 sm:px-6 py-3 text-sm text-right font-medium ${
                        row.type === 'receita'
                          ? 'text-green-600'
                          : row.type === 'despesa'
                          ? 'text-red-600'
                          : row.value >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(row.value)}
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
                                className={`font-medium ${
                                  row.variation >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {row.variation >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(row.variation))}
                              </span>
                              <span
                                className={`text-xs ${
                                  row.variationPercent >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                ({formatPercent(row.variationPercent)})
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-500">Total Receitas</p>
              <p className="text-2xl font-semibold text-green-600">
                {formatCurrency(totalReceitas)}
              </p>
              {previousPeriodTransactions.length > 0 && receitasAnterior > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <span className={`text-xs ${variacaoReceitas >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {variacaoReceitas >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(variacaoReceitas))}
                  </span>
                  <span className={`text-xs ${variacaoReceitasPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ({formatPercent(variacaoReceitasPercent)})
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-500">Total Despesas</p>
              <p className="text-2xl font-semibold text-red-600">
                {formatCurrency(totalDespesas)}
              </p>
              {previousPeriodTransactions.length > 0 && despesasAnterior > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <span className={`text-xs ${variacaoDespesas <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {variacaoDespesas <= 0 ? '↓' : '↑'} {formatCurrency(Math.abs(variacaoDespesas))}
                  </span>
                  <span className={`text-xs ${variacaoDespesasPercent <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ({formatPercent(variacaoDespesasPercent)})
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-amber-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-500">Resultado Líquido</p>
              <p className={`text-2xl font-semibold ${
                resultadoLiquido >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(resultadoLiquido)}
              </p>
              {previousPeriodTransactions.length > 0 && resultadoAnterior !== 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <span className={`text-xs ${variacaoResultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {variacaoResultado >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(variacaoResultado))}
                  </span>
                  <span className={`text-xs ${variacaoResultadoPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ({formatPercent(variacaoResultadoPercent)})
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DRE

