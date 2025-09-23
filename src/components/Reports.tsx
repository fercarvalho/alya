import { BarChart3, TrendingUp, Calendar, Download } from 'lucide-react'

const Reports = () => {
  const monthlyData = [
    { month: 'Jan', receitas: 12500, despesas: 8500, lucro: 4000 },
    { month: 'Fev', receitas: 15800, despesas: 9200, lucro: 6600 },
    { month: 'Mar', receitas: 18200, despesas: 10100, lucro: 8100 },
    { month: 'Abr', receitas: 16900, despesas: 9800, lucro: 7100 },
    { month: 'Mai', receitas: 21300, despesas: 11500, lucro: 9800 },
    { month: 'Jun', receitas: 24500, despesas: 12800, lucro: 11700 },
  ]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const totalReceitas = monthlyData.reduce((sum, month) => sum + month.receitas, 0)
  const totalDespesas = monthlyData.reduce((sum, month) => sum + month.despesas, 0)
  const totalLucro = totalReceitas - totalDespesas

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Relatórios</h2>
          <p className="text-gray-600">Análise financeira do seu negócio</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Exportar PDF
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Receitas (6 meses)</h3>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalReceitas)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <BarChart3 className="w-8 h-8 text-red-500" />
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Despesas (6 meses)</h3>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totalDespesas)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Lucro Líquido</h3>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalLucro)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Performance Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Desempenho Mensal</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mês
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receitas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Despesas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lucro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Margem
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {monthlyData.map((month) => {
                const margem = ((month.lucro / month.receitas) * 100).toFixed(1)
                return (
                  <tr key={month.month} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {month.month} 2025
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {formatCurrency(month.receitas)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {formatCurrency(month.despesas)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {formatCurrency(month.lucro)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        parseFloat(margem) > 40 
                          ? 'bg-green-100 text-green-800' 
                          : parseFloat(margem) > 25 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {margem}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Produtos Mais Vendidos</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[
              { name: 'Vela Aromática Lavanda', vendas: 156, receita: 14024.40 },
              { name: 'Vela Decorativa Rose Gold', vendas: 89, receita: 11116.10 },
              { name: 'Vela Citronela Anti-Inseto', vendas: 78, receita: 5296.20 },
              { name: 'Kit 3 Velas Pequenas', vendas: 45, receita: 10570.50 },
            ].map((product, index) => (
              <div key={product.name} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center">
                  <div className="text-sm font-medium text-gray-700 mr-2">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.vendas} unidades vendidas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">
                    {formatCurrency(product.receita)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Reports
