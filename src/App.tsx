import React, { useState, useEffect, Suspense, lazy } from 'react'
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
  Filter,
  Users,
  X,
  LogOut,
  Shield
} from 'lucide-react'
import Clients from './components/Clients'
import Login from './components/Login'
// Lazy load AdminPanel (só carrega quando necessário)
const AdminPanel = lazy(() => import('./components/AdminPanel'))
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useModules } from './hooks/useModules'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { API_BASE_URL } from './config/api'

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

type TabType = 'dashboard' | 'transactions' | 'products' | 'reports' | 'metas' | 'clients' | 'admin'

// Componente principal do conteúdo da aplicação
const AppContent: React.FC = () => {
  const { user, token, logout, isLoading } = useAuth();
  const { getVisibleModules } = useModules();
  
  // Mapeamento de ícones para os módulos (reservado para uso futuro)
  // const iconMap: Record<string, any> = {
  //   'Home': Home,
  //   'DollarSign': DollarSign,
  //   'Package': Package,
  //   'Users': Users,
  //   'BarChart3': BarChart3,
  //   'Target': Target,
  //   'Shield': Shield,
  //   'TrendingUp': TrendingUp
  // };

  // Funções para comunicação com a API (com token)
  const fetchTransactions = async () => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/transactions`, { headers });
    const result = await response.json();
    if (response.status === 401 || response.status === 403) {
      logout();
      return [];
    }
    return result.success ? result.data : [];
  }

  const saveTransaction = async (transaction: any) => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/transactions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(transaction)
    });
    if (response.status === 401 || response.status === 403) {
      logout();
      return null;
    }
    const result = await response.json();
    return result.success ? result.data : null;
  }

  const updateTransaction = async (id: string, transaction: any) => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(transaction)
    });
    if (response.status === 401 || response.status === 403) {
      logout();
      return null;
    }
    const result = await response.json();
    return result.success ? result.data : null;
  }

  const deleteTransaction = async (id: string) => {
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'DELETE',
      headers
    });
    if (response.status === 401 || response.status === 403) {
      logout();
      return false;
    }
    const result = await response.json();
    return result.success;
  }

  const deleteMultipleTransactions = async (ids: string[]) => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/transactions`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ ids })
    });
    if (response.status === 401 || response.status === 403) {
      logout();
      return false;
    }
    const result = await response.json();
    return result.success;
  }

  // Funções para Produtos
  const fetchProducts = async () => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/products`, { headers });
    const result = await response.json();
    if (response.status === 401 || response.status === 403) {
      logout();
      return [];
    }
    return result.success ? result.data : [];
  }

  const saveProduct = async (product: any) => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify(product)
    });
    if (response.status === 401 || response.status === 403) {
      logout();
      return null;
    }
    const result = await response.json();
    return result.success ? result.data : null;
  }

  const updateProduct = async (id: string, product: any) => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(product)
    });
    if (response.status === 401 || response.status === 403) {
      logout();
      return null;
    }
    const result = await response.json();
    return result.success ? result.data : null;
  }

  const deleteProduct = async (id: string) => {
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE',
      headers
    });
    if (response.status === 401 || response.status === 403) {
      logout();
      return false;
    }
    const result = await response.json();
    return result.success;
  }

  const deleteMultipleProducts = async (ids: string[]) => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ ids })
    });
    if (response.status === 401 || response.status === 403) {
      logout();
      return false;
    }
    const result = await response.json();
    return result.success;
  }

  // ⚠️ IMPORTANTE: Todos os hooks devem ser declarados ANTES de qualquer return condicional
  // Estados principais
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
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
  
  // Estado do modal de seleção de período para exportar relatórios
  const [isPeriodoExportModalOpen, setIsPeriodoExportModalOpen] = useState(false)
  
  // Estados do modal de exportação de transações
  const [isExportTransacoesModalOpen, setIsExportTransacoesModalOpen] = useState(false)
  const [exportarFiltradas, setExportarFiltradas] = useState(true)
  const [incluirResumo, setIncluirResumo] = useState(true)
  
  // Estados do modal de exportação de produtos
  const [isExportProdutosModalOpen, setIsExportProdutosModalOpen] = useState(false)
  const [exportarFiltrados, setExportarFiltrados] = useState(true)
  const [incluirResumoProdutos, setIncluirResumoProdutos] = useState(true)
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

  // Estados adicionais que aparecem mais tarde no código
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth())
  const [expandedCharts, setExpandedCharts] = useState<string[]>([])
  const [expandedReportCharts, setExpandedReportCharts] = useState<string[]>([])

  // ⚠️ TODOS OS useEffect DEVEM ESTAR AQUI, ANTES DOS RETURNS CONDICIONAIS
  
  // Carregar dados do banco de dados
  useEffect(() => {
    // Só carregar dados se o token estiver disponível
    if (!token || !user) {
      return;
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user])

  // Carregar dados do localStorage apenas se não houver dados da API
  useEffect(() => {
    // Só carregar do localStorage se não houver token (modo offline/desenvolvimento)
    // Em produção, os dados vêm da API
    if (!token || !user) {
      const savedTransactions = localStorage.getItem('alya-transactions')
      const savedProducts = localStorage.getItem('alya-products')
      const savedMetas = localStorage.getItem('alya-metas')
      
      if (savedTransactions) setTransactions(JSON.parse(savedTransactions))
      if (savedProducts) setProducts(JSON.parse(savedProducts))
      if (savedMetas) setMetas(JSON.parse(savedMetas))
    }
  }, [token, user])

  // Salvar dados no localStorage
  useEffect(() => {
    if (transactions.length > 0) {
      localStorage.setItem('alya-transactions', JSON.stringify(transactions))
    }
  }, [transactions])

  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem('alya-products', JSON.stringify(products))
    }
  }, [products])

  useEffect(() => {
    if (metas.length > 0) {
      localStorage.setItem('alya-metas', JSON.stringify(metas))
    }
  }, [metas])

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

  // ⚠️ AGORA SIM: Verificações de autenticação DEPOIS de todos os hooks
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

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

  // Removido: funções de ordenação não utilizadas (agora usamos filtros + ordenação combinada)

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
      return ['Atacado', 'Varejo', 'Investimentos', 'Outros']
    } else if (type === 'Despesa') {
      return ['Fixo', 'Variável', 'Investimento', 'Mkt', 'Outros']
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

  // Calcular resumo financeiro (mantendo para compatibilidade)
  // Removido: totais fictícios (usar calculateTotals())

  // Render Dashboard
  const renderDashboard = () => {
    // Calcular totais das transações reais (movido para dentro da função)
    const { receitas, despesas, resultado } = calculateTotals()
    
    // Obter o mês selecionado nas metas
    const mesSelecionadoMetas = mesesMetas.find(mes => mes.indice === selectedMonth) || mesesMetas[new Date().getMonth()]
    
    // (removido) Lista de transações do mês selecionado — não utilizada diretamente
    
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
    
    // Dados trimestrais (usando dados reais das transações)
    const totalReceitasTrimestre = transacoesTrimestre
      .filter(t => t.type === 'Receita')
      .reduce((sum, t) => sum + t.value, 0)
    const totalDespesasTrimestre = transacoesTrimestre
      .filter(t => t.type === 'Despesa')
      .reduce((sum, t) => sum + t.value, 0)
    const lucroLiquidoTrimestre = totalReceitasTrimestre - totalDespesasTrimestre
    
    // Meta do trimestre (soma das metas dos 3 meses)
    const metaTrimestre = mesesDoTrimestre.reduce((total, mesIndex) => 
      total + (mesesMetas[mesIndex]?.meta || 0), 0
    )
    
    // Filtrar transações do ano atual
    const transacoesAno = transactions.filter(t => {
      const transactionYear = new Date(t.date).getFullYear()
      return transactionYear === new Date().getFullYear()
    })
    
    // Dados anuais (usando dados reais das transações)
    const totalReceitasAno = transacoesAno
      .filter(t => t.type === 'Receita')
      .reduce((sum, t) => sum + t.value, 0)
    const totalDespesasAno = transacoesAno
      .filter(t => t.type === 'Despesa')
      .reduce((sum, t) => sum + t.value, 0)
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
  const renderMonthContent = (_monthName: string, monthIndex: number, metaValue: number, saldoInicial: number = 31970.50) => {
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

  // Função para exportar transações em PDF
  const exportarTransacoesPDF = async () => {
    try {
      setIsExportTransacoesModalOpen(false)
      
      // Obter transações para exportar
      const transacoesParaExportar = exportarFiltradas 
        ? getFilteredAndSortedTransactions() 
        : transactions
      
      // Validar se há transações
      if (transacoesParaExportar.length === 0) {
        alert('Não há transações para exportar!')
        return
      }
      
      // Calcular resumo financeiro (se habilitado)
      let totalReceitas = 0
      let totalDespesas = 0
      let saldo = 0
      
      if (incluirResumo) {
        totalReceitas = transacoesParaExportar
          .filter(t => t.type === 'Receita')
          .reduce((sum, t) => sum + t.value, 0)
        
        totalDespesas = transacoesParaExportar
          .filter(t => t.type === 'Despesa')
          .reduce((sum, t) => sum + t.value, 0)
        
        saldo = totalReceitas - totalDespesas
      }
      
      // Criar elemento temporário para capturar o conteúdo
      const tempElement = document.createElement('div')
      tempElement.style.position = 'absolute'
      tempElement.style.left = '-9999px'
      tempElement.style.top = '-9999px'
      tempElement.style.width = '800px'
      tempElement.style.backgroundColor = 'white'
      tempElement.style.padding = '20px'
      tempElement.style.fontFamily = 'Arial, sans-serif'
      
      // Construir informações de filtros aplicados
      let infoFiltros = 'Todas as transações'
      if (exportarFiltradas) {
        const filtrosAtivos = []
        if (transactionFilters.type) filtrosAtivos.push(`Tipo: ${transactionFilters.type}`)
        if (transactionFilters.category) filtrosAtivos.push(`Categoria: ${transactionFilters.category}`)
        if (transactionFilters.dateFrom) filtrosAtivos.push(`De: ${new Date(transactionFilters.dateFrom).toLocaleDateString('pt-BR')}`)
        if (transactionFilters.dateTo) filtrosAtivos.push(`Até: ${new Date(transactionFilters.dateTo).toLocaleDateString('pt-BR')}`)
        
        if (filtrosAtivos.length > 0) {
          infoFiltros = `Transações filtradas: ${filtrosAtivos.join(', ')}`
        } else {
          infoFiltros = 'Todas as transações (sem filtros ativos)'
        }
      }
      
      // Construir HTML do relatório
      let htmlContent = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: bold;">ALYA VELAS</h1>
          <h2 style="color: #374151; font-size: 24px; margin: 10px 0; font-weight: bold;">Relatório de Transações</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">${infoFiltros}</p>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
      `
      
      // Resumo Executivo (se habilitado)
      if (incluirResumo) {
        htmlContent += `
          <div style="margin-bottom: 30px;">
            <h3 style="color: #f59e0b; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #f59e0b; padding-bottom: 5px;">📊 Resumo Executivo</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
              <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                <div style="font-weight: bold; color: #10b981; margin-bottom: 5px;">Total de Receitas</div>
                <div style="font-size: 18px; font-weight: bold; color: #059669;">R$ ${totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
                <div style="font-weight: bold; color: #ef4444; margin-bottom: 5px;">Total de Despesas</div>
                <div style="font-size: 18px; font-weight: bold; color: #dc2626;">R$ ${totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div style="background: ${saldo >= 0 ? '#f0fdf4' : '#fef2f2'}; padding: 15px; border-radius: 8px; border-left: 4px solid ${saldo >= 0 ? '#10b981' : '#ef4444'};">
                <div style="font-weight: bold; color: ${saldo >= 0 ? '#10b981' : '#ef4444'}; margin-bottom: 5px;">Saldo</div>
                <div style="font-size: 18px; font-weight: bold; color: ${saldo >= 0 ? '#059669' : '#dc2626'};">R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div style="background: #fffbeb; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <div style="font-weight: bold; color: #f59e0b; margin-bottom: 5px;">Quantidade de Transações</div>
                <div style="font-size: 18px; font-weight: bold; color: #d97706;">${transacoesParaExportar.length}</div>
              </div>
            </div>
          </div>
        `
      }
      
      // Tabela de Transações
      htmlContent += `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #f59e0b; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #f59e0b; padding-bottom: 5px;">📋 Lista de Transações</h3>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; background: white;">
              <thead>
                <tr style="background: linear-gradient(to right, #fef3c7, #fed7aa); border-bottom: 2px solid #f59e0b;">
                  <th style="padding: 12px; text-align: left; font-weight: bold; color: #92400e; border-right: 1px solid #fbbf24;">Data</th>
                  <th style="padding: 12px; text-align: left; font-weight: bold; color: #92400e; border-right: 1px solid #fbbf24;">Descrição</th>
                  <th style="padding: 12px; text-align: center; font-weight: bold; color: #92400e; border-right: 1px solid #fbbf24;">Tipo</th>
                  <th style="padding: 12px; text-align: left; font-weight: bold; color: #92400e; border-right: 1px solid #fbbf24;">Categoria</th>
                  <th style="padding: 12px; text-align: right; font-weight: bold; color: #92400e;">Valor</th>
                </tr>
              </thead>
              <tbody>
      `
      
      // Adicionar linhas da tabela
      transacoesParaExportar.forEach((transaction, index) => {
        const dataFormatada = new Date(transaction.date).toLocaleDateString('pt-BR')
        const valorFormatado = transaction.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
        const tipoCor = transaction.type === 'Receita' ? '#10b981' : '#ef4444'
        const tipoBg = transaction.type === 'Receita' ? '#f0fdf4' : '#fef2f2'
        const valorCor = transaction.type === 'Receita' ? '#059669' : '#dc2626'
        const sinal = transaction.type === 'Receita' ? '+' : '-'
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb'
        
        htmlContent += `
          <tr style="background: ${bgColor}; border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; color: #374151;">${dataFormatada}</td>
            <td style="padding: 10px; color: #374151; font-weight: 500;">${transaction.description}</td>
            <td style="padding: 10px; text-align: center;">
              <span style="background: ${tipoBg}; color: ${tipoCor}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                ${transaction.type}
              </span>
            </td>
            <td style="padding: 10px; color: #6b7280;">${transaction.category}</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: ${valorCor};">
              ${sinal}R$ ${valorFormatado}
            </td>
          </tr>
        `
      })
      
      htmlContent += `
              </tbody>
            </table>
          </div>
        </div>
      `
      
      // Rodapé
      htmlContent += `
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            Relatório gerado automaticamente pelo sistema Alya Velas<br>
            Dados baseados em transações ${exportarFiltradas ? 'filtradas' : 'completas'}<br>
            Para mais informações, acesse o painel administrativo
          </p>
        </div>
      `
      
      tempElement.innerHTML = htmlContent
      document.body.appendChild(tempElement)
      
      // Capturar o elemento como imagem
      const canvas = await html2canvas(tempElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })
      
      // Remover elemento temporário
      document.body.removeChild(tempElement)
      
      // Criar PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      
      let position = 0
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Salvar PDF
      const fileName = `Transacoes_${exportarFiltradas ? 'Filtradas' : 'Completas'}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)

      alert(`✅ Relatório PDF exportado com sucesso!\nArquivo: ${fileName}\n\n📊 Dados incluídos:\n• Total de transações: ${transacoesParaExportar.length}${incluirResumo ? `\n• Total de Receitas: R$ ${totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n• Total de Despesas: R$ ${totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n• Saldo: R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}`)

    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      alert('❌ Erro ao exportar PDF. Tente novamente.')
    }
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
            onClick={() => setIsExportTransacoesModalOpen(true)}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <Download className="h-5 w-5" />
            Exportar PDF
          </button>
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
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
          {/* Título */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">FILTRE SEUS ITENS:</h2>
          </div>
          
          {/* Campos de Filtro */}
          <div className="flex items-end gap-1 sm:gap-2 md:gap-3 lg:gap-4 flex-1">
          {/* Filtro Tipo */}
          <div className="flex flex-col flex-1 min-w-0">
            <label className="text-xs sm:text-xs sm:text-sm font-semibold text-gray-700 mb-1 truncate truncate">Tipo</label>
            <select
              value={transactionFilters.type}
              onChange={(e) => setTransactionFilters(prev => ({ 
                ...prev, 
                type: e.target.value,
                category: '' // Limpar categoria quando tipo mudar
              }))}
              className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white w-full"
            >
              <option value="">Todos os tipos</option>
              <option value="Receita">Receitas</option>
              <option value="Despesa">Despesas</option>
            </select>
          </div>
          
          {/* Filtro Categoria */}
          <div className="flex flex-col flex-1 min-w-0">
            <label className="text-xs sm:text-xs sm:text-sm font-semibold text-gray-700 mb-1 truncate truncate">Categoria</label>
            <select
              value={transactionFilters.category}
              onChange={(e) => setTransactionFilters(prev => ({ ...prev, category: e.target.value }))}
              className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white w-full"
            >
              <option value="">Todas as categorias</option>
              {transactionFilters.type ? (
                getCategoriesByType(transactionFilters.type).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))
              ) : (
                <>
                  {/* Opções para Receita */}
                  <optgroup label="Receita">
                    {getCategoriesByType('Receita').map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </optgroup>
                  {/* Opções para Despesa */}
                  <optgroup label="Despesa">
                    {getCategoriesByType('Despesa').map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </optgroup>
                </>
              )}
            </select>
          </div>
          
          {/* Filtro Data Início */}
          <div className="flex flex-col flex-1 min-w-0">
            <label className="text-xs sm:text-xs sm:text-sm font-semibold text-gray-700 mb-1 truncate truncate">Data Início</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Início"
                value={transactionFilters.dateFrom ? formatDateToDisplay(transactionFilters.dateFrom) : ''}
                readOnly
                onClick={handleFilterCalendarFromToggle}
                className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white cursor-pointer w-full"
              />
              <Calendar 
                className="absolute right-1 sm:right-2 md:right-3 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-amber-600 pointer-events-none" 
              />
              {isFilterCalendarFromOpen && renderFilterCalendarFrom()}
            </div>
          </div>
          
          {/* Filtro Data Fim */}
          <div className="flex flex-col flex-1 min-w-0">
            <label className="text-xs sm:text-xs sm:text-sm font-semibold text-gray-700 mb-1 truncate truncate">Data Fim</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Fim"
                value={transactionFilters.dateTo ? formatDateToDisplay(transactionFilters.dateTo) : ''}
                readOnly
                onClick={handleFilterCalendarToToggle}
                className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white cursor-pointer w-full"
              />
              <Calendar 
                className="absolute right-1 sm:right-2 md:right-3 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-amber-600 pointer-events-none" 
              />
              {isFilterCalendarToOpen && renderFilterCalendarTo()}
            </div>
          </div>
          </div>
          
          {/* Botão Limpar Filtros */}
          <div className="lg:ml-auto">
            <button
              onClick={clearTransactionFilters}
              className="px-2 sm:px-3 md:px-4 py-1 sm:py-2 bg-amber-600 text-white rounded-md text-xs sm:text-sm hover:bg-amber-700 transition-colors w-full lg:w-auto"
            >
              Limpar Filtros
            </button>
          </div>
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
               <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 lg:gap-3">
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
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-20 sm:w-24"
                >
                   <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide truncate">Data</p>
                  {getSortIcon('date')}
                </button>
                <button 
                  onClick={() => handleSort('description')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-1 min-w-0"
                >
                   <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide truncate">Descrição</p>
                  {getSortIcon('description')}
                </button>
                <button 
                  onClick={() => handleSort('type')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-16 sm:w-20"
                >
                   <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">Tipo</p>
                  {getSortIcon('type')}
                </button>
                <button 
                  onClick={() => handleSort('category')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-20 sm:w-24"
                >
                   <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide truncate">Categoria</p>
                  {getSortIcon('category')}
                </button>
                <button 
                  onClick={() => handleSort('value')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-20 sm:w-24"
                >
                   <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">Valor</p>
                  {getSortIcon('value')}
                </button>
                <div className="flex-shrink-0 w-16 sm:w-20 flex justify-center">
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">Ações</p>
                </div>
              </div>
            </div>
            
            {getFilteredAndSortedTransactions().map((transaction, index) => (
              <div key={transaction.id} className={`bg-white border-b border-gray-100 p-4 hover:bg-amber-50/30 transition-all duration-200 ${
                index === transactions.length - 1 ? 'border-b-0' : ''
              }`}>
                <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 lg:gap-3">
                  {/* Checkbox */}
                  <div className="flex-shrink-0 text-left">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.has(transaction.id)}
                      onChange={() => handleSelectTransaction(transaction.id)}
                      className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                    />
                  </div>
                  
                  {/* Data */}
                   <div className="flex-shrink-0 w-20 sm:w-24 text-left">
                     <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                      {new Date(transaction.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  
                  {/* Descrição */}
                   <div className="flex-1 min-w-0 text-left">
                     <h3 className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                        {transaction.description}
                      </h3>
                    </div>
                  
                  {/* Tipo */}
                  <div className="flex-shrink-0 w-16 sm:w-20 text-center">
                    <span className={`px-0.5 sm:px-1 py-0.5 rounded-full text-xs font-medium ${
                      transaction.type === 'Receita' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {transaction.type}
                    </span>
                  </div>
                  
                  {/* Categoria */}
                   <div className="flex-shrink-0 w-20 sm:w-24 text-center">
                     <span className="text-xs sm:text-sm text-gray-600 bg-gray-50 px-0.5 sm:px-1 py-0.5 rounded-md truncate">
                        {transaction.category}
                      </span>
                    </div>
                  
                  {/* Valor */}
                  <div className="flex-shrink-0 w-20 sm:w-24 text-center">
                    <p className={`text-xs sm:text-sm md:text-lg font-bold ${
                      transaction.type === 'Receita' ? 'text-green-600' : 'text-red-600'
                    } truncate`}>
                      {transaction.type === 'Receita' ? '+' : '-'}R$ {transaction.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  
                  {/* Ações */}
                  <div className="flex-shrink-0 w-16 sm:w-20 flex gap-0.5 sm:gap-1 justify-center">
                    <button
                      onClick={() => handleEditTransaction(transaction)}
                      className="p-0.5 sm:p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-all duration-200"
                      title="Editar transação"
                    >
                      <Edit className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
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
                      className="p-0.5 sm:p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-all duration-200"
                      title="Excluir transação"
                    >
                      <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
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

  // Função para exportar produtos em PDF
  const exportarProdutosPDF = async () => {
    try {
      setIsExportProdutosModalOpen(false)
      
      // Obter produtos para exportar
      const produtosParaExportar = exportarFiltrados 
        ? getFilteredAndSortedProducts() 
        : products
      
      // Validar se há produtos
      if (produtosParaExportar.length === 0) {
        alert('Não há produtos para exportar!')
        return
      }
      
      // Calcular resumo estatístico (se habilitado)
      let totalProdutos = produtosParaExportar.length
      let valorTotalEstoque = 0
      let custoTotalEstoque = 0
      let lucroPotencial = 0
      let margemMedia = 0
      let totalVendidos = 0
      let produtosEmEstoque = 0
      let produtosSemEstoque = 0
      let produtosPorCategoria: { [key: string]: number } = {}
      
      if (incluirResumoProdutos) {
        // Calcular valores totais
        produtosParaExportar.forEach(p => {
          valorTotalEstoque += p.price * p.stock
          custoTotalEstoque += p.cost * p.stock
          totalVendidos += p.sold
          
          if (p.stock > 0) {
            produtosEmEstoque++
          } else {
            produtosSemEstoque++
          }
          
          // Contar por categoria
          produtosPorCategoria[p.category] = (produtosPorCategoria[p.category] || 0) + 1
          
          // Calcular margem de lucro (evitar divisão por zero)
          if (p.price > 0) {
            const margem = ((p.price - p.cost) / p.price) * 100
            margemMedia += margem
          }
        })
        
        lucroPotencial = valorTotalEstoque - custoTotalEstoque
        margemMedia = produtosParaExportar.length > 0 ? margemMedia / produtosParaExportar.length : 0
      }
      
      // Criar elemento temporário para capturar o conteúdo
      const tempElement = document.createElement('div')
      tempElement.style.position = 'absolute'
      tempElement.style.left = '-9999px'
      tempElement.style.top = '-9999px'
      tempElement.style.width = '800px'
      tempElement.style.backgroundColor = 'white'
      tempElement.style.padding = '20px'
      tempElement.style.fontFamily = 'Arial, sans-serif'
      
      // Construir informações de filtros aplicados
      let infoFiltros = 'Todos os produtos'
      if (exportarFiltrados) {
        const filtrosAtivos = []
        if (productFilters.category) filtrosAtivos.push(`Categoria: ${productFilters.category}`)
        if (productFilters.stockFilter === 'inStock') filtrosAtivos.push('Em estoque')
        if (productFilters.stockFilter === 'outOfStock') filtrosAtivos.push('Sem estoque')
        if (productFilters.soldFilter === 'sold') filtrosAtivos.push('Vendidos')
        if (productFilters.soldFilter === 'notSold') filtrosAtivos.push('Não vendidos')
        if (productFilters.costFilter === 'withCost') filtrosAtivos.push('Com preço de custo')
        if (productFilters.costFilter === 'withoutCost') filtrosAtivos.push('Sem preço de custo')
        
        if (filtrosAtivos.length > 0) {
          infoFiltros = `Produtos filtrados: ${filtrosAtivos.join(', ')}`
        } else {
          infoFiltros = 'Todos os produtos (sem filtros ativos)'
        }
      }
      
      // Construir HTML do relatório
      let htmlContent = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: bold;">ALYA VELAS</h1>
          <h2 style="color: #374151; font-size: 24px; margin: 10px 0; font-weight: bold;">Relatório de Produtos</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">${infoFiltros}</p>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
      `
      
      // Resumo Estatístico (se habilitado)
      if (incluirResumoProdutos) {
        htmlContent += `
          <div style="margin-bottom: 30px;">
            <h3 style="color: #f59e0b; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #f59e0b; padding-bottom: 5px;">📊 Resumo Estatístico</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
              <div style="background: #fffbeb; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <div style="font-weight: bold; color: #f59e0b; margin-bottom: 5px;">Total de Produtos</div>
                <div style="font-size: 18px; font-weight: bold; color: #d97706;">${totalProdutos}</div>
              </div>
              <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                <div style="font-weight: bold; color: #10b981; margin-bottom: 5px;">Valor Total do Estoque</div>
                <div style="font-size: 18px; font-weight: bold; color: #059669;">R$ ${valorTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
                <div style="font-weight: bold; color: #ef4444; margin-bottom: 5px;">Custo Total do Estoque</div>
                <div style="font-size: 18px; font-weight: bold; color: #dc2626;">R$ ${custoTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div style="background: ${lucroPotencial >= 0 ? '#f0fdf4' : '#fef2f2'}; padding: 15px; border-radius: 8px; border-left: 4px solid ${lucroPotencial >= 0 ? '#10b981' : '#ef4444'};">
                <div style="font-weight: bold; color: ${lucroPotencial >= 0 ? '#10b981' : '#ef4444'}; margin-bottom: 5px;">Lucro Potencial</div>
                <div style="font-size: 18px; font-weight: bold; color: ${lucroPotencial >= 0 ? '#059669' : '#dc2626'};">R$ ${lucroPotencial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div style="background: #fffbeb; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <div style="font-weight: bold; color: #f59e0b; margin-bottom: 5px;">Margem de Lucro Média</div>
                <div style="font-size: 18px; font-weight: bold; color: #d97706;">${margemMedia.toFixed(1)}%</div>
              </div>
              <div style="background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <div style="font-weight: bold; color: #3b82f6; margin-bottom: 5px;">Total Vendidos</div>
                <div style="font-size: 18px; font-weight: bold; color: #2563eb;">${totalVendidos}</div>
              </div>
              <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                <div style="font-weight: bold; color: #10b981; margin-bottom: 5px;">Em Estoque</div>
                <div style="font-size: 18px; font-weight: bold; color: #059669;">${produtosEmEstoque}</div>
              </div>
              <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
                <div style="font-weight: bold; color: #ef4444; margin-bottom: 5px;">Sem Estoque</div>
                <div style="font-size: 18px; font-weight: bold; color: #dc2626;">${produtosSemEstoque}</div>
              </div>
            </div>
            
            ${Object.keys(produtosPorCategoria).length > 0 ? `
              <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 15px;">
                <h4 style="color: #374151; font-size: 16px; margin-bottom: 10px; font-weight: bold;">Distribuição por Categoria:</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
                  ${Object.entries(produtosPorCategoria).map(([categoria, quantidade]) => `
                    <div style="text-align: center; padding: 8px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                      <div style="font-weight: bold; color: #f59e0b; font-size: 18px;">${quantidade}</div>
                      <div style="font-size: 12px; color: #6b7280;">${categoria}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        `
      }
      
      // Tabela de Produtos
      htmlContent += `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #f59e0b; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #f59e0b; padding-bottom: 5px;">📦 Lista de Produtos</h3>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; background: white;">
              <thead>
                <tr style="background: linear-gradient(to right, #fef3c7, #fed7aa); border-bottom: 2px solid #f59e0b;">
                  <th style="padding: 12px; text-align: left; font-weight: bold; color: #92400e; border-right: 1px solid #fbbf24;">Nome</th>
                  <th style="padding: 12px; text-align: left; font-weight: bold; color: #92400e; border-right: 1px solid #fbbf24;">Categoria</th>
                  <th style="padding: 12px; text-align: right; font-weight: bold; color: #92400e; border-right: 1px solid #fbbf24;">Preço</th>
                  <th style="padding: 12px; text-align: right; font-weight: bold; color: #92400e; border-right: 1px solid #fbbf24;">Custo</th>
                  <th style="padding: 12px; text-align: center; font-weight: bold; color: #92400e; border-right: 1px solid #fbbf24;">Estoque</th>
                  <th style="padding: 12px; text-align: center; font-weight: bold; color: #92400e; border-right: 1px solid #fbbf24;">Vendidos</th>
                  <th style="padding: 12px; text-align: right; font-weight: bold; color: #92400e;">Margem</th>
                </tr>
              </thead>
              <tbody>
      `
      
      // Adicionar linhas da tabela
      produtosParaExportar.forEach((product, index) => {
        const precoFormatado = product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
        const custoFormatado = product.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
        
        // Calcular margem de lucro (evitar divisão por zero)
        let margemLucro = 0
        let margemCor = '#6b7280'
        if (product.price > 0) {
          margemLucro = ((product.price - product.cost) / product.price) * 100
          margemCor = margemLucro >= 0 ? '#10b981' : '#ef4444'
        }
        
        // Cor do estoque
        let estoqueCor = '#ef4444' // vermelho
        if (product.stock > 10) {
          estoqueCor = '#10b981' // verde
        } else if (product.stock > 0) {
          estoqueCor = '#f59e0b' // amarelo
        }
        
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb'
        
        htmlContent += `
          <tr style="background: ${bgColor}; border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; color: #374151; font-weight: 500;">${product.name}</td>
            <td style="padding: 10px; color: #6b7280;">${product.category}</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #10b981;">R$ ${precoFormatado}</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #f97316;">R$ ${custoFormatado}</td>
            <td style="padding: 10px; text-align: center; font-weight: bold; color: ${estoqueCor};">${product.stock}</td>
            <td style="padding: 10px; text-align: center; font-weight: bold; color: #3b82f6;">${product.sold}</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: ${margemCor};">${margemLucro.toFixed(1)}%</td>
          </tr>
        `
      })
      
      htmlContent += `
              </tbody>
            </table>
          </div>
        </div>
      `
      
      // Rodapé
      htmlContent += `
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            Relatório gerado automaticamente pelo sistema Alya Velas<br>
            Dados baseados em produtos ${exportarFiltrados ? 'filtrados' : 'completos'}<br>
            Para mais informações, acesse o painel administrativo
          </p>
        </div>
      `
      
      tempElement.innerHTML = htmlContent
      document.body.appendChild(tempElement)
      
      // Capturar o elemento como imagem
      const canvas = await html2canvas(tempElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })
      
      // Remover elemento temporário
      document.body.removeChild(tempElement)
      
      // Criar PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      
      let position = 0
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Salvar PDF
      const fileName = `Produtos_${exportarFiltrados ? 'Filtrados' : 'Completos'}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)

      alert(`✅ Relatório PDF exportado com sucesso!\nArquivo: ${fileName}\n\n📊 Dados incluídos:\n• Total de produtos: ${totalProdutos}${incluirResumoProdutos ? `\n• Valor total do estoque: R$ ${valorTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n• Custo total do estoque: R$ ${custoTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n• Lucro potencial: R$ ${lucroPotencial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n• Margem média: ${margemMedia.toFixed(1)}%` : ''}`)

    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      alert('❌ Erro ao exportar PDF. Tente novamente.')
    }
  }

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
            onClick={() => setIsExportProdutosModalOpen(true)}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <Download className="h-5 w-5" />
            Exportar PDF
          </button>
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
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
          {/* Título */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">FILTRE SEUS ITENS:</h2>
          </div>
          
          {/* Campos de Filtro */}
          <div className="flex items-end gap-1 sm:gap-2 md:gap-3 lg:gap-4 flex-1">
          {/* Filtro Categoria */}
          <div className="flex flex-col flex-1 min-w-0">
            <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-1 truncate">Categoria</label>
            <input
              type="text"
              placeholder="Categoria..."
              value={productFilters.category}
              onChange={(e) => setProductFilters(prev => ({ ...prev, category: e.target.value }))}
              className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white w-full"
            />
          </div>
          
          {/* Filtro Estoque */}
          <div className="flex flex-col flex-1 min-w-0">
            <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-1 truncate">Estoque</label>
          
            <select
              value={productFilters.stockFilter}
              onChange={(e) => setProductFilters(prev => ({ ...prev, stockFilter: e.target.value }))}
              className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white w-full"
            >
              <option value="">Todos os estoques</option>
              <option value="inStock">Em estoque</option>
              <option value="outOfStock">Sem estoque</option>
            </select>
          </div>
          
          {/* Filtro Vendidos */}
          <div className="flex flex-col flex-1 min-w-0">
            <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-1 truncate">Vendidos</label>
          
            <select
              value={productFilters.soldFilter}
              onChange={(e) => setProductFilters(prev => ({ ...prev, soldFilter: e.target.value }))}
              className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white w-full"
            >
              <option value="">Todos os vendidos</option>
              <option value="sold">Vendidos</option>
              <option value="notSold">Não vendidos</option>
            </select>
          </div>
          
          {/* Filtro Preço de Custo */}
          <div className="flex flex-col flex-1 min-w-0">
            <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-1 truncate">Preço de Custo</label>
          
            <select
              value={productFilters.costFilter}
              onChange={(e) => setProductFilters(prev => ({ ...prev, costFilter: e.target.value }))}
              className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white w-full"
            >
              <option value="">Todos os custos</option>
              <option value="withCost">Com preço de custo</option>
              <option value="withoutCost">Sem preço de custo</option>
            </select>
          </div>
          </div>
          
          {/* Botão Limpar Filtros */}
          <div className="lg:ml-auto">
            <button
              onClick={clearProductFilters}
              className="px-4 py-2 bg-amber-600 text-white rounded-md text-sm hover:bg-amber-700 transition-colors w-full lg:w-auto"
            >
              Limpar Filtros
            </button>
          </div>
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
              <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 lg:gap-3">
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
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-1 min-w-0"
                >
                   <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">Nome</p>
                  {getSortIcon('name')}
                </button>
                <button 
                  onClick={() => handleSort('category')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-20 sm:w-24"
                >
                   <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide truncate">Categoria</p>
                  {getSortIcon('category')}
                </button>
                <button 
                  onClick={() => handleSort('price')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-20 sm:w-24"
                >
                   <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">Preço</p>
                  {getSortIcon('price')}
                </button>
                <button 
                  onClick={() => handleSort('cost')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-16 sm:w-20"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">Custo</p>
                  {getSortIcon('cost')}
                </button>
                <button 
                  onClick={() => handleSort('stock')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-16 sm:w-20"
                >
                   <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">Estoque</p>
                  {getSortIcon('stock')}
                </button>
                <button 
                  onClick={() => handleSort('sold')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-16 sm:w-20"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">Vendidos</p>
                  {getSortIcon('sold')}
                </button>
                <div className="flex-shrink-0 w-16 sm:w-20 flex justify-center">
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">Ações</p>
                </div>
              </div>
            </div>
            
            {getFilteredAndSortedProducts().map((product, index) => (
              <div key={product.id} className={`bg-white border-b border-gray-100 p-4 hover:bg-amber-50/30 transition-all duration-200 ${
                index === products.length - 1 ? 'border-b-0' : ''
              }`}>
                <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 lg:gap-3">
                  {/* Checkbox */}
                  <div className="flex-shrink-0 text-left">
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={() => handleSelectProduct(product.id)}
                      className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                    />
                  </div>
                  {/* Nome */}
                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                      {product.name}
                    </h3>
                  </div>
                  
                  {/* Categoria */}
                   <div className="flex-shrink-0 w-20 sm:w-24 text-center">
                     <span className="text-xs sm:text-sm text-gray-600 bg-gray-50 px-0.5 sm:px-1 py-0.5 rounded-md truncate">
                        {product.category}
                      </span>
                    </div>
                  
                  {/* Preço */}
                  <div className="flex-shrink-0 w-20 sm:w-24 text-center">
                    <p className="text-xs sm:text-sm md:text-lg font-bold text-green-600 truncate">
                      R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  
                  {/* Custo */}
                  <div className="flex-shrink-0 w-16 sm:w-20 text-center">
                    <p className="text-xs sm:text-sm md:text-lg font-bold text-orange-600 truncate">
                      R$ {product.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  
                  {/* Estoque */}
                  <div className="flex-shrink-0 w-16 sm:w-20 text-center">
                    <p className={`text-xs sm:text-sm md:text-lg font-bold ${product.stock > 10 ? 'text-green-600' : product.stock > 0 ? 'text-yellow-600' : 'text-red-600'} truncate`}>
                      {product.stock}
                    </p>
                  </div>
                  
                  {/* Vendidos */}
                  <div className="flex-shrink-0 w-16 sm:w-20 text-center">
                    <p className="text-xs sm:text-sm md:text-lg font-bold text-blue-600 truncate">
                      {product.sold}
                    </p>
                  </div>
                  
                  {/* Ações */}
                  <div className="flex-shrink-0 w-16 sm:w-20 flex gap-0.5 sm:gap-1 justify-center">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="p-0.5 sm:p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-all duration-200"
                      title="Editar produto"
                    >
                      <Edit className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
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
                      className="p-0.5 sm:p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-all duration-200"
                      title="Excluir produto"
                    >
                      <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
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

  // Função para abrir modal de seleção de período
  const abrirModalSelecaoPeriodo = () => {
    setIsPeriodoExportModalOpen(true)
  }

  // Função para exportar relatórios em PDF
  const exportarRelatoriosPDF = async (periodoSelecionado: string) => {
    try {
      setIsPeriodoExportModalOpen(false)
      
      // Calcular dados reais das transações (mesma lógica de renderReports)
      const agora = new Date()
      const inicioSemana = new Date(agora)
      inicioSemana.setDate(agora.getDate() - agora.getDay())
      inicioSemana.setHours(0, 0, 0, 0)
      
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
      const inicioTrimestre = new Date(agora.getFullYear(), Math.floor(agora.getMonth() / 3) * 3, 1)
      const inicioAno = new Date(agora.getFullYear(), 0, 1)

      // Filtrar transações por período
      const transacoesSemana = transactions.filter(t => {
        const dataTransacao = new Date(t.date)
        return dataTransacao >= inicioSemana
      })

      const transacoesMes = transactions.filter(t => {
        const dataTransacao = new Date(t.date)
        return dataTransacao >= inicioMes
      })

      const transacoesTrimestre = transactions.filter(t => {
        const dataTransacao = new Date(t.date)
        return dataTransacao >= inicioTrimestre
      })

      const transacoesAno = transactions.filter(t => {
        const dataTransacao = new Date(t.date)
        return dataTransacao >= inicioAno
      })

      // Funções auxiliares de cálculo (reutilizadas de renderReports)
      const calcularVendasPorCategoria = (transacoes: any[]) => {
        const vendasPorCategoria: { [key: string]: number } = {}
        
        transacoes.forEach(t => {
          if (t.type === 'Receita') {
            vendasPorCategoria[t.category] = (vendasPorCategoria[t.category] || 0) + t.value
          }
        })
        
        const cores = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']
        return Object.entries(vendasPorCategoria).map(([nome, valor], index) => ({
          nome,
          valor,
          cor: cores[index % cores.length]
        }))
      }

      const calcularDespesasPorCategoria = (transacoes: any[]) => {
        const despesasPorCategoria: { [key: string]: number } = {}
        
        transacoes.forEach(t => {
          if (t.type === 'Despesa') {
            despesasPorCategoria[t.category] = (despesasPorCategoria[t.category] || 0) + t.value
          }
        })
        
        const cores = ['#ef4444', '#f97316', '#84cc16', '#f59e0b', '#8b5cf6']
        return Object.entries(despesasPorCategoria).map(([nome, valor], index) => ({
          nome,
          valor,
          cor: cores[index % cores.length]
        }))
      }

      const calcularVendasPorProduto = (transacoes: any[]) => {
        const vendasPorProduto: { [key: string]: number } = {}
        
        transacoes.forEach(t => {
          if (t.type === 'Receita') {
            const nomeProduto = t.description || 'Produto sem nome'
            vendasPorProduto[nomeProduto] = (vendasPorProduto[nomeProduto] || 0) + t.value
          }
        })
        
        const cores = ['#8b5cf6', '#ec4899', '#06b6d4', '#22c55e', '#3b82f6']
        return Object.entries(vendasPorProduto)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([nome, valor], index) => ({
            nome,
            valor,
            cor: cores[index % cores.length]
          }))
      }

      // Determinar quais períodos exportar
      const periodosParaExportar: Array<{nome: string, transacoes: any[]}> = []
      
      if (periodoSelecionado === 'Todos') {
        periodosParaExportar.push(
          { nome: 'Semana', transacoes: transacoesSemana },
          { nome: 'Mês', transacoes: transacoesMes },
          { nome: 'Trimestre', transacoes: transacoesTrimestre },
          { nome: 'Ano', transacoes: transacoesAno }
        )
      } else {
        const transacoesMap: { [key: string]: any[] } = {
          'Semana': transacoesSemana,
          'Mês': transacoesMes,
          'Trimestre': transacoesTrimestre,
          'Ano': transacoesAno
        }
        periodosParaExportar.push({
          nome: periodoSelecionado,
          transacoes: transacoesMap[periodoSelecionado] || []
        })
      }

      // Validar se há dados
      const temDados = periodosParaExportar.some(p => p.transacoes.length > 0)
      if (!temDados) {
        alert('Não há dados para exportar no período selecionado!')
        return
      }

      // Criar elemento temporário para capturar o conteúdo
      const tempElement = document.createElement('div')
      tempElement.style.position = 'absolute'
      tempElement.style.left = '-9999px'
      tempElement.style.top = '-9999px'
      tempElement.style.width = '800px'
      tempElement.style.backgroundColor = 'white'
      tempElement.style.padding = '20px'
      tempElement.style.fontFamily = 'Arial, sans-serif'

      // Construir HTML do relatório
      let htmlContent = ''

      // Cabeçalho principal
      htmlContent += `
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: bold;">ALYA VELAS</h1>
          <h2 style="color: #374151; font-size: 24px; margin: 10px 0; font-weight: bold;">Relatório Financeiro${periodoSelecionado === 'Todos' ? '' : ' - ' + periodoSelecionado}</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
      `

      // Processar cada período
      periodosParaExportar.forEach((periodo, periodoIndex) => {
        const vendasPorCategoria = calcularVendasPorCategoria(periodo.transacoes)
        const vendasPorProduto = calcularVendasPorProduto(periodo.transacoes)
        const despesasPorCategoria = calcularDespesasPorCategoria(periodo.transacoes)
        
        const totalVendasCategoria = vendasPorCategoria.reduce((sum, item) => sum + item.valor, 0)
        const totalDespesas = despesasPorCategoria.reduce((sum, item) => sum + item.valor, 0)
        const lucroLiquido = totalVendasCategoria - totalDespesas
        const margemLucro = totalVendasCategoria > 0 ? ((lucroLiquido / totalVendasCategoria) * 100) : 0

        // Seção do período
        htmlContent += `
          <div style="margin-bottom: ${periodoIndex < periodosParaExportar.length - 1 ? '50px' : '30px'}; page-break-after: ${periodoIndex < periodosParaExportar.length - 1 ? 'always' : 'auto'};">
            <h3 style="color: #f59e0b; font-size: 22px; margin-bottom: 20px; border-bottom: 3px solid #f59e0b; padding-bottom: 10px;">📊 Relatório ${periodo.nome}</h3>
            
            <!-- Resumo Executivo -->
            <div style="margin-bottom: 30px;">
              <h4 style="color: #f59e0b; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #f59e0b; padding-bottom: 5px;">Resumo Executivo</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                  <div style="font-weight: bold; color: #10b981; margin-bottom: 5px;">Total Vendas</div>
                  <div style="font-size: 18px; font-weight: bold; color: #059669;">R$ ${totalVendasCategoria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
                  <div style="font-weight: bold; color: #ef4444; margin-bottom: 5px;">Total Despesas</div>
                  <div style="font-size: 18px; font-weight: bold; color: #dc2626;">R$ ${totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div style="background: ${lucroLiquido >= 0 ? '#f0fdf4' : '#fef2f2'}; padding: 15px; border-radius: 8px; border-left: 4px solid ${lucroLiquido >= 0 ? '#10b981' : '#ef4444'};">
                  <div style="font-weight: bold; color: ${lucroLiquido >= 0 ? '#10b981' : '#ef4444'}; margin-bottom: 5px;">Lucro Líquido</div>
                  <div style="font-size: 18px; font-weight: bold; color: ${lucroLiquido >= 0 ? '#059669' : '#dc2626'};">R$ ${lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div style="background: #fffbeb; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                  <div style="font-weight: bold; color: #f59e0b; margin-bottom: 5px;">Margem de Lucro</div>
                  <div style="font-size: 18px; font-weight: bold; color: #d97706;">${margemLucro.toFixed(1)}%</div>
                </div>
              </div>
            </div>

            <!-- Vendas por Categoria -->
            <div style="margin-bottom: 30px;">
              <h4 style="color: #f59e0b; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #f59e0b; padding-bottom: 5px;">📈 Vendas por Categoria</h4>
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                ${vendasPorCategoria.length > 0 ? vendasPorCategoria.map(item => `
                  <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-weight: bold; color: #374151;">${item.nome}</span>
                    <span style="font-weight: bold; color: #10b981;">R$ ${item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                `).join('') : '<p style="color: #6b7280; text-align: center;">Nenhuma venda registrada</p>'}
                <div style="display: flex; justify-content: space-between; padding: 15px; margin-top: 10px; background: #f0fdf4; border-radius: 8px; border: 2px solid #10b981;">
                  <span style="font-weight: bold; color: #10b981; font-size: 16px;">Total</span>
                  <span style="font-weight: bold; color: #10b981; font-size: 16px;">R$ ${totalVendasCategoria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <!-- Vendas por Produto (Top 5) -->
            <div style="margin-bottom: 30px;">
              <h4 style="color: #f59e0b; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #f59e0b; padding-bottom: 5px;">📦 Top 5 Produtos</h4>
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                ${vendasPorProduto.length > 0 ? vendasPorProduto.map((item, index) => `
                  <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-weight: bold; color: #374151;">${index + 1}. ${item.nome}</span>
                    <span style="font-weight: bold; color: #3b82f6;">R$ ${item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                `).join('') : '<p style="color: #6b7280; text-align: center;">Nenhum produto vendido</p>'}
              </div>
            </div>

            <!-- Despesas por Categoria -->
            <div style="margin-bottom: 30px;">
              <h4 style="color: #f59e0b; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #f59e0b; padding-bottom: 5px;">💸 Despesas por Categoria</h4>
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                ${despesasPorCategoria.length > 0 ? despesasPorCategoria.map(item => `
                  <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-weight: bold; color: #374151;">${item.nome}</span>
                    <span style="font-weight: bold; color: #ef4444;">R$ ${item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                `).join('') : '<p style="color: #6b7280; text-align: center;">Nenhuma despesa registrada</p>'}
                <div style="display: flex; justify-content: space-between; padding: 15px; margin-top: 10px; background: #fef2f2; border-radius: 8px; border: 2px solid #ef4444;">
                  <span style="font-weight: bold; color: #ef4444; font-size: 16px;">Total</span>
                  <span style="font-weight: bold; color: #ef4444; font-size: 16px;">R$ ${totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        `
      })

      // Rodapé
      htmlContent += `
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            Relatório gerado automaticamente pelo sistema Alya Velas<br>
            Dados baseados em transações reais do período<br>
            Para mais informações, acesse o painel administrativo
          </p>
        </div>
      `

      tempElement.innerHTML = htmlContent
      document.body.appendChild(tempElement)

      // Capturar o elemento como imagem
      const canvas = await html2canvas(tempElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })

      // Remover elemento temporário
      document.body.removeChild(tempElement)

      // Criar PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      
      let position = 0
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Salvar PDF
      const fileName = `Relatorio_${periodoSelecionado === 'Todos' ? 'Completo' : periodoSelecionado}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)

      alert(`✅ Relatório PDF exportado com sucesso!\nArquivo: ${fileName}\n\n📊 Período: ${periodoSelecionado}\n📈 Total de períodos: ${periodosParaExportar.length}`)

    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      alert('❌ Erro ao exportar PDF. Tente novamente.')
    }
  }

  // Render Reports
  const renderReports = () => {
    // Calcular dados reais das transações
    const agora = new Date()
    const inicioSemana = new Date(agora)
    inicioSemana.setDate(agora.getDate() - agora.getDay())
    inicioSemana.setHours(0, 0, 0, 0)
    
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
    const inicioTrimestre = new Date(agora.getFullYear(), Math.floor(agora.getMonth() / 3) * 3, 1)
    const inicioAno = new Date(agora.getFullYear(), 0, 1)

    // Filtrar transações por período
    const transacoesSemana = transactions.filter(t => {
      const dataTransacao = new Date(t.date)
      return dataTransacao >= inicioSemana
    })

    const transacoesMes = transactions.filter(t => {
      const dataTransacao = new Date(t.date)
      return dataTransacao >= inicioMes
    })

    const transacoesTrimestre = transactions.filter(t => {
      const dataTransacao = new Date(t.date)
      return dataTransacao >= inicioTrimestre
    })

    const transacoesAno = transactions.filter(t => {
      const dataTransacao = new Date(t.date)
      return dataTransacao >= inicioAno
    })

    // Função para calcular vendas por categoria
    const calcularVendasPorCategoria = (transacoes: any[]) => {
      const vendasPorCategoria: { [key: string]: number } = {}
      
      transacoes.forEach(t => {
        if (t.type === 'Receita') {
          vendasPorCategoria[t.category] = (vendasPorCategoria[t.category] || 0) + t.value
        }
      })
      
      const cores = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']
      return Object.entries(vendasPorCategoria).map(([nome, valor], index) => ({
        nome,
        valor,
        cor: cores[index % cores.length]
      }))
    }

    // Função para calcular despesas por categoria
    const calcularDespesasPorCategoria = (transacoes: any[]) => {
      const despesasPorCategoria: { [key: string]: number } = {}
      
      transacoes.forEach(t => {
        if (t.type === 'Despesa') {
          despesasPorCategoria[t.category] = (despesasPorCategoria[t.category] || 0) + t.value
        }
      })
      
      const cores = ['#ef4444', '#f97316', '#84cc16', '#f59e0b', '#8b5cf6']
      return Object.entries(despesasPorCategoria).map(([nome, valor], index) => ({
        nome,
        valor,
        cor: cores[index % cores.length]
      }))
    }

    // Função para calcular vendas por produto (baseado nas transações)
    const calcularVendasPorProduto = (transacoes: any[]) => {
      const vendasPorProduto: { [key: string]: number } = {}
      
      transacoes.forEach(t => {
        if (t.type === 'Receita') {
          // Usar a descrição como nome do produto
          const nomeProduto = t.description || 'Produto sem nome'
          vendasPorProduto[nomeProduto] = (vendasPorProduto[nomeProduto] || 0) + t.value
        }
      })
      
      const cores = ['#8b5cf6', '#ec4899', '#06b6d4', '#22c55e', '#3b82f6']
      return Object.entries(vendasPorProduto)
        .sort(([,a], [,b]) => b - a) // Ordenar por valor decrescente
        .slice(0, 5) // Pegar apenas os 5 primeiros
        .map(([nome, valor], index) => ({
          nome,
          valor,
          cor: cores[index % cores.length]
        }))
    }

    // Função para calcular produtos vendidos por período
    const calcularProdutosPorPeriodo = (transacoes: any[], tipo: 'dia' | 'semana') => {
      const produtosPorPeriodo: { [key: string]: { [key: string]: number } } = {}
      
      transacoes.forEach(t => {
        if (t.type === 'Receita') {
          const dataTransacao = new Date(t.date)
          let chavePeriodo: string
          
          if (tipo === 'dia') {
            const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
            chavePeriodo = diasSemana[dataTransacao.getDay()]
          } else {
            const semanaDoMes = Math.ceil(dataTransacao.getDate() / 7)
            chavePeriodo = `Sem ${semanaDoMes}`
          }
          
          if (!produtosPorPeriodo[chavePeriodo]) {
            produtosPorPeriodo[chavePeriodo] = {}
          }
          
          const nomeProduto = t.description || 'Produto sem nome'
          produtosPorPeriodo[chavePeriodo][nomeProduto] = 
            (produtosPorPeriodo[chavePeriodo][nomeProduto] || 0) + 1
        }
      })
      
      return Object.entries(produtosPorPeriodo).map(([nome, produtos]) => ({
        nome,
        ...produtos
      }))
    }

    // Calcular dados reais
    const dadosReais = {
      semana: {
        vendasPorCategoria: calcularVendasPorCategoria(transacoesSemana),
        vendasPorProduto: calcularVendasPorProduto(transacoesSemana),
        despesasPorCategoria: calcularDespesasPorCategoria(transacoesSemana),
        produtosPorDia: calcularProdutosPorPeriodo(transacoesSemana, 'dia')
      },
      mes: {
        vendasPorCategoria: calcularVendasPorCategoria(transacoesMes),
        vendasPorProduto: calcularVendasPorProduto(transacoesMes),
        despesasPorCategoria: calcularDespesasPorCategoria(transacoesMes),
        produtosPorSemana: calcularProdutosPorPeriodo(transacoesMes, 'semana')
      },
      trimestre: {
        vendasPorCategoria: calcularVendasPorCategoria(transacoesTrimestre),
        vendasPorProduto: calcularVendasPorProduto(transacoesTrimestre),
        despesasPorCategoria: calcularDespesasPorCategoria(transacoesTrimestre),
        produtosPorMes: calcularProdutosPorPeriodo(transacoesTrimestre, 'semana')
      },
      ano: {
        vendasPorCategoria: calcularVendasPorCategoria(transacoesAno),
        vendasPorProduto: calcularVendasPorProduto(transacoesAno),
        despesasPorCategoria: calcularDespesasPorCategoria(transacoesAno),
        produtosPorTrimestre: calcularProdutosPorPeriodo(transacoesAno, 'semana')
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
          <div className="flex gap-3">
            <button
              onClick={abrirModalSelecaoPeriodo}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <Download className="h-5 w-5" />
              Exportar PDF
            </button>
            <button
              onClick={() => alert("Ferramenta em construção")}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <Plus className="h-5 w-5" />
              Novo Relatório
            </button>
          </div>
        </div>

        {/* Seção Semana */}
        {renderSecaoRelatorio('Relatório Semanal', dadosReais.semana, 'Semana')}
        
        {/* Seção Mês */}
        {renderSecaoRelatorio('Relatório Mensal', dadosReais.mes, 'Mês')}
        
        {/* Seção Trimestre */}
        {renderSecaoRelatorio('Relatório Trimestral', dadosReais.trimestre, 'Trimestre')}
        
        {/* Seção Ano */}
        {renderSecaoRelatorio('Relatório Anual', dadosReais.ano, 'Ano')}
      </div>
    )
  }

  // Função para exportar dados do mês selecionado em PDF
  const exportarMetasPDF = async () => {
    try {
      const mesSelecionado = mesesMetas.find(mes => mes.indice === selectedMonth)
      if (!mesSelecionado) {
        alert('Mês selecionado não encontrado!')
        return
      }

      // Criar elemento temporário para capturar o conteúdo
      const tempElement = document.createElement('div')
      tempElement.style.position = 'absolute'
      tempElement.style.left = '-9999px'
      tempElement.style.top = '-9999px'
      tempElement.style.width = '800px'
      tempElement.style.backgroundColor = 'white'
      tempElement.style.padding = '20px'
      tempElement.style.fontFamily = 'Arial, sans-serif'
      
      // Obter dados REAIS do mês selecionado usando a mesma lógica de renderMonthContent
      const monthIndex = selectedMonth
      const currentYear = 2025
      
      // Filtrar transações do mês selecionado
      const transacoesDoMes = transactions.filter(t => {
        const transactionDate = new Date(t.date)
        return transactionDate.getMonth() === monthIndex && transactionDate.getFullYear() === currentYear
      })
      
      const totalReceitas = transacoesDoMes.filter(t => t.type === 'Receita').reduce((sum, t) => sum + t.value, 0)
      const totalDespesas = transacoesDoMes.filter(t => t.type === 'Despesa').reduce((sum, t) => sum + t.value, 0)
      
      // Meta de faturamento = meta do mês selecionado
      const metaFaturamento = mesSelecionado.meta
      
      // Resultado financeiro
      const resultadoFinanceiro = totalReceitas - totalDespesas
      
      // Criar HTML do relatório com dados REAIS
      tempElement.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: bold;">ALYA VELAS</h1>
          <h2 style="color: #374151; font-size: 24px; margin: 10px 0; font-weight: bold;">Relatório de Metas - ${mesSelecionado.nome} 2025</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="color: #f59e0b; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #f59e0b; padding-bottom: 5px;">📊 Resumo Executivo</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div style="background: #fffbeb; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <div style="font-weight: bold; color: #f59e0b; margin-bottom: 5px;">Meta de Faturamento</div>
              <div style="font-size: 18px; font-weight: bold; color: #d97706;">R$ ${metaFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
              <div style="font-weight: bold; color: #10b981; margin-bottom: 5px;">Faturamento Realizado</div>
              <div style="font-size: 18px; font-weight: bold; color: #059669;">R$ ${totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
              <div style="font-weight: bold; color: #ef4444; margin-bottom: 5px;">Total de Despesas</div>
              <div style="font-size: 18px; font-weight: bold; color: #dc2626;">R$ ${totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div style="background: ${resultadoFinanceiro >= 0 ? '#f0fdf4' : '#fef2f2'}; padding: 15px; border-radius: 8px; border-left: 4px solid ${resultadoFinanceiro >= 0 ? '#10b981' : '#ef4444'};">
              <div style="font-weight: bold; color: ${resultadoFinanceiro >= 0 ? '#10b981' : '#ef4444'}; margin-bottom: 5px;">Resultado Financeiro</div>
              <div style="font-size: 18px; font-weight: bold; color: ${resultadoFinanceiro >= 0 ? '#059669' : '#dc2626'};">R$ ${resultadoFinanceiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="color: #f59e0b; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #f59e0b; padding-bottom: 5px;">📈 Análise de Performance</h3>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="margin-bottom: 15px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="font-weight: bold;">Meta vs Realizado:</span>
                <span style="font-weight: bold; color: ${totalReceitas >= metaFaturamento ? '#10b981' : '#ef4444'};">${totalReceitas >= metaFaturamento ? '✅ Meta Atingida' : '❌ Meta Não Atingida'}</span>
              </div>
              <div style="background: #e2e8f0; height: 20px; border-radius: 10px; overflow: hidden;">
                <div style="background: ${totalReceitas >= metaFaturamento ? '#10b981' : '#ef4444'}; height: 100%; width: ${metaFaturamento > 0 ? Math.min((totalReceitas / metaFaturamento) * 100, 100) : 0}%; transition: width 0.3s ease;"></div>
              </div>
              <div style="text-align: center; margin-top: 5px; font-size: 14px; color: #6b7280;">
                ${metaFaturamento > 0 ? ((totalReceitas / metaFaturamento) * 100).toFixed(1) : 0}% da meta
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
              <div>
                <div style="font-weight: bold; color: #374151; margin-bottom: 5px;">Diferença da Meta:</div>
                <div style="font-size: 16px; color: ${totalReceitas >= metaFaturamento ? '#10b981' : '#ef4444'}; font-weight: bold;">
                  R$ ${(totalReceitas - metaFaturamento).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div style="font-weight: bold; color: #374151; margin-bottom: 5px;">Margem de Lucro:</div>
                <div style="font-size: 16px; color: ${resultadoFinanceiro >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">
                  ${totalReceitas > 0 ? ((resultadoFinanceiro / totalReceitas) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="color: #f59e0b; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #f59e0b; padding-bottom: 5px;">📋 Dados de Transações Reais</h3>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <div style="font-weight: bold; color: #374151; margin-bottom: 5px;">Total de Transações:</div>
                <div style="font-size: 16px; color: #f59e0b; font-weight: bold;">${transacoesDoMes.length} transações</div>
              </div>
              <div>
                <div style="font-weight: bold; color: #374151; margin-bottom: 5px;">Receitas Reais:</div>
                <div style="font-size: 16px; color: #10b981; font-weight: bold;">R$ ${totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div>
                <div style="font-weight: bold; color: #374151; margin-bottom: 5px;">Despesas Reais:</div>
                <div style="font-size: 16px; color: #ef4444; font-weight: bold;">R$ ${totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div>
                <div style="font-weight: bold; color: #374151; margin-bottom: 5px;">Meta de Faturamento:</div>
                <div style="font-size: 16px; color: #f59e0b; font-weight: bold;">R$ ${metaFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            Relatório gerado automaticamente pelo sistema Alya Velas<br>
            Dados baseados em metas e transações reais do mês<br>
            Para mais informações, acesse o painel administrativo
          </p>
        </div>
      `
      
      document.body.appendChild(tempElement)
      
      // Capturar o elemento como imagem
      const canvas = await html2canvas(tempElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })
      
      // Remover elemento temporário
      document.body.removeChild(tempElement)
      
      // Criar PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      
      let position = 0
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }
      
      // Salvar PDF
      const fileName = `Metas_${mesSelecionado.nome}_2025_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)
      
      alert(`✅ Relatório PDF exportado com sucesso!\nArquivo: ${fileName}\n\n📊 Dados incluídos:\n• Meta de Faturamento: R$ ${metaFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n• Faturamento Realizado: R$ ${totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n• Total de Despesas: R$ ${totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n• Resultado Financeiro: R$ ${resultadoFinanceiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
      
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      alert('❌ Erro ao exportar PDF. Tente novamente.')
    }
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
          <div className="flex gap-3">
            <button
              onClick={exportarMetasPDF}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <Download className="h-5 w-5" />
              Exportar PDF
            </button>
            <button
              onClick={() => alert("Ferramenta em construção")}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <Plus className="h-5 w-5" />
              Nova Meta
            </button>
          </div>
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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-lg border border-amber-200">
                <Users className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">{user?.username}</span>
                <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="fixed top-[76px] left-0 right-0 z-40 bg-white/90 backdrop-blur-sm shadow-sm border-b border-amber-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center overflow-x-auto scrollbar-hide">
            <div className="flex items-center space-x-2 min-w-max">
              {(() => {
                // const visibleModules = getVisibleModules(); // Reservado para uso futuro
                const allTabs = [
                  { id: 'dashboard', name: 'Dashboard', icon: Home, key: 'dashboard' },
                  { id: 'metas', name: 'Metas', icon: TrendingUp, key: 'metas' },
                  { id: 'reports', name: 'Relatórios', icon: BarChart3, key: 'reports' },
                  { id: 'transactions', name: 'Transações', icon: DollarSign, key: 'transactions' },
                  { id: 'products', name: 'Produtos', icon: Package, key: 'products' },
                  { id: 'clients', name: 'Clientes', icon: Users, key: 'clients' }
                ];
                
                // Filtrar abas baseado nos módulos visíveis
                const filteredTabs = allTabs.filter(tab => {
                  // Se não há módulos definidos ou usuário é admin, mostrar todos
                  if (!user?.modules || user.modules.length === 0 || user.role === 'admin') {
                    return true;
                  }
                  // Caso contrário, mostrar apenas módulos na lista do usuário
                  return user.modules.includes(tab.key);
                });
                
                // Adicionar aba Admin se o usuário for admin
                if (user?.role === 'admin') {
                  filteredTabs.push({ id: 'admin', name: 'Admin', icon: Shield, key: 'admin' });
                }
                
                return filteredTabs.map(tab => {
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
                })
              })()}
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
        {activeTab === 'clients' && <Clients />}
        {activeTab === 'admin' && (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-gray-500">Carregando painel administrativo...</div></div>}>
            <AdminPanel />
          </Suspense>
        )}
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
                      const response = await fetch(`${API_BASE_URL}/modelo/${importExportType}`)
                      
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
                onClick={async () => {
                  try {
                    setIsUploading(true)
                    
                    // Preparar dados para exportação
                    const dataToExport = importExportType === 'transactions' ? transactions : products
                    
                    if (dataToExport.length === 0) {
                      alert(`Nenhuma ${importExportType === 'transactions' ? 'transação' : 'produto'} encontrada para exportar!`)
                      return
                    }
                    
                    // Chamar API de exportação
                    const response = await fetch(`${API_BASE_URL}/export`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        type: importExportType,
                        data: dataToExport
                      })
                    })
                    
                    if (response.ok) {
                      // Baixar arquivo
                      const blob = await response.blob()
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `${importExportType === 'transactions' ? 'transacoes' : 'produtos'}_${new Date().toISOString().split('T')[0]}.xlsx`
                      document.body.appendChild(a)
                      a.click()
                      window.URL.revokeObjectURL(url)
                      document.body.removeChild(a)
                      
                      alert(`Arquivo ${importExportType === 'transactions' ? 'de transações' : 'de produtos'} exportado com sucesso!`)
                    } else {
                      const error = await response.text()
                      console.error('Erro do servidor:', error)
                      alert(`Erro ao exportar arquivo: ${error}`)
                    }
                  } catch (error) {
                    console.error('Erro ao exportar:', error)
                    alert(`Erro ao exportar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
                  } finally {
                    setIsUploading(false)
                  }
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
                        const headers: HeadersInit = {};
                        if (token) {
                          headers['Authorization'] = `Bearer ${token}`;
                        }
                        const response = await fetch(`${API_BASE_URL}/import`, {
                          method: 'POST',
                          headers,
                          body: formData
                        })
                        
                        if (response.ok) {
                          const result = await response.json()
                          console.log('Resposta do servidor:', result)
                          
                          // Atualizar os dados no frontend baseado na resposta
                          if (importExportType === 'transactions' && result.data) {
                            // Salvar cada transação no banco de dados
                            for (const transactionData of result.data) {
                              try {
                                const savedTransaction = await saveTransaction({
                                  date: transactionData.date,
                                  description: transactionData.description,
                                  value: transactionData.value,
                                  type: transactionData.type,
                                  category: transactionData.category
                                })
                                if (savedTransaction) {
                                  setTransactions(prev => [...prev, savedTransaction])
                                }
                              } catch (error) {
                                console.error('Erro ao salvar transação:', error)
                              }
                            }
                          } else if (importExportType === 'products' && result.data) {
                            // Salvar cada produto no banco de dados
                            for (const productData of result.data) {
                              try {
                                const savedProduct = await saveProduct({
                                  name: productData.name,
                                  category: productData.category,
                                  price: productData.price,
                                  cost: productData.cost,
                                  stock: productData.stock,
                                  sold: productData.sold
                                })
                                if (savedProduct) {
                                  setProducts(prev => [...prev, savedProduct])
                                }
                              } catch (error) {
                                console.error('Erro ao salvar produto:', error)
                              }
                            }
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

      {/* Modal de Seleção de Período para Exportar Relatórios */}
      {isPeriodoExportModalOpen && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsPeriodoExportModalOpen(false)
            }
          }}
        >
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200/50">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-amber-200/50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2">
                  <Download className="w-6 h-6 text-amber-700" />
                  Exportar Relatório PDF
                </h2>
                <button
                  onClick={() => setIsPeriodoExportModalOpen(false)}
                  className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 p-2 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="space-y-4">
              <p className="text-gray-700 text-center mb-6">
                Selecione o período que deseja exportar:
              </p>
              
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => exportarRelatoriosPDF('Semana')}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border-2 border-amber-200 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <span className="font-semibold text-gray-800">Semana</span>
                  </div>
                  <ArrowUpCircle className="w-5 h-5 text-amber-600" />
                </button>

                <button
                  onClick={() => exportarRelatoriosPDF('Mês')}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border-2 border-amber-200 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <span className="font-semibold text-gray-800">Mês</span>
                  </div>
                  <ArrowUpCircle className="w-5 h-5 text-amber-600" />
                </button>

                <button
                  onClick={() => exportarRelatoriosPDF('Trimestre')}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border-2 border-amber-200 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <span className="font-semibold text-gray-800">Trimestre</span>
                  </div>
                  <ArrowUpCircle className="w-5 h-5 text-amber-600" />
                </button>

                <button
                  onClick={() => exportarRelatoriosPDF('Ano')}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border-2 border-amber-200 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <span className="font-semibold text-gray-800">Ano</span>
                  </div>
                  <ArrowUpCircle className="w-5 h-5 text-amber-600" />
                </button>

                <button
                  onClick={() => exportarRelatoriosPDF('Todos')}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-2 border-amber-400 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg font-semibold"
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5" />
                    <span>Todos os Períodos</span>
                  </div>
                  <ArrowUpCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setIsPeriodoExportModalOpen(false)}
                  className="w-full py-2 px-4 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuração de Exportação de Transações */}
      {isExportTransacoesModalOpen && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsExportTransacoesModalOpen(false)
            }
          }}
        >
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200/50">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-amber-200/50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2">
                  <Download className="w-6 h-6 text-amber-700" />
                  Exportar Transações em PDF
                </h2>
                <button
                  onClick={() => setIsExportTransacoesModalOpen(false)}
                  className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 p-2 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="space-y-6">
              <p className="text-gray-700 text-sm">
                Configure as opções de exportação:
              </p>
              
              {/* Opção: Exportar Filtradas */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <input
                  type="checkbox"
                  id="exportarFiltradas"
                  checked={exportarFiltradas}
                  onChange={(e) => setExportarFiltradas(e.target.checked)}
                  className="mt-1 w-5 h-5 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                />
                <div className="flex-1">
                  <label htmlFor="exportarFiltradas" className="font-semibold text-gray-800 cursor-pointer block mb-1">
                    Exportar apenas transações filtradas
                  </label>
                  <p className="text-sm text-gray-600">
                    {exportarFiltradas 
                      ? 'Serão exportadas apenas as transações que estão visíveis na lista (com filtros aplicados).'
                      : 'Todas as transações serão exportadas, independente dos filtros ativos.'}
                  </p>
                </div>
              </div>

              {/* Opção: Incluir Resumo */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <input
                  type="checkbox"
                  id="incluirResumo"
                  checked={incluirResumo}
                  onChange={(e) => setIncluirResumo(e.target.checked)}
                  className="mt-1 w-5 h-5 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                />
                <div className="flex-1">
                  <label htmlFor="incluirResumo" className="font-semibold text-gray-800 cursor-pointer block mb-1">
                    Incluir resumo financeiro
                  </label>
                  <p className="text-sm text-gray-600">
                    {incluirResumo 
                      ? 'O PDF incluirá um resumo com totais de receitas, despesas, saldo e quantidade de transações.'
                      : 'Apenas a tabela de transações será incluída no PDF.'}
                  </p>
                </div>
              </div>

              {/* Informações sobre filtros ativos */}
              {(transactionFilters.type || transactionFilters.category || transactionFilters.dateFrom || transactionFilters.dateTo) && exportarFiltradas && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm font-semibold text-blue-800 mb-2">Filtros ativos:</p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {transactionFilters.type && <li>• Tipo: {transactionFilters.type}</li>}
                    {transactionFilters.category && <li>• Categoria: {transactionFilters.category}</li>}
                    {transactionFilters.dateFrom && <li>• Data início: {new Date(transactionFilters.dateFrom).toLocaleDateString('pt-BR')}</li>}
                    {transactionFilters.dateTo && <li>• Data fim: {new Date(transactionFilters.dateTo).toLocaleDateString('pt-BR')}</li>}
                  </ul>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setIsExportTransacoesModalOpen(false)}
                  className="flex-1 py-2 px-4 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={exportarTransacoesPDF}
                  className="flex-1 py-2 px-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Exportar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuração de Exportação de Produtos */}
      {isExportProdutosModalOpen && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsExportProdutosModalOpen(false)
            }
          }}
        >
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200/50">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-amber-200/50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2">
                  <Download className="w-6 h-6 text-amber-700" />
                  Exportar Produtos em PDF
                </h2>
                <button
                  onClick={() => setIsExportProdutosModalOpen(false)}
                  className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 p-2 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="space-y-6">
              <p className="text-gray-700 text-sm">
                Configure as opções de exportação:
              </p>
              
              {/* Opção: Exportar Filtrados */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <input
                  type="checkbox"
                  id="exportarFiltrados"
                  checked={exportarFiltrados}
                  onChange={(e) => setExportarFiltrados(e.target.checked)}
                  className="mt-1 w-5 h-5 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                />
                <div className="flex-1">
                  <label htmlFor="exportarFiltrados" className="font-semibold text-gray-800 cursor-pointer block mb-1">
                    Exportar apenas produtos filtrados
                  </label>
                  <p className="text-sm text-gray-600">
                    {exportarFiltrados 
                      ? 'Serão exportados apenas os produtos que estão visíveis na lista (com filtros aplicados).'
                      : 'Todos os produtos serão exportados, independente dos filtros ativos.'}
                  </p>
                </div>
              </div>

              {/* Opção: Incluir Resumo */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <input
                  type="checkbox"
                  id="incluirResumoProdutos"
                  checked={incluirResumoProdutos}
                  onChange={(e) => setIncluirResumoProdutos(e.target.checked)}
                  className="mt-1 w-5 h-5 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                />
                <div className="flex-1">
                  <label htmlFor="incluirResumoProdutos" className="font-semibold text-gray-800 cursor-pointer block mb-1">
                    Incluir resumo estatístico
                  </label>
                  <p className="text-sm text-gray-600">
                    {incluirResumoProdutos 
                      ? 'O PDF incluirá um resumo com totais de estoque, custos, lucro potencial, margem média e distribuição por categoria.'
                      : 'Apenas a tabela de produtos será incluída no PDF.'}
                  </p>
                </div>
              </div>

              {/* Informações sobre filtros ativos */}
              {(productFilters.category || productFilters.stockFilter || productFilters.soldFilter || productFilters.costFilter) && exportarFiltrados && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm font-semibold text-blue-800 mb-2">Filtros ativos:</p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {productFilters.category && <li>• Categoria: {productFilters.category}</li>}
                    {productFilters.stockFilter === 'inStock' && <li>• Em estoque</li>}
                    {productFilters.stockFilter === 'outOfStock' && <li>• Sem estoque</li>}
                    {productFilters.soldFilter === 'sold' && <li>• Vendidos</li>}
                    {productFilters.soldFilter === 'notSold' && <li>• Não vendidos</li>}
                    {productFilters.costFilter === 'withCost' && <li>• Com preço de custo</li>}
                    {productFilters.costFilter === 'withoutCost' && <li>• Sem preço de custo</li>}
                  </ul>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setIsExportProdutosModalOpen(false)}
                  className="flex-1 py-2 px-4 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={exportarProdutosPDF}
                  className="flex-1 py-2 px-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Exportar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente principal que envolve AppContent com AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App
