import { useState } from 'react'
import { 
  DollarSign, 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  Plus, 
  Edit, 
  Trash2,
  BarChart3,
  Home
} from 'lucide-react'

// Tipos
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

interface Meta {
  id: string
  tipo: 'receita' | 'despesa' | 'lucro' | 'vendas'
  categoria?: string
  valor: number
  periodo: 'semanal' | 'mensal' | 'trimestral' | 'anual'
  descricao: string
  dataInicio: string
  dataFim: string
  status: 'ativa' | 'pausada' | 'concluida'
}

type TabType = 'dashboard' | 'transactions' | 'products' | 'reports' | 'metas'

// Modal de Transação
interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (transaction: Omit<Transaction, 'id'>) => void
  transaction?: Transaction
}

function TransactionModal({ isOpen, onClose, onSave, transaction }: TransactionModalProps) {
  const [formData, setFormData] = useState({
    date: transaction?.date || new Date().toISOString().split('T')[0],
    description: transaction?.description || '',
    category: transaction?.category || '',
    amount: transaction?.amount || 0,
    type: transaction?.type || 'receita' as const
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const transactionData: Omit<Transaction, 'id'> = {
      date: formData.date,
      description: formData.description,
      category: formData.category,
      amount: formData.amount,
      type: formData.type
    }

    onSave(transactionData)
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white/95 backdrop-blur-md rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl border border-amber-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-6 text-amber-900 flex items-center">
          <img 
            src="/alya-logo.png" 
            alt="Alya" 
            className="w-8 h-8 rounded-lg mr-3 object-contain"
          />
          {transaction ? 'Editar Transação' : 'Nova Transação'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Data */}
          <div>
            <label className="block text-sm font-bold mb-2 text-amber-800">Data</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full p-3 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white/80 text-amber-900 font-medium"
              required
            />
          </div>

          {/* 2. Descrição */}
          <div>
            <label className="block text-sm font-bold mb-2 text-amber-800">Descrição</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-3 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white/80 text-amber-900 font-medium"
              required
            />
          </div>

          {/* 3. Valor */}
          <div>
            <label className="block text-sm font-bold mb-2 text-amber-800">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
              className="w-full p-3 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white/80 text-amber-900 font-medium"
              required
            />
          </div>

          {/* 4. Tipo */}
          <div>
            <label className="block text-sm font-bold mb-2 text-amber-800">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => {
                const newType = e.target.value as 'receita' | 'despesa'
                setFormData({ 
                  ...formData, 
                  type: newType,
                  category: '' // Reset category when type changes
                })
              }}
              className="w-full p-3 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white/80 text-amber-900 font-medium"
            >
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
          </div>

          {/* 5. Categoria (dinâmica baseada no tipo) */}
          <div>
            <label className={`block text-sm font-bold mb-2 ${
              formData.type === 'receita' ? 'text-emerald-800' : 'text-orange-800'
            }`}>
              Categoria
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={`w-full p-3 border rounded-xl focus:ring-2 font-medium ${
                formData.type === 'receita' 
                  ? 'border-emerald-200 focus:ring-emerald-400 focus:border-emerald-400 bg-emerald-50/80 text-emerald-900'
                  : 'border-orange-200 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/80 text-orange-900'
              }`}
              required
            >
              <option value="">Selecione uma categoria</option>
              {formData.type === 'receita' ? (
                <>
                  <option value="Atacado">Atacado</option>
                  <option value="Varejo">Varejo</option>
                  <option value="Outros">Outros</option>
                </>
              ) : (
                <>
                  <option value="Fixo">Fixo</option>
                  <option value="Variável">Variável</option>
                  <option value="Atacado">Atacado</option>
                  <option value="Varejo">Varejo</option>
                  <option value="Investimento">Investimento</option>
                  <option value="Mkt">Marketing</option>
                </>
              )}
            </select>
          </div>



          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 font-semibold rounded-xl hover:from-gray-300 hover:to-gray-400 transition-all duration-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold rounded-xl hover:from-amber-500 hover:to-orange-500 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Modal de Produto
interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (product: Omit<Product, 'id'>) => void
  product?: Product
}

function ProductModal({ isOpen, onClose, onSave, product }: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    category: product?.category || '',
    price: product?.price || 0,
    cost: product?.cost || 0,
    stock: product?.stock || 0,
    sold: product?.sold || 0
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-br from-amber-50 via-white to-orange-50 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-amber-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-amber-200 bg-gradient-to-r from-amber-100 to-orange-100">
          <div className="flex items-center gap-3">
            <img src="/alya-logo.png" alt="Alya" className="w-8 h-8" />
            <h2 className="text-2xl font-bold text-amber-900">
              {product ? 'Editar Produto' : 'Novo Produto'}
            </h2>
          </div>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome do Produto */}
            <div>
              <label className="block text-sm font-bold mb-2 text-amber-800">Nome do Produto</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white/80 text-amber-900 font-medium"
                required
                placeholder="Ex: Vela Aromática Lavanda"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-bold mb-2 text-amber-800">Categoria</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-3 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white/80 text-amber-900 font-medium"
                required
              >
                <option value="">Selecione uma categoria</option>
                <option value="Aromáticas">Aromáticas</option>
                <option value="Decorativas">Decorativas</option>
                <option value="Terapêuticas">Terapêuticas</option>
                <option value="Sazonais">Sazonais</option>
                <option value="Personalizadas">Personalizadas</option>
                <option value="Kits">Kits</option>
              </select>
            </div>

            {/* Preço de Venda */}
            <div>
              <label className="block text-sm font-bold mb-2 text-emerald-800">Preço de Venda (R$)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="w-full p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 bg-emerald-50/80 text-emerald-900 font-medium"
                required
              />
            </div>

            {/* Custo */}
            <div>
              <label className="block text-sm font-bold mb-2 text-orange-800">Custo (R$)</label>
              <input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                className="w-full p-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-orange-50/80 text-orange-900 font-medium"
                required
              />
            </div>

            {/* Estoque */}
            <div>
              <label className="block text-sm font-bold mb-2 text-blue-800">Estoque</label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                className="w-full p-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-blue-50/80 text-blue-900 font-medium"
                required
              />
            </div>

            {/* Vendidos */}
            <div>
              <label className="block text-sm font-bold mb-2 text-purple-800">Quantidade Vendida</label>
              <input
                type="number"
                value={formData.sold}
                onChange={(e) => setFormData({ ...formData, sold: parseInt(e.target.value) || 0 })}
                className="w-full p-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 bg-purple-50/80 text-purple-900 font-medium"
                required
              />
            </div>

            {/* Margem de Lucro (calculada automaticamente) */}
            {formData.price > 0 && (
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-200">
                <label className="block text-sm font-bold mb-2 text-emerald-800">Margem de Lucro</label>
                <div className="text-2xl font-bold text-emerald-700">
                  {formData.price > 0 ? (((formData.price - formData.cost) / formData.price) * 100).toFixed(1) : '0.0'}%
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 font-semibold rounded-xl hover:from-gray-300 hover:to-gray-400 transition-all duration-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold rounded-xl hover:from-amber-500 hover:to-orange-500 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Componente de Gráfico de Pizza
interface PieChartProps {
  data: { label: string; value: number; color: string }[]
  title: string
}

function PieChart({ data, title }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let cumulativePercentage = 0

  return (
    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-amber-100 mt-4">
      <h4 className="text-lg font-bold text-amber-900 mb-4 text-center">{title}</h4>
      <div className="flex flex-col lg:flex-row items-center gap-6">
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90">
            <circle
              cx="21"
              cy="21"
              r="15.915"
              fill="transparent"
              stroke="#f3f4f6"
              strokeWidth="3"
            />
            {data.map((item, index) => {
              const percentage = total > 0 ? (item.value / total) * 100 : 0
              const strokeDasharray = `${percentage} ${100 - percentage}`
              const strokeDashoffset = -cumulativePercentage
              cumulativePercentage += percentage
              
              return (
                <circle
                  key={index}
                  cx="21"
                  cy="21"
                  r="15.915"
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth="3"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300"
                />
              )
            })}
          </svg>
        </div>
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
              <span className="text-sm font-bold text-gray-900">
                R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-gray-500">
                ({total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Componente de Gráfico de Barras
interface BarChartProps {
  data: { label: string; value: number; color: string }[]
  title: string
  type: 'vertical' | 'horizontal'
}

function BarChart({ data, title, type = 'vertical' }: BarChartProps) {
  const maxValue = Math.max(...data.map(item => item.value), 1)

  return (
    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-amber-100 mt-4">
      <h4 className="text-lg font-bold text-amber-900 mb-4 text-center">{title}</h4>
      <div className={`${type === 'vertical' ? 'flex items-end justify-center gap-4 h-48' : 'space-y-3'}`}>
        {data.map((item, index) => {
          const percentage = (item.value / maxValue) * 100

          if (type === 'vertical') {
            return (
              <div key={index} className="flex flex-col items-center gap-2">
                <div className="text-xs font-bold text-gray-700">
                  {item.value}
                </div>
                <div
                  className="w-12 rounded-t-md transition-all duration-500"
                  style={{ 
                    height: `${percentage}%`,
                    backgroundColor: item.color,
                    minHeight: '8px'
                  }}
                />
                <div className="text-xs font-medium text-gray-600 text-center max-w-16">
                  {item.label}
                </div>
              </div>
            )
          }

          return (
            <div key={index} className="flex items-center gap-3">
              <div className="w-24 text-sm font-medium text-gray-700 truncate">
                {item.label}
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                <div
                  className="h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: item.color,
                    minWidth: percentage > 0 ? '24px' : '0px'
                  }}
                >
                  {percentage > 15 && (
                    <span className="text-xs font-bold text-white">
                      {item.value}
                    </span>
                  )}
                </div>
                {percentage <= 15 && percentage > 0 && (
                  <span className="absolute right-2 top-1 text-xs font-bold text-gray-700">
                    {item.value}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Componente do Modal de Meta
function MetaModal({ 
  isOpen, 
  onClose, 
  onSave, 
  meta 
}: { 
  isOpen: boolean
  onClose: () => void
  onSave: (meta: Meta) => void
  meta?: Meta 
}) {
  const [formData, setFormData] = useState({
    tipo: meta?.tipo || 'receita',
    categoria: meta?.categoria || '',
    valor: meta?.valor || 0,
    periodo: meta?.periodo || 'mensal',
    descricao: meta?.descricao || '',
    dataInicio: meta?.dataInicio || new Date().toISOString().split('T')[0],
    dataFim: meta?.dataFim || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
    status: meta?.status || 'ativa'
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const metaData: Meta = {
      id: meta?.id || Date.now().toString(),
      tipo: formData.tipo,
      categoria: formData.categoria,
      valor: formData.valor,
      periodo: formData.periodo,
      descricao: formData.descricao,
      dataInicio: formData.dataInicio,
      dataFim: formData.dataFim,
      status: formData.status
    }
    
    onSave(metaData)
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white/95 backdrop-blur-md rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl border border-amber-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {meta ? 'Editar Meta' : 'Nova Meta'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <input
              type="text"
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({...prev, descricao: e.target.value}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.valor}
              onChange={(e) => setFormData(prev => ({...prev, valor: parseFloat(e.target.value) || 0}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              value={formData.tipo}
              onChange={(e) => setFormData(prev => ({...prev, tipo: e.target.value as 'receita' | 'despesa' | 'lucro' | 'vendas'}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
              <option value="lucro">Lucro</option>
              <option value="vendas">Vendas</option>
            </select>
          </div>

          {(formData.tipo === 'receita' || formData.tipo === 'despesa' || formData.tipo === 'vendas') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <input
                type="text"
                value={formData.categoria}
                onChange={(e) => setFormData(prev => ({...prev, categoria: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Ex: Aromáticas, Atacado, Marketing..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Período
            </label>
            <select
              value={formData.periodo}
              onChange={(e) => setFormData(prev => ({...prev, periodo: e.target.value as 'semanal' | 'mensal' | 'trimestral' | 'anual'}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
              <option value="trimestral">Trimestral</option>
              <option value="anual">Anual</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Início
              </label>
              <input
                type="date"
                value={formData.dataInicio}
                onChange={(e) => setFormData(prev => ({...prev, dataInicio: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Fim
              </label>
              <input
                type="date"
                value={formData.dataFim}
                onChange={(e) => setFormData(prev => ({...prev, dataFim: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({...prev, status: e.target.value as 'ativa' | 'pausada' | 'concluida'}))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ativa">Ativa</option>
              <option value="pausada">Pausada</option>
              <option value="concluida">Concluída</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all transform hover:scale-105"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Componente principal
function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>()
  
  // Estados do modal de produtos
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | undefined>()
  
  // Estados do modal de metas
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false)
  const [editingMeta, setEditingMeta] = useState<Meta | undefined>()
  
  // Estados das metas
  const [metas, setMetas] = useState<Meta[]>([
    {
      id: '1',
      tipo: 'receita',
      categoria: 'Atacado',
      valor: 15000,
      periodo: 'mensal',
      descricao: 'Meta de receitas atacado mensal',
      dataInicio: '2025-09-01',
      dataFim: '2025-09-30',
      status: 'ativa'
    },
    {
      id: '2',
      tipo: 'vendas',
      categoria: 'Aromáticas',
      valor: 50,
      periodo: 'mensal',
      descricao: 'Meta de 50 velas aromáticas por mês',
      dataInicio: '2025-09-01',
      dataFim: '2025-09-30',
      status: 'ativa'
    },
    {
      id: '3',
      tipo: 'lucro',
      valor: 8000,
      periodo: 'mensal',
      descricao: 'Meta de lucro líquido mensal',
      dataInicio: '2025-09-01',
      dataFim: '2025-09-30',
      status: 'ativa'
    }
  ])
  
  // Estados dos gráficos
  const [visibleCharts, setVisibleCharts] = useState<{[key: string]: boolean}>({})
  
  const toggleChart = (chartId: string) => {
    setVisibleCharts(prev => ({
      ...prev,
      [chartId]: !prev[chartId]
    }))
  }

  // Estados dos dados
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      date: '2025-09-23',
      description: 'Venda - Kit 3 Velas Aromáticas',
      category: 'Vendas',
      amount: 234.90,
      type: 'receita'
    },
    {
      id: '2',
      date: '2025-09-22',
      description: 'Compra - Cera de Soja Premium',
      category: 'Matéria Prima',
      amount: 450.00,
      type: 'despesa'
    },
    {
      id: '3',
      date: '2025-09-21',
      description: 'Venda Atacado - 50 Velas',
      category: 'Vendas',
      amount: 1250.00,
      type: 'receita'
    },
    {
      id: '4',
      date: '2025-09-20',
      description: 'Campanha Instagram',
      category: 'Marketing',
      amount: 280.00,
      type: 'despesa'
    }
  ])

  const [products, setProducts] = useState<Product[]>([
    {
      id: '1',
      name: 'Vela Aromática Lavanda',
      category: 'Aromáticas',
      price: 89.90,
      cost: 35.00,
      stock: 45,
      sold: 23
    },
    {
      id: '2',
      name: 'Kit 3 Velas Decorativas',
      category: 'Kits',
      price: 234.90,
      cost: 95.00,
      stock: 12,
      sold: 8
    },
    {
      id: '3',
      name: 'Vela Artesanal Grande',
      category: 'Artesanais',
      price: 156.90,
      cost: 68.00,
      stock: 28,
      sold: 15
    }
  ])

  // Calculadora de métricas
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1
  const currentYear = currentDate.getFullYear()

  // Métricas do mês atual
  const totalReceitasMes = transactions
    .filter(t => {
      const transactionDate = new Date(t.date)
      return t.type === 'receita' && 
             transactionDate.getMonth() + 1 === currentMonth && 
             transactionDate.getFullYear() === currentYear
    })
    .reduce((sum, t) => sum + t.amount, 0)

  const totalDespesasMes = transactions
    .filter(t => {
      const transactionDate = new Date(t.date)
      return t.type === 'despesa' && 
             transactionDate.getMonth() + 1 === currentMonth && 
             transactionDate.getFullYear() === currentYear
    })
    .reduce((sum, t) => sum + t.amount, 0)

  const saldoMes = totalReceitasMes - totalDespesasMes

  // Métricas do ano atual
  const totalReceitasAno = transactions
    .filter(t => {
      const transactionDate = new Date(t.date)
      return t.type === 'receita' && transactionDate.getFullYear() === currentYear
    })
    .reduce((sum, t) => sum + t.amount, 0)

  const totalDespesasAno = transactions
    .filter(t => {
      const transactionDate = new Date(t.date)
      return t.type === 'despesa' && transactionDate.getFullYear() === currentYear
    })
    .reduce((sum, t) => sum + t.amount, 0)

  const saldoAno = totalReceitasAno - totalDespesasAno

  // Handlers
  const handleSaveTransaction = (transactionData: Omit<Transaction, 'id'>) => {
    if (editingTransaction) {
      setTransactions(prev => prev.map(t => 
        t.id === editingTransaction.id 
          ? { ...transactionData, id: editingTransaction.id }
          : t
      ))
      setEditingTransaction(undefined)
    } else {
      const newTransaction: Transaction = {
        ...transactionData,
        id: Date.now().toString()
      }
      setTransactions(prev => [newTransaction, ...prev])
    }
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

  // Funções para manipular produtos
  const handleSaveProduct = (productData: Omit<Product, 'id'>) => {
    if (editingProduct) {
      // Editando produto existente
      setProducts(prev => prev.map(p => 
        p.id === editingProduct.id ? { ...editingProduct, ...productData } : p
      ))
    } else {
      // Criando novo produto
      const newProduct: Product = {
        ...productData,
        id: Date.now().toString()
      }
      setProducts(prev => [...prev, newProduct])
    }
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

  // Funções para manipular metas
  const handleSaveMeta = (metaData: Meta) => {
    if (editingMeta) {
      // Editando meta existente
      setMetas(prev => prev.map(m => 
        m.id === editingMeta.id ? { ...metaData } : m
      ))
    } else {
      // Criando nova meta
      setMetas(prev => [...prev, metaData])
    }
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

  // Renderização das abas
  const renderDashboard = () => (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      {/* Seção do Mês */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-amber-800 flex items-center gap-3">
          <img src="/alya-logo.png" alt="Alya" className="w-6 h-6" />
          Mês Atual - {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date())}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            className="bg-gradient-to-br from-emerald-50 to-green-100 p-8 rounded-2xl border border-emerald-200 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={() => toggleChart('receitas-mes')}
          >
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <div className="ml-6">
                <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">Receitas</p>
                <p className="text-3xl font-bold text-emerald-900 mt-1">
                  R$ {totalReceitasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div 
            className="bg-gradient-to-br from-orange-50 to-red-100 p-8 rounded-2xl border border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={() => toggleChart('despesas-mes')}
          >
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
              <div className="ml-6">
                <p className="text-sm font-semibold text-orange-600 uppercase tracking-wide">Despesas</p>
                <p className="text-3xl font-bold text-orange-900 mt-1">
                  R$ {totalDespesasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div 
            className="bg-gradient-to-br from-amber-50 to-yellow-100 border-amber-200 p-8 rounded-2xl border shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={() => toggleChart('saldo-mes')}
          >
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div className="ml-6">
                <p className="text-sm font-semibold text-amber-600 uppercase tracking-wide">
                  Saldo
                </p>
                <p className={`text-3xl font-bold ${saldoMes >= 0 ? 'text-emerald-900' : 'text-red-900'} mt-1`}>
                  R$ {saldoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos do Mês */}
        {visibleCharts['receitas-mes'] && (
          <PieChart
            data={[
              { label: 'Atacado', value: getTransactionsByPeriod('mes').filter(t => t.type === 'receita' && t.category === 'Atacado').reduce((sum, t) => sum + t.amount, 0), color: '#10b981' },
              { label: 'Varejo', value: getTransactionsByPeriod('mes').filter(t => t.type === 'receita' && t.category === 'Varejo').reduce((sum, t) => sum + t.amount, 0), color: '#34d399' },
              { label: 'Outros', value: getTransactionsByPeriod('mes').filter(t => t.type === 'receita' && t.category === 'Outros').reduce((sum, t) => sum + t.amount, 0), color: '#6ee7b7' }
            ]}
            title="Receitas do Mês por Categoria"
          />
        )}

        {visibleCharts['despesas-mes'] && (
          <PieChart
            data={[
              { label: 'Fixo', value: getTransactionsByPeriod('mes').filter(t => t.type === 'despesa' && t.category === 'Fixo').reduce((sum, t) => sum + t.amount, 0), color: '#f97316' },
              { label: 'Variável', value: getTransactionsByPeriod('mes').filter(t => t.type === 'despesa' && t.category === 'Variável').reduce((sum, t) => sum + t.amount, 0), color: '#fb923c' },
              { label: 'Investimento', value: getTransactionsByPeriod('mes').filter(t => t.type === 'despesa' && t.category === 'Investimento').reduce((sum, t) => sum + t.amount, 0), color: '#fdba74' },
              { label: 'Marketing', value: getTransactionsByPeriod('mes').filter(t => t.type === 'despesa' && t.category === 'Mkt').reduce((sum, t) => sum + t.amount, 0), color: '#fed7aa' }
            ]}
            title="Despesas do Mês por Categoria"
          />
        )}

        {visibleCharts['saldo-mes'] && (
          <BarChart
            data={[
              { label: 'Receitas', value: totalReceitasMes, color: '#10b981' },
              { label: 'Despesas', value: totalDespesasMes, color: '#f97316' },
              { label: 'Saldo', value: Math.abs(saldoMes), color: saldoMes >= 0 ? '#10b981' : '#ef4444' }
            ]}
            title="Comparativo do Mês - Receitas vs Despesas vs Saldo"
            type="vertical"
          />
        )}


      </div>

      {/* Seção do Ano */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-amber-800 flex items-center gap-3">
          <img src="/alya-logo.png" alt="Alya" className="w-6 h-6" />
          Ano Atual - {currentYear}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            className="bg-gradient-to-br from-emerald-50 to-green-100 p-8 rounded-2xl border border-emerald-200 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={() => toggleChart('receitas-ano')}
          >
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <div className="ml-6">
                <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">Receitas</p>
                <p className="text-3xl font-bold text-emerald-900 mt-1">
                  R$ {totalReceitasAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div 
            className="bg-gradient-to-br from-orange-50 to-red-100 p-8 rounded-2xl border border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={() => toggleChart('despesas-ano')}
          >
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
              <div className="ml-6">
                <p className="text-sm font-semibold text-orange-600 uppercase tracking-wide">Despesas</p>
                <p className="text-3xl font-bold text-orange-900 mt-1">
                  R$ {totalDespesasAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div 
            className="bg-gradient-to-br from-amber-50 to-yellow-100 border-amber-200 p-8 rounded-2xl border shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={() => toggleChart('saldo-ano')}
          >
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div className="ml-6">
                <p className="text-sm font-semibold text-amber-600 uppercase tracking-wide">
                  Saldo
                </p>
                <p className={`text-3xl font-bold ${saldoAno >= 0 ? 'text-emerald-900' : 'text-red-900'} mt-1`}>
                  R$ {saldoAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos do Ano */}
        {visibleCharts['receitas-ano'] && (
          <PieChart
            data={[
              { label: 'Atacado', value: getTransactionsByPeriod('ano').filter(t => t.type === 'receita' && t.category === 'Atacado').reduce((sum, t) => sum + t.amount, 0), color: '#10b981' },
              { label: 'Varejo', value: getTransactionsByPeriod('ano').filter(t => t.type === 'receita' && t.category === 'Varejo').reduce((sum, t) => sum + t.amount, 0), color: '#34d399' },
              { label: 'Outros', value: getTransactionsByPeriod('ano').filter(t => t.type === 'receita' && t.category === 'Outros').reduce((sum, t) => sum + t.amount, 0), color: '#6ee7b7' }
            ]}
            title="Receitas do Ano por Categoria"
          />
        )}

        {visibleCharts['despesas-ano'] && (
          <PieChart
            data={[
              { label: 'Fixo', value: getTransactionsByPeriod('ano').filter(t => t.type === 'despesa' && t.category === 'Fixo').reduce((sum, t) => sum + t.amount, 0), color: '#f97316' },
              { label: 'Variável', value: getTransactionsByPeriod('ano').filter(t => t.type === 'despesa' && t.category === 'Variável').reduce((sum, t) => sum + t.amount, 0), color: '#fb923c' },
              { label: 'Investimento', value: getTransactionsByPeriod('ano').filter(t => t.type === 'despesa' && t.category === 'Investimento').reduce((sum, t) => sum + t.amount, 0), color: '#fdba74' },
              { label: 'Marketing', value: getTransactionsByPeriod('ano').filter(t => t.type === 'despesa' && t.category === 'Mkt').reduce((sum, t) => sum + t.amount, 0), color: '#fed7aa' }
            ]}
            title="Despesas do Ano por Categoria"
          />
        )}

        {visibleCharts['saldo-ano'] && (
          <BarChart
            data={[
              { label: 'Receitas', value: totalReceitasAno, color: '#10b981' },
              { label: 'Despesas', value: totalDespesasAno, color: '#f97316' },
              { label: 'Saldo', value: Math.abs(saldoAno), color: saldoAno >= 0 ? '#10b981' : '#ef4444' }
            ]}
            title="Comparativo do Ano - Receitas vs Despesas vs Saldo"
            type="vertical"
          />
        )}


      </div>

      <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-amber-100">
        <h2 className="text-2xl font-bold text-amber-900 mb-6 flex items-center">
          <img 
            src="/alya-logo.png" 
            alt="Alya" 
            className="w-8 h-8 rounded-lg mr-3 object-contain"
          />
          Transações Recentes
        </h2>
        <div className="space-y-4">
          {transactions.slice(0, 5).map(transaction => (
            <div key={transaction.id} className="flex justify-between items-center p-4 bg-gradient-to-r from-amber-50/50 to-orange-50/50 rounded-xl border border-amber-100 hover:shadow-md transition-all duration-300">
              <div>
                <p className="font-semibold text-amber-900">{transaction.description}</p>
                <p className="text-sm text-amber-600/70">{transaction.category}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold text-lg ${transaction.type === 'receita' ? 'text-emerald-600' : 'text-orange-600'}`}>
                  {transaction.type === 'receita' ? '+' : '-'} 
                  R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-amber-500 font-medium">{transaction.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderTransactions = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Transações</h1>
        <button
          onClick={() => {
            setEditingTransaction(undefined)
            setIsModalOpen(true)
          }}
          className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
        >
          <Plus className="h-5 w-5" />
          Nova Transação
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-amber-100">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-amber-100 to-orange-100">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-bold text-amber-800 uppercase tracking-wider">Data</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-amber-800 uppercase tracking-wider">Descrição</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-amber-800 uppercase tracking-wider">Categoria</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-amber-800 uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-amber-800 uppercase tracking-wider">Valor</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-amber-800 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white/50 divide-y divide-amber-200">
            {transactions.map(transaction => (
              <tr key={transaction.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-amber-900">
                  {transaction.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-amber-900">{transaction.description}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-700">
                  {transaction.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full shadow-sm ${
                    transaction.type === 'receita' ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border border-emerald-200' : 'bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 border border-orange-200'
                  }`}>
                    {transaction.type === 'receita' ? 'Receita' : 'Despesa'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-lg font-bold ${
                    transaction.type === 'receita' ? 'text-emerald-600' : 'text-orange-600'
                  }`}>
                    {transaction.type === 'receita' ? '+' : '-'} 
                    R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditTransaction(transaction)}
                      className="p-2 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-all duration-200"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTransaction(transaction.id)}
                      className="p-2 text-orange-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderProducts = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Produtos</h1>
        <button
          onClick={() => {
            setEditingProduct(undefined)
            setIsProductModalOpen(true)
          }}
          className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
        >
          <Plus className="h-5 w-5" />
          Adicionar Produto
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => (
          <div key={product.id} className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-amber-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <h3 className="text-xl font-bold text-amber-900 mb-2">{product.name}</h3>
            <p className="text-amber-600 font-medium mb-6">{product.category}</p>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl">
                <span className="text-sm font-semibold text-amber-700">Preço:</span>
                <span className="font-bold text-amber-900">R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl">
                <span className="text-sm font-semibold text-orange-700">Custo:</span>
                <span className="font-bold text-orange-900">R$ {product.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl">
                <span className="text-sm font-semibold text-emerald-700">Margem:</span>
                <span className="font-bold text-emerald-700 text-lg">
                  {(((product.price - product.cost) / product.price) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                <span className="text-sm font-semibold text-blue-700">Estoque:</span>
                <span className="font-bold text-blue-900">{product.stock} un.</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                <span className="text-sm font-semibold text-purple-700">Vendidos:</span>
                <span className="font-bold text-purple-900">{product.sold} un.</span>
              </div>
            </div>
            
            {/* Botões de ação */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleEditProduct(product)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-500 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-blue-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
              >
                <Edit className="h-4 w-4" />
                Editar
              </button>
              <button
                onClick={() => handleDeleteProduct(product.id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-400 to-red-500 text-white font-semibold rounded-xl hover:from-red-500 hover:to-red-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // Função para filtrar transações por período
  const getTransactionsByPeriod = (period: 'semana' | 'mes' | 'trimestre' | 'ano') => {
    const now = new Date()
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    return transactions.filter(t => {
      const transactionDate = new Date(t.date)
      switch (period) {
        case 'semana':
          return transactionDate >= startOfWeek
        case 'mes':
          return transactionDate >= startOfMonth
        case 'trimestre':
          return transactionDate >= startOfQuarter
        case 'ano':
          return transactionDate >= startOfYear
        default:
          return true
      }
    })
  }

  const renderReports = () => {
    const periods = [
      { key: 'semana', label: 'Semana' },
      { key: 'mes', label: 'Mês' },
      { key: 'trimestre', label: 'Trimestre' },
      { key: 'ano', label: 'Ano' }
    ] as const

    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Relatórios</h1>
        
        {periods.map(period => {
          const periodTransactions = getTransactionsByPeriod(period.key)
          
          return (
            <div key={period.key} className="space-y-6">
              <h2 className="text-2xl font-bold text-amber-800 flex items-center gap-3">
                <img src="/alya-logo.png" alt="Alya" className="w-6 h-6" />
                Relatório por {period.label}
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Relatórios de Vendas */}
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-emerald-100">
                  <h3 className="text-xl font-bold text-emerald-900 mb-6 flex items-center">
                    <TrendingUp className="h-6 w-6 mr-2" />
                    Vendas por Categoria
                  </h3>
                  
                  <div className="space-y-4">
                    {['Atacado', 'Varejo', 'Outros'].map(categoria => {
                      const total = periodTransactions
                        .filter(t => t.type === 'receita' && t.category === categoria)
                        .reduce((sum, t) => sum + t.amount, 0)
                      
                      return (
                        <div key={categoria}>
                          <div 
                            className="flex justify-between items-center p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-100 cursor-pointer hover:shadow-md transition-all duration-300"
                            onClick={() => toggleChart(`vendas-${categoria.toLowerCase()}-${period.key}`)}
                          >
                            <span className="px-3 py-2 text-sm font-bold rounded-full bg-emerald-100 text-emerald-800">
                              {categoria}
                            </span>
                            <span className="font-bold text-emerald-900 text-lg">
                              R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          
                          {/* Gráfico de Pizza para Vendas */}
                          {visibleCharts[`vendas-${categoria.toLowerCase()}-${period.key}`] && (
                            <PieChart
                              data={[
                                { label: categoria, value: total, color: '#10b981' },
                                { label: 'Meta Futura', value: total * 0.2, color: '#d1d5db' }
                              ]}
                              title={`Análise de Vendas - ${categoria} (${period.label})`}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-emerald-200">
                    <div 
                      className="cursor-pointer hover:bg-emerald-25 p-2 rounded-lg transition-all duration-300"
                      onClick={() => toggleChart(`produtos-vendas-${period.key}`)}
                    >
                      <h4 className="text-lg font-bold text-emerald-900 mb-4">Vendas por Tipo de Produto 📊</h4>
                    </div>
                    
                    {/* Gráfico especial para produtos */}
                    {visibleCharts[`produtos-vendas-${period.key}`] && (
                      <BarChart
                        data={Array.from(new Set(products.map(p => p.category))).map((categoria, index) => {
                          const produtosDaCategoria = products.filter(p => p.category === categoria)
                          // Simulação de vendas por período baseado no tipo de período
                          let vendasPorPeriodo = 0
                          switch (period.key) {
                            case 'semana':
                              vendasPorPeriodo = produtosDaCategoria.reduce((sum, p) => sum + Math.floor(p.sold / 4), 0) // por dia na semana
                              break
                            case 'mes':
                              vendasPorPeriodo = produtosDaCategoria.reduce((sum, p) => sum + Math.floor(p.sold / 4), 0) // por semana no mês
                              break
                            case 'trimestre':
                              vendasPorPeriodo = produtosDaCategoria.reduce((sum, p) => sum + Math.floor(p.sold / 3), 0) // por mês no trimestre
                              break
                            case 'ano':
                              vendasPorPeriodo = produtosDaCategoria.reduce((sum, p) => sum + Math.floor(p.sold / 12), 0) // por trimestre no ano
                              break
                          }
                          
                          const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']
                          return {
                            label: categoria,
                            value: vendasPorPeriodo,
                            color: colors[index % colors.length]
                          }
                        })}
                        title={`Vendas por ${
                          period.key === 'semana' ? 'Dia' : 
                          period.key === 'mes' ? 'Semana' :
                          period.key === 'trimestre' ? 'Mês' : 'Trimestre'
                        } - ${period.label}`}
                        type="vertical"
                      />
                    )}
                    
                    <div className="space-y-3">
                      {Array.from(new Set(products.map(p => p.category))).map(categoria => {
                        // Simulando vendas por categoria de produto baseado nas receitas
                        const produtosDaCategoria = products.filter(p => p.category === categoria)
                        const vendasCategoria = produtosDaCategoria.reduce((sum, p) => sum + (p.sold * p.price), 0)
                        
                        return (
                          <div key={categoria} className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                            <span className="px-3 py-1 text-sm font-bold rounded-full bg-blue-100 text-blue-800">
                              {categoria}
                            </span>
                            <span className="font-bold text-blue-900">
                              R$ {vendasCategoria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Relatórios de Despesas */}
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-orange-100">
                  <h3 className="text-xl font-bold text-orange-900 mb-6 flex items-center">
                    <DollarSign className="h-6 w-6 mr-2" />
                    Despesas por Categoria
                  </h3>
                  
                  <div className="space-y-4">
                    {['Fixo', 'Variável', 'Atacado', 'Varejo', 'Investimento', 'Mkt'].map(categoria => {
                      const total = periodTransactions
                        .filter(t => t.type === 'despesa' && t.category === categoria)
                        .reduce((sum, t) => sum + t.amount, 0)
                      
                      return (
                        <div key={categoria}>
                          <div 
                            className="flex justify-between items-center p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100 cursor-pointer hover:shadow-md transition-all duration-300"
                            onClick={() => toggleChart(`despesa-${categoria.toLowerCase()}-${period.key}`)}
                          >
                            <span className="px-3 py-2 text-sm font-bold rounded-full bg-orange-100 text-orange-800">
                              {categoria}
                            </span>
                            <span className="font-bold text-orange-900 text-lg">
                              R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          
                          {/* Gráfico de Pizza para Despesas */}
                          {visibleCharts[`despesa-${categoria.toLowerCase()}-${period.key}`] && (
                            <PieChart
                              data={[
                                { label: categoria, value: total, color: '#f97316' },
                                { label: 'Meta Controle', value: total * 0.15, color: '#d1d5db' }
                              ]}
                              title={`Análise de Despesas - ${categoria} (${period.label})`}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-orange-200">
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-200">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-amber-800">Total de Despesas</span>
                        <span className="text-2xl font-bold text-amber-900">
                          R$ {periodTransactions
                            .filter(t => t.type === 'despesa')
                            .reduce((sum, t) => sum + t.amount, 0)
                            .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumo do Período */}
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-amber-100">
                <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center">
                  <BarChart3 className="h-6 w-6 mr-2" />
                  Resumo do {period.label}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-200">
                    <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">Total Receitas</p>
                    <p className="text-2xl font-bold text-emerald-900 mt-1">
                      R$ {periodTransactions
                        .filter(t => t.type === 'receita')
                        .reduce((sum, t) => sum + t.amount, 0)
                        .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-xl border border-orange-200">
                    <p className="text-sm font-semibold text-orange-600 uppercase tracking-wide">Total Despesas</p>
                    <p className="text-2xl font-bold text-orange-900 mt-1">
                      R$ {periodTransactions
                        .filter(t => t.type === 'despesa')
                        .reduce((sum, t) => sum + t.amount, 0)
                        .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-200">
                    <p className="text-sm font-semibold text-amber-600 uppercase tracking-wide">Saldo</p>
                    <p className={`text-2xl font-bold mt-1 ${
                      (periodTransactions.filter(t => t.type === 'receita').reduce((sum, t) => sum + t.amount, 0) -
                       periodTransactions.filter(t => t.type === 'despesa').reduce((sum, t) => sum + t.amount, 0)) >= 0
                        ? 'text-emerald-900' : 'text-red-900'
                    }`}>
                      R$ {(periodTransactions.filter(t => t.type === 'receita').reduce((sum, t) => sum + t.amount, 0) -
                           periodTransactions.filter(t => t.type === 'despesa').reduce((sum, t) => sum + t.amount, 0))
                           .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

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
    const despesasFixas = transacoesDoMes.filter(t => t.type === 'despesa' && ['Aluguel', 'Salários', 'Seguros', 'Financiamentos'].includes(t.category)).reduce((sum, t) => sum + t.amount, 0)
    const despesasVariaveis = transacoesDoMes.filter(t => t.type === 'despesa' && ['Marketing', 'Materiais', 'Combustível', 'Outras Despesas'].includes(t.category)).reduce((sum, t) => sum + t.amount, 0)
    const investimentos = transacoesDoMes.filter(t => t.type === 'despesa' && ['Equipamentos', 'Tecnologia', 'Capacitação'].includes(t.category)).reduce((sum, t) => sum + t.amount, 0)

    // Faturamentos
    const faturamentoTotal = totalReceitas
    const faturamentoVarejo = transacoesDoMes.filter(t => t.type === 'receita' && t.category === 'Varejo').reduce((sum, t) => sum + t.amount, 0)
    const faturamentoAtacado = transacoesDoMes.filter(t => t.type === 'receita' && t.category === 'Atacado').reduce((sum, t) => sum + t.amount, 0)
    const investimentoMKT = transacoesDoMes.filter(t => t.type === 'despesa' && t.category === 'Marketing').reduce((sum, t) => sum + t.amount, 0)

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
            {new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())} - 2025
          </h2>
        </div>

        {/* 1. RESULTADO */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <img src="/alya-logo.png" alt="Alya" className="w-6 h-6" />
            Resultado
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Painel de Fluxo de Caixa */}
            <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <DollarSign className="h-6 w-6 mr-2 text-gray-600" />
                Reforço de Caixa
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium text-gray-700">REFORÇO DE CAIXA</span>
                  <span className="font-bold text-gray-800">-</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="font-medium text-gray-700">SAÍDA DE CAIXA</span>
                  <span className="font-bold text-gray-800">R$ 0,00</span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium text-emerald-700">RECEITA</span>
                  <span className="font-bold text-emerald-800">
                    R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium text-red-700">DESPESA</span>
                  <span className="font-bold text-red-800">
                    -R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="font-medium text-gray-700">SALDO INICIAL</span>
                  <span className="font-bold text-gray-800">R$ 31.970,50</span>
                </div>
                
                <div className="flex justify-between items-center py-3 bg-gray-50 px-4 rounded-lg">
                  <span className="font-bold text-gray-800 text-lg">Total geral</span>
                  <span className="font-bold text-gray-800 text-lg">
                    R$ {(31970.50 + totalReceitas - totalDespesas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Painel de Metas vs Realizado */}
            <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <TrendingUp className="h-6 w-6 mr-2 text-gray-600" />
                Metas vs Realizado
              </h3>
              
              <div className="space-y-6">
                {/* Meta de Faturamento */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">R$</span>
                    <span className="font-medium text-gray-700">%</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 bg-gray-50 px-4 rounded-lg">
                      <span className="font-medium text-gray-700">META</span>
                      <div className="flex gap-8">
                        <span className="font-bold text-gray-800">R$ 21.889,17</span>
                        <span className="font-bold text-gray-600">100%</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-emerald-700">ALCANÇADO</span>
                      <div className="flex gap-8">
                        <span className="font-bold text-emerald-800">
                          R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="font-bold text-emerald-800">
                          {((totalReceitas / 21889.17) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-red-700">RESTANTE</span>
                      <div className="flex gap-8">
                        <span className={`font-bold ${21889.17 - totalReceitas <= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                          {21889.17 - totalReceitas <= 0 ? '' : '-'}R$ {Math.abs(21889.17 - totalReceitas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className={`font-bold ${21889.17 - totalReceitas <= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                          {((totalReceitas / 21889.17) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Barra de Progresso da Meta */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Progresso da Meta</span>
                    <span>{((totalReceitas / 21889.17) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className={`h-4 rounded-full transition-all duration-700 ${
                        totalReceitas >= 21889.17 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min((totalReceitas / 21889.17) * 100, 100)}%` }}
                    />
                  </div>
                </div>
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Despesas Totais */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-2xl border border-red-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-red-800">Despesas Totais</h3>
              <TrendingUp className="h-6 w-6 text-red-600" />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-red-700">Meta:</span>
                <span className="text-sm font-bold text-red-800">R$ 29.100,00</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-red-700">Valor Bruto:</span>
                <span className="text-sm font-bold text-red-800">
                  R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="w-full bg-red-200 rounded-full h-3">
                <div 
                  className="h-3 bg-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((totalDespesas / 29100) * 100, 100)}%` }}
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-red-600">Percentual:</span>
                <span className={`text-xs font-bold ${(totalDespesas / 29100) * 100 <= 100 ? 'text-green-600' : 'text-red-600'}`}>
                  {((totalDespesas / 29100) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Despesas Variáveis */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl border border-orange-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-orange-800">Despesas Variáveis</h3>
              <BarChart3 className="h-6 w-6 text-orange-600" />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-orange-700">Meta:</span>
                <span className="text-sm font-bold text-orange-800">R$ 20.000,00</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-orange-700">Valor Bruto:</span>
                <span className="text-sm font-bold text-orange-800">
                  R$ {despesasVariaveis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="w-full bg-orange-200 rounded-full h-3">
                <div 
                  className="h-3 bg-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((despesasVariaveis / 20000) * 100, 100)}%` }}
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-orange-600">Percentual:</span>
                <span className={`text-xs font-bold ${(despesasVariaveis / 20000) * 100 <= 100 ? 'text-green-600' : 'text-red-600'}`}>
                  {((despesasVariaveis / 20000) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Despesas Fixas */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-2xl border border-amber-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-amber-800">Despesas Fixas</h3>
              <DollarSign className="h-6 w-6 text-amber-600" />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-amber-700">Meta:</span>
                <span className="text-sm font-bold text-amber-800">R$ 9.000,00</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-amber-700">Valor Bruto:</span>
                <span className="text-sm font-bold text-amber-800">
                  R$ {despesasFixas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="w-full bg-amber-200 rounded-full h-3">
                <div 
                  className="h-3 bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((despesasFixas / 9000) * 100, 100)}%` }}
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-amber-600">Percentual:</span>
                <span className={`text-xs font-bold ${(despesasFixas / 9000) * 100 <= 100 ? 'text-green-600' : 'text-red-600'}`}>
                  {((despesasFixas / 9000) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Investimentos */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-blue-800">Investimentos</h3>
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-700">Meta:</span>
                <span className="text-sm font-bold text-blue-800">R$ 100,00</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-700">Valor Bruto:</span>
                <span className="text-sm font-bold text-blue-800">
                  R$ {investimentos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="w-full bg-blue-200 rounded-full h-3">
                <div 
                  className="h-3 bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((investimentos / 100) * 100, 100)}%` }}
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-blue-600">Percentual:</span>
                <span className={`text-xs font-bold ${(investimentos / 100) * 100 <= 100 ? 'text-green-600' : 'text-red-600'}`}>
                  {((investimentos / 100) * 100).toFixed(1)}%
                </span>
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Faturamento Total */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-2xl border border-emerald-200 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-emerald-800">Faturamento TOTAL</h3>
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-emerald-700">Meta:</span>
                  <span className="text-sm font-bold text-emerald-800">R$ 21.889,17</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-emerald-700">Faturado:</span>
                  <span className="text-sm font-bold text-emerald-800">
                    R$ {faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="w-full bg-emerald-200 rounded-full h-3">
                  <div 
                    className="h-3 bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((faturamentoTotal / 21889.17) * 100, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-emerald-600">Percentual:</span>
                  <span className={`text-xs font-bold ${(faturamentoTotal / 21889.17) * 100 >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {((faturamentoTotal / 21889.17) * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-emerald-600">Restante:</span>
                  <span className={`text-xs font-bold ${21889.17 - faturamentoTotal <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    R$ {(21889.17 - faturamentoTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Faturamento Varejo */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border border-green-200 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-green-800">Faturamento Varejo</h3>
                <ShoppingCart className="h-6 w-6 text-green-600" />
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-green-700">Meta:</span>
                  <span className="text-sm font-bold text-green-800">R$ 16.612,77</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-green-700">Faturado:</span>
                  <span className="text-sm font-bold text-green-800">
                    R$ {faturamentoVarejo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="w-full bg-green-200 rounded-full h-3">
                  <div 
                    className="h-3 bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((faturamentoVarejo / 16612.77) * 100, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-green-600">Percentual:</span>
                  <span className={`text-xs font-bold ${(faturamentoVarejo / 16612.77) * 100 >= 100 ? 'text-green-600' : 'text-amber-600'}`}>
                    {((faturamentoVarejo / 16612.77) * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-green-600">Restante:</span>
                  <span className={`text-xs font-bold ${16612.77 - faturamentoVarejo <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {(16612.77 - faturamentoVarejo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Faturamento Atacado */}
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-6 rounded-2xl border border-teal-200 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-teal-800">Faturamento Atacado</h3>
                <Package className="h-6 w-6 text-teal-600" />
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-teal-700">Meta:</span>
                  <span className="text-sm font-bold text-teal-800">R$ 5.276,40</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-teal-700">Faturado:</span>
                  <span className="text-sm font-bold text-teal-800">
                    R$ {faturamentoAtacado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="w-full bg-teal-200 rounded-full h-3">
                  <div 
                    className="h-3 bg-teal-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((faturamentoAtacado / 5276.40) * 100, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-teal-600">Percentual:</span>
                  <span className={`text-xs font-bold ${(faturamentoAtacado / 5276.40) * 100 >= 100 ? 'text-teal-600' : 'text-amber-600'}`}>
                    {((faturamentoAtacado / 5276.40) * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-teal-600">Restante:</span>
                  <span className={`text-xs font-bold ${5276.40 - faturamentoAtacado <= 0 ? 'text-teal-600' : 'text-red-600'}`}>
                    R$ {(5276.40 - faturamentoAtacado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Investimentos em MKT */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-purple-800">Investimentos em MKT</h3>
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-purple-700">Meta:</span>
                  <span className="text-sm font-bold text-purple-800">R$ -</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-purple-700">Gasto:</span>
                  <span className="text-sm font-bold text-purple-800">
                    R$ {investimentoMKT.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="w-full bg-purple-200 rounded-full h-3">
                  <div 
                    className="h-3 bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((investimentoMKT / 8435.35) * 100, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-purple-600">Valor Bruto:</span>
                  <span className="text-xs font-bold text-purple-800">
                    R$ 8.435,35
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-purple-600">Restante:</span>
                  <span className="text-xs font-bold text-purple-600">
                    R$ {(8435.35 - investimentoMKT).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Cards de Progresso das Metas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metas.map(meta => {
          let progresso = 0
          let valorAtual = 0

          // Calcular progresso baseado no tipo de meta
          if (meta.tipo === 'receita') {
            valorAtual = transactions
              .filter(t => t.type === 'receita' && (!meta.categoria || t.category === meta.categoria))
              .reduce((sum, t) => sum + t.amount, 0)
            progresso = (valorAtual / meta.valor) * 100
          } else if (meta.tipo === 'lucro') {
            const receitas = transactions.filter(t => t.type === 'receita').reduce((sum, t) => sum + t.amount, 0)
            const despesas = transactions.filter(t => t.type === 'despesa').reduce((sum, t) => sum + t.amount, 0)
            valorAtual = receitas - despesas
            progresso = (valorAtual / meta.valor) * 100
          } else if (meta.tipo === 'vendas') {
            valorAtual = products
              .filter(p => !meta.categoria || p.category === meta.categoria)
              .reduce((sum, p) => sum + p.sold, 0)
            progresso = (valorAtual / meta.valor) * 100
          }

          const isCompleta = progresso >= 100
          const corProgresso = progresso >= 100 ? 'emerald' : progresso >= 75 ? 'amber' : progresso >= 50 ? 'orange' : 'red'

          return (
            <div key={meta.id} className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-amber-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    meta.status === 'ativa' ? 'bg-emerald-500' :
                    meta.status === 'pausada' ? 'bg-amber-500' : 'bg-gray-500'
                  }`} />
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                    {meta.periodo}
                  </span>
                </div>
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                  isCompleta ? 'bg-emerald-100 text-emerald-800' : 
                  `bg-${corProgresso}-100 text-${corProgresso}-800`
                }`}>
                  {progresso.toFixed(1)}%
                </span>
              </div>

              <h3 className="text-lg font-bold text-amber-900 mb-2">{meta.descricao}</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-amber-700 font-medium">Progresso:</span>
                  <span className="text-sm font-bold text-amber-900">
                    {meta.tipo === 'receita' || meta.tipo === 'lucro' ? 
                      `R$ ${valorAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` :
                      `${valorAtual} unidades`
                    }
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      isCompleta ? 'bg-emerald-500' : `bg-${corProgresso}-500`
                    }`}
                    style={{ width: `${Math.min(progresso, 100)}%` }}
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-amber-700 font-medium">Meta:</span>
                  <span className="text-sm font-bold text-amber-900">
                    {meta.tipo === 'receita' || meta.tipo === 'lucro' ? 
                      `R$ ${meta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` :
                      `${meta.valor} unidades`
                    }
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-amber-100 space-y-2">
                <p className="text-xs text-amber-600">
                  Período: {new Date(meta.dataInicio).toLocaleDateString('pt-BR')} - {new Date(meta.dataFim).toLocaleDateString('pt-BR')}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditMeta(meta)}
                    className="flex-1 text-xs py-2 px-3 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteMeta(meta.id)}
                    className="flex-1 text-xs py-2 px-3 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Resumo de Metas */}
      <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-amber-100">
        <h2 className="text-2xl font-bold text-amber-900 mb-6 flex items-center">
          <img 
            src="/alya-logo.png" 
            alt="Alya" 
            className="w-8 h-8 rounded-lg mr-3 object-contain"
          />
          Resumo de Performance
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600 mb-2">
              {metas.filter(m => {
                if (m.tipo === 'receita') {
                  const valorAtual = transactions.filter(t => t.type === 'receita' && (!m.categoria || t.category === m.categoria)).reduce((sum, t) => sum + t.amount, 0)
                  return (valorAtual / m.valor) * 100 >= 100
                } else if (m.tipo === 'lucro') {
                  const receitas = transactions.filter(t => t.type === 'receita').reduce((sum, t) => sum + t.amount, 0)
                  const despesas = transactions.filter(t => t.type === 'despesa').reduce((sum, t) => sum + t.amount, 0)
                  const valorAtual = receitas - despesas
                  return (valorAtual / m.valor) * 100 >= 100
                } else if (m.tipo === 'vendas') {
                  const valorAtual = products.filter(p => !m.categoria || p.category === m.categoria).reduce((sum, p) => sum + p.sold, 0)
                  return (valorAtual / m.valor) * 100 >= 100
                }
                return false
              }).length}
            </div>
            <p className="text-sm text-emerald-600 font-medium">Metas Atingidas</p>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-600 mb-2">
              {metas.filter(m => m.status === 'ativa').length}
            </div>
            <p className="text-sm text-amber-600 font-medium">Metas Ativas</p>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {metas.filter(m => {
                if (m.tipo === 'receita') {
                  const valorAtual = transactions.filter(t => t.type === 'receita' && (!m.categoria || t.category === m.categoria)).reduce((sum, t) => sum + t.amount, 0)
                  const prog = (valorAtual / m.valor) * 100
                  return prog >= 75 && prog < 100
                } else if (m.tipo === 'lucro') {
                  const receitas = transactions.filter(t => t.type === 'receita').reduce((sum, t) => sum + t.amount, 0)
                  const despesas = transactions.filter(t => t.type === 'despesa').reduce((sum, t) => sum + t.amount, 0)
                  const valorAtual = receitas - despesas
                  const prog = (valorAtual / m.valor) * 100
                  return prog >= 75 && prog < 100
                } else if (m.tipo === 'vendas') {
                  const valorAtual = products.filter(p => !m.categoria || p.category === m.categoria).reduce((sum, p) => sum + p.sold, 0)
                  const prog = (valorAtual / m.valor) * 100
                  return prog >= 75 && prog < 100
                }
                return false
              }).length}
            </div>
            <p className="text-sm text-orange-600 font-medium">Próximas ao Alvo</p>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">
              {metas.filter(m => {
                if (m.tipo === 'receita') {
                  const valorAtual = transactions.filter(t => t.type === 'receita' && (!m.categoria || t.category === m.categoria)).reduce((sum, t) => sum + t.amount, 0)
                  return (valorAtual / m.valor) * 100 < 50
                } else if (m.tipo === 'lucro') {
                  const receitas = transactions.filter(t => t.type === 'receita').reduce((sum, t) => sum + t.amount, 0)
                  const despesas = transactions.filter(t => t.type === 'despesa').reduce((sum, t) => sum + t.amount, 0)
                  const valorAtual = receitas - despesas
                  return (valorAtual / m.valor) * 100 < 50
                } else if (m.tipo === 'vendas') {
                  const valorAtual = products.filter(p => !m.categoria || p.category === m.categoria).reduce((sum, p) => sum + p.sold, 0)
                  return (valorAtual / m.valor) * 100 < 50
                }
                return false
              }).length}
            </div>
            <p className="text-sm text-red-600 font-medium">Precisa Atenção</p>
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
              { id: 'transactions', name: 'Transações', icon: DollarSign },
              { id: 'products', name: 'Produtos', icon: Package },
              { id: 'reports', name: 'Relatórios', icon: BarChart3 },
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
        {activeTab === 'transactions' && renderTransactions()}
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'reports' && renderReports()}
        {activeTab === 'metas' && renderMetas()}
      </main>

      {/* Modal de Transação */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingTransaction(undefined)
        }}
        onSave={handleSaveTransaction}
        transaction={editingTransaction}
      />

      {/* Modal de Produto */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false)
          setEditingProduct(undefined)
        }}
        onSave={handleSaveProduct}
        product={editingProduct}
      />

      {/* Modal de Meta */}
      <MetaModal
        isOpen={isMetaModalOpen}
        onClose={() => {
          setIsMetaModalOpen(false)
          setEditingMeta(undefined)
        }}
        onSave={handleSaveMeta}
        meta={editingMeta}
      />
    </div>
  )
}

export default App
