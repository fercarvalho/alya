import React, { useState, useEffect } from 'react'
import { 
  Home, 
  DollarSign, 
  Package, 
  BarChart3, 
  TrendingUp, 
  Plus, 
  Edit, 
  Trash2,
  ShoppingCart
} from 'lucide-react'

// Tipos
interface Transaction {
  id: string
  description: string
  amount: number
  type: 'receita' | 'despesa' | 'investimento'
  category: string
  date: string
}

interface Product {
  id: string
  name: string
  price: number
  cost: number
  stock: number
  sold: number
  category: string
}

interface Meta {
  id: string
  descricao: string
  valor: number
  tipo: 'receita' | 'despesa' | 'lucro' | 'vendas'
  categoria?: string
  dataInicio: string
  dataFim: string
  periodo: string
  status: 'ativa' | 'pausada' | 'concluida'
}

type TabType = 'dashboard' | 'transactions' | 'products' | 'reports' | 'metas'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [metas, setMetas] = useState<Meta[]>([])

  // Estados dos modais
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>()
  const [editingProduct, setEditingProduct] = useState<Product | undefined>()
  const [editingMeta, setEditingMeta] = useState<Meta | undefined>()

  // Carregar dados do localStorage
  useEffect(() => {
    const savedTransactions = localStorage.getItem('alya-transactions')
    const savedProducts = localStorage.getItem('alya-products')
    const savedMetas = localStorage.getItem('alya-metas')
    
    if (savedTransactions) setTransactions(JSON.parse(savedTransactions))
    if (savedProducts) setProducts(JSON.parse(savedProducts))
    if (savedMetas) setMetas(JSON.parse(savedMetas))
  }, [])

  // Salvar dados no localStorage
  useEffect(() => {
    localStorage.setItem('alya-transactions', JSON.stringify(transactions))
  }, [transactions])

  useEffect(() => {
    localStorage.setItem('alya-products', JSON.stringify(products))
  }, [products])

  useEffect(() => {
    localStorage.setItem('alya-metas', JSON.stringify(metas))
  }, [metas])

  // Funções para transações
  const handleSaveTransaction = (transaction: Omit<Transaction, 'id'>) => {
    if (editingTransaction) {
      setTransactions(prev => prev.map(t => 
        t.id === editingTransaction.id ? { ...transaction, id: editingTransaction.id } : t
      ))
    } else {
      setTransactions(prev => [...prev, { ...transaction, id: Date.now().toString() }])
    }
    setIsModalOpen(false)
    setEditingTransaction(undefined)
  }

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setIsModalOpen(true)
  }

  const handleDeleteTransaction = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
      setTransactions(prev => prev.filter(t => t.id !== id))
    }
  }

  // Funções para produtos
  const handleSaveProduct = (product: Omit<Product, 'id'>) => {
    if (editingProduct) {
      setProducts(prev => prev.map(p => 
        p.id === editingProduct.id ? { ...product, id: editingProduct.id } : p
      ))
    } else {
      setProducts(prev => [...prev, { ...product, id: Date.now().toString() }])
    }
    setIsProductModalOpen(false)
    setEditingProduct(undefined)
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setIsProductModalOpen(true)
  }

  const handleDeleteProduct = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      setProducts(prev => prev.filter(p => p.id !== id))
    }
  }

  // Funções para metas
  const handleSaveMeta = (meta: Omit<Meta, 'id'>) => {
    if (editingMeta) {
      setMetas(prev => prev.map(m => 
        m.id === editingMeta.id ? { ...meta, id: editingMeta.id } : m
      ))
    } else {
      setMetas(prev => [...prev, { ...meta, id: Date.now().toString() }])
    }
    setIsMetaModalOpen(false)
    setEditingMeta(undefined)
  }

  const handleEditMeta = (meta: Meta) => {
    setEditingMeta(meta)
    setIsMetaModalOpen(true)
  }

  const handleDeleteMeta = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta meta?')) {
      setMetas(prev => prev.filter(m => m.id !== id))
    }
  }

  // Calcular resumo financeiro
  const totalReceitas = transactions
    .filter(t => t.type === 'receita')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalDespesas = transactions
    .filter(t => t.type === 'despesa')
    .reduce((sum, t) => sum + t.amount, 0)

  const lucroLiquido = totalReceitas - totalDespesas

  // Render Dashboard
  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <img src="/alya-logo.png" alt="Alya" className="w-8 h-8" />
          Dashboard Financeiro
        </h1>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-6 rounded-2xl border border-emerald-200 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">Total Receitas</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">
                R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-emerald-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-2xl border border-orange-200 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-orange-600 uppercase tracking-wide">Total Despesas</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">
                R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className={`bg-gradient-to-r p-6 rounded-2xl border shadow-lg ${
          lucroLiquido >= 0 
            ? 'from-emerald-50 to-green-50 border-emerald-200' 
            : 'from-red-50 to-pink-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold uppercase tracking-wide ${
                lucroLiquido >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}>
                Lucro Líquido
              </p>
              <p className={`text-2xl font-bold mt-1 ${
                lucroLiquido >= 0 ? 'text-emerald-900' : 'text-red-900'
              }`}>
                R$ {lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <BarChart3 className={`h-8 w-8 ${lucroLiquido >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
          </div>
        </div>
      </div>

      {/* Transações Recentes */}
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-amber-100">
        <h3 className="text-xl font-bold text-amber-900 mb-4">Transações Recentes</h3>
        <div className="space-y-3">
          {transactions.slice(-5).reverse().map(transaction => (
            <div key={transaction.id} className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-100">
              <div>
                <p className="font-medium text-amber-900">{transaction.description}</p>
                <p className="text-sm text-amber-600">{new Date(transaction.date).toLocaleDateString('pt-BR')}</p>
              </div>
              <span className={`font-bold ${
                transaction.type === 'receita' ? 'text-emerald-600' : 'text-orange-600'
              }`}>
                {transaction.type === 'receita' ? '+' : '-'}R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="text-amber-600 text-center py-8">Nenhuma transação registrada ainda.</p>
          )}
        </div>
      </div>
    </div>
  )

  // Render Metas
  const renderMetas = () => {
    // Cálculos para o mês atual
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()

    const transacoesDoMes = transactions.filter(t => {
      const transactionDate = new Date(t.date)
      return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear
    })

    const totalReceitas = transacoesDoMes.filter(t => t.type === 'receita').reduce((sum, t) => sum + t.amount, 0)
    const totalDespesas = transacoesDoMes.filter(t => t.type === 'despesa').reduce((sum, t) => sum + t.amount, 0)

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <img src="/alya-logo.png" alt="Alya" className="w-8 h-8" />
            Metas
          </h1>
          <button
            onClick={() => setIsMetaModalOpen(true)}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <Plus className="h-5 w-5" />
            Nova Meta
          </button>
        </div>

        {/* Título Principal do Mês */}
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-6 rounded-2xl shadow-lg">
          <h2 className="text-3xl font-bold text-white text-center uppercase tracking-wider">
            SETEMBRO - 2025
          </h2>
        </div>

        {/* 1. RESULTADO */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <img src="/alya-logo.png" alt="Alya" className="w-6 h-6" />
            Resultado
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quadrante Financeiro */}
            <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-gray-200">
              <div className="space-y-3">
                {/* REFORÇO DE CAIXA */}
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="font-semibold text-gray-700">REFORÇO DE CAIXA</span>
                  <span className="font-bold text-gray-800">R$ 0,00</span>
                </div>
                
                {/* SAÍDA DE CAIXA */}
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="font-semibold text-gray-700">SAÍDA DE CAIXA</span>
                  <span className="font-bold text-gray-800">R$ 0,00</span>
                </div>
                
                {/* RECEITA */}
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="font-semibold text-emerald-700">RECEITA</span>
                  <span className="font-bold text-emerald-800">
                    R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                {/* DESPESA */}
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="font-semibold text-red-700">DESPESA</span>
                  <span className="font-bold text-red-800">
                    -R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                {/* SALDO INICIAL */}
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="font-semibold text-blue-700">SALDO INICIAL</span>
                  <span className="font-bold text-blue-800">R$ 31.970,50</span>
                </div>
                
                {/* TOTAL GERAL */}
                <div className="flex justify-between items-center py-4 bg-gray-50 px-4 rounded-lg border-2 border-gray-300 mt-4">
                  <span className="font-bold text-gray-900 text-lg">Total geral</span>
                  <span className={`font-bold text-xl ${
                    (31970.50 + totalReceitas - totalDespesas) >= 0 ? 'text-emerald-800' : 'text-red-800'
                  }`}>
                    R$ {(31970.50 + totalReceitas - totalDespesas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Quadrante META DO MÊS */}
            <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-gray-200">
              <div className="space-y-4">
                {/* Cabeçalho com colunas R$ e % */}
                <div className="grid grid-cols-3 gap-4 pb-2 border-b-2 border-gray-300">
                  <div className="text-center">
                    <span className="font-bold text-gray-600 text-lg"></span>
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-gray-800 text-xl">R$</span>
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-gray-800 text-xl">%</span>
                  </div>
                </div>
                
                {/* META */}
                <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200">
                  <div className="font-bold text-gray-800 italic">META</div>
                  <div className="text-center font-bold text-gray-800">R$ 21.889,17</div>
                  <div className="text-center font-bold text-gray-800">100%</div>
                </div>
                
                {/* ALCANÇADO */}
                <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200">
                  <div className="font-bold text-emerald-700 italic">ALCANÇADO</div>
                  <div className="text-center font-bold text-emerald-800">
                    R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-center font-bold text-emerald-800">
                    {((totalReceitas / 21889.17) * 100).toFixed(0)}%
                  </div>
                </div>
                
                {/* RESTANTE */}
                <div className="grid grid-cols-3 gap-4 py-3">
                  <div className="font-bold text-red-700 italic">RESTANTE</div>
                  <div className="text-center font-bold text-red-800">
                    -R$ {Math.max(0, 21889.17 - totalReceitas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-center font-bold text-red-800">
                    {Math.max(0, 100 - ((totalReceitas / 21889.17) * 100)).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. FATURAMENTO */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-emerald-800 flex items-center gap-3">
            <img src="/alya-logo.png" alt="Alya" className="w-6 h-6" />
            Faturamento
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-2xl border border-emerald-200 shadow-lg">
              <h3 className="text-lg font-bold text-emerald-800 mb-4">Faturamento TOTAL</h3>
              <div className="text-2xl font-bold text-emerald-900">
                R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border border-green-200 shadow-lg">
              <h3 className="text-lg font-bold text-green-800 mb-4">Faturamento Varejo</h3>
              <div className="text-2xl font-bold text-green-900">
                R$ {(totalReceitas * 0.6).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-6 rounded-2xl border border-teal-200 shadow-lg">
              <h3 className="text-lg font-bold text-teal-800 mb-4">Faturamento Atacado</h3>
              <div className="text-2xl font-bold text-teal-900">
                R$ {(totalReceitas * 0.3).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* 3. DESPESAS */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-red-800 flex items-center gap-3">
            <img src="/alya-logo.png" alt="Alya" className="w-6 h-6" />
            Despesas
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-2xl border border-red-200 shadow-lg">
              <h3 className="text-lg font-bold text-red-800 mb-4">Despesas Totais</h3>
              <div className="text-2xl font-bold text-red-900">
                R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl border border-orange-200 shadow-lg">
              <h3 className="text-lg font-bold text-orange-800 mb-4">Despesas Variáveis</h3>
              <div className="text-2xl font-bold text-orange-900">
                R$ {(totalDespesas * 0.7).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-2xl border border-amber-200 shadow-lg">
              <h3 className="text-lg font-bold text-amber-800 mb-4">Despesas Fixas</h3>
              <div className="text-2xl font-bold text-amber-900">
                R$ {(totalDespesas * 0.25).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* 4. INVESTIMENTOS */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-indigo-800 flex items-center gap-3">
            <img src="/alya-logo.png" alt="Alya" className="w-6 h-6" />
            Investimentos
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200 shadow-lg">
              <h3 className="text-lg font-bold text-blue-800 mb-4">Investimentos Gerais</h3>
              <div className="text-2xl font-bold text-blue-900">
                R$ {(totalDespesas * 0.05).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200 shadow-lg">
              <h3 className="text-lg font-bold text-purple-800 mb-4">Investimentos em MKT</h3>
              <div className="text-2xl font-bold text-purple-900">
                R$ {(totalReceitas * 0.1).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md shadow-lg border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <img 
                src="/alya-logo.png" 
                alt="Alya Velas Logo" 
                className="w-12 h-12 mr-4 rounded-xl shadow-lg object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  Alya Velas
                </h1>
                <p className="text-sm text-amber-600/70 font-medium">Sistema de Gestão Financeira</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm shadow-md border-b border-amber-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-2">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: Home },
              { id: 'metas', name: 'Metas', icon: TrendingUp }
            ].map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center px-6 py-4 text-sm font-medium rounded-t-xl transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-lg transform -translate-y-1'
                      : 'text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-t-lg'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'metas' && renderMetas()}
      </main>
    </div>
  )
}

export default App
