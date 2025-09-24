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
  Download,
  Upload,
  Target,
  PieChart,
  TrendingDown,
  ArrowUpCircle,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react'

// Funções para comunicação com a API
const API_BASE_URL = 'http://localhost:3001/api'

// Funções para Transações
const fetchTransactions = async () => {
  const response = await fetch(`${API_BASE_URL}/transactions`)
  const result = await response.json()
  return result.success ? result.data : []
}

const saveTransaction = async (transaction: any) => {
  const response = await fetch(`${API_BASE_URL}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transaction)
  })
  const result = await response.json()
  return result.success ? result.data : null
}

const updateTransaction = async (id: string, transaction: any) => {
  const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transaction)
  })
  const result = await response.json()
  return result.success ? result.data : null
}

const deleteTransaction = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
    method: 'DELETE'
  })
  const result = await response.json()
  return result.success
}

const deleteMultipleTransactions = async (ids: string[]) => {
  const response = await fetch(`${API_BASE_URL}/transactions`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  })
  const result = await response.json()
  return result.success
}

// Funções para Produtos
const fetchProducts = async () => {
  const response = await fetch(`${API_BASE_URL}/products`)
  const result = await response.json()
  return result.success ? result.data : []
}

const saveProduct = async (product: any) => {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  })
  const result = await response.json()
  return result.success ? result.data : null
}

const updateProduct = async (id: string, product: any) => {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  })
  const result = await response.json()
  return result.success ? result.data : null
}

const deleteProduct = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'DELETE'
  })
  const result = await response.json()
  return result.success
}

const deleteMultipleProducts = async (ids: string[]) => {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  })
  const result = await response.json()
  return result.success
}

import { 
  PieChart as RechartsPieChart, 
  Pie,
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts'

// Tipos
interface OldTransaction {
  id: string
  description: string
  amount: number
  type: 'receita' | 'despesa' | 'investimento'
  category: string
  date: string
}

interface NewTransaction {
  id: string;
  date: string;
  description: string;
  value: number;
  type: 'Receita' | 'Despesa';
  category: string;
  createdAt: Date;
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
  const [activeTab, setActiveTab] = useState<TabType>('metas')
  const [products, setProducts] = useState<Product[]>([])
  const [metas, setMetas] = useState<Meta[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())

  // Estados dos modais
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)

  // Estados do formulário de produto
  const [productForm, setProductForm] = useState({
    name: '',
    category: '',
    price: '',
    cost: '',
    stock: '',
    sold: ''
  })
  const [productFormErrors, setProductFormErrors] = useState({
    name: false,
    category: false,
    price: false,
    cost: false,
    stock: false,
    sold: false
  })

  // Estados das transações
  const [transactions, setTransactions] = useState<NewTransaction[]>([]);

  // Estados do formulário de transação
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<NewTransaction | null>(null)
  
  // Estados do modal de importar/exportar
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false)
  const [importExportType, setImportExportType] = useState<'transactions' | 'products'>('transactions')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [transactionForm, setTransactionForm] = useState({
    date: new Date().toISOString().split('T')[0], // Data atual por padrão
    description: '',
    value: '',
    type: 'Receita',
    category: ''
  })
  const [transactionFormErrors, setTransactionFormErrors] = useState({
    date: false,
    description: false,
    value: false,
    type: false,
    category: false
  })
  
  // Estados do calendário personalizado
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [calendarDate, setCalendarDate] = useState(new Date())
  
  // Estados para calendários dos filtros
  const [isFilterCalendarFromOpen, setIsFilterCalendarFromOpen] = useState(false)
  const [isFilterCalendarToOpen, setIsFilterCalendarToOpen] = useState(false)
  const [filterCalendarFromDate, setFilterCalendarFromDate] = useState<Date | null>(null)
  const [filterCalendarToDate, setFilterCalendarToDate] = useState<Date | null>(null)
  
  // Estados para ordenação
  const [sortConfig, setSortConfig] = useState<{
    field: string | null
    direction: 'asc' | 'desc'
  }>({
    field: null,
    direction: 'asc'
  })

  // Estados para filtros
  const [transactionFilters, setTransactionFilters] = useState({
    type: '', // 'Receita', 'Despesa' ou ''
    category: '', // categoria específica ou ''
    dateFrom: '', // data início
    dateTo: '', // data fim
    hasDateFilter: false // se está usando filtro de data
  })

  const [productFilters, setProductFilters] = useState({
    category: '', // categoria específica ou ''
    stockFilter: '', // 'inStock', 'outOfStock', ''
    soldFilter: '', // 'sold', 'notSold', ''
    costFilter: '', // 'withCost', 'withoutCost', ''
  })

  // Carregar dados do banco de dados
  useEffect(() => {
    const loadData = async () => {
      try {
        const [transactionsData, productsData] = await Promise.all([
          fetchTransactions(),
          fetchProducts()
        ])
        setTransactions(transactionsData)
        setProducts(productsData)
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      }
    }
    
    loadData()
  }, [])

  // Função para fechar modais com ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Fechar calendários dos filtros se estiverem abertos
        if (isFilterCalendarFromOpen) {
          setIsFilterCalendarFromOpen(false)
          return
        }
        
        if (isFilterCalendarToOpen) {
          setIsFilterCalendarToOpen(false)
          return
        }
        
        // Fechar calendário se estiver aberto
        if (isCalendarOpen) {
          setIsCalendarOpen(false)
          return
        }
        
        // Fechar modal de produto se estiver aberto
        if (isProductModalOpen) {
          setIsProductModalOpen(false)
          setEditingProduct(null)
          setProductForm({ name: '', category: '', price: '', cost: '', stock: '', sold: '' })
          setProductFormErrors({
            name: false,
            category: false,
            price: false,
            cost: false,
            stock: false,
            sold: false
          })
          return
        }
        
        // Fechar modal de transação se estiver aberto
        if (isTransactionModalOpen) {
          setIsTransactionModalOpen(false)
          setEditingTransaction(null)
          setTransactionForm({ 
            date: new Date().toISOString().split('T')[0], 
            description: '', 
            value: '', 
            type: 'Receita', 
            category: '' 
          })
          setTransactionFormErrors({
            date: false,
            description: false,
            value: false,
            type: false,
            category: false
          })
          setIsCalendarOpen(false)
          return
        }
        
        // Fechar modal de importar/exportar se estiver aberto
        if (isImportExportModalOpen) {
          setIsImportExportModalOpen(false)
          setSelectedFile(null)
          return
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFilterCalendarFromOpen, isFilterCalendarToOpen, isCalendarOpen, isProductModalOpen, isTransactionModalOpen, isImportExportModalOpen])

  // Funções para gerenciar o calendário personalizado
  const formatDateToInput = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const formatDateToDisplay = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR')
  }

  const handleDateSelect = (date: Date) => {
    setTransactionForm(prev => ({
      ...prev,
      date: formatDateToInput(date)
    }))
    setCalendarDate(date)
    setIsCalendarOpen(false)
    
    // Limpar erro do campo quando uma data for selecionada
    setTransactionFormErrors(prev => ({
      ...prev,
      date: false
    }))
  }

  const handleCalendarToggle = () => {
    setIsCalendarOpen(!isCalendarOpen)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCalendarDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    const today = new Date()
    setCalendarDate(today)
    handleDateSelect(today)
  }

  const clearDate = () => {
    setTransactionForm(prev => ({
      ...prev,
      date: ''
    }))
    setIsCalendarOpen(false)
  }

  // Funções para calendários dos filtros
  const handleFilterDateFromSelect = (date: Date) => {
    setTransactionFilters(prev => ({
      ...prev,
      dateFrom: formatDateToInput(date)
    }))
    setFilterCalendarFromDate(date)
    setIsFilterCalendarFromOpen(false)
  }

  const handleFilterDateToSelect = (date: Date) => {
    setTransactionFilters(prev => ({
      ...prev,
      dateTo: formatDateToInput(date)
    }))
    setFilterCalendarToDate(date)
    setIsFilterCalendarToOpen(false)
  }

  const handleFilterCalendarFromToggle = () => {
    setIsFilterCalendarFromOpen(!isFilterCalendarFromOpen)
    setIsFilterCalendarToOpen(false) // Fechar o outro calendário
  }

  const handleFilterCalendarToToggle = () => {
    setIsFilterCalendarToOpen(!isFilterCalendarToOpen)
    setIsFilterCalendarFromOpen(false) // Fechar o outro calendário
  }

  const navigateFilterMonthFrom = (direction: 'prev' | 'next') => {
    setFilterCalendarFromDate(prev => {
      const currentDate = prev || new Date()
      const newDate = new Date(currentDate)
      if (direction === 'prev') {
        newDate.setMonth(currentDate.getMonth() - 1)
      } else {
        newDate.setMonth(currentDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const navigateFilterMonthTo = (direction: 'prev' | 'next') => {
    setFilterCalendarToDate(prev => {
      const currentDate = prev || new Date()
      const newDate = new Date(currentDate)
      if (direction === 'prev') {
        newDate.setMonth(currentDate.getMonth() - 1)
      } else {
        newDate.setMonth(currentDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToTodayFilterFrom = () => {
    const today = new Date()
    setFilterCalendarFromDate(today)
    handleFilterDateFromSelect(today)
  }

  const goToTodayFilterTo = () => {
    const today = new Date()
    setFilterCalendarToDate(today)
    handleFilterDateToSelect(today)
  }

  const clearFilterDateFrom = () => {
    setTransactionFilters(prev => ({
      ...prev,
      dateFrom: ''
    }))
    setFilterCalendarFromDate(null)
    setIsFilterCalendarFromOpen(false)
  }

  const clearFilterDateTo = () => {
    setTransactionFilters(prev => ({
      ...prev,
      dateTo: ''
    }))
    setFilterCalendarToDate(null)
    setIsFilterCalendarToOpen(false)
  }

  // Função para gerenciar mudanças no formulário de transação
  const handleTransactionInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setTransactionForm(prev => ({
      ...prev,
      [name]: value,
      // Reset category when type changes
      ...(name === 'type' ? { category: '' } : {})
    }))
    
    // Limpar erro do campo quando o usuário digitar
    setTransactionFormErrors(prev => ({
      ...prev,
      [name]: false
    }))
  }

  // Funções para gerenciar seleção de produtos
  const handleSelectProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }

  const handleSelectAllProducts = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)))
    }
  }

  const handleDeleteSelectedProducts = async () => {
    if (selectedProducts.size === 0) return
    
    const confirmMessage = selectedProducts.size === 1 
      ? 'Tem certeza que deseja deletar este produto?' 
      : `Tem certeza que deseja deletar ${selectedProducts.size} produtos?`
    
    if (confirm(confirmMessage)) {
      try {
        const ids = Array.from(selectedProducts)
        const success = await deleteMultipleProducts(ids)
        if (success) {
          setProducts(prev => prev.filter(product => !selectedProducts.has(product.id)))
          setSelectedProducts(new Set())
        }
      } catch (error) {
        console.error('Erro ao deletar produtos:', error)
      }
    }
  }

  // Funções para gerenciar seleção de transações
  const handleSelectTransaction = (transactionId: string) => {
    setSelectedTransactions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId)
      } else {
        newSet.add(transactionId)
      }
      return newSet
    })
  }

  const handleSelectAllTransactions = () => {
    if (selectedTransactions.size === transactions.length) {
      setSelectedTransactions(new Set())
    } else {
      setSelectedTransactions(new Set(transactions.map(t => t.id)))
    }
  }

  const handleDeleteSelectedTransactions = async () => {
    if (selectedTransactions.size === 0) return
    
    const confirmMessage = selectedTransactions.size === 1 
      ? 'Tem certeza que deseja deletar esta transação?' 
      : `Tem certeza que deseja deletar ${selectedTransactions.size} transações?`
    
    if (confirm(confirmMessage)) {
      try {
        const ids = Array.from(selectedTransactions)
        const success = await deleteMultipleTransactions(ids)
        if (success) {
          setTransactions(prev => prev.filter(transaction => !selectedTransactions.has(transaction.id)))
          setSelectedTransactions(new Set())
        }
      } catch (error) {
        console.error('Erro ao deletar transações:', error)
      }
    }
  }

  // Funções de ordenação
  const handleSort = (field: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    
    if (sortConfig.field === field && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    
    setSortConfig({ field, direction })
  }

  const getSortIcon = (field: string) => {
    if (sortConfig.field !== field) {
      return <span className="text-gray-400">↕</span>
    }
    return sortConfig.direction === 'asc' ? 
      <span className="text-amber-600">↑</span> : 
      <span className="text-amber-600">↓</span>
  }

  const getSortedTransactions = () => {
    if (!sortConfig.field) return transactions

    return [...transactions].sort((a, b) => {
      let aValue: any = a[sortConfig.field as keyof NewTransaction]
      let bValue: any = b[sortConfig.field as keyof NewTransaction]

      // Tratamento especial para diferentes tipos de dados
      if (sortConfig.field === 'date') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      } else if (sortConfig.field === 'value') {
        aValue = Number(aValue)
        bValue = Number(bValue)
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }

  const getSortedProducts = () => {
    if (!sortConfig.field) return products

    return [...products].sort((a, b) => {
      let aValue: any = a[sortConfig.field as keyof Product]
      let bValue: any = b[sortConfig.field as keyof Product]

      // Tratamento especial para diferentes tipos de dados
      if (sortConfig.field === 'price' || sortConfig.field === 'cost' || sortConfig.field === 'stock' || sortConfig.field === 'sold') {
        aValue = Number(aValue)
        bValue = Number(bValue)
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }

  // Funções de filtro
  const getFilteredAndSortedTransactions = () => {
    let filtered = transactions

    // Filtro por tipo
    if (transactionFilters.type) {
      filtered = filtered.filter(t => t.type === transactionFilters.type)
    }

    // Filtro por categoria
    if (transactionFilters.category) {
      filtered = filtered.filter(t => t.category.toLowerCase().includes(transactionFilters.category.toLowerCase()))
    }

    // Filtro por data
    if (transactionFilters.dateFrom) {
      filtered = filtered.filter(t => new Date(t.date) >= new Date(transactionFilters.dateFrom))
    }
    if (transactionFilters.dateTo) {
      filtered = filtered.filter(t => new Date(t.date) <= new Date(transactionFilters.dateTo))
    }

    // Aplicar ordenação
    if (!sortConfig.field) return filtered

    return filtered.sort((a, b) => {
      let aValue: any = a[sortConfig.field as keyof NewTransaction]
      let bValue: any = b[sortConfig.field as keyof NewTransaction]

      if (sortConfig.field === 'date') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      } else if (sortConfig.field === 'value') {
        aValue = Number(aValue)
        bValue = Number(bValue)
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }

  const getFilteredAndSortedProducts = () => {
    let filtered = products

    // Filtro por categoria
    if (productFilters.category) {
      filtered = filtered.filter(p => p.category.toLowerCase().includes(productFilters.category.toLowerCase()))
    }

    // Filtro por estoque
    if (productFilters.stockFilter === 'inStock') {
      filtered = filtered.filter(p => p.stock > 0)
    } else if (productFilters.stockFilter === 'outOfStock') {
      filtered = filtered.filter(p => p.stock === 0)
    }

    // Filtro por vendidos
    if (productFilters.soldFilter === 'sold') {
      filtered = filtered.filter(p => p.sold > 0)
    } else if (productFilters.soldFilter === 'notSold') {
      filtered = filtered.filter(p => p.sold === 0)
    }

    // Filtro por custo
    if (productFilters.costFilter === 'withCost') {
      filtered = filtered.filter(p => p.cost > 0)
    } else if (productFilters.costFilter === 'withoutCost') {
      filtered = filtered.filter(p => p.cost === 0)
    }

    // Aplicar ordenação
    if (!sortConfig.field) return filtered

    return filtered.sort((a, b) => {
      let aValue: any = a[sortConfig.field as keyof Product]
      let bValue: any = b[sortConfig.field as keyof Product]

      if (sortConfig.field === 'price' || sortConfig.field === 'cost' || sortConfig.field === 'stock' || sortConfig.field === 'sold') {
        aValue = Number(aValue)
        bValue = Number(bValue)
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }

  // Funções para limpar filtros
  const clearTransactionFilters = () => {
    setTransactionFilters({
      type: '',
      category: '',
      dateFrom: '',
      dateTo: '',
      hasDateFilter: false
    })
  }

  const clearProductFilters = () => {
    setProductFilters({
      category: '',
      stockFilter: '',
      soldFilter: '',
      costFilter: ''
    })
  }

  // Função para validar formulário de transação
  const validateTransactionForm = () => {
    const errors = {
      date: !transactionForm.date || transactionForm.date.trim() === '',
      description: !transactionForm.description || transactionForm.description.trim() === '',
      value: !transactionForm.value || transactionForm.value.trim() === '' || parseFloat(transactionForm.value) <= 0,
      type: !transactionForm.type || transactionForm.type.trim() === '',
      category: !transactionForm.category || transactionForm.category.trim() === ''
    }
    
    setTransactionFormErrors(errors)
    
    // Verificar se há erros
    const hasErrors = Object.values(errors).some(error => error)
    
    if (hasErrors) {
      // Não mostrar notificação, apenas marcar os campos com erro visual
      return false
    }
    
    return true
  }

  // Função para renderizar o calendário personalizado
  const renderCustomCalendar = () => {
    const today = new Date()
    const currentMonth = calendarDate.getMonth()
    const currentYear = calendarDate.getFullYear()
    
    // Primeiro dia do mês
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
    
    // Gerar dias do calendário
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      days.push(date)
    }
    
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    
    return (
      <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50 min-w-[320px]">
        {/* Header do calendário */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-amber-600" />
          </button>
          
          <h3 className="text-lg font-semibold text-amber-800">
            {monthNames[currentMonth]} {currentYear}
          </h3>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-amber-600" />
          </button>
        </div>
        
        {/* Dias da semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, index) => (
            <div key={index} className="text-center text-sm font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Dias do calendário */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            const isCurrentMonth = date.getMonth() === currentMonth
            const isToday = date.toDateString() === today.toDateString()
            const isSelected = transactionForm.date === formatDateToInput(date)
            
            return (
              <button
                key={index}
                onClick={() => handleDateSelect(date)}
                className={`
                  w-10 h-10 text-sm rounded-lg transition-all duration-200
                  ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                  ${isToday ? 'bg-amber-100 text-amber-800 font-semibold' : ''}
                  ${isSelected ? 'bg-amber-500 text-white font-semibold' : ''}
                  ${!isSelected && !isToday ? 'hover:bg-amber-50' : ''}
                `}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
        
        {/* Botões de ação */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={clearDate}
            className="flex-1 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Limpar
          </button>
          <button
            onClick={goToToday}
            className="flex-1 px-3 py-2 text-sm text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
          >
            Hoje
          </button>
        </div>
      </div>
    )
  }

  // Funções para renderizar calendários dos filtros
  const renderFilterCalendarFrom = () => {
    const today = new Date()
    const currentDate = filterCalendarFromDate || new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      days.push(date)
    }
    
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    
    return (
      <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50 min-w-[320px]">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateFilterMonthFrom('prev')}
            className="p-2 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-amber-600" />
          </button>
          
          <h3 className="text-lg font-semibold text-amber-800">
            {monthNames[currentMonth]} {currentYear}
          </h3>
          
          <button
            onClick={() => navigateFilterMonthFrom('next')}
            className="p-2 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-amber-600" />
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, index) => (
            <div key={index} className="text-center text-sm font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            const isCurrentMonth = date.getMonth() === currentMonth
            const isToday = date.toDateString() === today.toDateString()
            const isSelected = transactionFilters.dateFrom === formatDateToInput(date)
            
            return (
              <button
                key={index}
                onClick={() => handleFilterDateFromSelect(date)}
                className={`
                  w-10 h-10 text-sm rounded-lg transition-all duration-200
                  ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                  ${isToday ? 'bg-amber-100 text-amber-800 font-semibold' : ''}
                  ${isSelected ? 'bg-amber-500 text-white font-semibold' : ''}
                  ${!isSelected && !isToday ? 'hover:bg-amber-50' : ''}
                `}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
        
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={clearFilterDateFrom}
            className="flex-1 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Limpar
          </button>
          <button
            onClick={goToTodayFilterFrom}
            className="flex-1 px-3 py-2 text-sm text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
          >
            Hoje
          </button>
        </div>
      </div>
    )
  }

  const renderFilterCalendarTo = () => {
    const today = new Date()
    const currentDate = filterCalendarToDate || new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      days.push(date)
    }
    
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    
    return (
      <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50 min-w-[320px]">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateFilterMonthTo('prev')}
            className="p-2 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-amber-600" />
          </button>
          
          <h3 className="text-lg font-semibold text-amber-800">
            {monthNames[currentMonth]} {currentYear}
          </h3>
          
          <button
            onClick={() => navigateFilterMonthTo('next')}
            className="p-2 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-amber-600" />
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, index) => (
            <div key={index} className="text-center text-sm font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            const isCurrentMonth = date.getMonth() === currentMonth
            const isToday = date.toDateString() === today.toDateString()
            const isSelected = transactionFilters.dateTo === formatDateToInput(date)
            
            return (
              <button
                key={index}
                onClick={() => handleFilterDateToSelect(date)}
                className={`
                  w-10 h-10 text-sm rounded-lg transition-all duration-200
                  ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                  ${isToday ? 'bg-amber-100 text-amber-800 font-semibold' : ''}
                  ${isSelected ? 'bg-amber-500 text-white font-semibold' : ''}
                  ${!isSelected && !isToday ? 'hover:bg-amber-50' : ''}
                `}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
        
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={clearFilterDateTo}
            className="flex-1 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Limpar
          </button>
          <button
            onClick={goToTodayFilterTo}
            className="flex-1 px-3 py-2 text-sm text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
          >
            Hoje
          </button>
        </div>
      </div>
    )
  }

  // Função para obter as categorias baseadas no tipo
  const getCategoriesByType = (type: string) => {
    if (type === 'Receita') {
      return ['Atacado', 'Varejo', 'Outros']
    } else if (type === 'Despesa') {
      return ['Fixo', 'Variável', 'Atacado', 'Varejo', 'Investimento', 'Mkt']
    }
    return []
  }

  // Função para abrir modal de edição
  const handleEditTransaction = (transaction: NewTransaction) => {
    setEditingTransaction(transaction)
    setTransactionForm({
      date: transaction.date,
      description: transaction.description,
      value: transaction.value.toString(),
      type: transaction.type,
      category: transaction.category
    })
    setIsTransactionModalOpen(true)
  }

  // Estados e funções para produtos
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Função para gerenciar mudanças no formulário de produto
  const handleProductInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setProductForm(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Limpar erro do campo quando o usuário digitar
    setProductFormErrors(prev => ({
      ...prev,
      [name]: false
    }))
  }

  // Função para validar formulário de produto
  const validateProductForm = () => {
    const errors = {
      name: !productForm.name || productForm.name.trim() === '',
      category: !productForm.category || productForm.category.trim() === '',
      price: !productForm.price || productForm.price.trim() === '' || parseFloat(productForm.price) <= 0,
      cost: false, // Não obrigatório
      stock: false, // Não obrigatório
      sold: false  // Não obrigatório
    }
    
    setProductFormErrors(errors)
    
    // Verificar se há erros apenas nos campos obrigatórios
    const hasErrors = errors.name || errors.category || errors.price
    
    if (hasErrors) {
      // Não mostrar notificação, apenas marcar os campos com erro visual
      return false
    }
    
    return true
  }

  // Função para abrir modal de edição de produto
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setProductForm({
      name: product.name,
      price: product.price.toString(),
      cost: product.cost.toString(),
      stock: product.stock.toString(),
      sold: product.sold.toString(),
      category: product.category
    })
    setIsProductModalOpen(true)
  }

  // Funções para calcular totais das transações
  const calculateTotals = () => {
    // Verificar se transactions existe e não está vazio
    if (!transactions || transactions.length === 0) {
      return { receitas: 0, despesas: 0, faturamento: 0, resultado: 0 }
    }

    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    
    try {
      // Filtrar transações do mês atual
      const currentMonthTransactions = transactions.filter(transaction => {
        if (!transaction.date) return false
        const transactionDate = new Date(transaction.date)
        return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear
      })
      
      const receitas = currentMonthTransactions
        .filter(t => t.type === 'Receita')
        .reduce((sum, t) => sum + (t.value || 0), 0)
      
      const despesas = currentMonthTransactions
        .filter(t => t.type === 'Despesa')
        .reduce((sum, t) => sum + (t.value || 0), 0)
      
      const faturamento = receitas
      const resultado = receitas - despesas
      
      return { receitas, despesas, faturamento, resultado }
    } catch (error) {
      console.error('Erro ao calcular totais:', error)
      return { receitas: 0, despesas: 0, faturamento: 0, resultado: 0 }
    }
  }
  
  // Estado para o mês selecionado (padrão é o mês atual)
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth())
  const [expandedCharts, setExpandedCharts] = useState<string[]>([])
  const [expandedReportCharts, setExpandedReportCharts] = useState<string[]>([])

  // Definição das metas mensais (centralizada)
  const mesesMetas = [
    { nome: 'JANEIRO', indice: 0, meta: 18500.00 },
    { nome: 'FEVEREIRO', indice: 1, meta: 19200.00 },
    { nome: 'MARÇO', indice: 2, meta: 20100.00 },
    { nome: 'ABRIL', indice: 3, meta: 19800.00 },
    { nome: 'MAIO', indice: 4, meta: 20500.00 },
    { nome: 'JUNHO', indice: 5, meta: 21000.00 },
    { nome: 'JULHO', indice: 6, meta: 21500.00 },
    { nome: 'AGOSTO', indice: 7, meta: 22000.00 },
    { nome: 'SETEMBRO', indice: 8, meta: 21889.17 },
    { nome: 'OUTUBRO', indice: 9, meta: 23000.00 },
    { nome: 'NOVEMBRO', indice: 10, meta: 25000.00 },
    { nome: 'DEZEMBRO', indice: 11, meta: 28000.00 }
  ]

  // Função para alternar gráficos
  const toggleChart = (chartId: string) => {
    setExpandedCharts(prev => 
      prev.includes(chartId) 
        ? prev.filter(id => id !== chartId)  // Remove se já existe
        : [...prev, chartId]                 // Adiciona se não existe
    )
  }

  // Função para alternar gráficos dos relatórios
  const toggleReportChart = (chartId: string) => {
    setExpandedReportCharts(prev => 
      prev.includes(chartId) 
        ? prev.filter(id => id !== chartId)
        : [...prev, chartId]
    )
  }

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

  // Calcular resumo financeiro (mantendo para compatibilidade)
  const totalReceitas = 0 // Agora usando calculateTotals()
  const totalDespesas = 0 // Agora usando calculateTotals()
  const lucroLiquido = totalReceitas - totalDespesas

  // Render Dashboard
  const renderDashboard = () => {
    // Calcular totais das transações reais (movido para dentro da função)
    const { receitas, despesas, faturamento, resultado } = calculateTotals()
    
    // Obter o mês selecionado nas metas
    const mesSelecionadoMetas = mesesMetas.find(mes => mes.indice === selectedMonth) || mesesMetas[new Date().getMonth()]
    
    // Filtrar transações do mês selecionado
    const transacoesMesSelecionado = transactions.filter(t => {
      const transactionMonth = new Date(t.date).getMonth()
      return transactionMonth === selectedMonth
    })
    
    // Usar dados reais das transações para o mês atual
    const totalReceitasMes = receitas
    const totalDespesasMes = despesas
    const lucroLiquidoMes = resultado
    
    // Função para determinar o trimestre de um mês (0-11)
    const getQuarter = (month: number) => Math.floor(month / 3)
    
    // Determinar trimestre atual baseado no mês selecionado
    const trimestreAtual = getQuarter(selectedMonth)
    const mesesDoTrimestre = [
      trimestreAtual * 3,     // Primeiro mês do trimestre
      trimestreAtual * 3 + 1, // Segundo mês do trimestre
      trimestreAtual * 3 + 2  // Terceiro mês do trimestre
    ]
    
    // Nomes dos trimestres
    const nomesTrimestres = [
      'Q1 (Jan-Mar)', 'Q2 (Abr-Jun)', 'Q3 (Jul-Set)', 'Q4 (Out-Dez)'
    ]
    
    // Filtrar transações do trimestre atual
    const transacoesTrimestre = transactions.filter(t => {
      const transactionMonth = new Date(t.date).getMonth()
      return mesesDoTrimestre.includes(transactionMonth)
    })
    
    // Dados trimestrais (usando dados atuais das transações)
    const totalReceitasTrimestre = 0 // Simplificado por enquanto
    const totalDespesasTrimestre = 0 // Simplificado por enquanto  
    const lucroLiquidoTrimestre = totalReceitasTrimestre - totalDespesasTrimestre
    
    // Meta do trimestre (soma das metas dos 3 meses)
    const metaTrimestre = mesesDoTrimestre.reduce((total, mesIndex) => 
      total + (mesesMetas[mesIndex]?.meta || 0), 0
    )
    
    // Dados anuais (usando dados atuais das transações)
    const totalReceitasAno = 0 // Simplificado por enquanto
    const totalDespesasAno = 0 // Simplificado por enquanto
    const lucroLiquidoAno = totalReceitasAno - totalDespesasAno

    // Transações recentes (últimas 5)
    const transacoesRecentes = transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)

    // Dados para gráficos mensais (baseados no mês selecionado nas metas)
    const pieChartData = [
      { name: 'Receitas', value: totalReceitasMes, color: '#22c55e' },
      { name: 'Despesas', value: totalDespesasMes, color: '#ef4444' }
    ]

    // Dados para gráficos trimestrais
    const pieChartDataTrimestre = [
      { name: 'Receitas', value: totalReceitasTrimestre, color: '#06b6d4' },
      { name: 'Despesas', value: totalDespesasTrimestre, color: '#f97316' }
    ]

    const pieChartDataAnual = [
      { name: 'Receitas Anuais', value: totalReceitasAno, color: '#16a34a' },
      { name: 'Despesas Anuais', value: totalDespesasAno, color: '#dc2626' }
    ]

    // Dados para comparação com metas (mês selecionado vs meta)
    const barChartData = [
      { name: 'Meta', value: mesSelecionadoMetas.meta, color: '#f59e0b' },
      { name: 'Real', value: lucroLiquidoMes, color: lucroLiquidoMes >= mesSelecionadoMetas.meta ? '#22c55e' : '#ef4444' }
    ]

    // Dados para comparação trimestral
    const barChartDataTrimestre = [
      { name: 'Meta', value: metaTrimestre, color: '#f59e0b' },
      { name: 'Real', value: lucroLiquidoTrimestre, color: lucroLiquidoTrimestre >= metaTrimestre ? '#22c55e' : '#ef4444' }
    ]

    // Meta anual (soma de todas as metas mensais)
    const metaAnual = mesesMetas.reduce((total, mes) => total + mes.meta, 0)
    const barChartDataAnual = [
      { name: 'Meta Anual', value: metaAnual, color: '#f59e0b' },
      { name: 'Real Anual', value: lucroLiquidoAno, color: lucroLiquidoAno >= metaAnual ? '#22c55e' : '#ef4444' }
    ]

    // Componente de gráfico de rosca (donut chart)
    const renderPieChart = (data: any[], title: string) => {
      // Se não houver dados ou todos os valores forem 0, exibir rosca cinza
      const hasData = data.length > 0 && data.some(item => item.value > 0);
      const displayData = hasData ? data : [{ name: 'Sem dados', value: 100, color: '#e5e7eb' }];
      
      return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mt-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
          <ResponsiveContainer width="100%" height={350}>
            <RechartsPieChart>
              <Pie
                data={displayData} 
                cx="50%" 
                cy="50%" 
                innerRadius={80} 
                outerRadius={140} 
                paddingAngle={hasData ? 8 : 0} 
                dataKey="value"
                cornerRadius={hasData ? 10 : 0}
                stroke="none"
              >
                {displayData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              {hasData && (
                <Tooltip 
                  formatter={(value: number) => [
                    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                    ''
                  ]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                />
              )}
              {hasData && (
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="circle"
                  wrapperStyle={{
                    paddingTop: '20px',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                />
              )}
              {!hasData && (
                <text 
                  x="50%" 
                  y="50%" 
                  textAnchor="middle" 
                  dominantBaseline="middle" 
                  className="fill-gray-400 text-sm font-medium"
                >
                  Sem dados disponíveis
                </text>
              )}
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // Componente de gráfico de barras para comparação com metas
    const renderBarChart = (data: any[], title: string) => (
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mt-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart 
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#f0f0f0"
              vertical={false}
            />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
            />
            <YAxis 
              tickFormatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
            />
            <Tooltip 
              formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
              }}
            />
            <Bar 
              dataKey="value" 
              fill="#8884d8"
              radius={[8, 8, 0, 0]}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )

    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Dashboard Financeiro
          </h1>
          <button
            onClick={() => setIsTransactionModalOpen(true)}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <Plus className="h-5 w-5" />
            Nova Transação
          </button>
        </div>

        {/* Seção Mês Atual */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <PieChart className="w-6 h-6 text-gray-600" />
            Mês Atual
            <span className="text-lg font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
              {mesSelecionadoMetas.nome}
            </span>
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card Receitas */}
              <div className="space-y-4">
                <div 
                  className="bg-green-500 p-6 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
                  onClick={() => toggleChart('receitas-mensal')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white text-opacity-80 uppercase tracking-wide">Receitas</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        R$ {totalReceitasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
                {expandedCharts.includes('receitas-mensal') && renderPieChart(pieChartData, 'Distribuição Mensal: Receitas vs Despesas')}
              </div>

              {/* Card Despesas */}
              <div className="space-y-4">
                <div 
                  className="bg-red-500 p-6 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
                  onClick={() => toggleChart('despesas-mensal')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <TrendingDown className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white text-opacity-80 uppercase tracking-wide">Despesas</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        R$ {totalDespesasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
                {expandedCharts.includes('despesas-mensal') && renderPieChart(pieChartData, 'Distribuição Mensal: Receitas vs Despesas')}
              </div>

              {/* Card Saldo */}
              <div className="space-y-4">
                <div 
                  className={`p-6 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:-translate-y-1 ${
                    lucroLiquidoMes >= 0 ? 'bg-yellow-500' : 'bg-yellow-500'
                  }`}
                  onClick={() => toggleChart('saldo-mensal')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white text-opacity-80 uppercase tracking-wide">Saldo</p>
                      <p className={`text-2xl font-bold mt-1 ${
                        lucroLiquidoMes >= 0 ? 'text-green-900' : 'text-red-900'
                      }`}>
                        R$ {lucroLiquidoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
                {expandedCharts.includes('saldo-mensal') && renderBarChart(barChartData, `Comparação: Meta vs Real (${mesSelecionadoMetas.nome})`)}
              </div>
            </div>
          </div>
        </div>

        {/* Seção Trimestre */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-cyan-800 flex items-center gap-3">
            <PieChart className="w-6 h-6 text-cyan-600" />
            Trimestre Atual
            <span className="text-lg font-medium text-cyan-600 bg-cyan-50 px-3 py-1 rounded-lg border border-cyan-200">
              {nomesTrimestres[trimestreAtual]}
            </span>
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card Receitas Trimestrais */}
              <div className="space-y-4">
                <div 
                  className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
                  onClick={() => toggleChart('receitas-trimestre')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white text-opacity-80 uppercase tracking-wide">Receitas</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        R$ {totalReceitasTrimestre.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
                {expandedCharts.includes('receitas-trimestre') && renderPieChart(pieChartDataTrimestre, 'Distribuição Trimestral: Receitas vs Despesas')}
              </div>

              {/* Card Despesas Trimestrais */}
              <div className="space-y-4">
                <div 
                  className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
                  onClick={() => toggleChart('despesas-trimestre')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <TrendingDown className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white text-opacity-80 uppercase tracking-wide">Despesas</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        R$ {totalDespesasTrimestre.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
                {expandedCharts.includes('despesas-trimestre') && renderPieChart(pieChartDataTrimestre, 'Distribuição Trimestral: Receitas vs Despesas')}
              </div>

              {/* Card Saldo Trimestral */}
              <div className="space-y-4">
                <div 
                  className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
                  onClick={() => toggleChart('saldo-trimestre')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white text-opacity-80 uppercase tracking-wide">Saldo</p>
                      <p className={`text-2xl font-bold mt-1 ${
                        lucroLiquidoTrimestre >= 0 ? 'text-green-900' : 'text-red-900'
                      }`}>
                        R$ {lucroLiquidoTrimestre.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
                {expandedCharts.includes('saldo-trimestre') && renderBarChart(barChartDataTrimestre, `Comparação Trimestral: Meta vs Real (${nomesTrimestres[trimestreAtual]})`)}
              </div>
            </div>
          </div>
        </div>

        {/* Seção Ano */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-purple-800 flex items-center gap-3">
            <PieChart className="w-6 h-6 text-purple-600" />
            Ano
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card Receitas Anuais */}
              <div className="space-y-4">
                <div 
                  className="bg-green-600 p-6 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
                  onClick={() => toggleChart('receitas-anual')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white text-opacity-80 uppercase tracking-wide">Receitas Anuais</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        R$ {totalReceitasAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
                {expandedCharts.includes('receitas-anual') && renderPieChart(pieChartDataAnual, 'Distribuição Anual: Receitas vs Despesas')}
              </div>

              {/* Card Despesas Anuais */}
              <div className="space-y-4">
                <div 
                  className="bg-red-600 p-6 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
                  onClick={() => toggleChart('despesas-anual')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <TrendingDown className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white text-opacity-80 uppercase tracking-wide">Despesas Anuais</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        R$ {totalDespesasAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
                {expandedCharts.includes('despesas-anual') && renderPieChart(pieChartDataAnual, 'Distribuição Anual: Receitas vs Despesas')}
              </div>

              {/* Card Saldo Anual */}
              <div className="space-y-4">
                <div 
                  className={`p-6 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:-translate-y-1 ${
                    lucroLiquidoAno >= 0 ? 'bg-yellow-600' : 'bg-yellow-600'
                  }`}
                  onClick={() => toggleChart('saldo-anual')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white text-opacity-80 uppercase tracking-wide">Saldo Anual</p>
                      <p className={`text-2xl font-bold mt-1 ${
                        lucroLiquidoAno >= 0 ? 'text-green-900' : 'text-red-900'
                      }`}>
                        R$ {lucroLiquidoAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
                {expandedCharts.includes('saldo-anual') && renderBarChart(barChartDataAnual, 'Comparação Anual: Meta vs Real')}
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Transações Recentes */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-gray-600" />
            Transações Recentes
          </h2>
          
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {transacoesRecentes.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">Nenhuma transação encontrada.</p>
                <p className="text-sm text-gray-400 mt-1">Adicione suas primeiras transações para vê-las aqui.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {transacoesRecentes.map((transacao, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50 transition-colors duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          transacao.type === 'Receita' ? 'bg-emerald-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <p className="font-medium text-gray-900">{transacao.description}</p>
                          <p className="text-sm text-gray-500">{transacao.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          transacao.type === 'Receita' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {transacao.type === 'Receita' ? '+' : '-'}R$ {transacao.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(transacao.date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 border-t border-gray-100">
              <button 
                onClick={() => setActiveTab('transactions')}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 group"
              >
                <DollarSign className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                Ver todas as transações
                <ArrowUpCircle className="h-5 w-5 rotate-90 group-hover:translate-x-1 transition-all duration-300" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Função para renderizar apenas o conteúdo do mês (sem título)
  const renderMonthContent = (monthName: string, monthIndex: number, metaValue: number, saldoInicial: number = 31970.50) => {
    // Cálculos para o mês específico
    const currentYear = 2025
    const transacoesDoMes = transactions.filter(t => {
      const transactionDate = new Date(t.date)
      return transactionDate.getMonth() === monthIndex && transactionDate.getFullYear() === currentYear
    })

    const totalReceitas = transacoesDoMes.filter(t => t.type === 'Receita').reduce((sum, t) => sum + t.value, 0)
    const totalDespesas = transacoesDoMes.filter(t => t.type === 'Despesa').reduce((sum, t) => sum + t.value, 0)

    return (
      <div className="space-y-6">
        {/* 1. RESULTADO */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <PieChart className="w-6 h-6 text-gray-600" />
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
                  <span className="font-bold text-blue-800">R$ {saldoInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                
                {/* TOTAL GERAL */}
                <div className="flex justify-between items-center py-4 bg-gray-50 px-4 rounded-lg border-2 border-gray-300 mt-4">
                  <span className="font-bold text-gray-900 text-lg">Total geral</span>
                  <span className={`font-bold text-xl ${
                    (saldoInicial + totalReceitas - totalDespesas) >= 0 ? 'text-emerald-800' : 'text-red-800'
                  }`}>
                    R$ {(saldoInicial + totalReceitas - totalDespesas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                  <div className="text-center font-bold text-gray-800">R$ {metaValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  <div className="text-center font-bold text-gray-800">100%</div>
                </div>
                
                {/* ALCANÇADO */}
                <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200">
                  <div className="font-bold text-emerald-700 italic">ALCANÇADO</div>
                  <div className="text-center font-bold text-emerald-800">
                    R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-center font-bold text-emerald-800">
                    {metaValue > 0 ? ((totalReceitas / metaValue) * 100).toFixed(0) : 0}%
                  </div>
                </div>
                
                {/* RESTANTE */}
                <div className="grid grid-cols-3 gap-4 py-3">
                  <div className="font-bold text-red-700 italic">RESTANTE</div>
                  <div className="text-center font-bold text-red-800">
                    -R$ {Math.max(0, metaValue - totalReceitas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-center font-bold text-red-800">
                    {metaValue > 0 ? Math.max(0, 100 - ((totalReceitas / metaValue) * 100)).toFixed(0) : 100}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. FATURAMENTO */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-emerald-800 flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            Faturamento
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-2xl border border-emerald-200 shadow-lg">
              <h3 className="text-lg font-bold text-emerald-800 mb-4">Faturamento TOTAL</h3>
              <div className="text-2xl font-bold text-emerald-900 mb-4">
                R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              
              {/* Barra de Progresso */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-emerald-700 mb-1">
                  <span>Progresso</span>
                  <span>{((totalReceitas / 30000) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-emerald-200 rounded-full h-2 relative">
                  {/* Barra base (0-100%) */}
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, ((totalReceitas / 30000) * 100))}%` }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {((totalReceitas / 30000) * 100) > 100 && (
                    <div 
                      className="absolute top-0 left-0 bg-gradient-to-r from-emerald-700 to-emerald-800 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (((totalReceitas / 30000) * 100) - 100))}%` }}
                    ></div>
                  )}
                </div>
              </div>
              
              {/* Valores Alcançado/Restante */}
              <div className="text-sm text-emerald-700 font-medium">
                R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {Math.max(0, 30000 - totalReceitas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border border-green-200 shadow-lg">
              <h3 className="text-lg font-bold text-green-800 mb-4">Faturamento Varejo</h3>
              <div className="text-2xl font-bold text-green-900 mb-4">
                R$ {(totalReceitas * 0.6).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              
              {/* Barra de Progresso */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-green-700 mb-1">
                  <span>Progresso</span>
                  <span>{(((totalReceitas * 0.6) / 18000) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-green-200 rounded-full h-2 relative">
                  {/* Barra base (0-100%) */}
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (((totalReceitas * 0.6) / 18000) * 100))}%` }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {(((totalReceitas * 0.6) / 18000) * 100) > 100 && (
                    <div 
                      className="absolute top-0 left-0 bg-gradient-to-r from-green-700 to-green-800 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, ((((totalReceitas * 0.6) / 18000) * 100) - 100))}%` }}
                    ></div>
                  )}
                </div>
              </div>
              
              {/* Valores Alcançado/Restante */}
              <div className="text-sm text-green-700 font-medium">
                R$ {(totalReceitas * 0.6).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {Math.max(0, 18000 - (totalReceitas * 0.6)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-6 rounded-2xl border border-teal-200 shadow-lg">
              <h3 className="text-lg font-bold text-teal-800 mb-4">Faturamento Atacado</h3>
              <div className="text-2xl font-bold text-teal-900 mb-4">
                R$ {(totalReceitas * 0.3).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              
              {/* Barra de Progresso */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-teal-700 mb-1">
                  <span>Progresso</span>
                  <span>{(((totalReceitas * 0.3) / 12000) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-teal-200 rounded-full h-2 relative">
                  {/* Barra base (0-100%) */}
                  <div 
                    className="bg-gradient-to-r from-teal-500 to-teal-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (((totalReceitas * 0.3) / 12000) * 100))}%` }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {(((totalReceitas * 0.3) / 12000) * 100) > 100 && (
                    <div 
                      className="absolute top-0 left-0 bg-gradient-to-r from-teal-700 to-teal-800 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, ((((totalReceitas * 0.3) / 12000) * 100) - 100))}%` }}
                    ></div>
                  )}
                </div>
              </div>
              
              {/* Valores Alcançado/Restante */}
              <div className="text-sm text-teal-700 font-medium">
                R$ {(totalReceitas * 0.3).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {Math.max(0, 12000 - (totalReceitas * 0.3)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* 3. DESPESAS */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-red-800 flex items-center gap-3">
            <TrendingDown className="w-6 h-6 text-red-600" />
            Despesas
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-2xl border border-red-200 shadow-lg">
              <h3 className="text-lg font-bold text-red-800 mb-4">Despesas TOTAL</h3>
              <div className="text-2xl font-bold text-red-900 mb-4">
                R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              
              {/* Barra de Progresso (Para despesas, menos é melhor) */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-red-700 mb-1">
                  <span>Limite</span>
                  <span>{((totalDespesas / 15000) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-red-200 rounded-full h-2 relative">
                  {/* Barra base (0-100%) */}
                  <div 
                    className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, ((totalDespesas / 15000) * 100))}%` }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {((totalDespesas / 15000) * 100) > 100 && (
                    <div 
                      className="absolute top-0 left-0 bg-gradient-to-r from-red-700 to-red-900 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (((totalDespesas / 15000) * 100) - 100))}%` }}
                    ></div>
                  )}
                </div>
              </div>
              
              {/* Valores Usado/Restante */}
              <div className="text-sm text-red-700 font-medium">
                R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {Math.max(0, 15000 - totalDespesas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl border border-orange-200 shadow-lg">
              <h3 className="text-lg font-bold text-orange-800 mb-4">Despesas Variáveis</h3>
              <div className="text-2xl font-bold text-orange-900 mb-4">
                R$ {(totalDespesas * 0.7).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              
              {/* Barra de Progresso */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-orange-700 mb-1">
                  <span>Limite</span>
                  <span>{(((totalDespesas * 0.7) / 10500) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-orange-200 rounded-full h-2 relative">
                  {/* Barra base (0-100%) */}
                  <div 
                    className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (((totalDespesas * 0.7) / 10500) * 100))}%` }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {(((totalDespesas * 0.7) / 10500) * 100) > 100 && (
                    <div 
                      className="absolute top-0 left-0 bg-gradient-to-r from-orange-700 to-orange-900 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, ((((totalDespesas * 0.7) / 10500) * 100) - 100))}%` }}
                    ></div>
                  )}
                </div>
              </div>
              
              {/* Valores Usado/Restante */}
              <div className="text-sm text-orange-700 font-medium">
                R$ {(totalDespesas * 0.7).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {Math.max(0, 10500 - (totalDespesas * 0.7)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-2xl border border-amber-200 shadow-lg">
              <h3 className="text-lg font-bold text-amber-800 mb-4">Despesas Fixas</h3>
              <div className="text-2xl font-bold text-amber-900 mb-4">
                R$ {(totalDespesas * 0.25).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              
              {/* Barra de Progresso */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-amber-700 mb-1">
                  <span>Limite</span>
                  <span>{(((totalDespesas * 0.25) / 4500) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-amber-200 rounded-full h-2 relative">
                  {/* Barra base (0-100%) */}
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-amber-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (((totalDespesas * 0.25) / 4500) * 100))}%` }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {(((totalDespesas * 0.25) / 4500) * 100) > 100 && (
                    <div 
                      className="absolute top-0 left-0 bg-gradient-to-r from-amber-700 to-amber-900 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, ((((totalDespesas * 0.25) / 4500) * 100) - 100))}%` }}
                    ></div>
                  )}
                </div>
              </div>
              
              {/* Valores Usado/Restante */}
              <div className="text-sm text-amber-700 font-medium">
                R$ {(totalDespesas * 0.25).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {Math.max(0, 4500 - (totalDespesas * 0.25)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* 4. INVESTIMENTOS */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-indigo-800 flex items-center gap-3">
            <ArrowUpCircle className="w-6 h-6 text-indigo-600" />
            Investimentos
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200 shadow-lg">
              <h3 className="text-lg font-bold text-blue-800 mb-4">Investimentos Gerais</h3>
              <div className="text-2xl font-bold text-blue-900 mb-4">
                R$ {(totalDespesas * 0.05).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              
              {/* Barra de Progresso */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-blue-700 mb-1">
                  <span>Meta</span>
                  <span>{(((totalDespesas * 0.05) / 2000) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 relative">
                  {/* Barra base (0-100%) */}
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (((totalDespesas * 0.05) / 2000) * 100))}%` }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {(((totalDespesas * 0.05) / 2000) * 100) > 100 && (
                    <div 
                      className="absolute top-0 left-0 bg-gradient-to-r from-blue-700 to-blue-900 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, ((((totalDespesas * 0.05) / 2000) * 100) - 100))}%` }}
                    ></div>
                  )}
                </div>
              </div>
              
              {/* Valores Alcançado/Restante */}
              <div className="text-sm text-blue-700 font-medium">
                R$ {(totalDespesas * 0.05).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {Math.max(0, 2000 - (totalDespesas * 0.05)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200 shadow-lg">
              <h3 className="text-lg font-bold text-purple-800 mb-4">Investimentos em MKT</h3>
              <div className="text-2xl font-bold text-purple-900 mb-4">
                R$ {(totalReceitas * 0.1).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              
              {/* Barra de Progresso */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-purple-700 mb-1">
                  <span>Meta</span>
                  <span>{(((totalReceitas * 0.1) / 3000) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-2 relative">
                  {/* Barra base (0-100%) */}
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (((totalReceitas * 0.1) / 3000) * 100))}%` }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {(((totalReceitas * 0.1) / 3000) * 100) > 100 && (
                    <div 
                      className="absolute top-0 left-0 bg-gradient-to-r from-purple-700 to-purple-900 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, ((((totalReceitas * 0.1) / 3000) * 100) - 100))}%` }}
                    ></div>
                  )}
                </div>
              </div>
              
              {/* Valores Alcançado/Restante */}
              <div className="text-sm text-purple-700 font-medium">
                R$ {(totalReceitas * 0.1).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {Math.max(0, 3000 - (totalReceitas * 0.1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Função para renderizar um mês específico com título
  const renderMonth = (monthName: string, monthIndex: number, metaValue: number, saldoInicial: number = 31970.50) => {
    return (
      <div key={monthName} className="space-y-6 mb-12">
        {/* Título Principal do Mês */}
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-6 rounded-2xl shadow-lg">
          <h2 className="text-3xl font-bold text-white text-center uppercase tracking-wider">
            {monthName} - 2025
          </h2>
        </div>
        
        {/* Conteúdo do Mês */}
        {renderMonthContent(monthName, monthIndex, metaValue, saldoInicial)}
      </div>
    )
  }

  // Função para renderizar o total do ano
  const renderTotalAno = () => {
    const currentYear = 2025
    
    // Cálculos totais do ano
    const transacoesDoAno = transactions.filter(t => {
      const transactionDate = new Date(t.date)
      return transactionDate.getFullYear() === currentYear
    })

    const totalReceitasAno = transacoesDoAno.filter(t => t.type === 'Receita').reduce((sum, t) => sum + t.value, 0)
    const totalDespesasAno = transacoesDoAno.filter(t => t.type === 'Despesa').reduce((sum, t) => sum + t.value, 0)

    // Metas totais do ano
    const metasDoAno = [18500, 19200, 20100, 19800, 20500, 21000, 21500, 22000, 21889.17, 23000, 25000, 28000]
    const metaTotalAno = metasDoAno.reduce((sum, meta) => sum + meta, 0)
    const saldoInicialAno = 31970.50

    return (
      <div className="space-y-6 mb-12">
        {/* Título Principal do Ano */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-8 rounded-2xl shadow-xl">
          <h2 className="text-4xl font-bold text-white text-center uppercase tracking-wider">
            TOTAL DO ANO - 2025
          </h2>
        </div>

        {/* 1. RESULTADO ANUAL */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-purple-800 flex items-center gap-3">
            <PieChart className="w-8 h-8 text-purple-600" />
            Resultado Anual
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quadrante Financeiro Anual */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-8 rounded-2xl shadow-lg border-2 border-purple-200">
              <div className="space-y-4">
                {/* REFORÇO DE CAIXA */}
                <div className="flex justify-between items-center py-3 border-b-2 border-purple-200">
                  <span className="font-bold text-purple-800 text-lg">REFORÇO DE CAIXA</span>
                  <span className="font-bold text-purple-900 text-lg">R$ 0,00</span>
                </div>
                
                {/* SAÍDA DE CAIXA */}
                <div className="flex justify-between items-center py-3 border-b-2 border-purple-200">
                  <span className="font-bold text-purple-800 text-lg">SAÍDA DE CAIXA</span>
                  <span className="font-bold text-purple-900 text-lg">R$ 0,00</span>
                </div>
                
                {/* RECEITA ANUAL */}
                <div className="flex justify-between items-center py-3 border-b-2 border-purple-200">
                  <span className="font-bold text-emerald-700 text-lg">RECEITA ANUAL</span>
                  <span className="font-bold text-emerald-800 text-lg">
                    R$ {totalReceitasAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                {/* DESPESA ANUAL */}
                <div className="flex justify-between items-center py-3 border-b-2 border-purple-200">
                  <span className="font-bold text-red-700 text-lg">DESPESA ANUAL</span>
                  <span className="font-bold text-red-800 text-lg">
                    -R$ {totalDespesasAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                {/* SALDO INICIAL */}
                <div className="flex justify-between items-center py-3 border-b-2 border-purple-200">
                  <span className="font-bold text-blue-700 text-lg">SALDO INICIAL</span>
                  <span className="font-bold text-blue-800 text-lg">R$ {saldoInicialAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                
                {/* TOTAL GERAL ANUAL */}
                <div className="flex justify-between items-center py-6 bg-gradient-to-r from-purple-100 to-indigo-100 px-6 rounded-xl border-3 border-purple-400 mt-6">
                  <span className="font-bold text-purple-900 text-2xl">Total Geral Anual</span>
                  <span className={`font-bold text-2xl ${
                    (saldoInicialAno + totalReceitasAno - totalDespesasAno) >= 0 ? 'text-emerald-800' : 'text-red-800'
                  }`}>
                    R$ {(saldoInicialAno + totalReceitasAno - totalDespesasAno).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Quadrante META ANUAL */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-8 rounded-2xl shadow-lg border-2 border-purple-200">
              <div className="space-y-6">
                {/* Cabeçalho com colunas R$ e % */}
                <div className="grid grid-cols-3 gap-4 pb-3 border-b-3 border-purple-400">
                  <div className="text-center">
                    <span className="font-bold text-purple-700 text-xl"></span>
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-purple-900 text-2xl">R$</span>
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-purple-900 text-2xl">%</span>
                  </div>
                </div>
                
                {/* META ANUAL */}
                <div className="grid grid-cols-3 gap-4 py-4 border-b-2 border-purple-200">
                  <div className="font-bold text-purple-800 italic text-lg">META ANUAL</div>
                  <div className="text-center font-bold text-purple-900 text-lg">R$ {metaTotalAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  <div className="text-center font-bold text-purple-900 text-lg">100%</div>
                </div>
                
                {/* ALCANÇADO ANUAL */}
                <div className="grid grid-cols-3 gap-4 py-4 border-b-2 border-purple-200">
                  <div className="font-bold text-emerald-700 italic text-lg">ALCANÇADO</div>
                  <div className="text-center font-bold text-emerald-800 text-lg">
                    R$ {totalReceitasAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-center font-bold text-emerald-800 text-lg">
                    {metaTotalAno > 0 ? ((totalReceitasAno / metaTotalAno) * 100).toFixed(0) : 0}%
                  </div>
                </div>
                
                {/* RESTANTE ANUAL */}
                <div className="grid grid-cols-3 gap-4 py-4">
                  <div className="font-bold text-red-700 italic text-lg">RESTANTE</div>
                  <div className="text-center font-bold text-red-800 text-lg">
                    -R$ {Math.max(0, metaTotalAno - totalReceitasAno).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-center font-bold text-red-800 text-lg">
                    {metaTotalAno > 0 ? Math.max(0, 100 - ((totalReceitasAno / metaTotalAno) * 100)).toFixed(0) : 100}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. FATURAMENTO ANUAL */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-emerald-800 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-emerald-600" />
            Faturamento Anual
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-emerald-100 to-emerald-200 p-8 rounded-2xl border-2 border-emerald-300 shadow-xl">
              <h3 className="text-xl font-bold text-emerald-900 mb-6">Faturamento TOTAL ANUAL</h3>
              <div className="text-3xl font-bold text-emerald-900 mb-4">
                R$ {totalReceitasAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              
              {/* Barra de Progresso Anual */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-emerald-800 mb-1">
                  <span>Progresso Anual</span>
                  <span>{((totalReceitasAno / 360000) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-emerald-300 rounded-full h-3 relative">
                  {/* Barra base (0-100%) */}
                  <div 
                    className="bg-gradient-to-r from-emerald-600 to-emerald-700 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, ((totalReceitasAno / 360000) * 100))}%` }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {((totalReceitasAno / 360000) * 100) > 100 && (
                    <div 
                      className="absolute top-0 left-0 bg-gradient-to-r from-emerald-800 to-emerald-900 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (((totalReceitasAno / 360000) * 100) - 100))}%` }}
                    ></div>
                  )}
                </div>
              </div>
              
              {/* Valores Alcançado/Restante */}
              <div className="text-sm text-emerald-800 font-medium">
                R$ {totalReceitasAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {Math.max(0, 360000 - totalReceitasAno).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-100 to-green-200 p-8 rounded-2xl border-2 border-green-300 shadow-xl">
              <h3 className="text-xl font-bold text-green-900 mb-6">Faturamento Varejo Anual</h3>
              <div className="text-3xl font-bold text-green-900 mb-4">
                R$ {(totalReceitasAno * 0.6).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              
              {/* Barra de Progresso Anual */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-green-800 mb-1">
                  <span>Progresso Anual</span>
                  <span>{(((totalReceitasAno * 0.6) / 216000) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-green-300 rounded-full h-3 relative">
                  {/* Barra base (0-100%) */}
                  <div 
                    className="bg-gradient-to-r from-green-600 to-green-700 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (((totalReceitasAno * 0.6) / 216000) * 100))}%` }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {(((totalReceitasAno * 0.6) / 216000) * 100) > 100 && (
                    <div 
                      className="absolute top-0 left-0 bg-gradient-to-r from-green-800 to-green-900 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, ((((totalReceitasAno * 0.6) / 216000) * 100) - 100))}%` }}
                    ></div>
                  )}
                </div>
              </div>
              
              {/* Valores Alcançado/Restante */}
              <div className="text-sm text-green-800 font-medium">
                R$ {(totalReceitasAno * 0.6).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {Math.max(0, 216000 - (totalReceitasAno * 0.6)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-100 to-teal-200 p-8 rounded-2xl border-2 border-teal-300 shadow-xl">
              <h3 className="text-xl font-bold text-teal-900 mb-6">Faturamento Atacado Anual</h3>
              <div className="text-3xl font-bold text-teal-900 mb-4">
                R$ {(totalReceitasAno * 0.3).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              
              {/* Barra de Progresso Anual */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-teal-800 mb-1">
                  <span>Progresso Anual</span>
                  <span>{(((totalReceitasAno * 0.3) / 144000) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-teal-300 rounded-full h-3 relative">
                  {/* Barra base (0-100%) */}
                  <div 
                    className="bg-gradient-to-r from-teal-600 to-teal-700 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (((totalReceitasAno * 0.3) / 144000) * 100))}%` }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {(((totalReceitasAno * 0.3) / 144000) * 100) > 100 && (
                    <div 
                      className="absolute top-0 left-0 bg-gradient-to-r from-teal-800 to-teal-900 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, ((((totalReceitasAno * 0.3) / 144000) * 100) - 100))}%` }}
                    ></div>
                  )}
                </div>
              </div>
              
              {/* Valores Alcançado/Restante */}
              <div className="text-sm text-teal-800 font-medium">
                R$ {(totalReceitasAno * 0.3).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {Math.max(0, 144000 - (totalReceitasAno * 0.3)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* 3. DESPESAS ANUAIS */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-red-800 flex items-center gap-3">
            <TrendingDown className="w-8 h-8 text-red-600" />
            Despesas Anuais
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-red-100 to-red-200 p-8 rounded-2xl border-2 border-red-300 shadow-xl">
              <h3 className="text-xl font-bold text-red-900 mb-6">Despesas TOTAL Anuais</h3>
              <div className="text-3xl font-bold text-red-900 mb-4">
                R$ {totalDespesasAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              
              {/* Barra de Progresso Anual */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-red-800 mb-1">
                  <span>Limite Anual</span>
                  <span>{((totalDespesasAno / 180000) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-red-300 rounded-full h-3 relative">
                  {/* Barra base (0-100%) */}
                  <div 
                    className="bg-gradient-to-r from-red-600 to-red-700 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, ((totalDespesasAno / 180000) * 100))}%` }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {((totalDespesasAno / 180000) * 100) > 100 && (
                    <div 
                      className="absolute top-0 left-0 bg-gradient-to-r from-red-800 to-red-900 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (((totalDespesasAno / 180000) * 100) - 100))}%` }}
                    ></div>
                  )}
                </div>
              </div>
              
              {/* Valores Usado/Restante */}
              <div className="text-sm text-red-800 font-medium">
                R$ {totalDespesasAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {Math.max(0, 180000 - totalDespesasAno).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-100 to-orange-200 p-8 rounded-2xl border-2 border-orange-300 shadow-xl">
              <h3 className="text-xl font-bold text-orange-900 mb-6">Despesas Variáveis Anuais</h3>
              <div className="text-3xl font-bold text-orange-900 mb-4">
                R$ {(totalDespesasAno * 0.7).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              
              {/* Barra de Progresso Anual */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-orange-800 mb-1">
                  <span>Limite Anual</span>
                  <span>{(((totalDespesasAno * 0.7) / 126000) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-orange-300 rounded-full h-3 relative">
                  {/* Barra base (0-100%) */}
                  <div 
                    className="bg-gradient-to-r from-orange-600 to-orange-700 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (((totalDespesasAno * 0.7) / 126000) * 100))}%` }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {(((totalDespesasAno * 0.7) / 126000) * 100) > 100 && (
                    <div 
                      className="absolute top-0 left-0 bg-gradient-to-r from-orange-800 to-orange-900 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, ((((totalDespesasAno * 0.7) / 126000) * 100) - 100))}%` }}
                    ></div>
                  )}
                </div>
              </div>
              
              {/* Valores Usado/Restante */}
              <div className="text-sm text-orange-800 font-medium">
                R$ {(totalDespesasAno * 0.7).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {Math.max(0, 126000 - (totalDespesasAno * 0.7)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-100 to-amber-200 p-8 rounded-2xl border-2 border-amber-300 shadow-xl">
              <h3 className="text-xl font-bold text-amber-900 mb-6">Despesas Fixas Anuais</h3>
              <div className="text-3xl font-bold text-amber-900 mb-4">
                R$ {(totalDespesasAno * 0.25).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              
              {/* Barra de Progresso Anual */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-amber-800 mb-1">
                  <span>Limite Anual</span>
                  <span>{(((totalDespesasAno * 0.25) / 54000) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-amber-300 rounded-full h-3 relative">
                  {/* Barra base (0-100%) */}
                  <div 
                    className="bg-gradient-to-r from-amber-600 to-amber-700 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (((totalDespesasAno * 0.25) / 54000) * 100))}%` }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {(((totalDespesasAno * 0.25) / 54000) * 100) > 100 && (
                    <div 
                      className="absolute top-0 left-0 bg-gradient-to-r from-amber-800 to-amber-900 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, ((((totalDespesasAno * 0.25) / 54000) * 100) - 100))}%` }}
                    ></div>
                  )}
                </div>
              </div>
              
              {/* Valores Usado/Restante */}
              <div className="text-sm text-amber-800 font-medium">
                R$ {(totalDespesasAno * 0.25).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {Math.max(0, 54000 - (totalDespesasAno * 0.25)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* 4. INVESTIMENTOS ANUAIS */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-indigo-800 flex items-center gap-3">
            <ArrowUpCircle className="w-8 h-8 text-indigo-600" />
            Investimentos Anuais
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-8 rounded-2xl border-2 border-blue-300 shadow-xl">
              <h3 className="text-xl font-bold text-blue-900 mb-6">Investimentos Gerais Anuais</h3>
              <div className="text-3xl font-bold text-blue-900 mb-4">
                R$ {(totalDespesasAno * 0.05).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              
              {/* Barra de Progresso Anual */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-blue-800 mb-1">
                  <span>Meta Anual</span>
                  <span>{(((totalDespesasAno * 0.05) / 24000) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-blue-300 rounded-full h-3 relative">
                  {/* Barra base (0-100%) */}
                  <div 
                    className="bg-gradient-to-r from-blue-600 to-blue-700 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (((totalDespesasAno * 0.05) / 24000) * 100))}%` }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {(((totalDespesasAno * 0.05) / 24000) * 100) > 100 && (
                    <div 
                      className="absolute top-0 left-0 bg-gradient-to-r from-blue-800 to-blue-900 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, ((((totalDespesasAno * 0.05) / 24000) * 100) - 100))}%` }}
                    ></div>
                  )}
                </div>
              </div>
              
              {/* Valores Alcançado/Restante */}
              <div className="text-sm text-blue-800 font-medium">
                R$ {(totalDespesasAno * 0.05).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {Math.max(0, 24000 - (totalDespesasAno * 0.05)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-100 to-purple-200 p-8 rounded-2xl border-2 border-purple-300 shadow-xl">
              <h3 className="text-xl font-bold text-purple-900 mb-6">Investimentos MKT Anuais</h3>
              <div className="text-3xl font-bold text-purple-900 mb-4">
                R$ {(totalReceitasAno * 0.1).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              
              {/* Barra de Progresso Anual */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-purple-800 mb-1">
                  <span>Meta Anual</span>
                  <span>{(((totalReceitasAno * 0.1) / 36000) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-purple-300 rounded-full h-3 relative">
                  {/* Barra base (0-100%) */}
                  <div 
                    className="bg-gradient-to-r from-purple-600 to-purple-700 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (((totalReceitasAno * 0.1) / 36000) * 100))}%` }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {(((totalReceitasAno * 0.1) / 36000) * 100) > 100 && (
                    <div 
                      className="absolute top-0 left-0 bg-gradient-to-r from-purple-800 to-purple-900 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, ((((totalReceitasAno * 0.1) / 36000) * 100) - 100))}%` }}
                    ></div>
                  )}
                </div>
              </div>
              
              {/* Valores Alcançado/Restante */}
              <div className="text-sm text-purple-800 font-medium">
                R$ {(totalReceitasAno * 0.1).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {Math.max(0, 36000 - (totalReceitasAno * 0.1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render Transactions
  const renderTransactions = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-green-600" />
          Transações
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setImportExportType('transactions')
              setIsImportExportModalOpen(true)
            }}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <Download className="h-5 w-5" />
            Importar/Exportar
          </button>
          <button
            onClick={() => setIsTransactionModalOpen(true)}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <Plus className="h-5 w-5" />
            Nova Transação
          </button>
        </div>
      </div>
      
      {/* Filtros de Transações */}
      <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-amber-50 to-orange-50 p-3 rounded-lg border border-amber-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">FILTRE SEUS ITENS:</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={transactionFilters.type}
            onChange={(e) => setTransactionFilters(prev => ({ ...prev, type: e.target.value }))}
            className="px-3 py-2 border border-amber-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
          >
            <option value="">Todos os tipos</option>
            <option value="Receita">Receitas</option>
            <option value="Despesa">Despesas</option>
          </select>
          
          <input
            type="text"
            placeholder="Categoria..."
            value={transactionFilters.category}
            onChange={(e) => setTransactionFilters(prev => ({ ...prev, category: e.target.value }))}
            className="px-3 py-2 border border-amber-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white w-32"
          />
          
          <div className="relative">
            <input
              type="text"
              placeholder="Data início"
              value={transactionFilters.dateFrom ? formatDateToDisplay(transactionFilters.dateFrom) : ''}
              readOnly
              onClick={handleFilterCalendarFromToggle}
              className="px-3 py-2 border border-amber-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white cursor-pointer w-32"
            />
            <Calendar 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-amber-600 pointer-events-none" 
            />
            {isFilterCalendarFromOpen && renderFilterCalendarFrom()}
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Data fim"
              value={transactionFilters.dateTo ? formatDateToDisplay(transactionFilters.dateTo) : ''}
              readOnly
              onClick={handleFilterCalendarToToggle}
              className="px-3 py-2 border border-amber-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white cursor-pointer w-32"
            />
            <Calendar 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-amber-600 pointer-events-none" 
            />
            {isFilterCalendarToOpen && renderFilterCalendarTo()}
          </div>
          
          <button
            onClick={clearTransactionFilters}
            className="px-3 py-2 bg-amber-600 text-white rounded-md text-sm hover:bg-amber-700 transition-colors"
          >
            Limpar Filtros
          </button>
        </div>
      </div>
      
      {/* Lista de Transações */}
      <div className="space-y-4">
        {transactions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600">Nenhuma transação encontrada.</p>
            <p className="text-gray-500 text-sm mt-2">Adicione sua primeira transação clicando no botão "Nova Transação".</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Cabeçalho das Colunas */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-100 border-b border-amber-200 p-4">
              <div className="grid grid-cols-7 gap-4 items-center text-center">
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={transactions.length > 0 && selectedTransactions.size === transactions.length}
                    onChange={handleSelectAllTransactions}
                    className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                  />
                </div>
                <button 
                  onClick={() => handleSort('date')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-2 py-1 transition-colors"
                >
                  <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">Data</p>
                  {getSortIcon('date')}
                </button>
                <button 
                  onClick={() => handleSort('description')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-2 py-1 transition-colors"
                >
                  <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">Descrição</p>
                  {getSortIcon('description')}
                </button>
                <button 
                  onClick={() => handleSort('type')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-2 py-1 transition-colors"
                >
                  <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">Tipo</p>
                  {getSortIcon('type')}
                </button>
                <button 
                  onClick={() => handleSort('category')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-2 py-1 transition-colors"
                >
                  <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">Categoria</p>
                  {getSortIcon('category')}
                </button>
                <button 
                  onClick={() => handleSort('value')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-2 py-1 transition-colors"
                >
                  <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">Valor</p>
                  {getSortIcon('value')}
                </button>
                <div>
                  <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">Ações</p>
                </div>
              </div>
            </div>
            
            {getFilteredAndSortedTransactions().map((transaction, index) => (
              <div key={transaction.id} className={`bg-white border-b border-gray-100 p-4 hover:bg-amber-50/30 transition-all duration-200 ${
                index === transactions.length - 1 ? 'border-b-0' : ''
              }`}>
                <div className="grid grid-cols-7 gap-4 items-center text-center">
                  {/* Checkbox */}
                  <div className="flex justify-center">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.has(transaction.id)}
                      onChange={() => handleSelectTransaction(transaction.id)}
                      className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                    />
                  </div>
                  
                  {/* Data */}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(transaction.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  
                  {/* Descrição */}
                  <div>
                    <h3 className="font-semibold text-gray-900 truncate">
                      {transaction.description}
                    </h3>
                  </div>
                  
                  {/* Tipo */}
                  <div className="flex justify-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      transaction.type === 'Receita' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {transaction.type}
                    </span>
                  </div>
                  
                  {/* Categoria */}
                  <div className="flex justify-center">
                    <span className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
                      {transaction.category}
                    </span>
                  </div>
                  
                  {/* Valor */}
                  <div>
                    <p className={`text-lg font-bold ${
                      transaction.type === 'Receita' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'Receita' ? '+' : '-'}R$ {transaction.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  
                  {/* Ações */}
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => handleEditTransaction(transaction)}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-all duration-200"
                      title="Editar transação"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm('Tem certeza que deseja excluir esta transação?')) {
                          try {
                            const success = await deleteTransaction(transaction.id)
                            if (success) {
                              setTransactions(prev => prev.filter(t => t.id !== transaction.id))
                            }
                          } catch (error) {
                            console.error('Erro ao deletar transação:', error)
                          }
                        }
                      }}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-all duration-200"
                      title="Excluir transação"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Botão de Deletar Selecionados */}
            {selectedTransactions.size > 0 && (
              <div className="flex justify-end p-4 bg-red-50 border-t border-red-200">
                <button
                  onClick={handleDeleteSelectedTransactions}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Trash2 className="h-4 w-4" />
                  Deletar Selecionada{selectedTransactions.size > 1 ? 's' : ''} ({selectedTransactions.size})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  // Render Products
  const renderProducts = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Package className="w-8 h-8 text-purple-600" />
          Produtos
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setImportExportType('products')
              setIsImportExportModalOpen(true)
            }}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <Download className="h-5 w-5" />
            Importar/Exportar
          </button>
          <button
            onClick={() => setIsProductModalOpen(true)}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <Plus className="h-5 w-5" />
            Novo Produto
          </button>
        </div>
      </div>
      
      {/* Filtros de Produtos */}
      <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-amber-50 to-orange-50 p-3 rounded-lg border border-amber-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">FILTRE SEUS ITENS:</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Categoria..."
            value={productFilters.category}
            onChange={(e) => setProductFilters(prev => ({ ...prev, category: e.target.value }))}
            className="px-3 py-2 border border-amber-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white w-32"
          />
          
          <select
            value={productFilters.stockFilter}
            onChange={(e) => setProductFilters(prev => ({ ...prev, stockFilter: e.target.value }))}
            className="px-3 py-2 border border-amber-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
          >
            <option value="">Todos os estoques</option>
            <option value="inStock">Em estoque</option>
            <option value="outOfStock">Sem estoque</option>
          </select>
          
          <select
            value={productFilters.soldFilter}
            onChange={(e) => setProductFilters(prev => ({ ...prev, soldFilter: e.target.value }))}
            className="px-3 py-2 border border-amber-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
          >
            <option value="">Todos os vendidos</option>
            <option value="sold">Vendidos</option>
            <option value="notSold">Não vendidos</option>
          </select>
          
          <select
            value={productFilters.costFilter}
            onChange={(e) => setProductFilters(prev => ({ ...prev, costFilter: e.target.value }))}
            className="px-3 py-2 border border-amber-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
          >
            <option value="">Todos os custos</option>
            <option value="withCost">Com preço de custo</option>
            <option value="withoutCost">Sem preço de custo</option>
          </select>
          
          <button
            onClick={clearProductFilters}
            className="px-3 py-2 bg-amber-600 text-white rounded-md text-sm hover:bg-amber-700 transition-colors"
          >
            Limpar Filtros
          </button>
        </div>
      </div>
      
      {/* Lista de Produtos */}
      <div className="space-y-4">
        {products.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600">Nenhum produto encontrado.</p>
            <p className="text-gray-500 text-sm mt-2">Adicione seu primeiro produto clicando no botão "Novo Produto".</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Cabeçalho das Colunas */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-100 border-b border-amber-200 p-4">
              <div className="grid grid-cols-8 gap-4 items-center text-center">
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selectedProducts.size === products.length}
                    onChange={handleSelectAllProducts}
                    className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                  />
                </div>
                <button 
                  onClick={() => handleSort('name')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-2 py-1 transition-colors"
                >
                  <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">Nome</p>
                  {getSortIcon('name')}
                </button>
                <button 
                  onClick={() => handleSort('category')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-2 py-1 transition-colors"
                >
                  <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">Categoria</p>
                  {getSortIcon('category')}
                </button>
                <button 
                  onClick={() => handleSort('price')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-2 py-1 transition-colors"
                >
                  <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">Preço</p>
                  {getSortIcon('price')}
                </button>
                <button 
                  onClick={() => handleSort('cost')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-2 py-1 transition-colors"
                >
                  <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">Custo</p>
                  {getSortIcon('cost')}
                </button>
                <button 
                  onClick={() => handleSort('stock')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-2 py-1 transition-colors"
                >
                  <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">Estoque</p>
                  {getSortIcon('stock')}
                </button>
                <button 
                  onClick={() => handleSort('sold')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-2 py-1 transition-colors"
                >
                  <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">Vendidos</p>
                  {getSortIcon('sold')}
                </button>
                <div>
                  <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">Ações</p>
                </div>
              </div>
            </div>
            
            {getFilteredAndSortedProducts().map((product, index) => (
              <div key={product.id} className={`bg-white border-b border-gray-100 p-4 hover:bg-amber-50/30 transition-all duration-200 ${
                index === products.length - 1 ? 'border-b-0' : ''
              }`}>
                <div className="grid grid-cols-8 gap-4 items-center text-center">
                  {/* Checkbox */}
                  <div className="flex justify-center">
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={() => handleSelectProduct(product.id)}
                      className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                    />
                  </div>
                  {/* Nome */}
                  <div>
                    <h3 className="font-semibold text-gray-900 truncate">
                      {product.name}
                    </h3>
                  </div>
                  
                  {/* Categoria */}
                  <div className="flex justify-center">
                    <span className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
                      {product.category}
                    </span>
                  </div>
                  
                  {/* Preço */}
                  <div>
                    <p className="text-lg font-bold text-green-600">
                      R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  
                  {/* Custo */}
                  <div>
                    <p className="text-lg font-bold text-orange-600">
                      R$ {product.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  
                  {/* Estoque */}
                  <div>
                    <p className={`text-lg font-bold ${product.stock > 10 ? 'text-green-600' : product.stock > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {product.stock}
                    </p>
                  </div>
                  
                  {/* Vendidos */}
                  <div>
                    <p className="text-lg font-bold text-blue-600">
                      {product.sold}
                    </p>
                  </div>
                  
                  {/* Ações */}
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-all duration-200"
                      title="Editar produto"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm('Tem certeza que deseja excluir este produto?')) {
                          try {
                            const success = await deleteProduct(product.id)
                            if (success) {
                              setProducts(prev => prev.filter(p => p.id !== product.id))
                            }
                          } catch (error) {
                            console.error('Erro ao deletar produto:', error)
                          }
                        }
                      }}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-all duration-200"
                      title="Excluir produto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Botão de Deletar Selecionados */}
            {selectedProducts.size > 0 && (
              <div className="flex justify-end p-4 bg-red-50 border-t border-red-200">
                <button
                  onClick={handleDeleteSelectedProducts}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Trash2 className="h-4 w-4" />
                  Deletar Selecionado{selectedProducts.size > 1 ? 's' : ''} ({selectedProducts.size})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  // Render Reports
  const renderReports = () => {
    // Dados simulados - futuramente virão das transações
    const dadosSimulados = {
      semana: {
        vendasPorCategoria: [
          { nome: 'Velas Aromáticas', valor: 2500, cor: '#22c55e' },
          { nome: 'Velas Decorativas', valor: 1800, cor: '#3b82f6' },
          { nome: 'Kits Presente', valor: 1200, cor: '#f59e0b' }
        ],
        vendasPorProduto: [
          { nome: 'Vela Lavanda', valor: 800, cor: '#8b5cf6' },
          { nome: 'Vela Vanilla', valor: 650, cor: '#ec4899' },
          { nome: 'Kit Romance', valor: 500, cor: '#06b6d4' }
        ],
        despesasPorCategoria: [
          { nome: 'Fixo', valor: 1500, cor: '#ef4444' },
          { nome: 'Variável', valor: 800, cor: '#f97316' },
          { nome: 'Outros', valor: 400, cor: '#84cc16' }
        ],
        produtosPorDia: [
          { nome: 'Seg', vela_lavanda: 15, vela_vanilla: 12, kit_romance: 8 },
          { nome: 'Ter', vela_lavanda: 18, vela_vanilla: 14, kit_romance: 6 },
          { nome: 'Qua', vela_lavanda: 22, vela_vanilla: 16, kit_romance: 10 },
          { nome: 'Qui', vela_lavanda: 20, vela_vanilla: 13, kit_romance: 9 },
          { nome: 'Sex', vela_lavanda: 25, vela_vanilla: 18, kit_romance: 12 },
          { nome: 'Sáb', vela_lavanda: 30, vela_vanilla: 22, kit_romance: 15 },
          { nome: 'Dom', vela_lavanda: 28, vela_vanilla: 20, kit_romance: 14 }
        ]
      },
      mes: {
        vendasPorCategoria: [
          { nome: 'Velas Aromáticas', valor: 12000, cor: '#22c55e' },
          { nome: 'Velas Decorativas', valor: 8500, cor: '#3b82f6' },
          { nome: 'Kits Presente', valor: 5200, cor: '#f59e0b' }
        ],
        vendasPorProduto: [
          { nome: 'Vela Lavanda', valor: 4200, cor: '#8b5cf6' },
          { nome: 'Vela Vanilla', valor: 3800, cor: '#ec4899' },
          { nome: 'Kit Romance', valor: 2500, cor: '#06b6d4' }
        ],
        despesasPorCategoria: [
          { nome: 'Fixo', valor: 7500, cor: '#ef4444' },
          { nome: 'Variável', valor: 3200, cor: '#f97316' },
          { nome: 'Outros', valor: 1800, cor: '#84cc16' }
        ],
        produtosPorSemana: [
          { nome: 'Sem 1', vela_lavanda: 120, vela_vanilla: 95, kit_romance: 65 },
          { nome: 'Sem 2', vela_lavanda: 135, vela_vanilla: 110, kit_romance: 75 },
          { nome: 'Sem 3', vela_lavanda: 140, vela_vanilla: 105, kit_romance: 80 },
          { nome: 'Sem 4', vela_lavanda: 125, vela_vanilla: 100, kit_romance: 70 }
        ]
      },
      trimestre: {
        vendasPorCategoria: [
          { nome: 'Velas Aromáticas', valor: 35000, cor: '#22c55e' },
          { nome: 'Velas Decorativas', valor: 28500, cor: '#3b82f6' },
          { nome: 'Kits Presente', valor: 18200, cor: '#f59e0b' }
        ],
        vendasPorProduto: [
          { nome: 'Vela Lavanda', valor: 15200, cor: '#8b5cf6' },
          { nome: 'Vela Vanilla', valor: 12800, cor: '#ec4899' },
          { nome: 'Kit Romance', valor: 8500, cor: '#06b6d4' }
        ],
        despesasPorCategoria: [
          { nome: 'Fixo', valor: 22500, cor: '#ef4444' },
          { nome: 'Variável', valor: 12200, cor: '#f97316' },
          { nome: 'Outros', valor: 6800, cor: '#84cc16' }
        ],
        produtosPorMes: [
          { nome: 'Mês 1', vela_lavanda: 520, vela_vanilla: 410, kit_romance: 290 },
          { nome: 'Mês 2', vela_lavanda: 485, vela_vanilla: 395, kit_romance: 275 },
          { nome: 'Mês 3', vela_lavanda: 510, vela_vanilla: 420, kit_romance: 300 }
        ]
      },
      ano: {
        vendasPorCategoria: [
          { nome: 'Velas Aromáticas', valor: 145000, cor: '#22c55e' },
          { nome: 'Velas Decorativas', valor: 118500, cor: '#3b82f6' },
          { nome: 'Kits Presente', valor: 78200, cor: '#f59e0b' }
        ],
        vendasPorProduto: [
          { nome: 'Vela Lavanda', valor: 65200, cor: '#8b5cf6' },
          { nome: 'Vela Vanilla', valor: 58800, cor: '#ec4899' },
          { nome: 'Kit Romance', valor: 38500, cor: '#06b6d4' }
        ],
        despesasPorCategoria: [
          { nome: 'Fixo', valor: 92500, cor: '#ef4444' },
          { nome: 'Variável', valor: 52200, cor: '#f97316' },
          { nome: 'Outros', valor: 28800, cor: '#84cc16' }
        ],
        produtosPorTrimestre: [
          { nome: 'T1', vela_lavanda: 1515, vela_vanilla: 1225, kit_romance: 865 },
          { nome: 'T2', vela_lavanda: 1620, vela_vanilla: 1380, kit_romance: 920 },
          { nome: 'T3', vela_lavanda: 1580, vela_vanilla: 1295, kit_romance: 885 },
          { nome: 'T4', vela_lavanda: 1685, vela_vanilla: 1450, kit_romance: 980 }
        ]
      }
    }

    const renderSecaoRelatorio = (titulo: string, dados: any, periodo: string) => {
      const totalVendasCategoria = dados.vendasPorCategoria.reduce((sum: number, item: any) => sum + item.valor, 0)
      const totalVendasProduto = dados.vendasPorProduto.reduce((sum: number, item: any) => sum + item.valor, 0)
      const totalDespesas = dados.despesasPorCategoria.reduce((sum: number, item: any) => sum + item.valor, 0)
      const lucroLiquido = totalVendasCategoria - totalDespesas

      return (
        <div className="space-y-6 mb-12">
          <h2 className="text-2xl font-bold text-gray-800">{titulo}</h2>
          
          {/* Cards principais lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Card Vendas por Categoria */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
              {/* Seção Vendas por Categoria */}
              <div className="mb-8">
                <div className="flex items-center mb-6">
                  <span className="text-gray-400 text-lg mr-3">📈</span>
                  <h3 className="text-lg font-bold text-gray-800">Vendas por Categoria</h3>
                </div>
                
                <div className="space-y-3">
                  {dados.vendasPorCategoria.map((item: any, index: number) => {
                    // Cores baseadas na imagem - tons de verde claro para categorias vazias
                    const backgroundColors = ['bg-green-100', 'bg-green-100', 'bg-green-100'];
                    const labelBgColors = ['bg-green-200', 'bg-green-200', 'bg-green-200'];
                    const textColors = ['text-green-800', 'text-green-800', 'text-green-800'];
                    const chartId = `vendas-categoria-${periodo}-${index}`;
                    
                    return (
                      <div key={index} className="space-y-3">
                        <div 
                          className={`${backgroundColors[index]} p-4 rounded-xl flex justify-between items-center cursor-pointer hover:opacity-80 transition-opacity`}
                          onClick={() => toggleReportChart(chartId)}
                        >
                          <span className={`${labelBgColors[index]} ${textColors[index]} font-medium px-4 py-2 rounded-lg min-w-0 flex-shrink-0`}>
                            {item.nome}
                          </span>
                          <span className="font-bold text-gray-500 ml-4 text-right">
                            R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        
                        {/* Gráfico expandido */}
                        {expandedReportCharts.includes(chartId) && (
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart data={[{name: item.nome, valor: item.valor}]}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']} />
                                <Bar dataKey="valor" fill={item.cor} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Total Vendas por Categoria */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="space-y-3">
                    <div 
                      className="bg-green-200 p-4 rounded-xl flex justify-between items-center cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => toggleReportChart(`total-vendas-categoria-${periodo}`)}
                    >
                      <span className="bg-green-300 text-green-800 font-bold px-4 py-2 rounded-lg min-w-0 flex-shrink-0">
                        Total Vendas por Categoria
                      </span>
                      <span className="font-bold text-green-800 text-lg ml-4 text-right">
                        R$ {totalVendasCategoria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    
                    {/* Gráfico expandido do Total */}
                    {expandedReportCharts.includes(`total-vendas-categoria-${periodo}`) && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={dados.vendasPorCategoria}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="nome" />
                            <YAxis />
                            <Tooltip formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']} />
                            <Bar dataKey="valor" fill="#22c55e" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Seção Vendas por Tipo de Produto */}
              <div>
                <div className="mb-4">
                  <h4 className="text-md font-bold text-gray-700">Vendas por Tipo de Produto</h4>
                </div>
                
                <div className="space-y-3">
                  {dados.vendasPorProduto.map((item: any, index: number) => {
                    // Cores baseadas na imagem - tons de azul para produtos
                    const backgroundColors = ['bg-blue-100', 'bg-blue-100', 'bg-blue-100'];
                    const labelBgColors = ['bg-blue-200', 'bg-blue-200', 'bg-blue-200'];
                    const textColors = ['text-blue-800', 'text-blue-800', 'text-blue-800'];
                    const chartId = `vendas-produto-${periodo}-${index}`;
                    
                    return (
                      <div key={index} className="space-y-3">
                        <div 
                          className={`${backgroundColors[index]} p-3 rounded-lg flex justify-between items-center cursor-pointer hover:opacity-80 transition-opacity`}
                          onClick={() => toggleReportChart(chartId)}
                        >
                          <span className={`${labelBgColors[index]} ${textColors[index]} font-medium text-sm px-3 py-2 rounded min-w-0 flex-shrink-0`}>
                            {item.nome}
                          </span>
                          <span className="font-bold text-blue-900 text-sm ml-3 text-right">
                            R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        
                        {/* Gráfico expandido */}
                        {expandedReportCharts.includes(chartId) && (
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart data={[{name: item.nome, valor: item.valor}]}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']} />
                                <Bar dataKey="valor" fill={item.cor} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Total Vendas por Produto */}
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="space-y-3">
                    <div 
                      className="bg-blue-200 p-3 rounded-lg flex justify-between items-center cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => toggleReportChart(`total-vendas-produto-${periodo}`)}
                    >
                      <span className="bg-blue-300 text-blue-800 font-bold text-sm px-3 py-2 rounded min-w-0 flex-shrink-0">
                        Total por Produto
                      </span>
                      <span className="font-bold text-blue-800 text-sm ml-3 text-right">
                        R$ {totalVendasProduto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    
                    {/* Gráfico expandido do Total */}
                    {expandedReportCharts.includes(`total-vendas-produto-${periodo}`) && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={dados.vendasPorProduto}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="nome" />
                            <YAxis />
                            <Tooltip formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']} />
                            <Bar dataKey="valor" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Card Despesas por Categoria */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
              <div className="flex items-center mb-6">
                <span className="text-gray-400 text-lg mr-3">💸</span>
                <h3 className="text-lg font-bold text-gray-800">Despesas por Categoria</h3>
              </div>
              
              <div className="space-y-3">
                {dados.despesasPorCategoria.map((item: any, index: number) => {
                  const chartId = `despesas-categoria-${periodo}-${index}`;
                  
                  return (
                    <div key={index} className="space-y-3">
                      <div 
                        className="bg-orange-50 p-4 rounded-xl flex justify-between items-center cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => toggleReportChart(chartId)}
                      >
                        <span className="bg-orange-100 text-orange-700 font-medium px-4 py-2 rounded-lg min-w-0 flex-shrink-0">
                          {item.nome}
                        </span>
                        <span className="font-bold text-gray-500 ml-4 text-right">
                          R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      {/* Gráfico expandido */}
                      {expandedReportCharts.includes(chartId) && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={[{name: item.nome, valor: item.valor}]}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']} />
                              <Bar dataKey="valor" fill={item.cor} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Total de Despesas - Mais escuro */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="space-y-3">
                  <div 
                    className="bg-orange-200 p-4 rounded-xl flex justify-between items-center cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => toggleReportChart(`total-despesas-${periodo}`)}
                  >
                    <span className="bg-orange-300 text-orange-800 font-bold px-4 py-2 rounded-lg min-w-0 flex-shrink-0">
                      Total de Despesas
                    </span>
                    <span className="font-bold text-orange-800 text-lg ml-4 text-right">
                      R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  {/* Gráfico expandido do Total */}
                  {expandedReportCharts.includes(`total-despesas-${periodo}`) && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dados.despesasPorCategoria}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nome" />
                          <YAxis />
                          <Tooltip formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']} />
                          <Bar dataKey="valor" fill="#f97316" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card Produtos por Período */}
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <span className="text-gray-400 text-lg mr-3">📦</span>
                <h3 className="text-lg font-bold text-gray-800">Produtos Vendidos por {periodo === 'Semana' ? 'Dia' : periodo === 'Mês' ? 'Semana' : periodo === 'Trimestre' ? 'Mês' : 'Trimestre'}</h3>
              </div>
              <button 
                className="text-blue-600 hover:text-blue-800 font-medium"
                onClick={() => toggleReportChart(`produtos-${periodo}`)}
              >
                {expandedReportCharts.includes(`produtos-${periodo}`) ? 'Ocultar Gráfico' : 'Ver Gráfico'}
              </button>
            </div>
            
            {expandedReportCharts.includes(`produtos-${periodo}`) && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={
                    periodo === 'Semana' ? dados.produtosPorDia :
                    periodo === 'Mês' ? dados.produtosPorSemana :
                    periodo === 'Trimestre' ? dados.produtosPorMes :
                    dados.produtosPorTrimestre
                  }>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="vela_lavanda" fill="#8b5cf6" name="Vela Lavanda" />
                    <Bar dataKey="vela_vanilla" fill="#ec4899" name="Vela Vanilla" />
                    <Bar dataKey="kit_romance" fill="#06b6d4" name="Kit Romance" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Card Resumo da Seção - Layout único com 4 colunas */}
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Resumo do {periodo}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Total Vendas */}
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <p className="text-sm font-bold text-green-600 mb-2">Total Vendas</p>
                <p className="text-xl font-bold text-green-600">
                  R$ {totalVendasCategoria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Total Despesas */}
              <div className="text-center p-4 bg-red-50 rounded-xl">
                <p className="text-sm font-bold text-red-600 mb-2">Total Despesas</p>
                <p className="text-xl font-bold text-red-600">
                  R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Lucro Líquido */}
              <div className={`text-center p-4 rounded-xl ${lucroLiquido >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className={`text-sm font-bold mb-2 ${lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>Lucro Líquido</p>
                <p className={`text-xl font-bold ${lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <div className={`mt-2 p-2 rounded-lg ${lucroLiquido >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <p className={`text-xs font-bold ${lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Margem: {((lucroLiquido / totalVendasCategoria) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className={`text-center p-4 rounded-xl ${lucroLiquido >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className={`text-sm font-bold mb-2 ${lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>Status</p>
                <div className={`inline-flex items-center px-3 py-2 rounded-lg ${lucroLiquido >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <span className={`text-sm font-bold ${lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {lucroLiquido >= 0 ? '📈 Positivo' : '📉 Negativo'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Relatórios
          </h1>
          <button
            onClick={() => alert("Ferramenta em construção")}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <Plus className="h-5 w-5" />
            Novo Relatório
          </button>
        </div>

        {/* Seção Semana */}
        {renderSecaoRelatorio('Relatório Semanal', dadosSimulados.semana, 'Semana')}
        
        {/* Seção Mês */}
        {renderSecaoRelatorio('Relatório Mensal', dadosSimulados.mes, 'Mês')}
        
        {/* Seção Trimestre */}
        {renderSecaoRelatorio('Relatório Trimestral', dadosSimulados.trimestre, 'Trimestre')}
        
        {/* Seção Ano */}
        {renderSecaoRelatorio('Relatório Anual', dadosSimulados.ano, 'Ano')}
      </div>
    )
  }

  // Render Metas
  const renderMetas = () => {
    // Encontrar o mês selecionado na lista
    const mesSelecionado = mesesMetas.find(mes => mes.indice === selectedMonth)

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Target className="w-8 h-8 text-amber-600" />
            Metas
          </h1>
          <button
            onClick={() => alert("Ferramenta em construção")}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <Plus className="h-5 w-5" />
            Nova Meta
          </button>
        </div>

        {/* Renderizar Mês Selecionado com Dropdown Integrado */}
        {mesSelecionado && (
          <div className="space-y-6 mb-12">
            {/* Dropdown do Mês Selecionado */}
            <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-6 rounded-2xl shadow-lg">
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full text-3xl font-bold text-white text-center uppercase tracking-wider bg-transparent border-none outline-none cursor-pointer"
                style={{ 
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                  backgroundPosition: 'right 1rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.2em 1.2em',
                  paddingRight: '3rem'
                }}
              >
                {mesesMetas.map((mes) => (
                  <option key={mes.indice} value={mes.indice} className="text-gray-800 bg-white normal-case text-lg font-normal">
                    {mes.nome} - 2025
                  </option>
                ))}
              </select>
            </div>
            
            {/* Conteúdo do Mês */}
            {renderMonthContent(mesSelecionado.nome, mesSelecionado.indice, mesSelecionado.meta, 31970.50)}
          </div>
        )}

        {/* Renderizar Total do Ano */}
        {renderTotalAno()}

        {/* Renderizar todos os 12 meses em ordem normal */}
        {mesesMetas.map((mes) => 
          renderMonth(mes.nome, mes.indice, mes.meta, 31970.50)
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Header Fixo */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-5">
            <div className="flex items-center">
              <img 
                src="/alya-logo.png" 
                alt="Alya Velas Logo" 
                className="w-10 h-10 mr-3 rounded-lg shadow-sm object-contain"
              />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  Alya Velas
                </h1>
                <p className="text-sm text-amber-600/70 font-medium">Sistema de Gestão Financeira</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="fixed top-[76px] left-0 right-0 z-40 bg-white/90 backdrop-blur-sm shadow-sm border-b border-amber-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center overflow-x-auto scrollbar-hide">
            <div className="flex items-center space-x-2 min-w-max">
              {[
                { id: 'dashboard', name: 'Dashboard', icon: Home },
                { id: 'metas', name: 'Metas', icon: TrendingUp },
                { id: 'reports', name: 'Relatórios', icon: BarChart3 },
                { id: 'transactions', name: 'Transações', icon: DollarSign },
                { id: 'products', name: 'Produtos', icon: Package }
              ].map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as TabType)
                      setExpandedCharts([]) // Limpa todos os gráficos ao trocar de aba
                    }}
                    className={`flex items-center px-6 pt-6 pb-4 text-sm font-medium rounded-t-xl transition-all duration-300 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-lg'
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
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-[150px]">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'metas' && renderMetas()}
        {activeTab === 'transactions' && renderTransactions()}
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'reports' && renderReports()}
      </main>

      {/* Modal de Produto */}
      {isProductModalOpen && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsProductModalOpen(false)
              setEditingProduct(null)
              setProductForm({ name: '', category: '', price: '', cost: '', stock: '', sold: '' })
              setProductFormErrors({
                name: false,
                category: false,
                price: false,
                cost: false,
                stock: false,
                sold: false
              })
            }
          }}
        >
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200/50">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-amber-200/50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2">
                  <Package className="w-6 h-6 text-amber-700" />
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                </h2>
                <button
                  onClick={() => {
                    setIsProductModalOpen(false)
                    setEditingProduct(null)
                    setProductForm({ name: '', category: '', price: '', cost: '', stock: '', sold: '' })
                    setProductFormErrors({
                      name: false,
                      category: false,
                      price: false,
                      cost: false,
                      stock: false,
                      sold: false
                    })
                  }}
                  className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 p-2 rounded-full transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Formulário */}
            <form onSubmit={async (e) => {
              e.preventDefault()
              
              // Validar formulário antes de prosseguir
              if (!validateProductForm()) {
                return
              }
              
              if (editingProduct) {
                // Editar produto existente
                try {
                  const updatedProduct = await updateProduct(editingProduct.id, {
                    name: productForm.name,
                    category: productForm.category,
                    price: parseFloat(productForm.price) || 0,
                    cost: parseFloat(productForm.cost) || 0,
                    stock: parseInt(productForm.stock) || 0,
                    sold: parseInt(productForm.sold) || 0
                  })
                  
                  if (updatedProduct) {
                    setProducts(prev => prev.map(p => 
                      p.id === editingProduct.id ? updatedProduct : p
                    ))
                  }
                } catch (error) {
                  console.error('Erro ao atualizar produto:', error)
                }
              } else {
                // Criar novo produto
                try {
                  const newProduct = await saveProduct({
                    name: productForm.name,
                    category: productForm.category,
                    price: parseFloat(productForm.price) || 0,
                    cost: parseFloat(productForm.cost) || 0,
                    stock: parseInt(productForm.stock) || 0,
                    sold: parseInt(productForm.sold) || 0
                  })
                  
                  if (newProduct) {
                    setProducts(prev => [newProduct, ...prev])
                  }
                } catch (error) {
                  console.error('Erro ao salvar produto:', error)
                }
              }
              
              // Limpar formulário e fechar modal
              setEditingProduct(null)
              setIsProductModalOpen(false)
              setProductForm({ name: '', category: '', price: '', cost: '', stock: '', sold: '' })
            }} className="space-y-4">
              
              {/* Nome do Produto */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nome do Produto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={productForm.name}
                  onChange={handleProductInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white transition-all duration-200 shadow-sm ${
                    productFormErrors.name 
                      ? 'bg-red-50 border-red-300 focus:ring-red-500' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  placeholder="Ex: Vela Aromática Lavanda"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Categoria <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="category"
                  required
                  value={productForm.category}
                  onChange={handleProductInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white transition-all duration-200 shadow-sm ${
                    productFormErrors.category 
                      ? 'bg-red-50 border-red-300 focus:ring-red-500' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  placeholder="Ex: Velas Aromáticas"
                />
              </div>

              {/* Preço de Venda */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Preço de Venda (R$) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="price"
                  step="0.01"
                  min="0"
                  required
                  value={productForm.price}
                  onChange={handleProductInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white transition-all duration-200 shadow-sm ${
                    productFormErrors.price 
                      ? 'bg-red-50 border-red-300 focus:ring-red-500' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  placeholder="0,00"
                />
              </div>

              {/* Custo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Custo (R$)
                </label>
                <input
                  type="number"
                  name="cost"
                  step="0.01"
                  min="0"
                  value={productForm.cost}
                  onChange={handleProductInputChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white transition-all duration-200 shadow-sm"
                  placeholder="0,00"
                />
              </div>

              {/* Estoque */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Estoque
                </label>
                <input
                  type="number"
                  name="stock"
                  min="0"
                  value={productForm.stock}
                  onChange={handleProductInputChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white transition-all duration-200 shadow-sm"
                  placeholder="0"
                />
              </div>

              {/* Quantidade Vendida */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quantidade Vendida
                </label>
                <input
                  type="number"
                  name="sold"
                  min="0"
                  value={productForm.sold}
                  onChange={handleProductInputChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white transition-all duration-200 shadow-sm"
                  placeholder="0"
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsProductModalOpen(false)
                    setEditingProduct(null)
                    setProductForm({ name: '', category: '', price: '', cost: '', stock: '', sold: '' })
                    setProductFormErrors({
                      name: false,
                      category: false,
                      price: false,
                      cost: false,
                      stock: false,
                      sold: false
                    })
                  }}
                  className="flex-1 px-6 py-3 text-gray-700 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-200 font-semibold shadow-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  {editingProduct ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Nova Transação */}
      {isTransactionModalOpen && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsTransactionModalOpen(false)
              setTransactionForm({ 
                date: new Date().toISOString().split('T')[0], 
                description: '', 
                value: '', 
                type: 'Receita', 
                category: '' 
              })
              setTransactionFormErrors({
                date: false,
                description: false,
                value: false,
                type: false,
                category: false
              })
            }
          }}
        >
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200/50">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-amber-200/50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-amber-700" />
                  {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
                </h2>
                <button
                  onClick={() => {
                    setIsTransactionModalOpen(false)
                    setEditingTransaction(null)
                    setTransactionForm({ 
                      date: new Date().toISOString().split('T')[0], 
                      description: '', 
                      value: '', 
                      type: 'Receita', 
                      category: '' 
                    })
                    setTransactionFormErrors({
                      date: false,
                      description: false,
                      value: false,
                      type: false,
                      category: false
                    })
                    setIsCalendarOpen(false)
                  }}
                  className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 p-2 rounded-full transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Formulário */}
            <form onSubmit={async (e) => {
              e.preventDefault()
              
              // Validar formulário antes de prosseguir
              if (!validateTransactionForm()) {
                return
              }
              
              if (editingTransaction) {
                // Editar transação existente
                try {
                  const updatedTransaction = await updateTransaction(editingTransaction.id, {
                    date: transactionForm.date,
                    description: transactionForm.description,
                    value: parseFloat(transactionForm.value) || 0,
                    type: transactionForm.type as 'Receita' | 'Despesa',
                    category: transactionForm.category
                  })
                  
                  if (updatedTransaction) {
                    setTransactions(prev => prev.map(t => 
                      t.id === editingTransaction.id ? updatedTransaction : t
                    ))
                  }
                } catch (error) {
                  console.error('Erro ao atualizar transação:', error)
                }
              } else {
                // Criar nova transação
                try {
                  const newTransaction = await saveTransaction({
                    date: transactionForm.date,
                    description: transactionForm.description,
                    value: parseFloat(transactionForm.value) || 0,
                    type: transactionForm.type as 'Receita' | 'Despesa',
                    category: transactionForm.category
                  })
                  
                  if (newTransaction) {
                    setTransactions(prev => [newTransaction, ...prev])
                  }
                } catch (error) {
                  console.error('Erro ao salvar transação:', error)
                }
              }
              
              // Limpar formulário e fechar modal
              setEditingTransaction(null)
              setTransactionForm({ 
                date: new Date().toISOString().split('T')[0], 
                description: '', 
                value: '', 
                type: 'Receita', 
                category: '' 
              })
              setIsTransactionModalOpen(false)
            }} className="space-y-5">
              
              {/* Data */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="date"
                    value={transactionForm.date ? formatDateToDisplay(transactionForm.date) : ''}
                    readOnly
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 focus:bg-white cursor-pointer ${
                      transactionFormErrors.date 
                        ? 'bg-red-50 border-red-300 focus:ring-red-500' 
                        : 'bg-gray-100 border-gray-300'
                    }`}
                    placeholder="Selecione uma data"
                    onClick={handleCalendarToggle}
                    required
                  />
                  <button
                    type="button"
                    onClick={handleCalendarToggle}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-amber-600 hover:text-amber-800 transition-colors"
                  >
                    <Calendar className="w-5 h-5" />
                  </button>
                  
                  {/* Ícone de erro e tooltip */}
                  {transactionFormErrors.date && (
                    <div className="absolute -bottom-8 left-0 z-50">
                      <div className="relative">
                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg shadow-sm flex items-center gap-2">
                          <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">!</span>
                          </div>
                          <span className="text-gray-700 text-sm">Preencha este campo.</span>
                        </div>
                        <div className="absolute -top-1 left-4 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-gray-50"></div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Calendário personalizado */}
                {isCalendarOpen && renderCustomCalendar()}
              </div>

              {/* Descrição */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="description"
                    value={transactionForm.description}
                    onChange={handleTransactionInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 focus:bg-white ${
                      transactionFormErrors.description 
                        ? 'bg-red-50 border-red-300 focus:ring-red-500' 
                        : 'bg-gray-100 border-gray-300'
                    }`}
                    placeholder="Digite a descrição da transação..."
                    required
                  />
                  
                  {/* Ícone de erro e tooltip */}
                  {transactionFormErrors.description && (
                    <div className="absolute -bottom-8 left-0 z-50">
                      <div className="relative">
                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg shadow-sm flex items-center gap-2">
                          <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">!</span>
                          </div>
                          <span className="text-gray-700 text-sm">Preencha este campo.</span>
                        </div>
                        <div className="absolute -top-1 left-4 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-gray-50"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Valor */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor (R$) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="value"
                    value={transactionForm.value}
                    onChange={handleTransactionInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 focus:bg-white ${
                      transactionFormErrors.value 
                        ? 'bg-red-50 border-red-300 focus:ring-red-500' 
                        : 'bg-gray-100 border-gray-300'
                    }`}
                    placeholder="0,00"
                    step="0.01"
                    min="0"
                    required
                  />
                  
                  {/* Ícone de erro e tooltip */}
                  {transactionFormErrors.value && (
                    <div className="absolute -bottom-8 left-0 z-50">
                      <div className="relative">
                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg shadow-sm flex items-center gap-2">
                          <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">!</span>
                          </div>
                          <span className="text-gray-700 text-sm">Preencha este campo.</span>
                        </div>
                        <div className="absolute -top-1 left-4 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-gray-50"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="type"
                    value={transactionForm.type}
                    onChange={handleTransactionInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 focus:bg-white ${
                      transactionFormErrors.type 
                        ? 'bg-red-50 border-red-300 focus:ring-red-500' 
                        : 'bg-gray-100 border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="Receita">Receita</option>
                    <option value="Despesa">Despesa</option>
                  </select>
                  
                  {/* Ícone de erro e tooltip */}
                  {transactionFormErrors.type && (
                    <div className="absolute -bottom-8 left-0 z-50">
                      <div className="relative">
                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg shadow-sm flex items-center gap-2">
                          <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">!</span>
                          </div>
                          <span className="text-gray-700 text-sm">Preencha este campo.</span>
                        </div>
                        <div className="absolute -top-1 left-4 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-gray-50"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="category"
                    value={transactionForm.category}
                    onChange={handleTransactionInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 focus:bg-white ${
                      transactionFormErrors.category 
                        ? 'bg-red-50 border-red-300 focus:ring-red-500' 
                        : 'bg-gray-100 border-gray-300'
                    }`}
                    required
                  >
                    <option value="" disabled>Selecione uma categoria</option>
                    {getCategoriesByType(transactionForm.type).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  
                  {/* Ícone de erro e tooltip */}
                  {transactionFormErrors.category && (
                    <div className="absolute -bottom-8 left-0 z-50">
                      <div className="relative">
                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg shadow-sm flex items-center gap-2">
                          <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">!</span>
                          </div>
                          <span className="text-gray-700 text-sm">Preencha este campo.</span>
                        </div>
                        <div className="absolute -top-1 left-4 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-gray-50"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsTransactionModalOpen(false)
                    setEditingTransaction(null)
                    setTransactionForm({ 
                      date: new Date().toISOString().split('T')[0], 
                      description: '', 
                      value: '', 
                      type: 'Receita', 
                      category: '' 
                    })
                    setTransactionFormErrors({
                      date: false,
                      description: false,
                      value: false,
                      type: false,
                      category: false
                    })
                    setIsCalendarOpen(false)
                  }}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  {editingTransaction ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Importar/Exportar */}
      {isImportExportModalOpen && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsImportExportModalOpen(false)
              setSelectedFile(null)
            }
          }}
        >
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200/50">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-amber-200/50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2">
                  <Download className="w-6 h-6 text-amber-700" />
                  Importar/Exportar {importExportType === 'transactions' ? 'Transações' : 'Produtos'}
                </h2>
                <button
                  onClick={() => {
                    setIsImportExportModalOpen(false)
                    setSelectedFile(null)
                  }}
                  className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 p-2 rounded-full transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="space-y-6">
              <p className="text-gray-600 text-center">
                Escolha uma das opções abaixo para gerenciar seus dados:
              </p>

              {/* Botão para baixar modelo */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Primeiro baixe o modelo, depois importe!
                  </span>
                </div>
                <p className="text-xs text-blue-700 mb-3">
                  Baixe o arquivo modelo, preencha com seus dados e depois faça o upload.
                </p>
                <button
                  onClick={async () => {
                    try {
                      console.log('Baixando modelo para:', importExportType)
                      
                      // Tentar baixar do servidor
                      const response = await fetch(`http://localhost:3001/api/modelo/${importExportType}`)
                      
                      if (response.ok) {
                        const blob = await response.blob()
                        const url = window.URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `modelo-${importExportType === 'transactions' ? 'transacoes' : 'produtos'}.xlsx`
                        document.body.appendChild(a)
                        a.click()
                        window.URL.revokeObjectURL(url)
                        document.body.removeChild(a)
                        
                        alert(`Modelo baixado! Preencha o arquivo e depois importe.`)
                      } else {
                        throw new Error('Servidor offline')
                      }
                    } catch (error) {
                      console.error('Servidor offline, criando modelo local:', error)
                      
                      // Fallback: criar CSV modelo localmente
                      let csvContent = ''
                      let filename = ''
                      
                      if (importExportType === 'transactions') {
                        csvContent = 'Data,Descrição,Valor,Tipo,Categoria\n'
                        csvContent += '2025-09-23,"Exemplo de venda",150.00,Entrada,Vendas\n'
                        csvContent += '2025-09-23,"Exemplo de compra",75.50,Saída,Compras\n'
                        csvContent += '2025-09-23,"Exemplo de serviço",200.00,Saída,Serviços'
                        filename = 'modelo-transacoes.csv'
                      } else {
                        csvContent = 'Nome,Categoria,Preço,Custo,Estoque,Vendido\n'
                        csvContent += 'Produto Exemplo 1,Eletrônicos,299.90,150.00,25,8\n'
                        csvContent += 'Produto Exemplo 2,Roupas,89.90,45.00,50,15\n'
                        csvContent += 'Produto Exemplo 3,Casa,149.90,75.00,10,3'
                        filename = 'modelo-produtos.csv'
                      }
                      
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = filename
                      document.body.appendChild(a)
                      a.click()
                      window.URL.revokeObjectURL(url)
                      document.body.removeChild(a)
                      
                      alert('Modelo CSV criado localmente! Preencha o arquivo e importe.')
                    }
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Baixar Modelo {importExportType === 'transactions' ? 'de Transações' : 'de Produtos'}
                </button>
              </div>

              {/* Botão Selecionar Arquivo ou Arquivo Selecionado */}
              {!selectedFile ? (
                <button
                  onClick={() => {
                    // Criar input de arquivo dinamicamente
                    const fileInput = document.createElement('input')
                    fileInput.type = 'file'
                    fileInput.accept = '.xlsx'
                    fileInput.style.display = 'none'
                    
                    fileInput.onchange = (event) => {
                      const file = (event.target as HTMLInputElement).files?.[0]
                      if (file) {
                        // Verificar se é arquivo xlsx
                        if (file.name.toLowerCase().endsWith('.xlsx')) {
                          setSelectedFile(file)
                        } else {
                          alert('Por favor, selecione apenas arquivos no formato .xlsx')
                        }
                      }
                      document.body.removeChild(fileInput)
                    }
                    
                    document.body.appendChild(fileInput)
                    fileInput.click()
                  }}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                >
                  <Upload className="h-6 w-6" />
                  <div className="text-left">
                    <div className="font-bold">Selecionar Arquivo</div>
                    <div className="text-sm opacity-90">Carregar arquivo .xlsx</div>
                  </div>
                </button>
              ) : (
                <div className="w-full p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Upload className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-green-800">Arquivo selecionado:</div>
                      <div className="text-sm text-green-600 truncate">{selectedFile.name}</div>
                      <div className="text-xs text-green-500">
                        Tamanho: {(selectedFile.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-full transition-all"
                      title="Remover arquivo"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Botão Exportar */}
              <button
                onClick={() => {
                  // TODO: Implementar função de exportar
                  console.log(`Exportar ${importExportType}`)
                  alert(`Funcionalidade de exportar ${importExportType === 'transactions' ? 'transações' : 'produtos'} será implementada em breve!`)
                }}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                <Download className="h-6 w-6" />
                <div className="text-left">
                  <div className="font-bold">Exportar</div>
                  <div className="text-sm opacity-90">Salvar dados em arquivo</div>
                </div>
              </button>

              {/* Botão Importar (quando arquivo selecionado) */}
              {selectedFile && (
                <button
                  onClick={async () => {
                    setIsUploading(true)
                    try {
                      // Criar FormData para enviar o arquivo
                      const formData = new FormData()
                      formData.append('file', selectedFile)
                      formData.append('type', importExportType) // 'transactions' ou 'products'
                      
                      console.log(`Enviando arquivo: ${selectedFile.name} (${importExportType})`)
                      
                      // Tentar fazer requisição para o servidor backend
                      try {
                        const response = await fetch('http://localhost:3001/api/import', {
                          method: 'POST',
                          body: formData
                        })
                        
                        if (response.ok) {
                          const result = await response.json()
                          console.log('Resposta do servidor:', result)
                          
                          // Atualizar os dados no frontend baseado na resposta
                          if (importExportType === 'transactions' && result.data) {
                            const newTransactions = result.data.map((t: any) => ({
                              ...t,
                              id: t.id || Date.now() + Math.random()
                            }))
                            setTransactions(prev => [...prev, ...newTransactions])
                            localStorage.setItem('transactions', JSON.stringify([...transactions, ...newTransactions]))
                          } else if (importExportType === 'products' && result.data) {
                            const newProducts = result.data.map((p: any) => ({
                              ...p,
                              id: p.id || Date.now() + Math.random()
                            }))
                            setProducts(prev => [...prev, ...newProducts])
                            localStorage.setItem('products', JSON.stringify([...products, ...newProducts]))
                          }
                          
                          alert(`Arquivo "${selectedFile.name}" importado com sucesso!\n\n${result.message || 'Dados processados com sucesso.'}`)
                        } else {
                          const error = await response.text()
                          console.error('Erro do servidor:', error)
                          alert(`Erro ao importar arquivo: ${error}`)
                        }
                      } catch (networkError) {
                        console.error('Erro de conexão com servidor:', networkError)
                        
                        // Fallback: processar dados mock localmente quando servidor não estiver disponível
                        console.log('Servidor não disponível, usando dados de exemplo...')
                        
                        if (importExportType === 'transactions') {
                          const mockTransactions = [
                            { id: (Date.now() + 1).toString(), date: new Date().toISOString().split('T')[0], description: 'Transação Importada 1', value: 150, type: 'Receita' as const, category: 'Vendas', createdAt: new Date() },
                            { id: (Date.now() + 2).toString(), date: new Date().toISOString().split('T')[0], description: 'Transação Importada 2', value: 75, type: 'Despesa' as const, category: 'Compras', createdAt: new Date() }
                          ]
                          setTransactions(prev => [...prev, ...mockTransactions])
                          localStorage.setItem('transactions', JSON.stringify([...transactions, ...mockTransactions]))
                          alert(`Arquivo "${selectedFile.name}" processado localmente!\n\n${mockTransactions.length} transações adicionadas como exemplo.`)
                        } else if (importExportType === 'products') {
                          const mockProducts = [
                            { id: (Date.now() + 1).toString(), name: 'Produto Importado 1', category: 'Importados', price: 120, cost: 60, stock: 15, sold: 3 },
                            { id: (Date.now() + 2).toString(), name: 'Produto Importado 2', category: 'Importados', price: 80, cost: 40, stock: 25, sold: 8 }
                          ]
                          setProducts(prev => [...prev, ...mockProducts])
                          localStorage.setItem('products', JSON.stringify([...products, ...mockProducts]))
                          alert(`Arquivo "${selectedFile.name}" processado localmente!\n\n${mockProducts.length} produtos adicionados como exemplo.`)
                        }
                      }
                    } catch (error) {
                      console.error('Erro na requisição:', error)
                      alert(`Erro ao enviar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
                    } finally {
                      setIsUploading(false)
                    }
                    
                    // Fechar modal e limpar arquivo após tentativa
                    setSelectedFile(null)
                    setIsImportExportModalOpen(false)
                  }}
                  disabled={isUploading}
                  className={`w-full px-6 py-3 font-semibold rounded-lg shadow-lg transition-all duration-200 ${
                    isUploading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 hover:shadow-xl transform hover:-translate-y-0.5'
                  }`}
                >
                  {isUploading ? 'Enviando arquivo...' : 'Importar Arquivo'}
                </button>
              )}

              {/* Separador */}
              {!selectedFile && (
                <div className="flex items-center my-6">
                  <div className="flex-1 border-t border-gray-300"></div>
                  <span className="px-4 text-sm text-gray-500">ou</span>
                  <div className="flex-1 border-t border-gray-300"></div>
                </div>
              )}

              {/* Botão de Exportar */}
              {!selectedFile && (
                <button
                  onClick={async () => {
                    try {
                      const dataToExport = importExportType === 'transactions' ? transactions : products
                      
                      if (dataToExport.length === 0) {
                        alert(`Nenhum ${importExportType === 'transactions' ? 'transação' : 'produto'} para exportar!`)
                        return
                      }

                      // Fallback: download CSV local (servidor offline por enquanto)
                      console.log('Fazendo download CSV local...')
                      
                      let csvContent = ''
                      if (importExportType === 'transactions') {
                        csvContent = 'Data,Descrição,Valor,Tipo,Categoria\n'
                        csvContent += dataToExport.map(t => 
                          `"${t.date}","${t.description}",${t.value},"${t.type}","${t.category}"`
                        ).join('\n')
                      } else {
                        csvContent = 'Nome,Categoria,Preço,Custo,Estoque,Vendido\n'
                        csvContent += dataToExport.map(p => 
                          `"${p.name}","${p.category}",${p.price},${p.cost},${p.stock},${p.sold}`
                        ).join('\n')
                      }
                      
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `${importExportType}_${new Date().toISOString().split('T')[0]}.csv`
                      document.body.appendChild(a)
                      a.click()
                      window.URL.revokeObjectURL(url)
                      document.body.removeChild(a)
                      
                      alert(`${dataToExport.length} ${importExportType === 'transactions' ? 'transações' : 'produtos'} exportados como CSV!`)
                      setIsImportExportModalOpen(false)
                    } catch (error) {
                      console.error('Erro no export:', error)
                      alert('Erro ao exportar dados')
                    }
                  }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Exportar {importExportType === 'transactions' ? 'Transações' : 'Produtos'}
                </button>
              )}

              {/* Botão Cancelar */}
              <button
                onClick={() => {
                  setIsImportExportModalOpen(false)
                  setSelectedFile(null)
                }}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all duration-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
