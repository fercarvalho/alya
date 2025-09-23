import { useState } from 'react'
import { DollarSign, TrendingUp, ShoppingCart, Package } from 'lucide-react'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🕯️ Alya - Sistema Financeiro</h1>
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <p className="text-lg text-green-600 font-semibold">✅ Sistema carregado com sucesso!</p>
          <p className="text-gray-700 mt-2">Testando funcionamento básico...</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900">Dashboard</h3>
            <p className="text-blue-700">Visão geral</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900">Transações</h3>
            <p className="text-green-700">Receitas e Despesas</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-900">Produtos</h3>
            <p className="text-purple-700">Gestão de Velas</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="font-semibold text-orange-900">Relatórios</h3>
            <p className="text-orange-700">Análises</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
