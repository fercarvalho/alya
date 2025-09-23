import { useState } from 'react'
import { DollarSign, TrendingUp, ShoppingCart, Package, Plus, Edit, Trash2 } from 'lucide-react'

// Tipos simplificados integrados
interface Transaction {
  id: string
  date: string
  description: string
  category: string
  amount: number
  type: 'receita' | 'despesa'
  tipoReceita?: 'atacado' | 'varejo' | 'outros'
  tipoDespesa?: 'fixo' | 'variavel' | 'atacado' | 'varejo' | 'investimento' | 'mkt' | 'outros'
}

interface Product {
  id: string
  name: string
  category: string
  price: number
  cost: number
  stock: number
  sold: number
}

type TabType = 'dashboard' | 'transactions' | 'products' | 'reports'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  
  // Estados locais simples (sem contextos complexos)
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      date: '2025-09-23',
      description: 'Venda - Kit 3 Velas Aromáticas',
      category: 'Vendas',
      amount: 234.90,
      type: 'receita',
      tipoReceita: 'varejo'
    },
    {
      id: '2',
      date: '2025-09-22',
      description: 'Compra - Cera de Soja Premium',
      category: 'Matéria Prima',
      amount: 450.00,
      type: 'despesa',
      tipoDespesa: 'variavel'
    },
    {
      id: '3',
      date: '2025-09-21',
      description: 'Venda - Vela Decorativa Rose Gold',
      category: 'Vendas',
      amount: 124.90,
      type: 'receita',
      tipoReceita: 'atacado'
    }
  ])

  const [products, setProducts] = useState<Product[]>([
    {
      id: '1',
      name: 'Vela Aromática Lavanda',
      category: 'Aromática',
      price: 89.90,
      cost: 35.50,
      stock: 25,
      sold: 156
    },
    {
      id: '2',
      name: 'Kit 3 Velas Pequenas',
      category: 'Kit',
      price: 234.90,
      cost: 89.50,
      stock: 8,
      sold: 45
    }
  ])

  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: DollarSign },
    { id: 'transactions', name: 'Transações', icon: TrendingUp },
    { id: 'products', name: 'Produtos', icon: Package },
    { id: 'reports', name: 'Relatórios', icon: ShoppingCart },
  ]

  // Funções de cálculo
  const totalReceitas = transactions
    .filter(t => t.type === 'receita')
    .reduce((sum, t) => sum + t.amount, 0)
    
  const totalDespesas = transactions
    .filter(t => t.type === 'despesa')
    .reduce((sum, t) => sum + t.amount, 0)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  // Modal de Transação Simples
  const TransactionModal = () => {
    const [formData, setFormData] = useState({
      date: new Date().toISOString().split('T')[0],
      description: '',
      category: '',
      amount: '',
      type: 'receita' as 'receita' | 'despesa',
      tipoReceita: '' as 'atacado' | 'varejo' | 'outros' | '',
      tipoDespesa: '' as 'fixo' | 'variavel' | 'atacado' | 'varejo' | 'investimento' | 'mkt' | 'outros' | '',
    })

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      
      if (!formData.description || !formData.category || !formData.amount) {
        alert('Preencha todos os campos!')
        return
      }

      if (formData.type === 'receita' && !formData.tipoReceita) {
        alert('Selecione o tipo de receita!')
        return
      }

      if (formData.type === 'despesa' && !formData.tipoDespesa) {
        alert('Selecione o tipo de despesa!')
        return
      }

      const newTransaction: Transaction = {
        id: Date.now().toString(),
        date: formData.date,
        description: formData.description,
        category: formData.category,
        amount: parseFloat(formData.amount),
        type: formData.type,
        ...(formData.type === 'receita' 
          ? { tipoReceita: formData.tipoReceita as 'atacado' | 'varejo' | 'outros' } 
          : { tipoDespesa: formData.tipoDespesa as 'fixo' | 'variavel' | 'atacado' | 'varejo' | 'investimento' | 'mkt' | 'outros' })
      }

      setTransactions([...transactions, newTransaction])
      setShowTransactionModal(false)
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        category: '',
        amount: '',
        type: 'receita',
        tipoReceita: '',
        tipoDespesa: '',
      })
    }

    if (!showTransactionModal) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Nova Transação</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
            
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value as any, tipoReceita: '', tipoDespesa: '', category: ''})}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>

            {formData.type === 'receita' && (
              <select
                value={formData.tipoReceita}
                onChange={(e) => setFormData({...formData, tipoReceita: e.target.value as any})}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Tipo de Receita</option>
                <option value="atacado">Atacado</option>
                <option value="varejo">Varejo</option>
                <option value="outros">Outros</option>
              </select>
            )}

            {formData.type === 'despesa' && (
              <select
                value={formData.tipoDespesa}
                onChange={(e) => setFormData({...formData, tipoDespesa: e.target.value as any})}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Tipo de Despesa</option>
                <option value="fixo">Fixo</option>
                <option value="variavel">Variável</option>
                <option value="atacado">Atacado</option>
                <option value="varejo">Varejo</option>
                <option value="investimento">Investimento</option>
                <option value="mkt">Marketing</option>
                <option value="outros">Outros</option>
              </select>
            )}
            
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-3 py-2 border rounded-md"
              required
            >
              <option value="">Categoria</option>
              {formData.type === 'receita' ? (
                <>
                  <option value="Vendas">Vendas</option>
                  <option value="Serviços">Serviços</option>
                  <option value="Outros Receitas">Outros Receitas</option>
                </>
              ) : (
                <>
                  <option value="Matéria Prima">Matéria Prima</option>
                  <option value="Logística">Logística</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Equipamentos">Equipamentos</option>
                  <option value="Outros Despesas">Outros Despesas</option>
                </>
              )}
            </select>
            
            <input
              type="text"
              placeholder="Descrição"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
            
            <input
              type="number"
              step="0.01"
              placeholder="Valor"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowTransactionModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
              <p className="text-gray-600">Visão geral do seu negócio de velas</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Total Receitas</h3>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceitas)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Total Despesas</h3>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDespesas)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Saldo</h3>
                <p className={`text-2xl font-bold ${(totalReceitas - totalDespesas) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalReceitas - totalDespesas)}
                </p>
              </div>
            </div>
          </div>
        )

      case 'transactions':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Transações</h2>
                <p className="text-gray-600">Gerencie todas as movimentações financeiras</p>
              </div>
              <button 
                onClick={() => setShowTransactionModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nova Transação
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.type === 'receita' && transaction.tipoReceita && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {transaction.tipoReceita.charAt(0).toUpperCase() + transaction.tipoReceita.slice(1)}
                          </span>
                        )}
                        {transaction.type === 'despesa' && transaction.tipoDespesa && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {transaction.tipoDespesa.charAt(0).toUpperCase() + transaction.tipoDespesa.slice(1)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={transaction.type === 'receita' ? 'text-green-600' : 'text-red-600'}>
                          {transaction.type === 'receita' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )

      case 'products':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Produtos</h2>
                <p className="text-gray-600">Gerencie seu catálogo de velas</p>
              </div>
              <button 
                onClick={() => setShowProductModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Novo Produto
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
                  <p className="text-gray-600 mb-4">{product.category}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Preço:</span>
                      <span className="text-sm font-medium">{formatCurrency(product.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Custo:</span>
                      <span className="text-sm font-medium">{formatCurrency(product.cost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Estoque:</span>
                      <span className="text-sm font-medium">{product.stock}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Vendidos:</span>
                      <span className="text-sm font-medium">{product.sold}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'reports':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">📈 Relatórios</h2>
            <p>Seção de relatórios em desenvolvimento...</p>
          </div>
        )

      default:
        return <div>Página não encontrada</div>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">🕯️ Alya</h1>
              <p className="text-sm text-gray-500 ml-4">Sistema Financeiro</p>
            </div>
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              ✅ Sistema Funcionando
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <nav className="lg:w-64 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabType)}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </button>
              )
            })}
          </nav>

          {/* Main Content */}
          <main className="flex-1">
            {renderContent()}
          </main>
        </div>
      </div>

      {/* Modals */}
      <TransactionModal />
    </div>
  )
}

export default App
