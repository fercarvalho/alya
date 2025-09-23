import { DollarSign, TrendingUp, TrendingDown, Package } from 'lucide-react'
import { useTransactions } from '../contexts/TransactionContext'
import { useProducts } from '../contexts/ProductContext'

const Dashboard = () => {
  const { transactions } = useTransactions()
  const { products } = useProducts()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const totalReceitas = transactions
    .filter(t => t.type === 'receita')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalDespesas = transactions
    .filter(t => t.type === 'despesa')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalProdutosVendidos = products
    .reduce((sum, p) => sum + p.sold, 0)

  const totalProdutos = products.length

  const saldoTotal = totalReceitas - totalDespesas

  const stats = [
    {
      name: 'Receita Total',
      value: formatCurrency(totalReceitas),
      change: '+20.1%',
      changeType: 'positive' as const,
      icon: DollarSign,
    },
    {
      name: 'Total Produtos',
      value: totalProdutos.toString(),
      change: '+15.3%',
      changeType: 'positive' as const,
      icon: Package,
    },
    {
      name: 'Produtos Vendidos',
      value: totalProdutosVendidos.toString(),
      change: '+5.4%',
      changeType: 'positive' as const,
      icon: TrendingUp,
    },
    {
      name: 'Despesas',
      value: formatCurrency(totalDespesas),
      change: '-3.2%',
      changeType: 'negative' as const,
      icon: TrendingDown,
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600">Visão geral do seu negócio de velas</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Icon className="w-8 h-8 text-blue-500" />
                </div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center text-sm">
                  <span
                    className={`font-medium ${
                      stat.changeType === 'positive'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {stat.change}
                  </span>
                  <span className="text-gray-500 ml-2">vs mês anterior</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Transações Recentes
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {[
            {
              id: 1,
              description: 'Venda - Vela Aromática Lavanda',
              amount: 'R$ 89,90',
              date: '23 Set 2025',
              type: 'receita',
            },
            {
              id: 2,
              description: 'Compra - Cera de Soja',
              amount: 'R$ 350,00',
              date: '22 Set 2025',
              type: 'despesa',
            },
            {
              id: 3,
              description: 'Venda - Kit 3 Velas',
              amount: 'R$ 234,90',
              date: '22 Set 2025',
              type: 'receita',
            },
          ].map((transaction) => (
            <div key={transaction.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {transaction.description}
                  </p>
                  <p className="text-sm text-gray-500">{transaction.date}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-medium ${
                      transaction.type === 'receita'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {transaction.type === 'receita' ? '+' : '-'}
                    {transaction.amount}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
