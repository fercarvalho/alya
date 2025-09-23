import { useState } from 'react'
import { DollarSign, TrendingUp, ShoppingCart, Package } from 'lucide-react'
import { TransactionProvider } from './contexts/TransactionContext'
import { ProductProvider } from './contexts/ProductContext'

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
            <h2 className="text-xl font-bold mb-4">Dashboard</h2>
            <p>Estatísticas e visão geral do negócio</p>
          </div>
        )
      case 'transactions':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Transações</h2>
            <p>Gerenciamento de receitas e despesas</p>
          </div>
        )
      case 'products':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Produtos</h2>
            <p>Catálogo de velas e produtos</p>
          </div>
        )
      case 'reports':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Relatórios</h2>
            <p>Análises e relatórios financeiros</p>
          </div>
        )
      default:
        return <div>Página não encontrada</div>
    }
  }

  return (
    <TransactionProvider>
      <ProductProvider>
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
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
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
      </ProductProvider>
    </TransactionProvider>
  )
}

export default App
