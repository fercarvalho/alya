import { useState } from 'react'
import { DollarSign, TrendingUp, ShoppingCart, Package } from 'lucide-react'

type TabType = 'dashboard' | 'transactions' | 'products' | 'reports'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: DollarSign },
    { id: 'transactions', name: 'Transações', icon: TrendingUp },
    { id: 'products', name: 'Produtos', icon: Package },
    { id: 'reports', name: 'Relatórios', icon: ShoppingCart },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">📊 Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800">Receita Total</h3>
                <p className="text-2xl font-bold text-green-600">R$ 1.234,56</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-semibold text-red-800">Despesas</h3>
                <p className="text-2xl font-bold text-red-600">R$ 567,89</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800">Lucro</h3>
                <p className="text-2xl font-bold text-blue-600">R$ 666,67</p>
              </div>
            </div>
          </div>
        )
      case 'transactions':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">💰 Transações</h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                + Nova Transação
              </button>
            </div>
            <div className="space-y-2">
              <div className="p-3 bg-green-50 rounded border-l-4 border-green-400">
                <p className="font-semibold">Venda - Vela Aromática</p>
                <p className="text-green-600">+ R$ 89,90 - Varejo</p>
              </div>
              <div className="p-3 bg-red-50 rounded border-l-4 border-red-400">
                <p className="font-semibold">Compra - Matéria Prima</p>
                <p className="text-red-600">- R$ 35,50 - Variável</p>
              </div>
            </div>
          </div>
        )
      case 'products':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">🕯️ Produtos</h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                + Novo Produto
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">Vela Aromática Lavanda</h3>
                <p className="text-gray-600">Preço: R$ 89,90 | Estoque: 25</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">Kit 3 Velas Pequenas</h3>
                <p className="text-gray-600">Preço: R$ 234,90 | Estoque: 8</p>
              </div>
            </div>
          </div>
        )
      case 'reports':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">📈 Relatórios</h2>
            <p>Em breve: análises detalhadas e relatórios financeiros</p>
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
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">🕯️ Alya</h1>
                <p className="text-sm text-gray-500">Sistema Financeiro</p>
              </div>
            </div>
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
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
    </div>
  )
}

export default App
