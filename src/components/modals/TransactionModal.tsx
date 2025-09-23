import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Transaction } from '../../types'

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void
  transaction?: Transaction | null
  title: string
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  transaction,
  title,
}) => {
  const [formData, setFormData] = useState({
    date: '',
    description: '',
    category: '',
    amount: '',
    type: 'receita' as 'receita' | 'despesa',
    tipoReceita: '' as 'atacado' | 'varejo' | 'outros' | '',
    tipoDespesa: '' as 'fixo' | 'variavel' | 'atacado' | 'varejo' | 'investimento' | 'mkt' | 'outros' | '',
  })

  const categories = {
    receita: ['Vendas', 'Serviços', 'Outros Receitas'],
    despesa: ['Matéria Prima', 'Logística', 'Marketing', 'Equipamentos', 'Outros Despesas'],
  }

  const tiposReceita = [
    { value: 'atacado', label: 'Atacado' },
    { value: 'varejo', label: 'Varejo' },
    { value: 'outros', label: 'Outros' },
  ]

  const tiposDespesa = [
    { value: 'fixo', label: 'Fixo' },
    { value: 'variavel', label: 'Variável' },
    { value: 'atacado', label: 'Atacado' },
    { value: 'varejo', label: 'Varejo' },
    { value: 'investimento', label: 'Investimento' },
    { value: 'mkt', label: 'Marketing' },
    { value: 'outros', label: 'Outros' },
  ]

  useEffect(() => {
    if (transaction) {
      setFormData({
        date: transaction.date,
        description: transaction.description,
        category: transaction.category,
        amount: transaction.amount.toString(),
        type: transaction.type,
        tipoReceita: transaction.tipoReceita || '',
        tipoDespesa: transaction.tipoDespesa || '',
      })
    } else {
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
  }, [transaction, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.description || !formData.category || !formData.amount) {
      alert('Por favor, preencha todos os campos obrigatórios')
      return
    }

    if (formData.type === 'receita' && !formData.tipoReceita) {
      alert('Por favor, selecione o tipo de receita')
      return
    }

    if (formData.type === 'despesa' && !formData.tipoDespesa) {
      alert('Por favor, selecione o tipo de despesa')
      return
    }

    const transactionData: any = {
      date: formData.date,
      description: formData.description,
      category: formData.category,
      amount: parseFloat(formData.amount),
      type: formData.type,
    }

    if (formData.type === 'receita') {
      transactionData.tipoReceita = formData.tipoReceita
    } else {
      transactionData.tipoDespesa = formData.tipoDespesa
    }

    onSave(transactionData)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo *
            </label>
            <select
              value={formData.type}
              onChange={(e) => {
                const newType = e.target.value as 'receita' | 'despesa'
                setFormData({ 
                  ...formData, 
                  type: newType, 
                  category: '',
                  tipoReceita: '',
                  tipoDespesa: ''
                })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
          </div>

          {formData.type === 'receita' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Receita *
              </label>
              <select
                value={formData.tipoReceita}
                onChange={(e) => setFormData({ ...formData, tipoReceita: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione o tipo de receita</option>
                {tiposReceita.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                ))}
              </select>
            </div>
          )}

          {formData.type === 'despesa' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Despesa *
              </label>
              <select
                value={formData.tipoDespesa}
                onChange={(e) => setFormData({ ...formData, tipoDespesa: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione o tipo de despesa</option>
                {tiposDespesa.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecione uma categoria</option>
              {categories[formData.type].map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição *
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descreva a transação"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0,00"
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
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

export default TransactionModal
