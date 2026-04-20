import React, { useState, useEffect, Suspense, lazy, useMemo, useRef, useCallback } from "react";
import {
  Home,
  DollarSign,
  Package,
  BarChart3,
  Calculator,
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
  Shield,
  Phone,
  Mail,
  Map,
  Lock,
  Activity,
  Bell,
  Globe,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  Clock,
  Award,
  Wallet,
  Sparkles,
  ShoppingBag,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import Clients from "./components/Clients";
import DRE from "./components/DRE";
import Login from "./components/Login";
import MenuUsuario from "./components/MenuUsuario";
import ImpersonationBanner from "./components/ImpersonationBanner";
import FeedbackButton from "./components/FeedbackButton";
import ThemeToggle from "./components/ThemeToggle";
import { ThemeProvider } from "./contexts/ThemeContext";
// Lazy load AdminPanel (só carrega quando necessário)
const AdminPanel = lazy(() => import("./components/AdminPanel"));
// Lazy load Projeção (componente grande)
const Projection = lazy(() => import("./components/Projection"));
// Lazy load integração Nuvemshop
const NuvemshopIntegration = lazy(() => import("./components/Nuvemshop"));
// Lazy load páginas de segurança
const ActiveSessions = lazy(() => import("./pages/ActiveSessions"));
const AnomalyDashboard = lazy(() => import("./pages/admin/AnomalyDashboard"));
const SecurityAlerts = lazy(() => import("./pages/admin/SecurityAlerts"));
// Lazy load Roadmap
const Roadmap = lazy(() => import("./components/Roadmap"));
// Lazy load FAQ
const FAQ = lazy(() => import("./components/FAQ"));
// Lazy load Documentação
const Documentation = lazy(() => import("./components/Documentation"));
import Footer from "./components/Footer";
import CommitVersionModal from "./components/CommitVersionModal";
import VersaoNovaModal from "./components/VersaoNovaModal";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useTheme } from "./contexts/ThemeContext";
import { useModules } from "./hooks/useModules";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { API_BASE_URL } from "./config/api";
import { parseLocalDate, formatDatePtBR } from "./utils/dateUtils";
// Importar Axios Interceptor para inicializar refresh automático
import "./utils/axiosInterceptor";

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
  Legend,
  LineChart,
  Line,
  LabelList,
  ReferenceLine,
} from "recharts";

interface NewTransaction {
  id: string;
  date: string;
  description: string;
  value: number;
  type: "Receita" | "Despesa";
  category: string;
  createdAt: Date;
}

interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  sold: number;
  category: string;
}

interface Meta {
  id: string;
  descricao: string;
  valor: number;
  tipo: "receita" | "despesa" | "lucro" | "vendas";
  categoria?: string;
  dataInicio: string;
  dataFim: string;
  periodo: string;
  status: "ativa" | "pausada" | "concluida";
}

type MesMeta = { nome: string; indice: number; meta: number };

// Metas padrão (fallback). As metas efetivas podem ser derivadas da Projeção.
const MESES_METAS_BASE: MesMeta[] = [
  { nome: "JANEIRO", indice: 0, meta: 18500.0 },
  { nome: "FEVEREIRO", indice: 1, meta: 19200.0 },
  { nome: "MARÇO", indice: 2, meta: 20100.0 },
  { nome: "ABRIL", indice: 3, meta: 19800.0 },
  { nome: "MAIO", indice: 4, meta: 20500.0 },
  { nome: "JUNHO", indice: 5, meta: 21000.0 },
  { nome: "JULHO", indice: 6, meta: 21500.0 },
  { nome: "AGOSTO", indice: 7, meta: 22000.0 },
  { nome: "SETEMBRO", indice: 8, meta: 21889.17 },
  { nome: "OUTUBRO", indice: 9, meta: 23000.0 },
  { nome: "NOVEMBRO", indice: 10, meta: 25000.0 },
  { nome: "DEZEMBRO", indice: 11, meta: 28000.0 },
];

type TabType =
  | "dashboard"
  | "transactions"
  | "products"
  | "reports"
  | "metas"
  | "clients"
  | "projecao"
  | "admin"
  | "dre"
  | "activeSessions"
  | "anomalies"
  | "securityAlerts"
  | "nuvemshop"
  | "roadmap"
  | "faq"
  | "documentacao";

// Componente principal do conteúdo da aplicação
const AppContent: React.FC = () => {
  const { user, token, logout, isLoading } = useAuth();
  const { isDark } = useTheme();
  const { getVisibleModules } = useModules();

  // Detectar se está em modo demo
  // Modo demo é ativado APENAS quando:
  // 1. A variável de ambiente VITE_DEMO_MODE está definida como 'true'
  // 2. OU quando o hostname contém 'demo', 'github.io' ou é 'alya.fercarvalho.com'
  // Em produção normal (alya.sistemas.viverdepj.com.br), NÃO é modo demo
  const isDemoMode =
    typeof window !== "undefined" &&
    (import.meta.env.VITE_DEMO_MODE === "true" ||
      window.location.hostname === "alya.fercarvalho.com" ||
      window.location.hostname.includes("github.io") ||
      window.location.hostname.includes("demo") ||
      window.location.hostname.includes("demo."));

  // Função auxiliar para usar storage correto
  // Em produção, sempre usa localStorage (dados persistentes)
  // Em modo demo, usa sessionStorage (dados temporários)
  const getStorage = () => (isDemoMode ? sessionStorage : localStorage);

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
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/transactions`, { headers });
    if (response.status === 401 || response.status === 403) {
      logout();
      return [];
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }
    const result = await response.json();
    return result.success ? result.data : [];
  };

  const saveTransaction = async (transaction: any) => {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/transactions`, {
      method: "POST",
      headers,
      body: JSON.stringify(transaction),
    });
    if (response.status === 401 || response.status === 403) {
      logout();
      return null;
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }
    const result = await response.json();
    return result.success ? result.data : null;
  };

  const updateTransaction = async (id: string, transaction: any) => {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(transaction),
    });
    if (response.status === 401 || response.status === 403) {
      logout();
      return null;
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }
    const result = await response.json();
    return result.success ? result.data : null;
  };

  const deleteTransaction = async (id: string) => {
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: "DELETE",
      headers,
    });
    if (response.status === 401 || response.status === 403) {
      logout();
      return false;
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }
    const result = await response.json();
    return result.success;
  };

  const deleteMultipleTransactions = async (ids: string[]) => {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/transactions`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ ids }),
    });
    if (response.status === 401 || response.status === 403) {
      logout();
      return false;
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }
    const result = await response.json();
    return result.success;
  };

  // Funções para Produtos
  const fetchProducts = async () => {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/products`, { headers });
    if (response.status === 401 || response.status === 403) {
      logout();
      return [];
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }
    const result = await response.json();
    return result.success ? result.data : [];
  };

  // Funções para Projeção (snapshot consolidado)
  const fetchProjectionSnapshot = async () => {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/projection`, { headers });
    if (response.status === 401 || response.status === 403) {
      // 401: token inválido/expirado -> logout
      // 403: pode ser permissão (ex.: módulo não liberado) -> não deslogar; apenas tratar como indisponível
      if (response.status === 401) {
        logout();
      }
      return null;
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }
    const result = await response.json();
    return result.success ? result.data : null;
  };

  const saveProduct = async (product: any) => {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: "POST",
      headers,
      body: JSON.stringify(product),
    });
    if (response.status === 401 || response.status === 403) {
      logout();
      return null;
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }
    const result = await response.json();
    return result.success ? result.data : null;
  };

  const updateProduct = async (id: string, product: any) => {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(product),
    });
    if (response.status === 401 || response.status === 403) {
      logout();
      return null;
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }
    const result = await response.json();
    return result.success ? result.data : null;
  };

  const deleteProduct = async (id: string) => {
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: "DELETE",
      headers,
    });
    if (response.status === 401 || response.status === 403) {
      logout();
      return false;
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }
    const result = await response.json();
    return result.success;
  };

  const deleteMultipleProducts = async (ids: string[]) => {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ ids }),
    });
    if (response.status === 401 || response.status === 403) {
      logout();
      return false;
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }
    const result = await response.json();
    return result.success;
  };

  // ⚠️ IMPORTANTE: Todos os hooks devem ser declarados ANTES de qualquer return condicional
  // Estados principais
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [projectionSnapshot, setProjectionSnapshot] = useState<any>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set(),
  );
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(
    new Set(),
  );

  // Metas derivadas diretamente da Projeção (cenário "Previsto" do faturamento total).
  // Fallback: MESES_METAS_BASE (quando projeção ainda não existe ou não carregou).
  const mesesMetas = useMemo<MesMeta[]>(() => {
    const arr = projectionSnapshot?.revenueTotals?.previsto;
    if (Array.isArray(arr) && arr.length >= 12) {
      return MESES_METAS_BASE.map((m) => ({
        ...m,
        meta: Number(arr[m.indice] ?? 0),
      }));
    }
    return MESES_METAS_BASE;
  }, [projectionSnapshot]);

  // Estados dos modais
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Estados do formulário de produto
  const [productForm, setProductForm] = useState({
    name: "",
    category: "",
    price: "",
    cost: "",
    stock: "",
    sold: "",
  });
  const [productFormErrors, setProductFormErrors] = useState({
    name: false,
    category: false,
    price: false,
    cost: false,
    stock: false,
    sold: false,
  });

  // Estados das transações
  const [transactions, setTransactions] = useState<NewTransaction[]>([]);

  // Estados do formulário de transação
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<NewTransaction | null>(null);

  // Estados do modal de importar/exportar
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [importExportType, setImportExportType] = useState<
    "transactions" | "products"
  >("transactions");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Estados do modal de importar extrato / fatura
  const [isImportExtratoModalOpen, setIsImportExtratoModalOpen] = useState(false);
  const [importType, setImportType] = useState<'extrato' | 'fatura' | null>(null);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [extratoStep, setExtratoStep] = useState<0 | 1 | 2 | 3>(0);
  const [extratoFile, setExtratoFile] = useState<File | null>(null);
  const [extratoPassword, setExtratoPassword] = useState('');
  const [isUploadingExtrato, setIsUploadingExtrato] = useState(false);
  // Preview sandbox
  type PreviewTx = { _id: string; date: string; description: string; value: number; type: 'Receita' | 'Despesa'; category: string; };
  const [extratoPreview, setExtratoPreview] = useState<PreviewTx[]>([]);
  const [isConfirmingImport, setIsConfirmingImport] = useState(false);
  // Undo system
  const [lastImportBatch, setLastImportBatch] = useState<string[]>([]);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [undoCountdown, setUndoCountdown] = useState(15);
  const [isUndoing, setIsUndoing] = useState(false);

  // Estado do modal de seleção de período para exportar relatórios
  const [isPeriodoExportModalOpen, setIsPeriodoExportModalOpen] =
    useState(false);

  // Estados do modal de exportação de transações
  const [isExportTransacoesModalOpen, setIsExportTransacoesModalOpen] =
    useState(false);
  const [exportarFiltradas, setExportarFiltradas] = useState(true);
  const [incluirResumo, setIncluirResumo] = useState(true);

  // Estados do modal de exportação de produtos
  const [isExportProdutosModalOpen, setIsExportProdutosModalOpen] =
    useState(false);
  const [exportarFiltrados, setExportarFiltrados] = useState(true);
  const [incluirResumoProdutos, setIncluirResumoProdutos] = useState(true);

  // Estado de geração de PDF (desabilita botões durante geração)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Refs para estado indeterminate nos Select All checkboxes
  const selectAllTransactionsRef = useRef<HTMLInputElement>(null);
  const selectAllProductsRef = useRef<HTMLInputElement>(null);
  const [transactionForm, setTransactionForm] = useState({
    date: new Date().toISOString().split("T")[0], // Data atual por padrão
    description: "",
    value: "",
    type: "Receita",
    category: "",
  });
  const [transactionFormErrors, setTransactionFormErrors] = useState({
    date: false,
    description: false,
    value: false,
    type: false,
    category: false,
  });

  // Estados do calendário personalizado
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Estados para calendários dos filtros
  const [isFilterCalendarFromOpen, setIsFilterCalendarFromOpen] =
    useState(false);
  const [isFilterCalendarToOpen, setIsFilterCalendarToOpen] = useState(false);
  const [filterCalendarFromDate, setFilterCalendarFromDate] =
    useState<Date | null>(null);
  const [filterCalendarToDate, setFilterCalendarToDate] = useState<Date | null>(
    null,
  );

  // Estados para ordenação (separados por aba para evitar conflito de ícones)
  const [transactionSortConfig, setTransactionSortConfig] = useState<{
    field: string | null;
    direction: "asc" | "desc";
  }>({
    field: null,
    direction: "asc",
  });
  const [productSortConfig, setProductSortConfig] = useState<{
    field: string | null;
    direction: "asc" | "desc";
  }>({
    field: null,
    direction: "asc",
  });

  // Estados para filtros
  const [transactionFilters, setTransactionFilters] = useState({
    type: "", // 'Receita', 'Despesa' ou ''
    category: "", // categoria específica ou ''
    dateFrom: "", // data início
    dateTo: "", // data fim
    hasDateFilter: false, // se está usando filtro de data
    description: "", // busca por descrição
  });

  const [productFilters, setProductFilters] = useState({
    category: "", // categoria específica ou ''
    stockFilter: "", // 'inStock', 'outOfStock', ''
    soldFilter: "", // 'sold', 'notSold', ''
    costFilter: "", // 'withCost', 'withoutCost', ''
  });

  // Estados adicionais que aparecem mais tarde no código
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth(),
  );
  const [expandedCharts, setExpandedCharts] = useState<string[]>([]);

  const [periodoRelatorio, setPeriodoRelatorio] = useState<"semana" | "mes" | "trimestre" | "ano">("mes");
  const [periodoOffset, setPeriodoOffset] = useState(0);

  // Commit pendente (superadmin)
  const [commitPendente, setCommitPendente] = useState<{
    commitHash: string;
    versaoAtual: string;
    mensagem: string;
    data: string;
  } | null>(null);

  // Notificação de nova versão (outros usuários)
  const [versaoNova, setVersaoNova] = useState<{
    versao: string;
    texto: string;
  } | null>(null);

  // ⚠️ TODOS OS useEffect DEVEM ESTAR AQUI, ANTES DOS RETURNS CONDICIONAIS

  // Carregar dados do banco de dados
  useEffect(() => {
    // Só carregar dados se o token estiver disponível
    if (!token || !user) {
      return;
    }

    let mounted = true;

    const loadData = async () => {
      try {
        const [transactionsData, productsData, projectionData] =
          await Promise.all([
            fetchTransactions(),
            fetchProducts(),
            fetchProjectionSnapshot(),
          ]);
        if (!mounted) return;
        setTransactions(transactionsData);
        setProducts(productsData);
        setProjectionSnapshot(projectionData);
      } catch (error) {
        if (!mounted) return;
        console.error("Erro ao carregar dados:", error);
      }
    };

    loadData();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  // Verificar commit pendente quando superadmin faz login
  useEffect(() => {
    if (!token || !user || user.role !== 'superadmin') return;
    let cancelled = false;

    const checkCommit = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/rodape/commit-pendente`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (json.success && json.data?.pendente && !cancelled) {
          setCommitPendente({
            commitHash: json.data.commitHash,
            versaoAtual: json.data.versaoAtual || '',
            mensagem: json.data.mensagem || '',
            data: json.data.data || '',
          });
        }
      } catch {
        // silently ignore — não crítico
      }
    };

    checkCommit();
    return () => { cancelled = true; };
  }, [token, user]);

  // Verificar notificação de nova versão (usuários não-superadmin)
  useEffect(() => {
    if (!token || !user || user.role === 'superadmin') return;
    let cancelled = false;

    const checkVersao = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/notificacao-versao`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (json.success && json.data?.notificar && !cancelled) {
          setVersaoNova({ versao: json.data.versao, texto: json.data.texto });
        }
      } catch {
        // silently ignore
      }
    };

    checkVersao();
    return () => { cancelled = true; };
  }, [token, user]);

  // Sincronizar consentimento de cookies com o banco (LGPD)
  useEffect(() => {
    if (!token || !user) return;

    const syncConsent = async () => {
      try {
        const stored = localStorage.getItem('cookieConsent');
        if (!stored) return;

        const prefs = JSON.parse(stored);

        // Buscar versões atuais dos documentos legais
        const [termosRes, politicaRes] = await Promise.all([
          fetch(`${API_BASE_URL}/termos-uso`).then(r => r.json()).catch(() => null),
          fetch(`${API_BASE_URL}/politica-privacidade`).then(r => r.json()).catch(() => null),
        ]);

        const versaoTermos = termosRes?.data?.versao ?? 1;
        const versaoPolitica = politicaRes?.data?.versao ?? 1;

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        };

        await fetch(`${API_BASE_URL}/cookie-consentimento`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            preferencias: prefs,
            versao_termos: versaoTermos,
            versao_politica: versaoPolitica,
          }),
        });
      } catch (e) {
        // Não bloquear a aplicação se a sincronização falhar
        console.error('[LGPD] Falha ao sincronizar consentimento de cookies com o servidor:', e);
      }
    };

    syncConsent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id]);

  // Atualizar snapshot da Projeção ao entrar em abas que dependem das metas.
  // (Metas é derivado diretamente do Faturamento Total da Projeção.)
  useEffect(() => {
    if (!token || !user) return;
    if (activeTab !== "metas" && activeTab !== "dashboard") return;

    let mounted = true;

    const refreshProjection = async () => {
      try {
        const projectionData = await fetchProjectionSnapshot();
        if (!mounted) return;
        setProjectionSnapshot(projectionData);
      } catch (error) {
        if (!mounted) return;
        // silenciar (Metas tem fallback)
        console.error("Erro ao atualizar projeção:", error);
      }
    };

    refreshProjection();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, token, user]);

  // Carregar dados do storage apenas se não houver dados da API
  useEffect(() => {
    // Só carregar do storage se não houver token (modo offline/desenvolvimento)
    // Em produção, os dados vêm da API
    if (!token || !user) {
      const storage = getStorage();
      const savedTransactions = storage.getItem("alya-transactions");
      const savedProducts = storage.getItem("alya-products");
      const savedMetas = storage.getItem("alya-metas");

      if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
      if (savedProducts) setProducts(JSON.parse(savedProducts));
      if (savedMetas) setMetas(JSON.parse(savedMetas));
    }
  }, [token, user]);

  // Salvar dados no storage (sessionStorage no demo, localStorage em dev)
  useEffect(() => {
    const storage = getStorage();
    if (transactions.length > 0) {
      storage.setItem("alya-transactions", JSON.stringify(transactions));
    }
  }, [transactions]);

  useEffect(() => {
    const storage = getStorage();
    if (products.length > 0) {
      storage.setItem("alya-products", JSON.stringify(products));
    }
  }, [products]);

  useEffect(() => {
    const storage = getStorage();
    if (metas.length > 0) {
      storage.setItem("alya-metas", JSON.stringify(metas));
    }
  }, [metas]);

  // Countdown do toast de desfazer importação
  useEffect(() => {
    if (!showUndoToast) return;
    if (undoCountdown <= 0) {
      setShowUndoToast(false);
      setLastImportBatch([]);
      return;
    }
    const timer = setTimeout(() => setUndoCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [showUndoToast, undoCountdown]);

  // Função para fechar modais com ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Fechar calendários dos filtros se estiverem abertos
        if (isFilterCalendarFromOpen) {
          setIsFilterCalendarFromOpen(false);
          return;
        }

        if (isFilterCalendarToOpen) {
          setIsFilterCalendarToOpen(false);
          return;
        }

        // Fechar calendário se estiver aberto
        if (isCalendarOpen) {
          setIsCalendarOpen(false);
          return;
        }

        // Fechar modal de produto se estiver aberto
        if (isProductModalOpen) {
          setIsProductModalOpen(false);
          setEditingProduct(null);
          setProductForm({
            name: "",
            category: "",
            price: "",
            cost: "",
            stock: "",
            sold: "",
          });
          setProductFormErrors({
            name: false,
            category: false,
            price: false,
            cost: false,
            stock: false,
            sold: false,
          });
          return;
        }

        // Fechar modal de transação se estiver aberto
        if (isTransactionModalOpen) {
          setIsTransactionModalOpen(false);
          setEditingTransaction(null);
          setTransactionForm({
            date: new Date().toISOString().split("T")[0],
            description: "",
            value: "",
            type: "Receita",
            category: "",
          });
          setTransactionFormErrors({
            date: false,
            description: false,
            value: false,
            type: false,
            category: false,
          });
          setIsCalendarOpen(false);
          return;
        }

        // Fechar modal de importar/exportar se estiver aberto
        if (isImportExportModalOpen) {
          setIsImportExportModalOpen(false);
          setSelectedFile(null);
          return;
        }

        // Fechar modal de importar extrato se estiver aberto
        if (isImportExtratoModalOpen) {
          setIsImportExtratoModalOpen(false);
          setImportType(null);
          setSelectedBank(null);
          setExtratoStep(0);
          setExtratoFile(null);
          setExtratoPassword('');
          return;
        }

        // Fechar modal de seleção de período para exportar relatórios
        if (isPeriodoExportModalOpen) {
          setIsPeriodoExportModalOpen(false);
          return;
        }

        // Fechar modal de exportação de transações
        if (isExportTransacoesModalOpen) {
          setIsExportTransacoesModalOpen(false);
          return;
        }

        // Fechar modal de exportação de produtos
        if (isExportProdutosModalOpen) {
          setIsExportProdutosModalOpen(false);
          return;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isFilterCalendarFromOpen,
    isFilterCalendarToOpen,
    isCalendarOpen,
    isProductModalOpen,
    isTransactionModalOpen,
    isImportExportModalOpen,
    isImportExtratoModalOpen,
    isPeriodoExportModalOpen,
    isExportTransacoesModalOpen,
    isExportProdutosModalOpen,
  ]);

  // Fechar modais ao mudar de guia
  useEffect(() => {
    // Fechar modal de produto se estiver aberto
    if (isProductModalOpen) {
      setIsProductModalOpen(false);
      setEditingProduct(null);
      setProductForm({
        name: "",
        category: "",
        price: "",
        cost: "",
        stock: "",
        sold: "",
      });
      setProductFormErrors({
        name: false,
        category: false,
        price: false,
        cost: false,
        stock: false,
        sold: false,
      });
    }

    // Fechar modal de transação se estiver aberto
    if (isTransactionModalOpen) {
      setIsTransactionModalOpen(false);
      setEditingTransaction(null);
      setTransactionForm({
        date: new Date().toISOString().split("T")[0],
        description: "",
        value: "",
        type: "Receita",
        category: "",
      });
      setTransactionFormErrors({
        date: false,
        description: false,
        value: false,
        type: false,
        category: false,
      });
      setIsCalendarOpen(false);
    }

    // Fechar modal de importar extrato se estiver aberto
    if (isImportExtratoModalOpen) {
      setIsImportExtratoModalOpen(false);
      setSelectedBank(null);
      setExtratoStep(1);
      setExtratoFile(null);
    }

    // Limpar seleções ao trocar de aba para evitar exclusões acidentais
    setSelectedTransactions(new Set());
    setSelectedProducts(new Set());
  }, [activeTab]);

  // Resetar aba ao mudar de usuário (impersonação)
  useEffect(() => {
    const handler = () => setActiveTab("dashboard");
    window.addEventListener("auth:impersonation-changed", handler);
    return () => window.removeEventListener("auth:impersonation-changed", handler);
  }, []);

  // Navegação interna via evento customizado (ex: componente Nuvemshop → Transações)
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent<{ tab: string }>).detail?.tab;
      if (tab) { setActiveTab(tab as TabType); window.scrollTo({ top: 0, behavior: "instant" }); }
    };
    window.addEventListener("alya:navigate", handler);
    return () => window.removeEventListener("alya:navigate", handler);
  }, []);


  // Indeterminate nos Select All checkboxes (guard: só executa quando logado)
  useEffect(() => {
    if (isLoading || !user) return;
    const el = selectAllTransactionsRef.current;
    if (!el) return;
    const filtered = getFilteredAndSortedTransactions();
    const someSelected = filtered.some((t) => selectedTransactions.has(t.id));
    const allSelected = filtered.length > 0 && filtered.every((t) => selectedTransactions.has(t.id));
    el.indeterminate = someSelected && !allSelected;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTransactions, transactions, transactionFilters, transactionSortConfig, isLoading, user]);

  useEffect(() => {
    if (isLoading || !user) return;
    const el = selectAllProductsRef.current;
    if (!el) return;
    const filtered = getFilteredAndSortedProducts();
    const someSelected = filtered.some((p) => selectedProducts.has(p.id));
    const allSelected = filtered.length > 0 && filtered.every((p) => selectedProducts.has(p.id));
    el.indeterminate = someSelected && !allSelected;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProducts, products, productFilters, productSortConfig, isLoading, user]);

  // ⚠️ AGORA SIM: Verificações de autenticação DEPOIS de todos os hooks
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <ThemeToggle />
        <Login />
      </>
    );
  }

  // Funções para gerenciar o calendário personalizado
  const formatDateToInput = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const formatDateToDisplay = (dateString: string) =>
    formatDatePtBR(dateString);

  const handleDateSelect = (date: Date) => {
    setTransactionForm((prev) => ({
      ...prev,
      date: formatDateToInput(date),
    }));
    setCalendarDate(date);
    setIsCalendarOpen(false);

    // Limpar erro do campo quando uma data for selecionada
    setTransactionFormErrors((prev) => ({
      ...prev,
      date: false,
    }));
  };

  const handleCalendarToggle = () => {
    setIsCalendarOpen(!isCalendarOpen);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCalendarDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    const today = new Date();
    setCalendarDate(today);
    handleDateSelect(today);
  };

  const clearDate = () => {
    setTransactionForm((prev) => ({
      ...prev,
      date: "",
    }));
    setIsCalendarOpen(false);
  };

  // Funções para calendários dos filtros
  const handleFilterDateFromSelect = (date: Date) => {
    setTransactionFilters((prev) => ({
      ...prev,
      dateFrom: formatDateToInput(date),
    }));
    setFilterCalendarFromDate(date);
    setIsFilterCalendarFromOpen(false);
  };

  const handleFilterDateToSelect = (date: Date) => {
    setTransactionFilters((prev) => ({
      ...prev,
      dateTo: formatDateToInput(date),
    }));
    setFilterCalendarToDate(date);
    setIsFilterCalendarToOpen(false);
  };

  const handleFilterCalendarFromToggle = () => {
    setIsFilterCalendarFromOpen(!isFilterCalendarFromOpen);
    setIsFilterCalendarToOpen(false); // Fechar o outro calendário
  };

  const handleFilterCalendarToToggle = () => {
    setIsFilterCalendarToOpen(!isFilterCalendarToOpen);
    setIsFilterCalendarFromOpen(false); // Fechar o outro calendário
  };

  const navigateFilterMonthFrom = (direction: "prev" | "next") => {
    setFilterCalendarFromDate((prev) => {
      const currentDate = prev || new Date();
      const newDate = new Date(currentDate);
      if (direction === "prev") {
        newDate.setMonth(currentDate.getMonth() - 1);
      } else {
        newDate.setMonth(currentDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const navigateFilterMonthTo = (direction: "prev" | "next") => {
    setFilterCalendarToDate((prev) => {
      const currentDate = prev || new Date();
      const newDate = new Date(currentDate);
      if (direction === "prev") {
        newDate.setMonth(currentDate.getMonth() - 1);
      } else {
        newDate.setMonth(currentDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToTodayFilterFrom = () => {
    const today = new Date();
    setFilterCalendarFromDate(today);
    handleFilterDateFromSelect(today);
  };

  const goToTodayFilterTo = () => {
    const today = new Date();
    setFilterCalendarToDate(today);
    handleFilterDateToSelect(today);
  };

  const clearFilterDateFrom = () => {
    setTransactionFilters((prev) => ({
      ...prev,
      dateFrom: "",
    }));
    setFilterCalendarFromDate(null);
    setIsFilterCalendarFromOpen(false);
  };

  const clearFilterDateTo = () => {
    setTransactionFilters((prev) => ({
      ...prev,
      dateTo: "",
    }));
    setFilterCalendarToDate(null);
    setIsFilterCalendarToOpen(false);
  };

  // Função para gerenciar mudanças no formulário de transação
  const handleTransactionInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setTransactionForm((prev) => ({
      ...prev,
      [name]: value,
      // Reset category when type changes
      ...(name === "type" ? { category: "" } : {}),
    }));

    // Limpar erro do campo quando o usuário digitar
    setTransactionFormErrors((prev) => ({
      ...prev,
      [name]: false,
    }));
  };

  // Funções para gerenciar seleção de produtos
  const handleSelectProduct = (productId: string) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleSelectAllProducts = () => {
    const filtered = getFilteredAndSortedProducts();
    const allSelected = filtered.length > 0 && filtered.every((p) => selectedProducts.has(p.id));
    if (allSelected) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filtered.map((p) => p.id)));
    }
  };

  const handleDeleteSelectedProducts = async () => {
    if (selectedProducts.size === 0) return;

    const confirmMessage =
      selectedProducts.size === 1
        ? "Tem certeza que deseja deletar este produto?"
        : `Tem certeza que deseja deletar ${selectedProducts.size} produtos?`;

    if (confirm(confirmMessage)) {
      try {
        const ids = Array.from(selectedProducts);
        const success = await deleteMultipleProducts(ids);
        if (success) {
          setProducts((prev) =>
            prev.filter((product) => !selectedProducts.has(product.id)),
          );
          setSelectedProducts(new Set());
        }
      } catch (error) {
        console.error("Erro ao deletar produtos:", error);
      }
    }
  };

  // Funções para gerenciar seleção de transações
  const handleSelectTransaction = (transactionId: string) => {
    setSelectedTransactions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId);
      } else {
        newSet.add(transactionId);
      }
      return newSet;
    });
  };

  const handleSelectAllTransactions = () => {
    const filtered = getFilteredAndSortedTransactions();
    const allSelected = filtered.length > 0 && filtered.every((t) => selectedTransactions.has(t.id));
    if (allSelected) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(filtered.map((t) => t.id)));
    }
  };

  const handleDeleteSelectedTransactions = async () => {
    if (selectedTransactions.size === 0) return;

    const confirmMessage =
      selectedTransactions.size === 1
        ? "Tem certeza que deseja deletar esta transação?"
        : `Tem certeza que deseja deletar ${selectedTransactions.size} transações?`;

    if (confirm(confirmMessage)) {
      try {
        const ids = Array.from(selectedTransactions);
        const success = await deleteMultipleTransactions(ids);
        if (success) {
          setTransactions((prev) =>
            prev.filter(
              (transaction) => !selectedTransactions.has(transaction.id),
            ),
          );
          setSelectedTransactions(new Set());
        }
      } catch (error) {
        console.error("Erro ao deletar transações:", error);
      }
    }
  };

  // Funções de ordenação — separadas por aba
  const handleSort = (field: string) => {
    setTransactionSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleProductSort = (field: string) => {
    setProductSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getSortIcon = (field: string) => {
    if (transactionSortConfig.field !== field) {
      return <span className="text-gray-400" aria-hidden="true">↕</span>;
    }
    return transactionSortConfig.direction === "asc" ? (
      <span className="text-amber-600" aria-hidden="true">↑</span>
    ) : (
      <span className="text-amber-600" aria-hidden="true">↓</span>
    );
  };

  const getTransactionSortAriaSort = (field: string): "ascending" | "descending" | "none" => {
    if (transactionSortConfig.field !== field) return "none";
    return transactionSortConfig.direction === "asc" ? "ascending" : "descending";
  };

  const getProductSortIcon = (field: string) => {
    if (productSortConfig.field !== field) {
      return <span className="text-gray-400" aria-hidden="true">↕</span>;
    }
    return productSortConfig.direction === "asc" ? (
      <span className="text-amber-600" aria-hidden="true">↑</span>
    ) : (
      <span className="text-amber-600" aria-hidden="true">↓</span>
    );
  };

  const getProductSortAriaSort = (field: string): "ascending" | "descending" | "none" => {
    if (productSortConfig.field !== field) return "none";
    return productSortConfig.direction === "asc" ? "ascending" : "descending";
  };

  // Removido: funções de ordenação não utilizadas (agora usamos filtros + ordenação combinada)

  // Funções de filtro
  const getFilteredAndSortedTransactions = () => {
    let filtered = transactions;

    // Filtro por descrição
    if (transactionFilters.description) {
      filtered = filtered.filter((t) =>
        t.description
          .toLowerCase()
          .includes(transactionFilters.description.toLowerCase()),
      );
    }

    // Filtro por tipo
    if (transactionFilters.type) {
      filtered = filtered.filter((t) => t.type === transactionFilters.type);
    }

    // Filtro por categoria
    if (transactionFilters.category) {
      filtered = filtered.filter((t) =>
        t.category
          .toLowerCase()
          .includes(transactionFilters.category.toLowerCase()),
      );
    }

    // Filtro por data
    if (transactionFilters.dateFrom) {
      filtered = filtered.filter(
        (t) =>
          parseLocalDate(t.date).getTime() >=
          parseLocalDate(transactionFilters.dateFrom).getTime(),
      );
    }
    if (transactionFilters.dateTo) {
      filtered = filtered.filter(
        (t) =>
          parseLocalDate(t.date).getTime() <=
          parseLocalDate(transactionFilters.dateTo).getTime(),
      );
    }

    // Aplicar ordenação
    if (!transactionSortConfig.field) return filtered;

    return filtered.sort((a, b) => {
      let aValue: any = a[transactionSortConfig.field as keyof NewTransaction];
      let bValue: any = b[transactionSortConfig.field as keyof NewTransaction];

      if (transactionSortConfig.field === "date") {
        aValue = parseLocalDate(aValue).getTime();
        bValue = parseLocalDate(bValue).getTime();
      } else if (transactionSortConfig.field === "value") {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return transactionSortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return transactionSortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  };

  const getFilteredAndSortedProducts = () => {
    let filtered = products;

    // Filtro por categoria
    if (productFilters.category) {
      filtered = filtered.filter((p) =>
        p.category
          .toLowerCase()
          .includes(productFilters.category.toLowerCase()),
      );
    }

    // Filtro por estoque
    if (productFilters.stockFilter === "inStock") {
      filtered = filtered.filter((p) => p.stock > 0);
    } else if (productFilters.stockFilter === "outOfStock") {
      filtered = filtered.filter((p) => p.stock === 0);
    }

    // Filtro por vendidos
    if (productFilters.soldFilter === "sold") {
      filtered = filtered.filter((p) => p.sold > 0);
    } else if (productFilters.soldFilter === "notSold") {
      filtered = filtered.filter((p) => p.sold === 0);
    }

    // Filtro por custo
    if (productFilters.costFilter === "withCost") {
      filtered = filtered.filter((p) => p.cost > 0);
    } else if (productFilters.costFilter === "withoutCost") {
      filtered = filtered.filter((p) => p.cost === 0);
    }

    // Aplicar ordenação
    if (!productSortConfig.field) return filtered;

    return filtered.sort((a, b) => {
      let aValue: any = a[productSortConfig.field as keyof Product];
      let bValue: any = b[productSortConfig.field as keyof Product];

      if (
        productSortConfig.field === "price" ||
        productSortConfig.field === "cost" ||
        productSortConfig.field === "stock" ||
        productSortConfig.field === "sold"
      ) {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return productSortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return productSortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  };

  // Funções para limpar filtros
  const clearTransactionFilters = () => {
    setTransactionFilters({
      type: "",
      category: "",
      dateFrom: "",
      dateTo: "",
      hasDateFilter: false,
      description: "",
    });
  };

  const clearProductFilters = () => {
    setProductFilters({
      category: "",
      stockFilter: "",
      soldFilter: "",
      costFilter: "",
    });
  };

  // Função para validar formulário de transação
  const validateTransactionForm = () => {
    const errors = {
      date: !transactionForm.date || transactionForm.date.trim() === "",
      description:
        !transactionForm.description ||
        transactionForm.description.trim() === "",
      value:
        !transactionForm.value ||
        transactionForm.value.trim() === "" ||
        parseFloat(transactionForm.value) <= 0,
      type: !transactionForm.type || transactionForm.type.trim() === "",
      category:
        !transactionForm.category || transactionForm.category.trim() === "",
    };

    setTransactionFormErrors(errors);

    // Verificar se há erros
    const hasErrors = Object.values(errors).some((error) => error);

    if (hasErrors) {
      // Não mostrar notificação, apenas marcar os campos com erro visual
      return false;
    }

    return true;
  };

  // Função para renderizar o calendário personalizado
  const renderCustomCalendar = () => {
    const today = new Date();
    const currentMonth = calendarDate.getMonth();
    const currentYear = calendarDate.getFullYear();

    // Primeiro dia do mês
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

    // Gerar dias do calendário
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }

    const monthNames = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];

    return (
      <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50 min-w-[320px]">
        {/* Header do calendário */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth("prev")}
            className="p-2 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-amber-600" />
          </button>

          <h3 className="text-lg font-semibold text-amber-800">
            {monthNames[currentMonth]} {currentYear}
          </h3>

          <button
            onClick={() => navigateMonth("next")}
            className="p-2 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-amber-600" />
          </button>
        </div>

        {/* Dias da semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, index) => (
            <div
              key={index}
              className="text-center text-sm font-semibold text-gray-600 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Dias do calendário */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            const isCurrentMonth = date.getMonth() === currentMonth;
            const isToday = date.toDateString() === today.toDateString();
            const isSelected = transactionForm.date === formatDateToInput(date);

            return (
              <button
                key={index}
                onClick={() => handleDateSelect(date)}
                className={`
                  w-10 h-10 text-sm rounded-lg transition-all duration-200
                  ${isCurrentMonth ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-600"}
                  ${isToday ? "bg-amber-100 text-amber-800 font-semibold dark:bg-amber-900/40 dark:text-amber-300" : ""}
                  ${isSelected ? "bg-amber-500 text-white font-semibold" : ""}
                  ${!isSelected && !isToday ? "hover:bg-amber-50 dark:hover:bg-amber-900/20" : ""}
                `}
              >
                {date.getDate()}
              </button>
            );
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
    );
  };

  // Funções para renderizar calendários dos filtros
  const renderFilterCalendarFrom = () => {
    const today = new Date();
    const currentDate = filterCalendarFromDate || new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }

    const monthNames = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];

    return (
      <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50 min-w-[320px]">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateFilterMonthFrom("prev")}
            className="p-2 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-amber-600" />
          </button>

          <h3 className="text-lg font-semibold text-amber-800">
            {monthNames[currentMonth]} {currentYear}
          </h3>

          <button
            onClick={() => navigateFilterMonthFrom("next")}
            className="p-2 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-amber-600" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, index) => (
            <div
              key={index}
              className="text-center text-sm font-semibold text-gray-600 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            const isCurrentMonth = date.getMonth() === currentMonth;
            const isToday = date.toDateString() === today.toDateString();
            const isSelected =
              transactionFilters.dateFrom === formatDateToInput(date);

            return (
              <button
                key={index}
                onClick={() => handleFilterDateFromSelect(date)}
                className={`
                  w-10 h-10 text-sm rounded-lg transition-all duration-200
                  ${isCurrentMonth ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-600"}
                  ${isToday ? "bg-amber-100 text-amber-800 font-semibold dark:bg-amber-900/40 dark:text-amber-300" : ""}
                  ${isSelected ? "bg-amber-500 text-white font-semibold" : ""}
                  ${!isSelected && !isToday ? "hover:bg-amber-50 dark:hover:bg-amber-900/20" : ""}
                `}
              >
                {date.getDate()}
              </button>
            );
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
    );
  };

  const renderFilterCalendarTo = () => {
    const today = new Date();
    const currentDate = filterCalendarToDate || new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }

    const monthNames = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];

    return (
      <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50 min-w-[320px]">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateFilterMonthTo("prev")}
            className="p-2 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-amber-600" />
          </button>

          <h3 className="text-lg font-semibold text-amber-800">
            {monthNames[currentMonth]} {currentYear}
          </h3>

          <button
            onClick={() => navigateFilterMonthTo("next")}
            className="p-2 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-amber-600" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, index) => (
            <div
              key={index}
              className="text-center text-sm font-semibold text-gray-600 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            const isCurrentMonth = date.getMonth() === currentMonth;
            const isToday = date.toDateString() === today.toDateString();
            const isSelected =
              transactionFilters.dateTo === formatDateToInput(date);

            return (
              <button
                key={index}
                onClick={() => handleFilterDateToSelect(date)}
                className={`
                  w-10 h-10 text-sm rounded-lg transition-all duration-200
                  ${isCurrentMonth ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-600"}
                  ${isToday ? "bg-amber-100 text-amber-800 font-semibold dark:bg-amber-900/40 dark:text-amber-300" : ""}
                  ${isSelected ? "bg-amber-500 text-white font-semibold" : ""}
                  ${!isSelected && !isToday ? "hover:bg-amber-50 dark:hover:bg-amber-900/20" : ""}
                `}
              >
                {date.getDate()}
              </button>
            );
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
    );
  };

  // Helpers case-insensitive para tipo de transação (Receita, RECEITA, receita, DESpesAS, etc.)
  const isReceita = (type: string) => /receita/i.test(type || "");
  const isDespesa = (type: string) => /despesa/i.test(type || "");

  // Função para obter as categorias baseadas no tipo (case-insensitive)
  const getCategoriesByType = (type: string) => {
    if (isReceita(type)) {
      return ["Atacado", "Varejo", "Investimentos", "Outros"];
    } else if (isDespesa(type)) {
      return ["Fixo", "Variável", "Investimento", "Mkt", "Outros"];
    }
    return [];
  };

  // Função para abrir modal de edição
  const handleEditTransaction = (transaction: NewTransaction) => {
    setEditingTransaction(transaction);
    setTransactionForm({
      date: transaction.date,
      description: transaction.description,
      value: transaction.value.toString(),
      type: transaction.type,
      category: transaction.category,
    });
    setIsTransactionModalOpen(true);
  };

  // Função para gerenciar mudanças no formulário de produto
  const handleProductInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setProductForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Limpar erro do campo quando o usuário digitar
    setProductFormErrors((prev) => ({
      ...prev,
      [name]: false,
    }));
  };

  // Função para validar formulário de produto
  const validateProductForm = () => {
    const errors = {
      name: !productForm.name || productForm.name.trim() === "",
      category: !productForm.category || productForm.category.trim() === "",
      price:
        !productForm.price ||
        productForm.price.trim() === "" ||
        parseFloat(productForm.price) <= 0,
      cost: false, // Não obrigatório
      stock: false, // Não obrigatório
      sold: false, // Não obrigatório
    };

    setProductFormErrors(errors);

    // Verificar se há erros apenas nos campos obrigatórios
    const hasErrors = errors.name || errors.category || errors.price;

    if (hasErrors) {
      // Não mostrar notificação, apenas marcar os campos com erro visual
      return false;
    }

    return true;
  };

  // Função para abrir modal de edição de produto
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      price: product.price.toString(),
      cost: product.cost.toString(),
      stock: product.stock.toString(),
      sold: product.sold.toString(),
      category: product.category,
    });
    setIsProductModalOpen(true);
  };

  // Função auxiliar para extrair mês e ano de uma data (suporta YYYY-MM-DD, DD/MM/YYYY e MM/DD/YYYY)
  const getMonthYearFromDate = (dateString: string) => {
    if (!dateString) return { month: -1, year: -1 };
    const s = String(dateString).trim();
    // YYYY-MM-DD (ISO)
    const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return {
        month: parseInt(isoMatch[2], 10) - 1,
        year: parseInt(isoMatch[1], 10),
      };
    }
    // A/B/YYYY (detecta DD/MM vs MM/DD automaticamente)
    // Formato dos dados existentes: MM/DD/YYYY
    const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      const a = parseInt(slashMatch[1], 10);
      const b = parseInt(slashMatch[2], 10);
      const year = parseInt(slashMatch[3], 10);
      let month: number;
      if (b > 12) {
        month = a - 1; // MM/DD (ex: 01/13/2026 = 13 de janeiro) - segundo valor > 12, então primeiro é mês
      } else if (a > 12) {
        month = b - 1; // DD/MM (ex: 15/01/2026 = 15 de janeiro) - primeiro valor > 12, então segundo é mês
      } else {
        // Quando ambíguo, assumir MM/DD (formato dos dados existentes)
        // ex: 01/02/2026 = 2 de janeiro (mês 1, dia 2)
        month = a - 1; // Primeiro valor é o mês no formato MM/DD
      }
      return { month, year };
    }
    const date = new Date(s);
    return Number.isFinite(date.getTime())
      ? { month: date.getMonth(), year: date.getFullYear() }
      : { month: -1, year: -1 };
  };

  // Função auxiliar para extrair apenas o ano de uma data
  const getYearFromDate = (dateString: string) => {
    const { year } = getMonthYearFromDate(dateString);
    return year >= 0
      ? year
      : dateString
        ? new Date(dateString).getFullYear()
        : -1;
  };

  // Funções para calcular totais das transações
  const calculateTotals = () => {
    const now = new Date();
    return calculateTotalsForMonth(now.getMonth(), now.getFullYear());
  };

  // Calcula totais para um mês/ano específico (usado nas metas para comparar com a projeção)
  const calculateTotalsForMonth = (month: number, year: number) => {
    if (!transactions || transactions.length === 0) {
      return { receitas: 0, despesas: 0, faturamento: 0, resultado: 0 };
    }
    try {
      const monthTransactions = transactions.filter((transaction) => {
        if (!transaction.date) return false;
        const { month: m, year: y } = getMonthYearFromDate(transaction.date);
        return m === month && y === year;
      });
      const receitas = monthTransactions
        .filter((t) => isReceita(t.type))
        .reduce((sum, t) => sum + (Number(t.value) || 0), 0);
      const despesas = monthTransactions
        .filter((t) => isDespesa(t.type))
        .reduce((sum, t) => sum + (Number(t.value) || 0), 0);
      return {
        receitas,
        despesas,
        faturamento: receitas,
        resultado: receitas - despesas,
      };
    } catch (error) {
      console.error("Erro ao calcular totais:", error);
      return { receitas: 0, despesas: 0, faturamento: 0, resultado: 0 };
    }
  };

  // (metas) definido no bloco de hooks no topo do componente

  // Função para alternar gráficos
  const toggleChart = (chartId: string) => {
    setExpandedCharts(
      (prev) =>
        prev.includes(chartId)
          ? prev.filter((id) => id !== chartId) // Remove se já existe
          : [...prev, chartId], // Adiciona se não existe
    );
  };


  // Calcular resumo financeiro (mantendo para compatibilidade)
  // Removido: totais fictícios (usar calculateTotals())

  // Render Dashboard
  const renderDashboard = () => {
    // Banner de modo demo (apenas se estiver em modo demo)
    const demoBanner = isDemoMode ? (
      <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-amber-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-bold text-amber-900">Modo Demo</h3>
            <p className="text-sm text-amber-800 mt-1">
              Os dados são temporários e serão perdidos ao fechar o navegador.
              Este é um ambiente de demonstração.
            </p>
          </div>
        </div>
      </div>
    ) : null;

    // Calcular totais das transações reais para o mês selecionado (para comparar com metas)
    const currentYear = new Date().getFullYear();
    const { receitas, despesas, resultado } = calculateTotalsForMonth(
      selectedMonth,
      currentYear,
    );

    // Obter o mês selecionado nas metas
    const mesSelecionadoMetas =
      mesesMetas.find((mes) => mes.indice === selectedMonth) ||
      mesesMetas.find((mes) => mes.indice === new Date().getMonth()) ||
      mesesMetas[0];

    // Dados reais das transações do mês selecionado
    const totalReceitasMes = receitas;
    const totalDespesasMes = despesas;
    const lucroLiquidoMes = resultado;

    // Função para determinar o trimestre de um mês (0-11)
    const getQuarter = (month: number) => Math.floor(month / 3);

    // Determinar trimestre atual baseado no mês selecionado
    const trimestreAtual = getQuarter(selectedMonth);
    const mesesDoTrimestre = [
      trimestreAtual * 3, // Primeiro mês do trimestre
      trimestreAtual * 3 + 1, // Segundo mês do trimestre
      trimestreAtual * 3 + 2, // Terceiro mês do trimestre
    ];

    // Nomes dos trimestres
    const nomesTrimestres = [
      "Q1 (Jan-Mar)",
      "Q2 (Abr-Jun)",
      "Q3 (Jul-Set)",
      "Q4 (Out-Dez)",
    ];

    // Filtrar transações do trimestre atual usando função auxiliar
    const transacoesTrimestre = transactions.filter((t) => {
      if (!t.date) return false;
      const { month, year } = getMonthYearFromDate(t.date);
      return mesesDoTrimestre.includes(month) && year === currentYear;
    });

    // Dados trimestrais (usando dados reais das transações)
    const totalReceitasTrimestre = transacoesTrimestre
      .filter((t) => isReceita(t.type))
      .reduce((sum, t) => sum + (Number(t.value) || 0), 0);
    const totalDespesasTrimestre = transacoesTrimestre
      .filter((t) => isDespesa(t.type))
      .reduce((sum, t) => sum + (Number(t.value) || 0), 0);
    const lucroLiquidoTrimestre =
      totalReceitasTrimestre - totalDespesasTrimestre;

    // Meta do trimestre (soma das metas dos 3 meses)
    const metaTrimestre = mesesDoTrimestre.reduce(
      (total, mesIndex) => total + (mesesMetas[mesIndex]?.meta || 0),
      0,
    );

    // Filtrar transações do ano atual usando função auxiliar
    const transacoesAno = transactions.filter((t) => {
      if (!t.date) return false;
      return getYearFromDate(t.date) === currentYear;
    });

    // Dados anuais (usando dados reais das transações)
    const totalReceitasAno = transacoesAno
      .filter((t) => isReceita(t.type))
      .reduce((sum, t) => sum + (Number(t.value) || 0), 0);
    const totalDespesasAno = transacoesAno
      .filter((t) => isDespesa(t.type))
      .reduce((sum, t) => sum + (Number(t.value) || 0), 0);
    const lucroLiquidoAno = totalReceitasAno - totalDespesasAno;

    // Transações recentes (últimas 5)
    const transacoesRecentes = transactions
      .sort(
        (a, b) =>
          parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime(),
      )
      .slice(0, 5);

    // Dados para gráficos mensais (baseados no mês selecionado nas metas)
    const pieChartData = [
      { name: "Receitas", value: totalReceitasMes, color: "#22c55e" },
      { name: "Despesas", value: totalDespesasMes, color: "#ef4444" },
    ];

    // Dados para gráficos trimestrais
    const pieChartDataTrimestre = [
      { name: "Receitas", value: totalReceitasTrimestre, color: "#06b6d4" },
      { name: "Despesas", value: totalDespesasTrimestre, color: "#f97316" },
    ];

    const pieChartDataAnual = [
      { name: "Receitas Anuais", value: totalReceitasAno, color: "#16a34a" },
      { name: "Despesas Anuais", value: totalDespesasAno, color: "#dc2626" },
    ];

    // Dados para comparação com metas: Meta (faturamento da projeção) vs Real (receitas das transações)
    const metaFaturamentoMes = mesSelecionadoMetas.meta;
    const barChartData = [
      {
        name: "Meta (Faturamento)",
        value: metaFaturamentoMes,
        color: "#f59e0b",
      },
      {
        name: "Real (Receitas)",
        value: totalReceitasMes,
        color: totalReceitasMes >= metaFaturamentoMes ? "#22c55e" : "#ef4444",
      },
    ];

    // Dados para comparação trimestral (meta de faturamento vs receitas reais)
    const barChartDataTrimestre = [
      { name: "Meta (Faturamento)", value: metaTrimestre, color: "#f59e0b" },
      {
        name: "Real (Receitas)",
        value: totalReceitasTrimestre,
        color: totalReceitasTrimestre >= metaTrimestre ? "#22c55e" : "#ef4444",
      },
    ];

    // Meta anual (soma de todas as metas mensais de faturamento)
    const metaAnual = mesesMetas.reduce((total, mes) => total + mes.meta, 0);
    const barChartDataAnual = [
      { name: "Meta Anual (Faturamento)", value: metaAnual, color: "#f59e0b" },
      {
        name: "Real Anual (Receitas)",
        value: totalReceitasAno,
        color: totalReceitasAno >= metaAnual ? "#22c55e" : "#ef4444",
      },
    ];

    // Metas de despesas (projeção) para comparação Meta vs Real
    const metaDespesasMes =
      getProjectionMetasForMonth(selectedMonth).despesasTotal;
    const barChartDataDespesas = [
      { name: "Meta (Despesas)", value: metaDespesasMes, color: "#f59e0b" },
      {
        name: "Real (Despesas)",
        value: totalDespesasMes,
        color: totalDespesasMes <= metaDespesasMes ? "#22c55e" : "#ef4444",
      },
    ];
    const metaDespesasTrimestre = mesesDoTrimestre.reduce(
      (s, i) => s + getProjectionMetasForMonth(i).despesasTotal,
      0,
    );
    const barChartDataDespesasTrimestre = [
      {
        name: "Meta (Despesas)",
        value: metaDespesasTrimestre,
        color: "#f59e0b",
      },
      {
        name: "Real (Despesas)",
        value: totalDespesasTrimestre,
        color:
          totalDespesasTrimestre <= metaDespesasTrimestre
            ? "#22c55e"
            : "#ef4444",
      },
    ];
    const projAnualDesp = getProjectionMetasAnual();
    const barChartDataDespesasAnual = [
      {
        name: "Meta Anual (Despesas)",
        value: projAnualDesp.despesasTotal,
        color: "#f59e0b",
      },
      {
        name: "Real Anual (Despesas)",
        value: totalDespesasAno,
        color:
          totalDespesasAno <= projAnualDesp.despesasTotal
            ? "#22c55e"
            : "#ef4444",
      },
    ];

    // Resultado projetado = faturamento projetado - despesas projetadas
    const resultadoProjetadoMes = metaFaturamentoMes - metaDespesasMes;
    const resultadoProjetadoTrimestre = metaTrimestre - metaDespesasTrimestre;
    const resultadoProjetadoAnual = metaAnual - projAnualDesp.despesasTotal;

    // Dados para gráfico de saldo: Resultado Projetado vs Resultado Real
    const barChartDataSaldo = [
      { name: "Resultado Projetado", value: resultadoProjetadoMes, color: "#6366f1" },
      { name: "Resultado Real", value: lucroLiquidoMes, color: lucroLiquidoMes >= resultadoProjetadoMes ? "#22c55e" : "#ef4444" },
    ];
    const barChartDataSaldoTrimestre = [
      { name: "Resultado Projetado", value: resultadoProjetadoTrimestre, color: "#6366f1" },
      { name: "Resultado Real", value: lucroLiquidoTrimestre, color: lucroLiquidoTrimestre >= resultadoProjetadoTrimestre ? "#22c55e" : "#ef4444" },
    ];
    const barChartDataSaldoAnual = [
      { name: "Resultado Projetado", value: resultadoProjetadoAnual, color: "#6366f1" },
      { name: "Resultado Real", value: lucroLiquidoAno, color: lucroLiquidoAno >= resultadoProjetadoAnual ? "#22c55e" : "#ef4444" },
    ];

    // Dados para LineChart de evolução mensal (12 meses do ano)
    const mesesNomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const lineChartData = mesesNomes.map((nome, idx) => {
      const { receitas: rec, despesas: desp, resultado: saldo } = calculateTotalsForMonth(idx, currentYear);
      return { mes: nome, Receitas: rec, Despesas: desp, Saldo: saldo };
    });

    // Dados para PieChart de categorias de despesas do mês selecionado
    const despesasMes = transactions.filter((t) => {
      if (!t.date || !isDespesa(t.type)) return false;
      const { month, year } = getMonthYearFromDate(t.date);
      return month === selectedMonth && year === currentYear;
    });
    const categoriasDespesas: Record<string, number> = {};
    despesasMes.forEach((t) => {
      const cat = t.category || "Outros";
      categoriasDespesas[cat] = (categoriasDespesas[cat] || 0) + (Number(t.value) || 0);
    });
    const CORES_CATEGORIAS = ["#ef4444","#f97316","#f59e0b","#8b5cf6","#06b6d4","#ec4899","#10b981","#3b82f6","#84cc16","#6366f1"];
    const pieChartDataCategorias = Object.entries(categoriasDespesas)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: CORES_CATEGORIAS[i % CORES_CATEGORIAS.length] }));

    // Componente de gráfico de rosca (donut chart)
    const renderPieChart = (data: any[], title: string) => {
      // Se não houver dados ou todos os valores forem 0, exibir rosca cinza
      const hasData = data.length > 0 && data.some((item) => item.value > 0);
      const displayData = hasData
        ? data
        : [{ name: "Sem dados", value: 100, color: "#e5e7eb" }];

      return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 mt-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">{title}</h3>
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
                  formatter={(value: any) => [
                    `R$ ${(typeof value === 'number' ? value : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                    "",
                  ]}
                  contentStyle={{
                    backgroundColor: isDark ? "#1f2937" : "#ffffff",
                    border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
                    borderRadius: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    color: isDark ? "#f3f4f6" : "#111827",
                  }}
                />
              )}
              {hasData && (
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{
                    paddingTop: "20px",
                    fontSize: "14px",
                    fontWeight: 600,
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
    };

    // Componente de gráfico de barras para comparação com metas
    const renderBarChart = (data: any[], title: string) => (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 mt-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">{title}</h3>
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
              stroke={isDark ? "#374151" : "#f0f0f0"}
              vertical={false}
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: isDark ? "#9ca3af" : "#666" }}
            />
            <YAxis
              tickFormatter={(value: number) =>
                `R$ ${value.toLocaleString("pt-BR")}`
              }
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: isDark ? "#9ca3af" : "#666" }}
            />
            <Tooltip
              formatter={(value: any) =>
                `R$ ${(typeof value === 'number' ? value : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
              }
              contentStyle={{
                backgroundColor: isDark ? "#1f2937" : "white",
                border: `1px solid ${isDark ? "#374151" : "#e0e0e0"}`,
                borderRadius: "12px",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
                color: isDark ? "#f3f4f6" : "#111827",
              }}
            />
            <Bar dataKey="value" fill="#8884d8" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                formatter={(v: any) =>
                  `R$ ${(Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                }
                style={{ fontSize: 11, fontWeight: 600, fill: isDark ? "#d1d5db" : "#374151" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );

    // Componente de gráfico de linha (evolução mensal)
    const renderLineChart = () => (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 mt-6">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Evolução Mensal — {currentYear}</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={lineChartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#f0f0f0"} />
            <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? "#9ca3af" : "#666" }} />
            <YAxis
              tickFormatter={(v: number) => `R$ ${(v / 1000).toFixed(0)}k`}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: isDark ? "#9ca3af" : "#666" }}
            />
            <Tooltip
              formatter={(value: any) =>
                `R$ ${(typeof value === "number" ? value : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
              }
              contentStyle={{ backgroundColor: isDark ? "#1f2937" : "#fff", border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`, borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", color: isDark ? "#f3f4f6" : "#111827" }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: "16px", fontSize: 13, fontWeight: 600 }} />
            <ReferenceLine x={mesesNomes[selectedMonth]} stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" label={{ value: mesesNomes[selectedMonth], position: "top", fill: "#f59e0b", fontSize: 11, fontWeight: 700 }} />
            <Line type="monotone" dataKey="Receitas" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Saldo" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );

    // Componente de PieChart de categorias de despesas
    const renderPieChartCategorias = () => {
      const hasData = pieChartDataCategorias.length > 0;
      const displayData = hasData ? pieChartDataCategorias : [{ name: "Sem dados", value: 100, color: "#e5e7eb" }];
      return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
            Despesas por Categoria — {mesesNomes[selectedMonth]}
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <RechartsPieChart>
              <Pie
                data={displayData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={140}
                paddingAngle={hasData ? 5 : 0}
                dataKey="value"
                cornerRadius={hasData ? 8 : 0}
                stroke="none"
              >
                {displayData.map((entry, index) => (
                  <Cell key={`cat-${index}`} fill={entry.color} />
                ))}
              </Pie>
              {hasData && (
                <Tooltip
                  formatter={(value: any) => [
                    `R$ ${(typeof value === "number" ? value : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                    "",
                  ]}
                  contentStyle={{ backgroundColor: isDark ? "#1f2937" : "#fff", border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`, borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", color: isDark ? "#f3f4f6" : "#111827" }}
                />
              )}
              {hasData && (
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ paddingTop: "16px", fontSize: 12, fontWeight: 600 }}
                />
              )}
              {!hasData && (
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-400 text-sm">
                  Sem despesas neste mês
                </text>
              )}
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      );
    };

    return (
      <div className="space-y-8">
        {demoBanner}
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

        {/* Seção do Mês (com seletor para comparar metas vs real) */}
        <div className="bg-gradient-to-br from-emerald-50/60 to-green-50/40 dark:from-emerald-900/20 dark:to-green-900/10 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-900/30 space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
              <PieChart className="w-6 h-6 text-emerald-600" />
              Dados do mês
            </h2>
            <div className="flex items-center gap-1 bg-emerald-100 border border-emerald-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setSelectedMonth((m) => (m - 1 + 12) % 12)}
                className="px-2 py-1.5 text-emerald-700 hover:bg-emerald-200 transition-colors duration-150"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-emerald-700 px-2 min-w-[130px] text-center">
                {mesSelecionadoMetas.nome} {new Date().getFullYear()}
              </span>
              <button
                onClick={() => setSelectedMonth((m) => (m + 1) % 12)}
                className="px-2 py-1.5 text-emerald-700 hover:bg-emerald-200 transition-colors duration-150"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Resumo rápido do mês */}
          {(() => {
            const pctMeta = metaFaturamentoMes > 0 ? (totalReceitasMes / metaFaturamentoMes) * 100 : 0;
            const variacaoMes = totalReceitasMes - metaFaturamentoMes;
            const hoje = new Date();
            const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
            const emDia = pctMeta >= (hoje.getDate() / diasNoMes) * 100;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${pctMeta >= 100 ? "bg-emerald-100" : pctMeta >= 75 ? "bg-amber-100" : "bg-red-100"}`}>
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">% da Meta</p>
                    <p className={`text-xl font-black ${pctMeta >= 100 ? "text-emerald-600" : pctMeta >= 75 ? "text-amber-600" : "text-red-600"}`}>{pctMeta.toFixed(0)}%</p>
                  </div>
                </div>
                <div className={`rounded-xl border shadow-sm p-4 flex items-center gap-3 ${variacaoMes >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${variacaoMes >= 0 ? "bg-emerald-100" : "bg-red-100"}`}>
                    {variacaoMes >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Variação</p>
                    <p className={`text-base font-black ${variacaoMes >= 0 ? "text-emerald-700" : "text-red-700"}`}>{variacaoMes >= 0 ? "+" : ""}R$ {Math.abs(variacaoMes).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${lucroLiquidoMes >= 0 ? "bg-emerald-100" : "bg-red-100"}`}>
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Lucro Líquido</p>
                    <p className={`text-base font-black ${lucroLiquidoMes >= 0 ? "text-emerald-600" : "text-red-600"}`}>R$ {lucroLiquidoMes.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
                <div className={`rounded-xl border shadow-sm p-4 flex items-center gap-3 ${emDia ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${emDia ? "bg-emerald-100" : "bg-amber-100"}`}>
                    {emDia ? <Zap className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ritmo</p>
                    <p className={`text-sm font-black ${emDia ? "text-emerald-700" : "text-amber-700"}`}>{emDia ? "No ritmo" : "Atenção"}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card Receitas */}
              <div className="space-y-4">
                <div
                  className="bg-gradient-to-br from-green-400 to-emerald-500 p-6 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
                  onClick={() => toggleChart("receitas-mensal")}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white text-opacity-80 uppercase tracking-wide">
                        Receitas
                      </p>
                      <p className="text-2xl font-bold text-white mt-1">
                        R${" "}
                        {totalReceitasMes.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      {(() => {
                        const pct = metaFaturamentoMes > 0 ? (totalReceitasMes / metaFaturamentoMes) * 100 : 0;
                        if (pct >= 100) return <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> Meta atingida</span>;
                        if (pct >= 75) return <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full"><Zap className="w-3 h-3" /> Em andamento ({pct.toFixed(0)}%)</span>;
                        return <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold bg-black/20 text-white/90 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" /> Abaixo ({pct.toFixed(0)}%)</span>;
                      })()}
                    </div>
                  </div>
                </div>
                {expandedCharts.includes("receitas-mensal") &&
                  renderBarChart(
                    barChartData,
                    `Faturamento: Meta vs Real (${mesSelecionadoMetas.nome})`,
                  )}
              </div>

              {/* Card Despesas */}
              <div className="space-y-4">
                <div
                  className="bg-gradient-to-br from-red-400 to-rose-500 p-6 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
                  onClick={() => toggleChart("despesas-mensal")}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <TrendingDown className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white text-opacity-80 uppercase tracking-wide">
                        Despesas
                      </p>
                      <p className="text-2xl font-bold text-white mt-1">
                        R${" "}
                        {totalDespesasMes.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      {(() => {
                        const metaDesp = getProjectionMetasForMonth(selectedMonth).despesasTotal;
                        const pct = metaDesp > 0 ? (totalDespesasMes / metaDesp) * 100 : 0;
                        if (pct > 100) return <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold bg-black/20 text-white/90 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" /> Limite ultrapassado</span>;
                        if (pct >= 85) return <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full"><Zap className="w-3 h-3" /> Próximo do limite ({pct.toFixed(0)}%)</span>;
                        return <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> Dentro do limite ({pct.toFixed(0)}%)</span>;
                      })()}
                    </div>
                  </div>
                </div>
                {expandedCharts.includes("despesas-mensal") &&
                  renderBarChart(
                    barChartDataDespesas,
                    `Despesas: Meta vs Real (${mesSelecionadoMetas.nome})`,
                  )}
              </div>

              {/* Card Saldo */}
              <div className="space-y-4">
                <div
                  className={`p-6 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:-translate-y-1 ${
                    lucroLiquidoMes >= 0 ? "bg-gradient-to-br from-emerald-400 to-green-500" : "bg-gradient-to-br from-red-400 to-red-500"
                  }`}
                  onClick={() => toggleChart("saldo-mensal")}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white text-opacity-80 uppercase tracking-wide">
                        Saldo
                      </p>
                      <p className="text-2xl font-bold mt-1 text-white">
                        R${" "}
                        {lucroLiquidoMes.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      <span className={`inline-flex items-center gap-1 mt-1 text-xs font-bold px-2 py-0.5 rounded-full ${lucroLiquidoMes >= 0 ? "bg-white/20 text-white" : "bg-black/20 text-white/90"}`}>
                        {lucroLiquidoMes >= 0 ? <><CheckCircle2 className="w-3 h-3" /> Positivo</> : <><AlertTriangle className="w-3 h-3" /> Negativo</>}
                      </span>
                    </div>
                  </div>
                </div>
                {expandedCharts.includes("saldo-mensal") &&
                  renderBarChart(
                    barChartDataSaldo,
                    `Resultado: Projetado vs Real (${mesSelecionadoMetas.nome})`,
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Seção Trimestre */}
        <div className="bg-gradient-to-br from-cyan-50/60 to-sky-50/40 dark:from-cyan-900/20 dark:to-sky-900/10 rounded-2xl p-5 border border-cyan-100 dark:border-cyan-900/30 space-y-4">
          <h2 className="text-2xl font-bold text-cyan-800 dark:text-cyan-300 flex items-center gap-3">
            <PieChart className="w-6 h-6 text-cyan-600" />
            Trimestre Atual
            <span className="text-lg font-medium text-cyan-600 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/30 px-3 py-1 rounded-lg border border-cyan-200 dark:border-cyan-800">
              {nomesTrimestres[trimestreAtual]}
            </span>
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card Receitas Trimestrais */}
              <div className="space-y-4">
                <div
                  className="bg-gradient-to-br from-green-400 to-emerald-500 p-6 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
                  onClick={() => toggleChart("receitas-trimestre")}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white text-opacity-80 uppercase tracking-wide">
                        Receitas
                      </p>
                      <p className="text-2xl font-bold text-white mt-1">
                        R${" "}
                        {totalReceitasTrimestre.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      {(() => {
                        const metaTrim = mesesMetas.filter((_, i) => Math.floor(i / 3) === trimestreAtual).reduce((s, m) => s + m.meta, 0);
                        const pct = metaTrim > 0 ? (totalReceitasTrimestre / metaTrim) * 100 : 0;
                        if (pct >= 100) return <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> Meta atingida</span>;
                        if (pct >= 75) return <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full"><Zap className="w-3 h-3" /> Em andamento ({pct.toFixed(0)}%)</span>;
                        return <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold bg-black/20 text-white/90 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" /> Abaixo ({pct.toFixed(0)}%)</span>;
                      })()}
                    </div>
                  </div>
                </div>
                {expandedCharts.includes("receitas-trimestre") &&
                  renderBarChart(
                    barChartDataTrimestre,
                    `Faturamento: Meta vs Real (${nomesTrimestres[trimestreAtual]})`,
                  )}
              </div>

              {/* Card Despesas Trimestrais */}
              <div className="space-y-4">
                <div
                  className="bg-gradient-to-br from-red-400 to-rose-500 p-6 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
                  onClick={() => toggleChart("despesas-trimestre")}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <TrendingDown className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white text-opacity-80 uppercase tracking-wide">
                        Despesas
                      </p>
                      <p className="text-2xl font-bold text-white mt-1">
                        R${" "}
                        {totalDespesasTrimestre.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      {(() => {
                        const metaDespTrim = mesesMetas.filter((_, i) => Math.floor(i / 3) === trimestreAtual).reduce((s, m) => s + getProjectionMetasForMonth(m.indice).despesasTotal, 0);
                        const pct = metaDespTrim > 0 ? (totalDespesasTrimestre / metaDespTrim) * 100 : 0;
                        if (pct > 100) return <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold bg-black/20 text-white/90 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" /> Limite ultrapassado</span>;
                        if (pct >= 85) return <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full"><Zap className="w-3 h-3" /> Próximo do limite ({pct.toFixed(0)}%)</span>;
                        return <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> Dentro do limite ({pct.toFixed(0)}%)</span>;
                      })()}
                    </div>
                  </div>
                </div>
                {expandedCharts.includes("despesas-trimestre") &&
                  renderBarChart(
                    barChartDataDespesasTrimestre,
                    `Despesas: Meta vs Real (${nomesTrimestres[trimestreAtual]})`,
                  )}
              </div>

              {/* Card Saldo Trimestral */}
              <div className="space-y-4">
                <div
                  className={`p-6 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:-translate-y-1 ${lucroLiquidoTrimestre >= 0 ? "bg-gradient-to-br from-emerald-400 to-green-500" : "bg-gradient-to-br from-red-400 to-red-500"}`}
                  onClick={() => toggleChart("saldo-trimestre")}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white text-opacity-80 uppercase tracking-wide">
                        Saldo
                      </p>
                      <p className="text-2xl font-bold mt-1 text-white">
                        R${" "}
                        {lucroLiquidoTrimestre.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      <span className={`inline-flex items-center gap-1 mt-1 text-xs font-bold px-2 py-0.5 rounded-full ${lucroLiquidoTrimestre >= 0 ? "bg-white/20 text-white" : "bg-black/20 text-white/90"}`}>
                        {lucroLiquidoTrimestre >= 0 ? <><CheckCircle2 className="w-3 h-3" /> Positivo</> : <><AlertTriangle className="w-3 h-3" /> Negativo</>}
                      </span>
                    </div>
                  </div>
                </div>
                {expandedCharts.includes("saldo-trimestre") &&
                  renderBarChart(
                    barChartDataSaldoTrimestre,
                    `Resultado: Projetado vs Real (${nomesTrimestres[trimestreAtual]})`,
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Seção Ano */}
        <div className="bg-gradient-to-br from-purple-50/60 to-indigo-50/40 dark:from-purple-900/20 dark:to-indigo-900/10 rounded-2xl p-5 border border-purple-100 dark:border-purple-900/30 space-y-4">
          <h2 className="text-2xl font-bold text-purple-800 dark:text-purple-300 flex items-center gap-3">
            <PieChart className="w-6 h-6 text-purple-600" />
            Ano
            <span className="text-sm font-semibold text-purple-700 bg-purple-100 px-3 py-1 rounded-lg border border-purple-200">
              {new Date().getFullYear()}
            </span>
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card Receitas Anuais */}
              <div className="space-y-4">
                <div
                  className="bg-gradient-to-br from-green-400 to-emerald-500 p-6 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
                  onClick={() => toggleChart("receitas-anual")}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white text-opacity-80 uppercase tracking-wide">
                        Receitas Anuais
                      </p>
                      <p className="text-2xl font-bold text-white mt-1">
                        R${" "}
                        {totalReceitasAno.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      {(() => {
                        const metaAno = mesesMetas.reduce((s, m) => s + m.meta, 0);
                        const pct = metaAno > 0 ? (totalReceitasAno / metaAno) * 100 : 0;
                        if (pct >= 100) return <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> Meta atingida</span>;
                        if (pct >= 75) return <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full"><Zap className="w-3 h-3" /> Em andamento ({pct.toFixed(0)}%)</span>;
                        return <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold bg-black/20 text-white/90 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" /> Abaixo ({pct.toFixed(0)}%)</span>;
                      })()}
                    </div>
                  </div>
                </div>
                {expandedCharts.includes("receitas-anual") &&
                  renderBarChart(
                    barChartDataAnual,
                    "Faturamento Anual: Meta vs Real",
                  )}
              </div>

              {/* Card Despesas Anuais */}
              <div className="space-y-4">
                <div
                  className="bg-gradient-to-br from-red-400 to-rose-500 p-6 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
                  onClick={() => toggleChart("despesas-anual")}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <TrendingDown className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white text-opacity-80 uppercase tracking-wide">
                        Despesas Anuais
                      </p>
                      <p className="text-2xl font-bold text-white mt-1">
                        R${" "}
                        {totalDespesasAno.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      {(() => {
                        const metaDespAno = mesesMetas.reduce((s, m) => s + getProjectionMetasForMonth(m.indice).despesasTotal, 0);
                        const pct = metaDespAno > 0 ? (totalDespesasAno / metaDespAno) * 100 : 0;
                        if (pct > 100) return <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold bg-black/20 text-white/90 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" /> Limite ultrapassado</span>;
                        if (pct >= 85) return <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full"><Zap className="w-3 h-3" /> Próximo do limite ({pct.toFixed(0)}%)</span>;
                        return <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> Dentro do limite ({pct.toFixed(0)}%)</span>;
                      })()}
                    </div>
                  </div>
                </div>
                {expandedCharts.includes("despesas-anual") &&
                  renderBarChart(
                    barChartDataDespesasAnual,
                    "Despesas Anuais: Meta vs Real",
                  )}
              </div>

              {/* Card Saldo Anual */}
              <div className="space-y-4">
                <div
                  className={`p-6 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:-translate-y-1 ${
                    lucroLiquidoAno >= 0 ? "bg-gradient-to-br from-emerald-400 to-green-500" : "bg-gradient-to-br from-red-400 to-red-500"
                  }`}
                  onClick={() => toggleChart("saldo-anual")}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white text-opacity-80 uppercase tracking-wide">
                        Saldo Anual
                      </p>
                      <p className="text-2xl font-bold mt-1 text-white">
                        R${" "}
                        {lucroLiquidoAno.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      <span className={`inline-flex items-center gap-1 mt-1 text-xs font-bold px-2 py-0.5 rounded-full ${lucroLiquidoAno >= 0 ? "bg-white/20 text-white" : "bg-black/20 text-white/90"}`}>
                        {lucroLiquidoAno >= 0 ? <><CheckCircle2 className="w-3 h-3" /> Positivo</> : <><AlertTriangle className="w-3 h-3" /> Negativo</>}
                      </span>
                    </div>
                  </div>
                </div>
                {expandedCharts.includes("saldo-anual") &&
                  renderBarChart(
                    barChartDataSaldoAnual,
                    "Resultado Anual: Projetado vs Real",
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Evolução Mensal e Categorias de Despesas */}
        <div className="bg-gradient-to-br from-slate-50/80 to-gray-50/60 dark:from-gray-800 dark:to-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-gray-600" />
            Análise do Ano
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-600">
              {new Date().getFullYear()}
            </span>
          </h2>
          {renderLineChart()}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {renderPieChart(pieChartDataAnual, `Receitas vs Despesas — Ano ${new Date().getFullYear()}`)}
            {renderPieChartCategorias()}
          </div>
        </div>

        {/* Lista de Transações Recentes */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-gray-600" />
            Transações Recentes
          </h2>

          {transacoesRecentes.length > 0 && (() => {
            const rec = transacoesRecentes.filter((t) => isReceita(t.type));
            const desp = transacoesRecentes.filter((t) => !isReceita(t.type));
            const totalRec = rec.reduce((s, t) => s + (Number(t.value) || 0), 0);
            const totalDesp = desp.reduce((s, t) => s + (Number(t.value) || 0), 0);
            return (
              <div className="flex flex-wrap gap-3 mb-2">
                <span className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  {rec.length} receita{rec.length !== 1 ? "s" : ""} · +R$ {totalRec.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
                <span className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm font-bold px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  {desp.length} despesa{desp.length !== 1 ? "s" : ""} · -R$ {totalDesp.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
                <span className={`flex items-center gap-2 border text-sm font-bold px-3 py-1.5 rounded-full ${(totalRec - totalDesp) >= 0 ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-orange-50 border-orange-200 text-orange-700"}`}>
                  Saldo: {(totalRec - totalDesp) >= 0 ? "+" : ""}R$ {(totalRec - totalDesp).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            );
          })()}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {transacoesRecentes.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">Nenhuma transação encontrada.</p>
                <p className="text-sm text-gray-400 mt-1">
                  Adicione suas primeiras transações para vê-las aqui.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {transacoesRecentes.map((transacao, index) => (
                  <div
                    key={index}
                    className="p-4 hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            isReceita(transacao.type)
                              ? "bg-emerald-500"
                              : "bg-red-500"
                          }`}
                        ></div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate">
                            {transacao.description}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {transacao.category}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p
                          className={`font-bold whitespace-nowrap ${
                            isReceita(transacao.type)
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {isReceita(transacao.type) ? "+" : "-"}R${" "}
                          {(Number(transacao.value) || 0).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        <p className="text-sm text-gray-500 whitespace-nowrap">
                          {formatDateToDisplay(transacao.date)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => { setActiveTab("transactions"); window.scrollTo({ top: 0, behavior: "instant" }); }}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-700 dark:to-indigo-800 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 group"
              >
                <DollarSign className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                Ver todas as transações
                <ArrowUpCircle className="h-5 w-5 rotate-90 group-hover:translate-x-1 transition-all duration-300" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Metas da projeção por mês (com fallback quando projeção não carregada)
  const getProjectionMetasForMonth = (monthIndex: number) => {
    const snap = projectionSnapshot;
    const fallback = {
      faturamentoTotal: mesesMetas[monthIndex]?.meta ?? 30000,
      faturamentoVarejo: 18000,
      faturamentoAtacado: 12000,
      despesasTotal: 15000,
      despesasFixo: 4500,
      despesasVariável: 10500,
      investimentosGerais: 2000,
      investimentosMkt: 3000,
    };
    if (!snap) return fallback;

    const rev =
      snap.revenueTotals?.previsto?.[monthIndex] ?? fallback.faturamentoTotal;
    const fix =
      snap.fixedExpenses?.previsto?.[monthIndex] ?? fallback.despesasFixo;
    const varExp =
      snap.variableExpenses?.previsto?.[monthIndex] ??
      fallback.despesasVariável;
    const inv =
      snap.investments?.previsto?.[monthIndex] ?? fallback.investimentosGerais;
    const mkt =
      snap.mktTotals?.previsto?.[monthIndex] ?? fallback.investimentosMkt;

    // Faturamento por stream (Varejo/Atacado) - ordem: primeiro stream, segundo stream
    const streams =
      snap.config?.revenueStreams?.filter((s: any) => s?.isActive !== false) ||
      [];
    const revStreams = snap.revenue?.streams || {};
    let varejo = fallback.faturamentoVarejo;
    let atacado = fallback.faturamentoAtacado;
    if (streams.length >= 1 && revStreams[streams[0].id]?.previsto) {
      atacado = Number(revStreams[streams[0].id].previsto[monthIndex]) || 0;
    }
    if (streams.length >= 2 && revStreams[streams[1].id]?.previsto) {
      varejo = Number(revStreams[streams[1].id].previsto[monthIndex]) || 0;
    }
    // Se só tem um stream ou nomes diferentes, usar proporções do total
    if (streams.length < 2 || (atacado === 0 && varejo === 0)) {
      varejo = rev * 0.6;
      atacado = rev * 0.4;
    }

    return {
      faturamentoTotal: rev,
      faturamentoVarejo: varejo,
      faturamentoAtacado: atacado,
      despesasTotal: fix + varExp,
      despesasFixo: fix,
      despesasVariável: varExp,
      investimentosGerais: inv,
      investimentosMkt: mkt,
    };
  };

  // Metas anuais da projeção (soma dos 12 meses)
  const getProjectionMetasAnual = () => {
    let fatTotal = 0,
      fatVarejo = 0,
      fatAtacado = 0,
      desTotal = 0,
      desFixo = 0,
      desVar = 0,
      inv = 0,
      mkt = 0;
    for (let i = 0; i < 12; i++) {
      const p = getProjectionMetasForMonth(i);
      fatTotal += p.faturamentoTotal;
      fatVarejo += p.faturamentoVarejo;
      fatAtacado += p.faturamentoAtacado;
      desTotal += p.despesasTotal;
      desFixo += p.despesasFixo;
      desVar += p.despesasVariável;
      inv += p.investimentosGerais;
      mkt += p.investimentosMkt;
    }
    return {
      faturamentoTotal: fatTotal,
      faturamentoVarejo: fatVarejo,
      faturamentoAtacado: fatAtacado,
      despesasTotal: desTotal,
      despesasFixo: desFixo,
      despesasVariável: desVar,
      investimentosGerais: inv,
      investimentosMkt: mkt,
    };
  };

  // Valores reais por categoria das transações do mês
  const getReaisByCategoryForMonth = (monthIndex: number) => {
    const currentYear = new Date().getFullYear();
    const monthTransactions = transactions.filter((t) => {
      if (!t.date) return false;
      const { month, year } = getMonthYearFromDate(t.date);
      return month === monthIndex && year === currentYear;
    });
    const receitas = monthTransactions.filter((t) => isReceita(t.type));
    const despesas = monthTransactions.filter((t) => isDespesa(t.type));

    const sum = (arr: any[], pred?: (t: any) => boolean) =>
      (pred ? arr.filter(pred) : arr).reduce(
        (s, t) => s + (Number(t.value) || 0),
        0,
      );

    const catMatch = (c: string) => (t: any) =>
      (t.category || "").toLowerCase().includes(c.toLowerCase());

    return {
      totalReceitas: sum(receitas),
      receitasVarejo: sum(receitas, catMatch("Varejo")),
      receitasAtacado: sum(receitas, catMatch("Atacado")),
      totalDespesas: sum(despesas),
      despesasFixo: sum(despesas, catMatch("Fixo")),
      despesasVariável: sum(despesas, catMatch("Variável")),
      investimentos: sum(
        despesas,
        (t) => catMatch("Investimento")(t) || catMatch("Investimentos")(t),
      ),
      mkt: sum(despesas, catMatch("Mkt")),
    };
  };

  // Valores reais anuais por categoria
  const getReaisByCategoryAnual = () => {
    let tr = 0,
      rv = 0,
      ra = 0,
      td = 0,
      df = 0,
      dv = 0,
      inv = 0,
      mkt = 0;
    for (let i = 0; i < 12; i++) {
      const r = getReaisByCategoryForMonth(i);
      tr += r.totalReceitas;
      rv += r.receitasVarejo;
      ra += r.receitasAtacado;
      td += r.totalDespesas;
      df += r.despesasFixo;
      dv += r.despesasVariável;
      inv += r.investimentos;
      mkt += r.mkt;
    }
    return {
      totalReceitas: tr,
      receitasVarejo: rv,
      receitasAtacado: ra,
      totalDespesas: td,
      despesasFixo: df,
      despesasVariável: dv,
      investimentos: inv,
      mkt,
    };
  };

  // Função para renderizar apenas o conteúdo do mês (sem título)
  const renderMonthContent = (
    _monthName: string,
    monthIndex: number,
    metaValue: number,
  ) => {
    const currentYear = new Date().getFullYear();
    const { receitas, despesas, resultado } = calculateTotalsForMonth(
      monthIndex,
      currentYear,
    );
    const totalReceitas = receitas;
    const totalDespesas = despesas;

    const proj = getProjectionMetasForMonth(monthIndex);
    const reais = getReaisByCategoryForMonth(monthIndex);

    // Percentual geral de faturamento (para o donut central)
    const pctFatReal = metaValue > 0 ? (totalReceitas / metaValue) * 100 : 0;
    const pctFaturamento = pctFatReal;
    const pctFatDisplay = pctFatReal.toFixed(0);

    // Helper: badge de status para cards de receita (atingiu = verde, andamento = amarelo)
    const badgeReceita = (real: number, meta: number) => {
      if (meta <= 0) return null;
      const pct = (real / meta) * 100;
      if (pct >= 100) return (
        <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3" /> Atingido
        </span>
      );
      if (pct >= 75) return (
        <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
          <Zap className="w-3 h-3" /> Em andamento
        </span>
      );
      return (
        <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
          <XCircle className="w-3 h-3" /> Abaixo
        </span>
      );
    };

    // Helper: badge de status para cards de despesa (dentro = verde, estourado = vermelho)
    const badgeDespesa = (real: number, limite: number) => {
      if (limite <= 0) return null;
      const pct = (real / limite) * 100;
      if (pct > 100) return (
        <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
          <AlertTriangle className="w-3 h-3" /> Estourado
        </span>
      );
      if (pct >= 85) return (
        <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
          <AlertTriangle className="w-3 h-3" /> Próximo do limite
        </span>
      );
      return (
        <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3" /> Dentro do limite
        </span>
      );
    };

    // Helper: barra de progresso com cor dinâmica
    const renderBar = (real: number, meta: number, tipo: "receita" | "despesa" | "investimento") => {
      const pct = meta > 0 ? (real / meta) * 100 : 0;
      const acimaDe100 = pct > 100;
      let barColor = "";
      if (tipo === "receita") {
        barColor = acimaDe100 ? "from-emerald-600 to-emerald-700" : pct >= 75 ? "from-emerald-500 to-emerald-600" : "from-amber-400 to-amber-500";
      } else if (tipo === "despesa") {
        barColor = acimaDe100 ? "from-red-600 to-red-800" : pct >= 85 ? "from-orange-500 to-orange-600" : "from-emerald-500 to-emerald-600";
      } else {
        barColor = acimaDe100 ? "from-blue-600 to-blue-800" : "from-blue-500 to-blue-600";
      }
      return (
        <div className="w-full bg-white/40 rounded-full h-3 relative overflow-hidden">
          <div
            className={`bg-gradient-to-r ${barColor} h-3 rounded-full transition-all duration-500`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      );
    };

    // Helper: rodapé dos cards com texto claro
    const cardFooter = (real: number, meta: number, tipo: "receita" | "despesa" | "investimento") => {
      const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
      if (tipo === "receita" || tipo === "investimento") {
        const pctCard = meta > 0 ? (real / meta) * 100 : 0;
        return (
          <div className="text-xs text-white/70 font-medium flex justify-between items-center">
            <span>Meta: <span className="font-bold text-white">R$ {fmt(meta)}</span></span>
            {pctCard >= 100
              ? <span className="text-yellow-200 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Superada</span>
              : <span className="font-bold text-white/90">{pctCard.toFixed(0)}% atingido</span>
            }
          </div>
        );
      } else {
        const excesso = Math.max(0, real - meta);
        const disponivel = Math.max(0, meta - real);
        return (
          <div className="text-xs text-white/70 font-medium flex justify-between">
            <span>Realizado: <span className="font-bold text-white">R$ {fmt(real)}</span></span>
            {excesso > 0
              ? <span className="text-yellow-200 font-bold">Excesso: R$ {fmt(excesso)}</span>
              : <span>Disponível: <span className="font-bold text-yellow-200">R$ {fmt(disponivel)}</span></span>
            }
          </div>
        );
      }
    };

    return (
      <div className="space-y-6">
        {/* DONUT CENTRAL — percentual geral de faturamento */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Donut */}
            {(() => {
              const color = pctFaturamento >= 100 ? "#22c55e" : pctFaturamento >= 75 ? "#f59e0b" : "#ef4444";
              const pct = pctFaturamento >= 100 ? 100 : pctFaturamento;
              const deg = (pct / 100) * 360;
              const trackColor = isDark ? "#374151" : "#e5e7eb";
              const innerBg = isDark ? "#1e293b" : "white";
              return (
                <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 220, height: 220 }}>
                  <div style={{
                    width: 200, height: 200, borderRadius: "50%",
                    background: `conic-gradient(${color} ${deg}deg, ${trackColor} ${deg}deg)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <div style={{
                      width: 148, height: 148, borderRadius: "50%",
                      background: innerBg,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    }}>
                      <span className={`text-3xl font-black`} style={{ color }}>
                        {pctFatDisplay}%
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">da meta</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Resumo ao lado do donut */}
            {(() => {
              const margem = totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas) * 100 : 0;
              return (
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-md">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Meta</div>
                    <div className="text-xl font-black text-gray-800">R$ {metaValue.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-md">
                    <div className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1">Realizado</div>
                    <div className="text-xl font-black text-emerald-800">R$ {totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-md">
                    <div className={`text-xs font-bold uppercase tracking-wide mb-1 ${resultado >= 0 ? "text-blue-600" : "text-red-600"}`}>Resultado</div>
                    <div className={`text-xl font-black ${resultado >= 0 ? "text-blue-800" : "text-red-800"}`}>
                      {resultado >= 0 ? "+" : ""}R$ {resultado.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-md">
                    <div className={`text-xs font-bold uppercase tracking-wide mb-1 ${margem >= 0 ? "text-violet-600" : "text-red-600"}`}>Margem</div>
                    <div className={`text-xl font-black ${margem >= 0 ? "text-violet-800" : "text-red-800"}`}>{margem.toFixed(1)}%</div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* 1. RESULTADO */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
            <PieChart className="w-6 h-6 text-gray-600" />
            Resultado
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quadrante Financeiro */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
              <div className="space-y-3">
                {/* RECEITA */}
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-emerald-700">RECEITA</span>
                  <span className="font-bold text-emerald-800">
                    R$ {totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* DESPESA */}
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-red-700">DESPESA</span>
                  <span className="font-bold text-red-800">
                    -R$ {totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* MARGEM LÍQUIDA */}
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-violet-700">MARGEM LÍQUIDA</span>
                  <span className="font-bold text-violet-800">
                    {totalReceitas > 0 ? (((totalReceitas - totalDespesas) / totalReceitas) * 100).toFixed(1) : "0.0"}%
                  </span>
                </div>

                {/* TOTAL GERAL */}
                <div className={`flex justify-between items-center py-4 px-4 rounded-lg border-2 mt-4 ${resultado >= 0 ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300"}`}>
                  <span className="font-bold text-gray-900 text-lg">Total geral</span>
                  <span className={`font-bold text-xl ${resultado >= 0 ? "text-emerald-800" : "text-red-800"}`}>
                    R$ {resultado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Quadrante META DO MÊS */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 pb-2 border-b-2 border-gray-300">
                  <div></div>
                  <div className="text-center font-bold text-gray-800 text-xl">R$</div>
                  <div className="text-center font-bold text-gray-800 text-xl">%</div>
                </div>

                {/* META */}
                <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200">
                  <div className="font-bold text-gray-800 italic">META</div>
                  <div className="text-center font-bold text-gray-800">
                    R$ {metaValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-center font-bold text-gray-800">100%</div>
                </div>

                {/* ALCANÇADO */}
                <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-200">
                  <div className="font-bold text-emerald-700 italic">ALCANÇADO</div>
                  <div className="text-center font-bold text-emerald-800">
                    R$ {totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-center font-bold text-emerald-800">
                    {metaValue > 0 ? ((totalReceitas / metaValue) * 100).toFixed(0) : 0}%
                  </div>
                </div>

                {/* RESTANTE */}
                <div className="grid grid-cols-3 gap-4 py-3">
                  <div className="font-bold text-red-700 italic">RESTANTE</div>
                  <div className="text-center font-bold text-red-800">
                    {totalReceitas >= metaValue ? "—" : `-R$ ${Math.max(0, metaValue - totalReceitas).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  </div>
                  <div className="text-center font-bold text-red-800">
                    {totalReceitas >= metaValue ? "—" : `${Math.max(0, 100 - (metaValue > 0 ? (totalReceitas / metaValue) * 100 : 0)).toFixed(0)}%`}
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
            {(() => {
              const diff = totalReceitas - reais.totalReceitas;
              if (diff > 0.01) return (
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-1 rounded-lg">
                  <AlertTriangle className="w-3 h-3" /> R$ {diff.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} sem categoria
                </span>
              );
              return null;
            })()}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Faturamento TOTAL */}
            <div className="bg-gradient-to-br from-emerald-400 to-green-500 p-6 rounded-2xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">Faturamento TOTAL</h3>
                {badgeReceita(reais.totalReceitas, proj.faturamentoTotal)}
              </div>
              <div className="text-2xl font-bold text-white mb-4">
                R$ {reais.totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-white/80 mb-1">
                  <span>Progresso</span>
                  <span>{proj.faturamentoTotal > 0 ? ((reais.totalReceitas / proj.faturamentoTotal) * 100).toFixed(0) : 0}%</span>
                </div>
                {renderBar(reais.totalReceitas, proj.faturamentoTotal, "receita")}
              </div>
              {cardFooter(reais.totalReceitas, proj.faturamentoTotal, "receita")}
            </div>

            {/* Faturamento Varejo */}
            <div className="bg-gradient-to-br from-green-400 to-green-500 p-6 rounded-2xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">Faturamento Varejo</h3>
                {badgeReceita(reais.receitasVarejo, proj.faturamentoVarejo)}
              </div>
              <div className="text-2xl font-bold text-white mb-4">
                R$ {reais.receitasVarejo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-white/80 mb-1">
                  <span>Progresso</span>
                  <span>{proj.faturamentoVarejo > 0 ? ((reais.receitasVarejo / proj.faturamentoVarejo) * 100).toFixed(0) : 0}%</span>
                </div>
                {renderBar(reais.receitasVarejo, proj.faturamentoVarejo, "receita")}
              </div>
              {cardFooter(reais.receitasVarejo, proj.faturamentoVarejo, "receita")}
            </div>

            {/* Faturamento Atacado */}
            <div className="bg-gradient-to-br from-teal-400 to-teal-500 p-6 rounded-2xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">Faturamento Atacado</h3>
                {badgeReceita(reais.receitasAtacado, proj.faturamentoAtacado)}
              </div>
              <div className="text-2xl font-bold text-white mb-4">
                R$ {reais.receitasAtacado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-white/80 mb-1">
                  <span>Progresso</span>
                  <span>{proj.faturamentoAtacado > 0 ? ((reais.receitasAtacado / proj.faturamentoAtacado) * 100).toFixed(0) : 0}%</span>
                </div>
                {renderBar(reais.receitasAtacado, proj.faturamentoAtacado, "receita")}
              </div>
              {cardFooter(reais.receitasAtacado, proj.faturamentoAtacado, "receita")}
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
            {/* Despesas TOTAL */}
            <div className="bg-gradient-to-br from-red-400 to-red-500 p-6 rounded-2xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">Despesas TOTAL</h3>
                {badgeDespesa(reais.totalDespesas, proj.despesasTotal)}
              </div>
              <div className="text-2xl font-bold text-white mb-4">
                R$ {reais.totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-white/80 mb-1">
                  <span>Meta</span>
                  <span>{proj.despesasTotal > 0 ? ((reais.totalDespesas / proj.despesasTotal) * 100).toFixed(0) : 0}%</span>
                </div>
                {renderBar(reais.totalDespesas, proj.despesasTotal, "despesa")}
              </div>
              {cardFooter(reais.totalDespesas, proj.despesasTotal, "despesa")}
            </div>

            {/* Despesas Variáveis */}
            <div className="bg-gradient-to-br from-orange-400 to-orange-500 p-6 rounded-2xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">Despesas Variáveis</h3>
                {badgeDespesa(reais.despesasVariável, proj.despesasVariável)}
              </div>
              <div className="text-2xl font-bold text-white mb-4">
                R$ {reais.despesasVariável.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-white/80 mb-1">
                  <span>Meta</span>
                  <span>{proj.despesasVariável > 0 ? ((reais.despesasVariável / proj.despesasVariável) * 100).toFixed(0) : 0}%</span>
                </div>
                {renderBar(reais.despesasVariável, proj.despesasVariável, "despesa")}
              </div>
              {cardFooter(reais.despesasVariável, proj.despesasVariável, "despesa")}
            </div>

            {/* Despesas Fixas */}
            <div className="bg-gradient-to-br from-amber-400 to-amber-500 p-6 rounded-2xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">Despesas Fixas</h3>
                {badgeDespesa(reais.despesasFixo, proj.despesasFixo)}
              </div>
              <div className="text-2xl font-bold text-white mb-4">
                R$ {reais.despesasFixo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-white/80 mb-1">
                  <span>Meta</span>
                  <span>{proj.despesasFixo > 0 ? ((reais.despesasFixo / proj.despesasFixo) * 100).toFixed(0) : 0}%</span>
                </div>
                {renderBar(reais.despesasFixo, proj.despesasFixo, "despesa")}
              </div>
              {cardFooter(reais.despesasFixo, proj.despesasFixo, "despesa")}
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
            {/* Investimentos Gerais */}
            <div className="bg-gradient-to-br from-blue-400 to-blue-500 p-6 rounded-2xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">Investimentos Gerais</h3>
                {badgeReceita(reais.investimentos, proj.investimentosGerais)}
              </div>
              <div className="text-2xl font-bold text-white mb-4">
                R$ {reais.investimentos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-white/80 mb-1">
                  <span>Meta</span>
                  <span>{proj.investimentosGerais > 0 ? ((reais.investimentos / proj.investimentosGerais) * 100).toFixed(0) : 0}%</span>
                </div>
                {renderBar(reais.investimentos, proj.investimentosGerais, "investimento")}
              </div>
              {cardFooter(reais.investimentos, proj.investimentosGerais, "investimento")}
            </div>

            {/* Investimentos em MKT */}
            <div className="bg-gradient-to-br from-purple-400 to-purple-500 p-6 rounded-2xl shadow-lg text-white">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">Investimentos em MKT</h3>
                {badgeReceita(reais.mkt, proj.investimentosMkt)}
              </div>
              <div className="text-2xl font-bold text-white mb-4">
                R$ {reais.mkt.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-white/80 mb-1">
                  <span>Meta</span>
                  <span>{proj.investimentosMkt > 0 ? ((reais.mkt / proj.investimentosMkt) * 100).toFixed(0) : 0}%</span>
                </div>
                {renderBar(reais.mkt, proj.investimentosMkt, "investimento")}
              </div>
              {cardFooter(reais.mkt, proj.investimentosMkt, "investimento")}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Função para renderizar um mês específico com título
  const renderMonth = (
    monthName: string,
    monthIndex: number,
    metaValue: number,
  ) => {
    const currentYear = new Date().getFullYear();
    return (
      <div key={monthName} className="space-y-6 mb-12">
        {/* Título Principal do Mês */}
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-6 rounded-2xl shadow-lg">
          <h2 className="text-3xl font-bold text-white text-center uppercase tracking-wider">
            {monthName} - {currentYear}
          </h2>
        </div>

        {/* Conteúdo do Mês */}
        {renderMonthContent(monthName, monthIndex, metaValue)}
      </div>
    );
  };

  // Função para renderizar o total do ano
  const renderTotalAno = () => {
    const currentYear = new Date().getFullYear();

    // Usar função auxiliar do escopo do componente para evitar problemas de timezone
    const transacoesDoAno = transactions.filter((t) => {
      if (!t.date) return false;
      return getYearFromDate(t.date) === currentYear;
    });

    const totalReceitasAno = transacoesDoAno
      .filter((t) => isReceita(t.type))
      .reduce((sum, t) => sum + (Number(t.value) || 0), 0);
    const totalDespesasAno = transacoesDoAno
      .filter((t) => isDespesa(t.type))
      .reduce((sum, t) => sum + (Number(t.value) || 0), 0);

    // Metas totais do ano (valores da projeção)
    const metaTotalAno = mesesMetas.reduce((sum, m) => sum + m.meta, 0);
    const margemLiquidaAno = totalReceitasAno > 0 ? ((totalReceitasAno - totalDespesasAno) / totalReceitasAno) * 100 : 0;

    // Metas anuais da projeção e valores reais por categoria
    const projAnual = getProjectionMetasAnual();
    const reaisAnual = getReaisByCategoryAnual();

    return (
      <div className="space-y-6 mb-12">
        {/* Título Principal do Ano */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 rounded-2xl shadow-xl">
          <h2 className="text-3xl font-bold text-white text-center uppercase tracking-wider">
            TOTAL DO ANO - {currentYear}
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
            <div className="bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-800 dark:to-gray-800 p-6 rounded-2xl shadow-lg border border-purple-200 dark:border-gray-700">
              <div className="space-y-4">
                {/* REFORÇO DE CAIXA — TODO: implementar cálculo de reforço de caixa */}
                <div className="flex justify-between items-center py-3 border-b-2 border-purple-200 dark:border-gray-700 opacity-50" title="Funcionalidade em desenvolvimento">
                  <span className="font-bold text-purple-800 text-lg">
                    REFORÇO DE CAIXA
                  </span>
                  <span className="font-bold text-purple-900 text-lg text-xs font-normal italic">
                    Em breve
                  </span>
                </div>

                {/* SAÍDA DE CAIXA — TODO: implementar cálculo de saída de caixa */}
                <div className="flex justify-between items-center py-3 border-b-2 border-purple-200 dark:border-gray-700 opacity-50" title="Funcionalidade em desenvolvimento">
                  <span className="font-bold text-purple-800 text-lg">
                    SAÍDA DE CAIXA
                  </span>
                  <span className="font-bold text-purple-900 text-lg text-xs font-normal italic">
                    Em breve
                  </span>
                </div>

                {/* RECEITA ANUAL */}
                <div className="flex justify-between items-center py-3 border-b-2 border-purple-200 dark:border-gray-700">
                  <span className="font-bold text-emerald-700 text-lg">
                    RECEITA ANUAL
                  </span>
                  <span className="font-bold text-emerald-800 text-lg">
                    R${" "}
                    {totalReceitasAno.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {/* DESPESA ANUAL */}
                <div className="flex justify-between items-center py-3 border-b-2 border-purple-200 dark:border-gray-700">
                  <span className="font-bold text-red-700 text-lg">
                    DESPESA ANUAL
                  </span>
                  <span className="font-bold text-red-800 text-lg">
                    -R${" "}
                    {totalDespesasAno.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {/* MARGEM LÍQUIDA */}
                <div className="flex justify-between items-center py-3 border-b-2 border-purple-200 dark:border-gray-700">
                  <span className="font-bold text-violet-700 text-lg">
                    MARGEM LÍQUIDA
                  </span>
                  <span className={`font-bold text-lg ${margemLiquidaAno >= 0 ? "text-violet-800" : "text-red-800"}`}>
                    {margemLiquidaAno.toFixed(1)}%
                  </span>
                </div>

                {/* TOTAL GERAL ANUAL */}
                <div className="flex justify-between items-center py-6 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-gray-700 dark:to-gray-700 px-6 rounded-xl border-3 border-purple-400 dark:border-gray-600 mt-6">
                  <span className="font-bold text-purple-900 dark:text-purple-200 text-2xl">
                    Total Geral Anual
                  </span>
                  <span
                    className={`font-bold text-2xl ${
                      totalReceitasAno - totalDespesasAno >= 0
                        ? "text-emerald-800"
                        : "text-red-800"
                    }`}
                  >
                    R${" "}
                    {(totalReceitasAno - totalDespesasAno).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Quadrante META ANUAL */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-800 dark:to-gray-800 p-6 rounded-2xl shadow-lg border border-purple-200 dark:border-gray-700">
              <div className="space-y-6">
                {/* Cabeçalho com colunas R$ e % */}
                <div className="grid grid-cols-3 gap-4 pb-3 border-b-3 border-purple-400 dark:border-gray-600">
                  <div className="text-center">
                    <span className="font-bold text-purple-700 text-xl"></span>
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-purple-900 dark:text-purple-300 text-2xl">
                      R$
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-purple-900 dark:text-purple-300 text-2xl">
                      %
                    </span>
                  </div>
                </div>

                {/* META ANUAL */}
                <div className="grid grid-cols-3 gap-4 py-4 border-b-2 border-purple-200 dark:border-gray-700">
                  <div className="font-bold text-purple-800 dark:text-purple-300 italic text-lg">
                    META ANUAL
                  </div>
                  <div className="text-center font-bold text-purple-900 dark:text-purple-200 text-lg">
                    R${" "}
                    {metaTotalAno.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-center font-bold text-purple-900 dark:text-purple-200 text-lg">
                    100%
                  </div>
                </div>

                {/* ALCANÇADO ANUAL */}
                <div className="grid grid-cols-3 gap-4 py-4 border-b-2 border-purple-200 dark:border-gray-700">
                  <div className="font-bold text-emerald-700 italic text-lg">
                    ALCANÇADO
                  </div>
                  <div className="text-center font-bold text-emerald-800 text-lg">
                    R${" "}
                    {totalReceitasAno.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-center font-bold text-emerald-800 text-lg">
                    {metaTotalAno > 0
                      ? ((totalReceitasAno / metaTotalAno) * 100).toFixed(0)
                      : 0}
                    %
                  </div>
                </div>

                {/* RESTANTE ANUAL */}
                <div className="grid grid-cols-3 gap-4 py-4">
                  <div className="font-bold text-red-700 italic text-lg">
                    RESTANTE
                  </div>
                  <div className="text-center font-bold text-red-800 text-lg">
                    {totalReceitasAno >= metaTotalAno ? "—" : `-R$ ${Math.max(0, metaTotalAno - totalReceitasAno).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  </div>
                  <div className="text-center font-bold text-red-800 text-lg">
                    {totalReceitasAno >= metaTotalAno ? "—" : `${(metaTotalAno > 0 ? Math.max(0, 100 - (totalReceitasAno / metaTotalAno) * 100) : 100).toFixed(0)}%`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. FATURAMENTO ANUAL */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            Faturamento Anual
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-emerald-800 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-700 shadow-lg">
              <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100 mb-6">
                Faturamento TOTAL ANUAL
              </h3>
              <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-100 mb-4">
                R${" "}
                {totalReceitasAno.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>

              {/* Barra de Progresso Anual */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-1">
                  <span>Progresso Anual</span>
                  <span>
                    {projAnual.faturamentoTotal > 0
                      ? (
                          (totalReceitasAno / projAnual.faturamentoTotal) *
                          100
                        ).toFixed(0)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-emerald-300 dark:bg-emerald-700 rounded-full h-3 relative">
                  {/* Barra base (0-100%) */}
                  <div
                    className="bg-gradient-to-r from-emerald-600 to-emerald-700 h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, projAnual.faturamentoTotal > 0 ? (totalReceitasAno / projAnual.faturamentoTotal) * 100 : 0)}%`,
                    }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {projAnual.faturamentoTotal > 0 &&
                    (totalReceitasAno / projAnual.faturamentoTotal) * 100 >
                      100 && (
                      <div
                        className="absolute top-0 left-0 bg-gradient-to-r from-emerald-800 to-emerald-900 h-3 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (totalReceitasAno / projAnual.faturamentoTotal) * 100 - 100)}%`,
                        }}
                      ></div>
                    )}
                </div>
              </div>

              {/* Valores Alcançado/Restante */}
              <div className="text-sm text-emerald-800 dark:text-emerald-200 font-medium">
                R${" "}
                {totalReceitasAno.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}{" "}
                / R${" "}
                {Math.max(
                  0,
                  projAnual.faturamentoTotal - totalReceitasAno,
                ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 p-6 rounded-2xl border border-green-200 dark:border-green-700 shadow-lg">
              <h3 className="text-xl font-bold text-green-900 dark:text-green-100 mb-6">
                Faturamento Varejo Anual
              </h3>
              <div className="text-3xl font-bold text-green-900 dark:text-green-100 mb-4">
                R${" "}
                {reaisAnual.receitasVarejo.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>

              {/* Barra de Progresso Anual */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                  <span>Progresso Anual</span>
                  <span>
                    {projAnual.faturamentoVarejo > 0
                      ? (
                          (reaisAnual.receitasVarejo /
                            projAnual.faturamentoVarejo) *
                          100
                        ).toFixed(0)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-green-300 dark:bg-green-700 rounded-full h-3 relative">
                  {/* Barra base (0-100%) */}
                  <div
                    className="bg-gradient-to-r from-green-600 to-green-700 h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, projAnual.faturamentoVarejo > 0 ? (reaisAnual.receitasVarejo / projAnual.faturamentoVarejo) * 100 : 0)}%`,
                    }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {projAnual.faturamentoVarejo > 0 &&
                    (reaisAnual.receitasVarejo / projAnual.faturamentoVarejo) *
                      100 >
                      100 && (
                      <div
                        className="absolute top-0 left-0 bg-gradient-to-r from-green-800 to-green-900 h-3 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (reaisAnual.receitasVarejo / projAnual.faturamentoVarejo) * 100 - 100)}%`,
                        }}
                      ></div>
                    )}
                </div>
              </div>

              {/* Valores Alcançado/Restante */}
              <div className="text-sm text-green-800 dark:text-green-200 font-medium">
                R${" "}
                {reaisAnual.receitasVarejo.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}{" "}
                / R${" "}
                {Math.max(
                  0,
                  projAnual.faturamentoVarejo - reaisAnual.receitasVarejo,
                ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-100 to-teal-200 dark:from-teal-900 dark:to-teal-800 p-6 rounded-2xl border border-teal-200 dark:border-teal-700 shadow-lg">
              <h3 className="text-xl font-bold text-teal-900 dark:text-teal-100 mb-6">
                Faturamento Atacado Anual
              </h3>
              <div className="text-3xl font-bold text-teal-900 dark:text-teal-100 mb-4">
                R${" "}
                {reaisAnual.receitasAtacado.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>

              {/* Barra de Progresso Anual */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-teal-800 dark:text-teal-200 mb-1">
                  <span>Progresso Anual</span>
                  <span>
                    {projAnual.faturamentoAtacado > 0
                      ? (
                          (reaisAnual.receitasAtacado /
                            projAnual.faturamentoAtacado) *
                          100
                        ).toFixed(0)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-teal-300 dark:bg-teal-700 rounded-full h-3 relative">
                  {/* Barra base (0-100%) */}
                  <div
                    className="bg-gradient-to-r from-teal-600 to-teal-700 h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, projAnual.faturamentoAtacado > 0 ? (reaisAnual.receitasAtacado / projAnual.faturamentoAtacado) * 100 : 0)}%`,
                    }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {projAnual.faturamentoAtacado > 0 &&
                    (reaisAnual.receitasAtacado /
                      projAnual.faturamentoAtacado) *
                      100 >
                      100 && (
                      <div
                        className="absolute top-0 left-0 bg-gradient-to-r from-teal-800 to-teal-900 h-3 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (reaisAnual.receitasAtacado / projAnual.faturamentoAtacado) * 100 - 100)}%`,
                        }}
                      ></div>
                    )}
                </div>
              </div>

              {/* Valores Alcançado/Restante */}
              <div className="text-sm text-teal-800 dark:text-teal-200 font-medium">
                R${" "}
                {reaisAnual.receitasAtacado.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}{" "}
                / R${" "}
                {Math.max(
                  0,
                  projAnual.faturamentoAtacado - reaisAnual.receitasAtacado,
                ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* 3. DESPESAS ANUAIS */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-red-800 dark:text-red-300 flex items-center gap-3">
            <TrendingDown className="w-8 h-8 text-red-600 dark:text-red-400" />
            Despesas Anuais
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900 dark:to-red-800 p-6 rounded-2xl border border-red-200 dark:border-red-700 shadow-lg">
              <h3 className="text-xl font-bold text-red-900 dark:text-red-100 mb-6">
                Despesas TOTAL Anuais
              </h3>
              <div className="text-3xl font-bold text-red-900 dark:text-red-100 mb-4">
                R${" "}
                {totalDespesasAno.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>

              {/* Barra de Progresso Anual */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                  <span>Limite Anual</span>
                  <span>
                    {projAnual.despesasTotal > 0
                      ? (
                          (totalDespesasAno / projAnual.despesasTotal) *
                          100
                        ).toFixed(0)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-red-300 dark:bg-red-700 rounded-full h-3 relative">
                  {/* Barra base (0-100%) */}
                  <div
                    className="bg-gradient-to-r from-red-600 to-red-700 h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, projAnual.despesasTotal > 0 ? (totalDespesasAno / projAnual.despesasTotal) * 100 : 0)}%`,
                    }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {projAnual.despesasTotal > 0 &&
                    (totalDespesasAno / projAnual.despesasTotal) * 100 >
                      100 && (
                      <div
                        className="absolute top-0 left-0 bg-gradient-to-r from-red-800 to-red-900 h-3 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (totalDespesasAno / projAnual.despesasTotal) * 100 - 100)}%`,
                        }}
                      ></div>
                    )}
                </div>
              </div>

              {/* Valores Usado/Restante */}
              <div className="text-sm text-red-800 dark:text-red-200 font-medium">
                R${" "}
                {totalDespesasAno.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}{" "}
                / R${" "}
                {Math.max(
                  0,
                  projAnual.despesasTotal - totalDespesasAno,
                ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800 p-6 rounded-2xl border border-orange-200 dark:border-orange-700 shadow-lg">
              <h3 className="text-xl font-bold text-orange-900 dark:text-orange-100 mb-6">
                Despesas Variáveis Anuais
              </h3>
              <div className="text-3xl font-bold text-orange-900 dark:text-orange-100 mb-4">
                R${" "}
                {reaisAnual.despesasVariável.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>

              {/* Barra de Progresso Anual */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-orange-800 dark:text-orange-200 mb-1">
                  <span>Limite Anual</span>
                  <span>
                    {projAnual.despesasVariável > 0
                      ? (
                          (reaisAnual.despesasVariável /
                            projAnual.despesasVariável) *
                          100
                        ).toFixed(0)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-orange-300 dark:bg-orange-700 rounded-full h-3 relative">
                  {/* Barra base (0-100%) */}
                  <div
                    className="bg-gradient-to-r from-orange-600 to-orange-700 h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, projAnual.despesasVariável > 0 ? (reaisAnual.despesasVariável / projAnual.despesasVariável) * 100 : 0)}%`,
                    }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {projAnual.despesasVariável > 0 &&
                    (reaisAnual.despesasVariável / projAnual.despesasVariável) *
                      100 >
                      100 && (
                      <div
                        className="absolute top-0 left-0 bg-gradient-to-r from-orange-800 to-orange-900 h-3 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (reaisAnual.despesasVariável / projAnual.despesasVariável) * 100 - 100)}%`,
                        }}
                      ></div>
                    )}
                </div>
              </div>

              {/* Valores Usado/Restante */}
              <div className="text-sm text-orange-800 dark:text-orange-200 font-medium">
                R${" "}
                {reaisAnual.despesasVariável.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}{" "}
                / R${" "}
                {Math.max(
                  0,
                  projAnual.despesasVariável - reaisAnual.despesasVariável,
                ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-800 p-6 rounded-2xl border border-amber-200 dark:border-amber-700 shadow-lg">
              <h3 className="text-xl font-bold text-amber-900 dark:text-amber-100 mb-6">
                Despesas Fixas Anuais
              </h3>
              <div className="text-3xl font-bold text-amber-900 dark:text-amber-100 mb-4">
                R${" "}
                {reaisAnual.despesasFixo.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>

              {/* Barra de Progresso Anual */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                  <span>Limite Anual</span>
                  <span>
                    {projAnual.despesasFixo > 0
                      ? (
                          (reaisAnual.despesasFixo / projAnual.despesasFixo) *
                          100
                        ).toFixed(0)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-amber-300 dark:bg-amber-700 rounded-full h-3 relative">
                  {/* Barra base (0-100%) */}
                  <div
                    className="bg-gradient-to-r from-amber-600 to-amber-700 h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, projAnual.despesasFixo > 0 ? (reaisAnual.despesasFixo / projAnual.despesasFixo) * 100 : 0)}%`,
                    }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {projAnual.despesasFixo > 0 &&
                    (reaisAnual.despesasFixo / projAnual.despesasFixo) * 100 >
                      100 && (
                      <div
                        className="absolute top-0 left-0 bg-gradient-to-r from-amber-800 to-amber-900 h-3 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (reaisAnual.despesasFixo / projAnual.despesasFixo) * 100 - 100)}%`,
                        }}
                      ></div>
                    )}
                </div>
              </div>

              {/* Valores Usado/Restante */}
              <div className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                R${" "}
                {reaisAnual.despesasFixo.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}{" "}
                / R${" "}
                {Math.max(
                  0,
                  projAnual.despesasFixo - reaisAnual.despesasFixo,
                ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* 4. INVESTIMENTOS ANUAIS */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-3">
            <ArrowUpCircle className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            Investimentos Anuais
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 p-6 rounded-2xl border border-blue-200 dark:border-blue-700 shadow-lg">
              <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-6">
                Investimentos Gerais Anuais
              </h3>
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-4">
                R${" "}
                {reaisAnual.investimentos.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>

              {/* Barra de Progresso Anual */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                  <span>Meta Anual</span>
                  <span>
                    {projAnual.investimentosGerais > 0
                      ? (
                          (reaisAnual.investimentos /
                            projAnual.investimentosGerais) *
                          100
                        ).toFixed(0)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-blue-300 dark:bg-blue-700 rounded-full h-3 relative">
                  {/* Barra base (0-100%) */}
                  <div
                    className="bg-gradient-to-r from-blue-600 to-blue-700 h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, projAnual.investimentosGerais > 0 ? (reaisAnual.investimentos / projAnual.investimentosGerais) * 100 : 0)}%`,
                    }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {projAnual.investimentosGerais > 0 &&
                    (reaisAnual.investimentos / projAnual.investimentosGerais) *
                      100 >
                      100 && (
                      <div
                        className="absolute top-0 left-0 bg-gradient-to-r from-blue-800 to-blue-900 h-3 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (reaisAnual.investimentos / projAnual.investimentosGerais) * 100 - 100)}%`,
                        }}
                      ></div>
                    )}
                </div>
              </div>

              {/* Valores Alcançado/Restante */}
              <div className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                R${" "}
                {reaisAnual.investimentos.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}{" "}
                / R${" "}
                {Math.max(
                  0,
                  projAnual.investimentosGerais - reaisAnual.investimentos,
                ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 p-6 rounded-2xl border border-purple-200 dark:border-purple-700 shadow-lg">
              <h3 className="text-xl font-bold text-purple-900 dark:text-purple-100 mb-6">
                Investimentos MKT Anuais
              </h3>
              <div className="text-3xl font-bold text-purple-900 dark:text-purple-100 mb-4">
                R${" "}
                {reaisAnual.mkt.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>

              {/* Barra de Progresso Anual */}
              <div className="mb-3">
                <div className="flex justify-between text-sm font-medium text-purple-800 dark:text-purple-200 mb-1">
                  <span>Meta Anual</span>
                  <span>
                    {projAnual.investimentosMkt > 0
                      ? (
                          (reaisAnual.mkt / projAnual.investimentosMkt) *
                          100
                        ).toFixed(0)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-purple-300 dark:bg-purple-700 rounded-full h-3 relative">
                  {/* Barra base (0-100%) */}
                  <div
                    className="bg-gradient-to-r from-purple-600 to-purple-700 h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, projAnual.investimentosMkt > 0 ? (reaisAnual.mkt / projAnual.investimentosMkt) * 100 : 0)}%`,
                    }}
                  ></div>
                  {/* Barra de excesso (>100%) */}
                  {projAnual.investimentosMkt > 0 &&
                    (reaisAnual.mkt / projAnual.investimentosMkt) * 100 >
                      100 && (
                      <div
                        className="absolute top-0 left-0 bg-gradient-to-r from-purple-800 to-purple-900 h-3 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (reaisAnual.mkt / projAnual.investimentosMkt) * 100 - 100)}%`,
                        }}
                      ></div>
                    )}
                </div>
              </div>

              {/* Valores Alcançado/Restante */}
              <div className="text-sm text-purple-800 dark:text-purple-200 font-medium">
                R${" "}
                {reaisAnual.mkt.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}{" "}
                / R${" "}
                {Math.max(
                  0,
                  projAnual.investimentosMkt - reaisAnual.mkt,
                ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Função para exportar transações em PDF
  const exportarTransacoesPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      setIsExportTransacoesModalOpen(false);

      // Obter transações para exportar
      const transacoesParaExportar = exportarFiltradas
        ? getFilteredAndSortedTransactions()
        : transactions;

      // Validar se há transações
      if (transacoesParaExportar.length === 0) {
        alert("Não há transações para exportar!");
        return;
      }

      // Calcular resumo financeiro (se habilitado)
      let totalReceitas = 0;
      let totalDespesas = 0;
      let saldo = 0;

      if (incluirResumo) {
        totalReceitas = transacoesParaExportar
          .filter((t) => isReceita(t.type))
          .reduce((sum, t) => sum + (Number(t.value) || 0), 0);

        totalDespesas = transacoesParaExportar
          .filter((t) => isDespesa(t.type))
          .reduce((sum, t) => sum + (Number(t.value) || 0), 0);

        saldo = totalReceitas - totalDespesas;
      }

      // Criar elemento temporário para capturar o conteúdo
      const tempElement = document.createElement("div");
      tempElement.style.position = "absolute";
      tempElement.style.left = "-9999px";
      tempElement.style.top = "-9999px";
      tempElement.style.width = "800px";
      tempElement.style.backgroundColor = "white";
      tempElement.style.padding = "20px";
      tempElement.style.fontFamily = "Arial, sans-serif";

      // Construir informações de filtros aplicados
      let infoFiltros = "Todas as transações";
      if (exportarFiltradas) {
        const filtrosAtivos = [];
        if (transactionFilters.type)
          filtrosAtivos.push(`Tipo: ${transactionFilters.type}`);
        if (transactionFilters.category)
          filtrosAtivos.push(`Categoria: ${transactionFilters.category}`);
        if (transactionFilters.dateFrom)
          filtrosAtivos.push(
            `De: ${formatDateToDisplay(transactionFilters.dateFrom)}`,
          );
        if (transactionFilters.dateTo)
          filtrosAtivos.push(
            `Até: ${formatDateToDisplay(transactionFilters.dateTo)}`,
          );

        if (filtrosAtivos.length > 0) {
          infoFiltros = `Transações filtradas: ${filtrosAtivos.join(", ")}`;
        } else {
          infoFiltros = "Todas as transações (sem filtros ativos)";
        }
      }

      // Construir HTML do relatório
      let htmlContent = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: bold;">ALYA VELAS</h1>
          <h2 style="color: #374151; font-size: 24px; margin: 10px 0; font-weight: bold;">Relatório de Transações</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">${infoFiltros}</p>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
        </div>
      `;

      // Resumo Executivo (se habilitado)
      if (incluirResumo) {
        htmlContent += `
          <div style="margin-bottom: 30px;">
            <h3 style="color: #f59e0b; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #f59e0b; padding-bottom: 5px;">📊 Resumo Executivo</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
              <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                <div style="font-weight: bold; color: #10b981; margin-bottom: 5px;">Total de Receitas</div>
                <div style="font-size: 18px; font-weight: bold; color: #059669;">R$ ${totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
              </div>
              <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
                <div style="font-weight: bold; color: #ef4444; margin-bottom: 5px;">Total de Despesas</div>
                <div style="font-size: 18px; font-weight: bold; color: #dc2626;">R$ ${totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
              </div>
              <div style="background: ${saldo >= 0 ? "#f0fdf4" : "#fef2f2"}; padding: 15px; border-radius: 8px; border-left: 4px solid ${saldo >= 0 ? "#10b981" : "#ef4444"};">
                <div style="font-weight: bold; color: ${saldo >= 0 ? "#10b981" : "#ef4444"}; margin-bottom: 5px;">Saldo</div>
                <div style="font-size: 18px; font-weight: bold; color: ${saldo >= 0 ? "#059669" : "#dc2626"};">R$ ${saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
              </div>
              <div style="background: #fffbeb; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <div style="font-weight: bold; color: #f59e0b; margin-bottom: 5px;">Quantidade de Transações</div>
                <div style="font-size: 18px; font-weight: bold; color: #d97706;">${transacoesParaExportar.length}</div>
              </div>
            </div>
          </div>
        `;
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
      `;

      // Adicionar linhas da tabela
      transacoesParaExportar.forEach((transaction, index) => {
        const dataFormatada = formatDateToDisplay(transaction.date);
        const valorFormatado = (Number(transaction.value) || 0).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        });
        const tipoCor = isReceita(transaction.type) ? "#10b981" : "#ef4444";
        const tipoBg = isReceita(transaction.type) ? "#f0fdf4" : "#fef2f2";
        const valorCor = isReceita(transaction.type) ? "#059669" : "#dc2626";
        const sinal = isReceita(transaction.type) ? "+" : "-";
        const bgColor = index % 2 === 0 ? "#ffffff" : "#f9fafb";

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
        `;
      });

      htmlContent += `
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Rodapé
      htmlContent += `
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            Relatório gerado automaticamente pelo sistema Alya Velas<br>
            Dados baseados em transações ${exportarFiltradas ? "filtradas" : "completas"}<br>
            Para mais informações, acesse o painel administrativo
          </p>
        </div>
      `;

      tempElement.innerHTML = htmlContent;
      document.body.appendChild(tempElement);

      // Capturar o elemento como imagem
      const canvas = await html2canvas(tempElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      // Remover elemento temporário
      document.body.removeChild(tempElement);

      // Criar PDF
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Salvar PDF
      const fileName = `Transacoes_${exportarFiltradas ? "Filtradas" : "Completas"}_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(fileName);

      alert(
        `✅ Relatório PDF exportado com sucesso!\nArquivo: ${fileName}\n\n📊 Dados incluídos:\n• Total de transações: ${transacoesParaExportar.length}${incluirResumo ? `\n• Total de Receitas: R$ ${totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n• Total de Despesas: R$ ${totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n• Saldo: R$ ${saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""}`,
      );
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      alert("❌ Erro ao exportar PDF. Tente novamente.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

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
              setImportType(null);
              setSelectedBank(null);
              setExtratoStep(0);
              setExtratoFile(null);
              setIsImportExtratoModalOpen(true);
            }}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <Upload className="h-5 w-5" />
            Importar Extrato
          </button>
          <button
            onClick={() => setIsExportTransacoesModalOpen(true)}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <Download className="h-5 w-5" />
            Exportar PDF
          </button>
          <button
            onClick={() => {
              setImportExportType("transactions");
              setIsImportExportModalOpen(true);
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
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-800 p-4 rounded-lg border border-amber-200 dark:border-gray-700 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
          {/* Título */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
              FILTRE SEUS ITENS:
            </h2>
          </div>

          {/* Campos de Filtro */}
          <div className="flex items-end gap-1 sm:gap-2 md:gap-3 lg:gap-4 flex-1">
            {/* Busca por descrição */}
            <div className="flex flex-col flex-1 min-w-0">
              <label htmlFor="transaction-description-filter" className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate">
                Buscar
              </label>
              <div className="relative">
                <input
                  id="transaction-description-filter"
                  name="transaction-description-filter"
                  type="text"
                  placeholder="Nome da transação..."
                  value={transactionFilters.description}
                  onChange={(e) =>
                    setTransactionFilters((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 dark:border-gray-600 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:!bg-gray-700 dark:text-gray-100 w-full pr-7"
                />
                {transactionFilters.description && (
                  <button
                    type="button"
                    onClick={() => setTransactionFilters((prev) => ({ ...prev, description: "" }))}
                    className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filtro Tipo */}
            <div className="flex flex-col flex-1 min-w-0">
              <label htmlFor="transaction-type-filter" className="text-xs sm:text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate truncate">
                Tipo
              </label>
              <select
                id="transaction-type-filter"
                name="transaction-type-filter"
                value={transactionFilters.type}
                onChange={(e) =>
                  setTransactionFilters((prev) => ({
                    ...prev,
                    type: e.target.value,
                    category: "", // Limpar categoria quando tipo mudar
                  }))
                }
                className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 dark:border-gray-600 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:!bg-gray-700 dark:text-gray-100 w-full"
              >
                <option value="">Todos os tipos</option>
                <option value="Receita">Receitas</option>
                <option value="Despesa">Despesas</option>
              </select>
            </div>

            {/* Filtro Categoria */}
            <div className="flex flex-col flex-1 min-w-0">
              <label htmlFor="transaction-category-filter" className="text-xs sm:text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate truncate">
                Categoria
              </label>
              <select
                id="transaction-category-filter"
                name="transaction-category-filter"
                value={transactionFilters.category}
                onChange={(e) =>
                  setTransactionFilters((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 dark:border-gray-600 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:!bg-gray-700 dark:text-gray-100 w-full"
              >
                <option value="">Todas as categorias</option>
                {transactionFilters.type ? (
                  getCategoriesByType(transactionFilters.type).map(
                    (category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ),
                  )
                ) : (
                  <>
                    {/* Opções para Receita */}
                    <optgroup label="Receita">
                      {getCategoriesByType("Receita").map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </optgroup>
                    {/* Opções para Despesa */}
                    <optgroup label="Despesa">
                      {getCategoriesByType("Despesa").map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </optgroup>
                  </>
                )}
              </select>
            </div>

            {/* Filtro Data Início */}
            <div className="flex flex-col flex-1 min-w-0">
              <label htmlFor="filter-date-from" className="text-xs sm:text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate truncate">
                Data Início
              </label>
              <div className="relative">
                <input
                  id="filter-date-from"
                  name="filter-date-from"
                  type="text"
                  placeholder="Início"
                  value={
                    transactionFilters.dateFrom
                      ? formatDateToDisplay(transactionFilters.dateFrom)
                      : ""
                  }
                  readOnly
                  onClick={handleFilterCalendarFromToggle}
                  className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 dark:border-gray-600 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:!bg-gray-700 dark:text-gray-100 cursor-pointer w-full"
                />
                <Calendar className="absolute right-1 sm:right-2 md:right-3 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-amber-600 pointer-events-none" />
                {isFilterCalendarFromOpen && renderFilterCalendarFrom()}
              </div>
            </div>

            {/* Filtro Data Fim */}
            <div className="flex flex-col flex-1 min-w-0">
              <label htmlFor="filter-date-to" className="text-xs sm:text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate truncate">
                Data Fim
              </label>
              <div className="relative">
                <input
                  id="filter-date-to"
                  name="filter-date-to"
                  type="text"
                  placeholder="Fim"
                  value={
                    transactionFilters.dateTo
                      ? formatDateToDisplay(transactionFilters.dateTo)
                      : ""
                  }
                  readOnly
                  onClick={handleFilterCalendarToToggle}
                  className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 dark:border-gray-600 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:!bg-gray-700 dark:text-gray-100 cursor-pointer w-full"
                />
                <Calendar className="absolute right-1 sm:right-2 md:right-3 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-amber-600 pointer-events-none" />
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">Nenhuma transação encontrada.</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
              Adicione sua primeira transação clicando no botão "Nova
              Transação".
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Ações (acima da lista) */}
            {selectedTransactions.size > 0 && (
              <div className="flex justify-end p-3 sm:p-4 bg-red-50 border-b border-red-200">
                <button
                  onClick={handleDeleteSelectedTransactions}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Trash2 className="h-4 w-4" />
                  Deletar Selecionada{selectedTransactions.size > 1
                    ? "s"
                    : ""}{" "}
                  ({selectedTransactions.size})
                </button>
              </div>
            )}

            {/* Cabeçalho das Colunas */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/20 border-b border-amber-200 dark:border-amber-800/40 p-4">
              <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 lg:gap-3 w-full">
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    ref={selectAllTransactionsRef}
                    checked={(() => {
                      const f = getFilteredAndSortedTransactions();
                      return f.length > 0 && f.every((t) => selectedTransactions.has(t.id));
                    })()}
                    onChange={handleSelectAllTransactions}
                    className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                  />
                </div>
                <button
                  onClick={() => handleSort("date")}
                  aria-sort={getTransactionSortAriaSort("date")}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-20 sm:w-24"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide truncate">
                    Data
                  </p>
                  {getSortIcon("date")}
                </button>
                <button
                  onClick={() => handleSort("description")}
                  aria-sort={getTransactionSortAriaSort("description")}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-1 min-w-0"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide truncate">
                    Descrição
                  </p>
                  {getSortIcon("description")}
                </button>
                <button
                  onClick={() => handleSort("type")}
                  aria-sort={getTransactionSortAriaSort("type")}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-16 sm:w-20"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">
                    Tipo
                  </p>
                  {getSortIcon("type")}
                </button>
                <button
                  onClick={() => handleSort("category")}
                  aria-sort={getTransactionSortAriaSort("category")}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-20 sm:w-24"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide truncate">
                    Categoria
                  </p>
                  {getSortIcon("category")}
                </button>
                <button
                  onClick={() => handleSort("value")}
                  aria-sort={getTransactionSortAriaSort("value")}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-28 sm:w-32"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide whitespace-nowrap">
                    Valor
                  </p>
                  {getSortIcon("value")}
                </button>
                <div className="flex-shrink-0 w-16 sm:w-20 flex justify-center">
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">
                    Ações
                  </p>
                </div>
              </div>
            </div>

            {getFilteredAndSortedTransactions().length === 0 && transactions.length > 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Nenhuma transação corresponde aos filtros aplicados.
              </div>
            )}
            {getFilteredAndSortedTransactions().map((transaction, index, arr) => (
              <div
                key={transaction.id}
                className={`bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 p-4 hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-all duration-200 ${
                  index === arr.length - 1 ? "border-b-0" : ""
                }`}
              >
                <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 lg:gap-3 w-full">
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
                      {formatDateToDisplay(transaction.date)}
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
                    <span
                      className={`px-0.5 sm:px-1 py-0.5 rounded-full text-xs font-medium ${
                        isReceita(transaction.type)
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {transaction.type}
                    </span>
                  </div>

                  {/* Categoria */}
                  <div className="flex-shrink-0 w-20 sm:w-24 text-center">
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-0.5 sm:px-1 py-0.5 rounded-md truncate">
                      {transaction.category}
                    </span>
                  </div>

                  {/* Valor */}
                  <div className="flex-shrink-0 w-28 sm:w-32 text-center">
                    <p
                      className={`text-xs sm:text-sm md:text-lg font-bold whitespace-nowrap ${
                        isReceita(transaction.type)
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {isReceita(transaction.type) ? "+" : "-"}R${" "}
                      {(Number(transaction.value) || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
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
                        if (
                          confirm(
                            "Tem certeza que deseja excluir esta transação?",
                          )
                        ) {
                          try {
                            const success = await deleteTransaction(
                              transaction.id,
                            );
                            if (success) {
                              setTransactions((prev) =>
                                prev.filter((t) => t.id !== transaction.id),
                              );
                            }
                          } catch (error) {
                            console.error("Erro ao deletar transação:", error);
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
          </div>
        )}
      </div>
    </div>
  );

  // Função para exportar produtos em PDF
  const exportarProdutosPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      setIsExportProdutosModalOpen(false);

      // Obter produtos para exportar
      const produtosParaExportar = exportarFiltrados
        ? getFilteredAndSortedProducts()
        : products;

      // Validar se há produtos
      if (produtosParaExportar.length === 0) {
        alert("Não há produtos para exportar!");
        return;
      }

      // Calcular resumo estatístico (se habilitado)
      let totalProdutos = produtosParaExportar.length;
      let valorTotalEstoque = 0;
      let custoTotalEstoque = 0;
      let lucroPotencial = 0;
      let margemMedia = 0;
      let totalVendidos = 0;
      let produtosEmEstoque = 0;
      let produtosSemEstoque = 0;
      let produtosPorCategoria: { [key: string]: number } = {};

      if (incluirResumoProdutos) {
        // Calcular valores totais
        produtosParaExportar.forEach((p) => {
          valorTotalEstoque += p.price * p.stock;
          custoTotalEstoque += p.cost * p.stock;
          totalVendidos += p.sold;

          if (p.stock > 0) {
            produtosEmEstoque++;
          } else {
            produtosSemEstoque++;
          }

          // Contar por categoria
          produtosPorCategoria[p.category] =
            (produtosPorCategoria[p.category] || 0) + 1;

          // Calcular margem de lucro (evitar divisão por zero)
          if (p.price > 0) {
            const margem = ((p.price - p.cost) / p.price) * 100;
            margemMedia += margem;
          }
        });

        lucroPotencial = valorTotalEstoque - custoTotalEstoque;
        margemMedia =
          produtosParaExportar.length > 0
            ? margemMedia / produtosParaExportar.length
            : 0;
      }

      // Criar elemento temporário para capturar o conteúdo
      const tempElement = document.createElement("div");
      tempElement.style.position = "absolute";
      tempElement.style.left = "-9999px";
      tempElement.style.top = "-9999px";
      tempElement.style.width = "800px";
      tempElement.style.backgroundColor = "white";
      tempElement.style.padding = "20px";
      tempElement.style.fontFamily = "Arial, sans-serif";

      // Construir informações de filtros aplicados
      let infoFiltros = "Todos os produtos";
      if (exportarFiltrados) {
        const filtrosAtivos = [];
        if (productFilters.category)
          filtrosAtivos.push(`Categoria: ${productFilters.category}`);
        if (productFilters.stockFilter === "inStock")
          filtrosAtivos.push("Em estoque");
        if (productFilters.stockFilter === "outOfStock")
          filtrosAtivos.push("Sem estoque");
        if (productFilters.soldFilter === "sold")
          filtrosAtivos.push("Vendidos");
        if (productFilters.soldFilter === "notSold")
          filtrosAtivos.push("Não vendidos");
        if (productFilters.costFilter === "withCost")
          filtrosAtivos.push("Com preço de custo");
        if (productFilters.costFilter === "withoutCost")
          filtrosAtivos.push("Sem preço de custo");

        if (filtrosAtivos.length > 0) {
          infoFiltros = `Produtos filtrados: ${filtrosAtivos.join(", ")}`;
        } else {
          infoFiltros = "Todos os produtos (sem filtros ativos)";
        }
      }

      // Construir HTML do relatório
      let htmlContent = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: bold;">ALYA VELAS</h1>
          <h2 style="color: #374151; font-size: 24px; margin: 10px 0; font-weight: bold;">Relatório de Produtos</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">${infoFiltros}</p>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
        </div>
      `;

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
                <div style="font-size: 18px; font-weight: bold; color: #059669;">R$ ${valorTotalEstoque.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
              </div>
              <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
                <div style="font-weight: bold; color: #ef4444; margin-bottom: 5px;">Custo Total do Estoque</div>
                <div style="font-size: 18px; font-weight: bold; color: #dc2626;">R$ ${custoTotalEstoque.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
              </div>
              <div style="background: ${lucroPotencial >= 0 ? "#f0fdf4" : "#fef2f2"}; padding: 15px; border-radius: 8px; border-left: 4px solid ${lucroPotencial >= 0 ? "#10b981" : "#ef4444"};">
                <div style="font-weight: bold; color: ${lucroPotencial >= 0 ? "#10b981" : "#ef4444"}; margin-bottom: 5px;">Lucro Potencial</div>
                <div style="font-size: 18px; font-weight: bold; color: ${lucroPotencial >= 0 ? "#059669" : "#dc2626"};">R$ ${lucroPotencial.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
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
            
            ${
              Object.keys(produtosPorCategoria).length > 0
                ? `
              <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 15px;">
                <h4 style="color: #374151; font-size: 16px; margin-bottom: 10px; font-weight: bold;">Distribuição por Categoria:</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
                  ${Object.entries(produtosPorCategoria)
                    .map(
                      ([categoria, quantidade]) => `
                    <div style="text-align: center; padding: 8px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                      <div style="font-weight: bold; color: #f59e0b; font-size: 18px;">${quantidade}</div>
                      <div style="font-size: 12px; color: #6b7280;">${categoria}</div>
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              </div>
            `
                : ""
            }
          </div>
        `;
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
      `;

      // Adicionar linhas da tabela
      produtosParaExportar.forEach((product, index) => {
        const precoFormatado = (Number(product.price) || 0).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        });
        const custoFormatado = (Number(product.cost) || 0).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        });

        // Calcular margem de lucro (evitar divisão por zero)
        let margemLucro = 0;
        let margemCor = "#6b7280";
        if (product.price > 0) {
          margemLucro = ((product.price - product.cost) / product.price) * 100;
          margemCor = margemLucro >= 0 ? "#10b981" : "#ef4444";
        }

        // Cor do estoque
        let estoqueCor = "#ef4444"; // vermelho
        if (product.stock > 10) {
          estoqueCor = "#10b981"; // verde
        } else if (product.stock > 0) {
          estoqueCor = "#f59e0b"; // amarelo
        }

        const bgColor = index % 2 === 0 ? "#ffffff" : "#f9fafb";

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
        `;
      });

      htmlContent += `
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Rodapé
      htmlContent += `
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            Relatório gerado automaticamente pelo sistema Alya Velas<br>
            Dados baseados em produtos ${exportarFiltrados ? "filtrados" : "completos"}<br>
            Para mais informações, acesse o painel administrativo
          </p>
        </div>
      `;

      tempElement.innerHTML = htmlContent;
      document.body.appendChild(tempElement);

      // Capturar o elemento como imagem
      const canvas = await html2canvas(tempElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      // Remover elemento temporário
      document.body.removeChild(tempElement);

      // Criar PDF
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Salvar PDF
      const fileName = `Produtos_${exportarFiltrados ? "Filtrados" : "Completos"}_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(fileName);

      alert(
        `✅ Relatório PDF exportado com sucesso!\nArquivo: ${fileName}\n\n📊 Dados incluídos:\n• Total de produtos: ${totalProdutos}${incluirResumoProdutos ? `\n• Valor total do estoque: R$ ${valorTotalEstoque.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n• Custo total do estoque: R$ ${custoTotalEstoque.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n• Lucro potencial: R$ ${lucroPotencial.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n• Margem média: ${margemMedia.toFixed(1)}%` : ""}`,
      );
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      alert("❌ Erro ao exportar PDF. Tente novamente.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

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
              setImportExportType("products");
              setIsImportExportModalOpen(true);
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
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-800 p-4 rounded-lg border border-amber-200 dark:border-gray-700 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
          {/* Título */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
              FILTRE SEUS ITENS:
            </h2>
          </div>

          {/* Campos de Filtro */}
          <div className="flex items-end gap-1 sm:gap-2 md:gap-3 lg:gap-4 flex-1">
            {/* Filtro Categoria */}
            <div className="flex flex-col flex-1 min-w-0">
              <label htmlFor="product-category-filter" className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate">
                Categoria
              </label>
              <input
                id="product-category-filter"
                name="product-category-filter"
                type="text"
                placeholder="Categoria..."
                value={productFilters.category}
                onChange={(e) =>
                  setProductFilters((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 dark:border-gray-600 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:!bg-gray-700 dark:text-gray-100 w-full"
              />
            </div>

            {/* Filtro Estoque */}
            <div className="flex flex-col flex-1 min-w-0">
              <label htmlFor="product-stock-filter" className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate">
                Estoque
              </label>

              <select
                id="product-stock-filter"
                name="product-stock-filter"
                value={productFilters.stockFilter}
                onChange={(e) =>
                  setProductFilters((prev) => ({
                    ...prev,
                    stockFilter: e.target.value,
                  }))
                }
                className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 dark:border-gray-600 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:!bg-gray-700 dark:text-gray-100 w-full"
              >
                <option value="">Todos os estoques</option>
                <option value="inStock">Em estoque</option>
                <option value="outOfStock">Sem estoque</option>
              </select>
            </div>

            {/* Filtro Vendidos */}
            <div className="flex flex-col flex-1 min-w-0">
              <label htmlFor="product-sold-filter" className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate">
                Vendidos
              </label>

              <select
                id="product-sold-filter"
                name="product-sold-filter"
                value={productFilters.soldFilter}
                onChange={(e) =>
                  setProductFilters((prev) => ({
                    ...prev,
                    soldFilter: e.target.value,
                  }))
                }
                className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 dark:border-gray-600 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:!bg-gray-700 dark:text-gray-100 w-full"
              >
                <option value="">Todos os vendidos</option>
                <option value="sold">Vendidos</option>
                <option value="notSold">Não vendidos</option>
              </select>
            </div>

            {/* Filtro Preço de Custo */}
            <div className="flex flex-col flex-1 min-w-0">
              <label htmlFor="product-cost-filter" className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate">
                Preço de Custo
              </label>

              <select
                id="product-cost-filter"
                name="product-cost-filter"
                value={productFilters.costFilter}
                onChange={(e) =>
                  setProductFilters((prev) => ({
                    ...prev,
                    costFilter: e.target.value,
                  }))
                }
                className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 dark:border-gray-600 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:!bg-gray-700 dark:text-gray-100 w-full"
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">Nenhum produto encontrado.</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
              Adicione seu primeiro produto clicando no botão "Novo Produto".
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Cabeçalho das Colunas */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/20 border-b border-amber-200 dark:border-amber-800/40 p-4">
              <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 lg:gap-3">
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    ref={selectAllProductsRef}
                    checked={(() => {
                      const f = getFilteredAndSortedProducts();
                      return f.length > 0 && f.every((p) => selectedProducts.has(p.id));
                    })()}
                    onChange={handleSelectAllProducts}
                    className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                  />
                </div>
                <button
                  onClick={() => handleProductSort("name")}
                  aria-sort={getProductSortAriaSort("name")}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-1 min-w-0"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">
                    Nome
                  </p>
                  {getProductSortIcon("name")}
                </button>
                <button
                  onClick={() => handleProductSort("category")}
                  aria-sort={getProductSortAriaSort("category")}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-20 sm:w-24"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide truncate">
                    Categoria
                  </p>
                  {getProductSortIcon("category")}
                </button>
                <button
                  onClick={() => handleProductSort("price")}
                  aria-sort={getProductSortAriaSort("price")}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-20 sm:w-24"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">
                    Preço
                  </p>
                  {getProductSortIcon("price")}
                </button>
                <button
                  onClick={() => handleProductSort("cost")}
                  aria-sort={getProductSortAriaSort("cost")}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-16 sm:w-20"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">
                    Custo
                  </p>
                  {getProductSortIcon("cost")}
                </button>
                <button
                  onClick={() => handleProductSort("stock")}
                  aria-sort={getProductSortAriaSort("stock")}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-16 sm:w-20"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">
                    Estoque
                  </p>
                  {getProductSortIcon("stock")}
                </button>
                <button
                  onClick={() => handleProductSort("sold")}
                  aria-sort={getProductSortAriaSort("sold")}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-16 sm:w-20"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">
                    Vendidos
                  </p>
                  {getProductSortIcon("sold")}
                </button>
                <div className="flex-shrink-0 w-16 sm:w-20 flex justify-center">
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">
                    Ações
                  </p>
                </div>
              </div>
            </div>

            {getFilteredAndSortedProducts().length === 0 && products.length > 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Nenhum produto corresponde aos filtros aplicados.
              </div>
            )}
            {getFilteredAndSortedProducts().map((product, index, arr) => (
              <div
                key={product.id}
                className={`bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 p-4 hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-all duration-200 ${
                  index === arr.length - 1 ? "border-b-0" : ""
                }`}
              >
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
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-0.5 sm:px-1 py-0.5 rounded-md truncate">
                      {product.category}
                    </span>
                  </div>

                  {/* Preço */}
                  <div className="flex-shrink-0 w-20 sm:w-24 text-center">
                    <p className="text-xs sm:text-sm md:text-lg font-bold text-green-600 truncate">
                      R${" "}
                      {(Number(product.price) || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>

                  {/* Custo */}
                  <div className="flex-shrink-0 w-16 sm:w-20 text-center">
                    <p className="text-xs sm:text-sm md:text-lg font-bold text-orange-600 truncate">
                      R${" "}
                      {(Number(product.cost) || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>

                  {/* Estoque */}
                  <div className="flex-shrink-0 w-16 sm:w-20 text-center">
                    <p
                      className={`text-xs sm:text-sm md:text-lg font-bold ${product.stock > 10 ? "text-green-600" : product.stock > 0 ? "text-yellow-600" : "text-red-600"} truncate`}
                    >
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
                        if (
                          confirm(
                            "Tem certeza que deseja excluir este produto?",
                          )
                        ) {
                          try {
                            const success = await deleteProduct(product.id);
                            if (success) {
                              setProducts((prev) =>
                                prev.filter((p) => p.id !== product.id),
                              );
                            }
                          } catch (error) {
                            console.error("Erro ao deletar produto:", error);
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
                  Deletar Selecionado{selectedProducts.size > 1 ? "s" : ""} (
                  {selectedProducts.size})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Função para abrir modal de seleção de período
  const abrirModalSelecaoPeriodo = () => {
    setIsPeriodoExportModalOpen(true);
  };

  // Função para exportar relatórios em PDF
  const exportarRelatoriosPDF = async (periodoSelecionado: string) => {
    setIsGeneratingPDF(true);
    try {
      setIsPeriodoExportModalOpen(false);

      // Calcular dados reais das transações (mesma lógica de renderReports)
      const agora = new Date();
      const inicioSemana = new Date(agora);
      inicioSemana.setDate(agora.getDate() - ((agora.getDay() + 6) % 7));
      inicioSemana.setHours(0, 0, 0, 0);

      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
      const inicioTrimestre = new Date(
        agora.getFullYear(),
        Math.floor(agora.getMonth() / 3) * 3,
        1,
      );
      const inicioAno = new Date(agora.getFullYear(), 0, 1);

      // Filtrar transações por período
      const transacoesSemana = transactions.filter((t) => {
        const dataTransacao = parseLocalDate(t.date);
        return dataTransacao >= inicioSemana;
      });

      const transacoesMes = transactions.filter((t) => {
        const dataTransacao = parseLocalDate(t.date);
        return dataTransacao >= inicioMes;
      });

      const transacoesTrimestre = transactions.filter((t) => {
        const dataTransacao = parseLocalDate(t.date);
        return dataTransacao >= inicioTrimestre;
      });

      const transacoesAno = transactions.filter((t) => {
        const dataTransacao = parseLocalDate(t.date);
        return dataTransacao >= inicioAno;
      });

      // Funções auxiliares de cálculo (reutilizadas de renderReports)
      const calcularVendasPorCategoria = (transacoes: any[]) => {
        const vendasPorCategoria: { [key: string]: number } = {};

        transacoes.forEach((t) => {
          if (isReceita(t.type)) {
            vendasPorCategoria[t.category] =
              (vendasPorCategoria[t.category] || 0) + t.value;
          }
        });

        const cores = [
          "#22c55e",
          "#3b82f6",
          "#f59e0b",
          "#8b5cf6",
          "#ec4899",
          "#06b6d4",
        ];
        return Object.entries(vendasPorCategoria).map(
          ([nome, valor], index) => ({
            nome,
            valor,
            cor: cores[index % cores.length],
          }),
        );
      };

      const calcularDespesasPorCategoria = (transacoes: any[]) => {
        const despesasPorCategoria: { [key: string]: number } = {};

        transacoes.forEach((t) => {
          if (isDespesa(t.type)) {
            despesasPorCategoria[t.category] =
              (despesasPorCategoria[t.category] || 0) + t.value;
          }
        });

        const cores = ["#ef4444", "#f97316", "#84cc16", "#f59e0b", "#8b5cf6"];
        return Object.entries(despesasPorCategoria).map(
          ([nome, valor], index) => ({
            nome,
            valor,
            cor: cores[index % cores.length],
          }),
        );
      };

      const calcularVendasPorProduto = (transacoes: any[]) => {
        const vendasPorProduto: { [key: string]: number } = {};

        transacoes.forEach((t) => {
          if (isReceita(t.type)) {
            const nomeProduto = t.description || "Produto sem nome";
            vendasPorProduto[nomeProduto] =
              (vendasPorProduto[nomeProduto] || 0) + t.value;
          }
        });

        const cores = ["#8b5cf6", "#ec4899", "#06b6d4", "#22c55e", "#3b82f6"];
        return Object.entries(vendasPorProduto)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([nome, valor], index) => ({
            nome,
            valor,
            cor: cores[index % cores.length],
          }));
      };

      // Determinar quais períodos exportar
      const periodosParaExportar: Array<{ nome: string; transacoes: any[] }> =
        [];

      if (periodoSelecionado === "Todos") {
        periodosParaExportar.push(
          { nome: "Semana", transacoes: transacoesSemana },
          { nome: "Mês", transacoes: transacoesMes },
          { nome: "Trimestre", transacoes: transacoesTrimestre },
          { nome: "Ano", transacoes: transacoesAno },
        );
      } else {
        const transacoesMap: { [key: string]: any[] } = {
          Semana: transacoesSemana,
          Mês: transacoesMes,
          Trimestre: transacoesTrimestre,
          Ano: transacoesAno,
        };
        periodosParaExportar.push({
          nome: periodoSelecionado,
          transacoes: transacoesMap[periodoSelecionado] || [],
        });
      }

      // Validar se há dados
      const temDados = periodosParaExportar.some(
        (p) => p.transacoes.length > 0,
      );
      if (!temDados) {
        alert("Não há dados para exportar no período selecionado!");
        return;
      }

      // Criar elemento temporário para capturar o conteúdo
      const tempElement = document.createElement("div");
      tempElement.style.position = "absolute";
      tempElement.style.left = "-9999px";
      tempElement.style.top = "-9999px";
      tempElement.style.width = "800px";
      tempElement.style.backgroundColor = "white";
      tempElement.style.padding = "20px";
      tempElement.style.fontFamily = "Arial, sans-serif";

      // Construir HTML do relatório
      let htmlContent = "";

      // Cabeçalho principal
      htmlContent += `
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: bold;">ALYA VELAS</h1>
          <h2 style="color: #374151; font-size: 24px; margin: 10px 0; font-weight: bold;">Relatório Financeiro${periodoSelecionado === "Todos" ? "" : " - " + periodoSelecionado}</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
        </div>
      `;

      // Processar cada período
      periodosParaExportar.forEach((periodo, periodoIndex) => {
        const vendasPorCategoria = calcularVendasPorCategoria(
          periodo.transacoes,
        );
        const vendasPorProduto = calcularVendasPorProduto(periodo.transacoes);
        const despesasPorCategoria = calcularDespesasPorCategoria(
          periodo.transacoes,
        );

        const totalVendasCategoria = vendasPorCategoria.reduce(
          (sum, item) => sum + item.valor,
          0,
        );
        const totalDespesas = despesasPorCategoria.reduce(
          (sum, item) => sum + item.valor,
          0,
        );
        const lucroLiquido = totalVendasCategoria - totalDespesas;
        const margemLucro =
          totalVendasCategoria > 0
            ? (lucroLiquido / totalVendasCategoria) * 100
            : 0;

        // Seção do período
        htmlContent += `
          <div style="margin-bottom: ${periodoIndex < periodosParaExportar.length - 1 ? "50px" : "30px"}; page-break-after: ${periodoIndex < periodosParaExportar.length - 1 ? "always" : "auto"};">
            <h3 style="color: #f59e0b; font-size: 22px; margin-bottom: 20px; border-bottom: 3px solid #f59e0b; padding-bottom: 10px;">📊 Relatório ${periodo.nome}</h3>
            
            <!-- Resumo Executivo -->
            <div style="margin-bottom: 30px;">
              <h4 style="color: #f59e0b; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #f59e0b; padding-bottom: 5px;">Resumo Executivo</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                  <div style="font-weight: bold; color: #10b981; margin-bottom: 5px;">Total Vendas</div>
                  <div style="font-size: 18px; font-weight: bold; color: #059669;">R$ ${totalVendasCategoria.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                </div>
                <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
                  <div style="font-weight: bold; color: #ef4444; margin-bottom: 5px;">Total Despesas</div>
                  <div style="font-size: 18px; font-weight: bold; color: #dc2626;">R$ ${totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                </div>
                <div style="background: ${lucroLiquido >= 0 ? "#f0fdf4" : "#fef2f2"}; padding: 15px; border-radius: 8px; border-left: 4px solid ${lucroLiquido >= 0 ? "#10b981" : "#ef4444"};">
                  <div style="font-weight: bold; color: ${lucroLiquido >= 0 ? "#10b981" : "#ef4444"}; margin-bottom: 5px;">Lucro Líquido</div>
                  <div style="font-size: 18px; font-weight: bold; color: ${lucroLiquido >= 0 ? "#059669" : "#dc2626"};">R$ ${lucroLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
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
                ${
                  vendasPorCategoria.length > 0
                    ? vendasPorCategoria
                        .map(
                          (item) => `
                  <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-weight: bold; color: #374151;">${item.nome}</span>
                    <span style="font-weight: bold; color: #10b981;">R$ ${item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                `,
                        )
                        .join("")
                    : '<p style="color: #6b7280; text-align: center;">Nenhuma venda registrada</p>'
                }
                <div style="display: flex; justify-content: space-between; padding: 15px; margin-top: 10px; background: #f0fdf4; border-radius: 8px; border: 2px solid #10b981;">
                  <span style="font-weight: bold; color: #10b981; font-size: 16px;">Total</span>
                  <span style="font-weight: bold; color: #10b981; font-size: 16px;">R$ ${totalVendasCategoria.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <!-- Vendas por Produto (Top 5) -->
            <div style="margin-bottom: 30px;">
              <h4 style="color: #f59e0b; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #f59e0b; padding-bottom: 5px;">📦 Top 5 Produtos</h4>
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                ${
                  vendasPorProduto.length > 0
                    ? vendasPorProduto
                        .map(
                          (item, index) => `
                  <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-weight: bold; color: #374151;">${index + 1}. ${item.nome}</span>
                    <span style="font-weight: bold; color: #3b82f6;">R$ ${item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                `,
                        )
                        .join("")
                    : '<p style="color: #6b7280; text-align: center;">Nenhum produto vendido</p>'
                }
              </div>
            </div>

            <!-- Despesas por Categoria -->
            <div style="margin-bottom: 30px;">
              <h4 style="color: #f59e0b; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #f59e0b; padding-bottom: 5px;">💸 Despesas por Categoria</h4>
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                ${
                  despesasPorCategoria.length > 0
                    ? despesasPorCategoria
                        .map(
                          (item) => `
                  <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-weight: bold; color: #374151;">${item.nome}</span>
                    <span style="font-weight: bold; color: #ef4444;">R$ ${item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                `,
                        )
                        .join("")
                    : '<p style="color: #6b7280; text-align: center;">Nenhuma despesa registrada</p>'
                }
                <div style="display: flex; justify-content: space-between; padding: 15px; margin-top: 10px; background: #fef2f2; border-radius: 8px; border: 2px solid #ef4444;">
                  <span style="font-weight: bold; color: #ef4444; font-size: 16px;">Total</span>
                  <span style="font-weight: bold; color: #ef4444; font-size: 16px;">R$ ${totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      });

      // Rodapé
      htmlContent += `
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            Relatório gerado automaticamente pelo sistema Alya Velas<br>
            Dados baseados em transações reais do período<br>
            Para mais informações, acesse o painel administrativo
          </p>
        </div>
      `;

      tempElement.innerHTML = htmlContent;
      document.body.appendChild(tempElement);

      // Capturar o elemento como imagem
      const canvas = await html2canvas(tempElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      // Remover elemento temporário
      document.body.removeChild(tempElement);

      // Criar PDF
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Salvar PDF
      const fileName = `Relatorio_${periodoSelecionado === "Todos" ? "Completo" : periodoSelecionado}_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(fileName);

      alert(
        `✅ Relatório PDF exportado com sucesso!\nArquivo: ${fileName}\n\n📊 Período: ${periodoSelecionado}\n📈 Total de períodos: ${periodosParaExportar.length}`,
      );
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      alert("❌ Erro ao exportar PDF. Tente novamente.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Render Reports
  const renderReports = () => {
    const agora = new Date();
    const off = periodoOffset;

    // ── Helpers para calcular início/fim de cada período com offset ──────────
    const calcRangeAtual = (tipo: "semana" | "mes" | "trimestre" | "ano", offset: number): [Date, Date] => {
      if (tipo === "semana") {
        const ini = new Date(agora);
        ini.setDate(agora.getDate() - ((agora.getDay() + 6) % 7) + offset * 7);
        ini.setHours(0, 0, 0, 0);
        const fim = new Date(ini);
        fim.setDate(ini.getDate() + 6);
        fim.setHours(23, 59, 59, 999);
        return [ini, fim];
      }
      if (tipo === "mes") {
        const ano = agora.getFullYear();
        const mesBase = agora.getMonth() + offset;
        const ini = new Date(ano, mesBase, 1);
        const fim = new Date(ano, mesBase + 1, 0, 23, 59, 59, 999);
        return [ini, fim];
      }
      if (tipo === "trimestre") {
        const trimBase = Math.floor(agora.getMonth() / 3) + offset;
        const ano = agora.getFullYear() + Math.floor(trimBase / 4);
        const trimNorm = ((trimBase % 4) + 4) % 4;
        const ini = new Date(ano, trimNorm * 3, 1);
        const fim = new Date(ano, trimNorm * 3 + 3, 0, 23, 59, 59, 999);
        return [ini, fim];
      }
      // ano
      const anoSel = agora.getFullYear() + offset;
      return [new Date(anoSel, 0, 1), new Date(anoSel, 11, 31, 23, 59, 59, 999)];
    };

    const labelPeriodo = (tipo: "semana" | "mes" | "trimestre" | "ano", offset: number): string => {
      const mesesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
      if (tipo === "semana") {
        const [ini, fim] = calcRangeAtual(tipo, offset);
        const fmt = (d: Date) => `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
        return `${fmt(ini)} – ${fmt(fim)}/${fim.getFullYear()}`;
      }
      if (tipo === "mes") {
        const mesBase = agora.getMonth() + offset;
        const ano = agora.getFullYear() + Math.floor(mesBase / 12);
        const mesNorm = ((mesBase % 12) + 12) % 12;
        return `${mesesNomes[mesNorm]} ${ano}`;
      }
      if (tipo === "trimestre") {
        const trimBase = Math.floor(agora.getMonth() / 3) + offset;
        const ano = agora.getFullYear() + Math.floor(trimBase / 4);
        const trimNorm = ((trimBase % 4) + 4) % 4;
        return `T${trimNorm + 1} ${ano}`;
      }
      return String(agora.getFullYear() + offset);
    };

    const filtrar = (ini: Date, fim: Date) =>
      transactions.filter((t) => {
        const d = parseLocalDate(t.date);
        return d >= ini && d <= fim;
      });

    const p = periodoRelatorio;
    const [iniAtual, fimAtual] = calcRangeAtual(p, off);
    const tsAtual = filtrar(iniAtual, fimAtual);
    const tsAnt   = filtrar(...calcRangeAtual(p, off - 1));

    const somarReceitas = (ts: any[]) => ts.filter((t) => isReceita(t.type)).reduce((s, t) => s + (Number(t.value) || 0), 0);
    const somarDespesas = (ts: any[]) => ts.filter((t) => isDespesa(t.type)).reduce((s, t) => s + (Number(t.value) || 0), 0);

    const calcPorCategoria = (ts: any[], tipo: "receita" | "despesa") => {
      const acc: { [k: string]: number } = {};
      ts.forEach((t) => {
        if (tipo === "receita" ? isReceita(t.type) : isDespesa(t.type)) {
          const cat = t.category || "Sem categoria";
          acc[cat] = (acc[cat] || 0) + (Number(t.value) || 0);
        }
      });
      const cores = tipo === "receita"
        ? ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"]
        : ["#ef4444", "#f97316", "#84cc16", "#f59e0b", "#8b5cf6"];
      return Object.entries(acc)
        .sort(([, a], [, b]) => b - a)
        .map(([nome, valor], i) => ({ nome, valor, cor: cores[i % cores.length] }));
    };

    const calcProdutos = (ts: any[]) => {
      const acc: { [k: string]: number } = {};
      ts.filter((t) => isReceita(t.type)).forEach((t) => {
        const nome = t.description || "Sem descrição";
        acc[nome] = (acc[nome] || 0) + (Number(t.value) || 0);
      });
      const cores = ["#8b5cf6", "#ec4899", "#06b6d4", "#22c55e", "#3b82f6"];
      return Object.entries(acc)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([nome, valor], i) => ({ nome, valor, cor: cores[i % cores.length] }));
    };

    const calcTendencia = (ts: any[], periodo: "semana" | "mes" | "trimestre" | "ano") => {
      const diasSemana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
      const mesesNomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const grupos: { [k: string]: { rec: number; desp: number; ordem: number } } = {};
      ts.forEach((t) => {
        const d = parseLocalDate(t.date);
        let chave: string;
        let ordem: number;
        if (periodo === "semana") {
          const diaSemana = (d.getDay() + 6) % 7; // 0=Seg ... 6=Dom
          chave = diasSemana[diaSemana];
          ordem = diaSemana;
        } else if (periodo === "mes") {
          const sem = Math.ceil(d.getDate() / 7);
          chave = `Sem ${sem}`;
          ordem = sem;
        } else {
          // trimestre e ano: agrupar por mês
          chave = mesesNomes[d.getMonth()];
          ordem = d.getMonth();
        }
        if (!grupos[chave]) grupos[chave] = { rec: 0, desp: 0, ordem };
        if (isReceita(t.type)) grupos[chave].rec += (Number(t.value) || 0);
        if (isDespesa(t.type)) grupos[chave].desp += (Number(t.value) || 0);
      });
      return Object.entries(grupos)
        .sort(([, a], [, b]) => a.ordem - b.ordem)
        .map(([nome, v]) => ({ nome, receitas: v.rec, despesas: v.desp, saldo: v.rec - v.desp }));
    };

    const recAtual = somarReceitas(tsAtual);
    const despAtual = somarDespesas(tsAtual);
    const lucroAtual = recAtual - despAtual;

    const recAnt = somarReceitas(tsAnt);
    const despAnt = somarDespesas(tsAnt);
    const lucroAnt = recAnt - despAnt;

    const varRec = recAnt > 0 ? ((recAtual - recAnt) / recAnt) * 100 : 0;
    const varDesp = despAnt > 0 ? ((despAtual - despAnt) / despAnt) * 100 : 0;
    const varLucro = lucroAnt !== 0 ? ((lucroAtual - lucroAnt) / Math.abs(lucroAnt)) * 100 : 0;
    const margemAtual = recAtual > 0 ? (lucroAtual / recAtual) * 100 : 0;

    const catReceitas = calcPorCategoria(tsAtual, "receita");
    const catDespesas = calcPorCategoria(tsAtual, "despesa");
    const produtos = calcProdutos(tsAtual);
    const tendencia = calcTendencia(tsAtual, p);

    const totalCatRec = catReceitas.reduce((s, i) => s + i.valor, 0);
    const totalCatDesp = catDespesas.reduce((s, i) => s + i.valor, 0);

    const periodoLabels: Record<string, string> = {
      semana: periodoOffset === 0 ? "Esta Semana" : periodoOffset === -1 ? "Semana Passada" : `Semana (${periodoOffset})`,
      mes: periodoOffset === 0 ? "Este Mês" : periodoOffset === -1 ? "Mês Passado" : labelPeriodo("mes", periodoOffset),
      trimestre: periodoOffset === 0 ? "Este Trimestre" : periodoOffset === -1 ? "Trimestre Passado" : labelPeriodo("trimestre", periodoOffset),
      ano: periodoOffset === 0 ? "Este Ano" : periodoOffset === -1 ? "Ano Passado" : String(new Date().getFullYear() + periodoOffset),
    };

    return (
      <div className="space-y-6">
        {/* Header + Botões */}
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
          </div>
        </div>

        {/* Seletor de período + navegador */}
        {(() => {
          const periodos = ["ano", "trimestre", "mes", "semana"] as const;
          const labels: Record<string, string> = { semana: "Semana", mes: "Mês", trimestre: "Trimestre", ano: "Ano" };
          const tabWidth = 100;
          const activeIdx = periodos.indexOf(periodoRelatorio);
          return (
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Tabs de tipo */}
              <div className="relative flex bg-white rounded-2xl shadow border border-gray-200 p-1 gap-0 w-fit">
                <span
                  className="absolute top-1 bottom-1 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300 ease-in-out pointer-events-none"
                  style={{ width: tabWidth - 2, left: activeIdx * tabWidth + 5 }}
                />
                {periodos.map((per) => (
                  <button
                    key={per}
                    onClick={() => { setPeriodoRelatorio(per); setPeriodoOffset(0); }}
                    style={{ width: tabWidth }}
                    className={`relative z-10 py-2 px-0 rounded-xl text-sm font-bold flex items-center justify-center transition-colors duration-200 ${
                      periodoRelatorio === per ? "text-white" : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {labels[per]}
                  </button>
                ))}
              </div>

              {/* Navegação ← período → */}
              <div className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl shadow-lg px-2 py-1">
                <button
                  onClick={() => setPeriodoOffset((o) => o - 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors duration-150"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="min-w-[160px] text-center text-sm font-bold text-white px-2">
                  {labelPeriodo(periodoRelatorio, periodoOffset)}
                </span>
                <button
                  onClick={() => setPeriodoOffset((o) => o + 1)}
                  disabled={periodoOffset >= 0}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })()}

        {/* Cards de resumo com comparação */}
        {(() => {
          const margemAnt = recAnt > 0 ? (lucroAnt / recAnt) * 100 : 0;
          const varMargem = margemAnt !== 0 ? margemAtual - margemAnt : 0;
          const semTransacoes = tsAtual.length === 0;
          const cards = [
            { label: "Receitas", valor: recAtual as number | null, margem: null as number | null, vari: varRec, temBase: recAnt > 0, invertido: false,
              gradFrom: "from-emerald-500", gradTo: "to-green-400", icon: <TrendingUp className="w-5 h-5" /> },
            { label: "Despesas", valor: despAtual, margem: null, vari: varDesp, temBase: despAnt > 0, invertido: true,
              gradFrom: "from-rose-500", gradTo: "to-red-400", icon: <TrendingDown className="w-5 h-5" /> },
            { label: "Lucro", valor: lucroAtual, margem: null, vari: varLucro, temBase: lucroAnt !== 0, invertido: false,
              gradFrom: lucroAtual >= 0 ? "from-teal-500" : "from-orange-500", gradTo: lucroAtual >= 0 ? "to-emerald-400" : "to-red-400", icon: lucroAtual >= 0 ? <Sparkles className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" /> },
            { label: "Margem", valor: null, margem: margemAtual, vari: varMargem, temBase: recAnt > 0, invertido: false,
              gradFrom: margemAtual >= 0 ? "from-violet-500" : "from-orange-500", gradTo: margemAtual >= 0 ? "to-purple-400" : "to-red-400", icon: <BarChart3 className="w-5 h-5" /> },
          ];
          return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {cards.map((card, i) => (
                <div key={i} className={`bg-gradient-to-br ${card.gradFrom} ${card.gradTo} rounded-2xl shadow-lg p-6 text-white`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-white/80 uppercase tracking-wide">{card.label}</p>
                    {card.icon}
                  </div>
                  <p className="text-2xl font-black text-white drop-shadow">
                    {card.valor !== null
                      ? `R$ ${card.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                      : `${card.margem!.toFixed(1)}%`}
                  </p>
                  <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-2">
                    {semTransacoes ? (
                      <span className="text-xs text-white/60 italic">sem dados no período</span>
                    ) : card.temBase ? (
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                        (card.invertido ? card.vari < 0 : card.vari >= 0)
                          ? "bg-white/25 text-white"
                          : "bg-black/20 text-white/90"
                      }`}>
                        {card.vari >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {Math.abs(card.vari).toFixed(1)}% vs ant.
                      </span>
                    ) : (
                      <span className="text-xs text-white/60 italic">sem histórico</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Gráfico de evolução + categorias lado a lado em telas largas */}
        {(() => {
          const fmt = (d: Date) => `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
          const subtitulo = `${fmt(iniAtual)} – ${fmt(fimAtual)}`;
          return (
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              {/* Gráfico — ocupa 3/5 em xl */}
              <div className="xl:col-span-3 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-800 rounded-2xl shadow border border-slate-200 dark:border-gray-700 p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Evolução — {periodoLabels[p]}</h3>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">{subtitulo}</p>
                </div>
                {tendencia.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm font-medium">Nenhuma transação neste período</p>
                    <p className="text-xs mt-1 opacity-70">Navegue para outro período ou adicione transações</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={tendencia} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v: any) => `R$${Number(v).toLocaleString("pt-BR")}`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => [`R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, ""]} />
                      <Legend />
                      <Line type="monotone" dataKey="receitas" stroke="#22c55e" strokeWidth={2} dot={tendencia.length <= 5} name="Receitas" />
                      <Line type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={2} dot={tendencia.length <= 5} name="Despesas" />
                      <Line type="monotone" dataKey="saldo" stroke="#f59e0b" strokeWidth={2} dot={tendencia.length <= 5} name="Saldo" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Categorias — ocupa 2/5 em xl, empilhadas */}
              <div className="xl:col-span-2 grid grid-cols-1 gap-6">
                {/* Receitas por categoria */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800 rounded-2xl shadow border border-green-100 dark:border-gray-700 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Receitas por Categoria</h3>
                  </div>
                  {catReceitas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <TrendingUp className="w-10 h-10 mb-2 opacity-25" />
                      <p className="text-sm font-medium">Nenhuma receita no período</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {catReceitas.map((item, i) => {
                        const pct = totalCatRec > 0 ? (item.valor / totalCatRec) * 100 : 0;
                        const qtd = tsAtual.filter((t) => isReceita(t.type) && (t.category || "Sem categoria") === item.nome).length;
                        return (
                          <div key={i}>
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.cor }} />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{item.nome}</span>
                                <span className="text-xs text-gray-400 flex-shrink-0">({qtd})</span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <span className="text-xs text-gray-400">{pct.toFixed(1)}%</span>
                                <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                                  R$ {item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                            <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: item.cor }} />
                            </div>
                          </div>
                        );
                      })}
                      <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between">
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Total</span>
                        <span className="text-sm font-bold text-green-600">R$ {totalCatRec.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Despesas por categoria */}
                <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-gray-800 dark:to-gray-800 rounded-2xl shadow border border-red-100 dark:border-gray-700 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingDown className="w-5 h-5 text-red-500" />
                    <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Despesas por Categoria</h3>
                  </div>
                  {catDespesas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <TrendingDown className="w-10 h-10 mb-2 opacity-25" />
                      <p className="text-sm font-medium">Nenhuma despesa no período</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {catDespesas.map((item, i) => {
                        const pct = totalCatDesp > 0 ? (item.valor / totalCatDesp) * 100 : 0;
                        const qtd = tsAtual.filter((t) => isDespesa(t.type) && (t.category || "Sem categoria") === item.nome).length;
                        return (
                          <div key={i}>
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.cor }} />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{item.nome}</span>
                                <span className="text-xs text-gray-400 flex-shrink-0">({qtd})</span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <span className="text-xs text-gray-400">{pct.toFixed(1)}%</span>
                                <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                                  R$ {item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                            <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: item.cor }} />
                            </div>
                          </div>
                        );
                      })}
                      <div className="pt-3 border-t border-gray-100 flex justify-between">
                        <span className="text-sm font-bold text-gray-600">Total</span>
                        <span className="text-sm font-bold text-red-600">R$ {totalCatDesp.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Top produtos */}
        <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 rounded-2xl shadow border border-sky-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Award className="w-5 h-5 text-blue-500" />
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Top Produtos / Serviços</h3>
          </div>
          {produtos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Award className="w-10 h-10 mb-2 opacity-25" />
              <p className="text-sm font-medium">Nenhum produto/serviço no período</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(120, produtos.length * 52)}>
              <BarChart data={produtos} layout="vertical" margin={{ top: 0, right: 80, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v: any) => `R$${Number(v).toLocaleString("pt-BR")}`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="nome" width={150} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => [`R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Valor"]} />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]} minPointSize={4}>
                  {produtos.map((entry, i) => (
                    <Cell key={i} fill={entry.cor} />
                  ))}
                  <LabelList dataKey="valor" position="right" formatter={(v: any) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`} style={{ fontSize: 11, fill: "#374151" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  };


  // Função para exportar dados do mês selecionado em PDF
  const exportarMetasPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const mesSelecionado = mesesMetas.find(
        (mes) => mes.indice === selectedMonth,
      );
      if (!mesSelecionado) {
        alert("Mês selecionado não encontrado!");
        return;
      }

      // Criar elemento temporário para capturar o conteúdo
      const tempElement = document.createElement("div");
      tempElement.style.position = "absolute";
      tempElement.style.left = "-9999px";
      tempElement.style.top = "-9999px";
      tempElement.style.width = "800px";
      tempElement.style.backgroundColor = "white";
      tempElement.style.padding = "20px";
      tempElement.style.fontFamily = "Arial, sans-serif";

      // Obter dados REAIS do mês selecionado usando a mesma função do dashboard
      const monthIndex = selectedMonth;
      const currentYear = new Date().getFullYear();

      // Usar a mesma função de cálculo do dashboard para garantir consistência
      const { receitas, despesas, resultado } = calculateTotalsForMonth(
        monthIndex,
        currentYear,
      );
      const totalReceitas = receitas;
      const totalDespesas = despesas;

      // Transações do mês (para exibir quantidade no PDF)
      const transacoesDoMes = transactions.filter((t) => {
        if (!t.date) return false;
        const { month: m, year: y } = getMonthYearFromDate(t.date);
        return m === monthIndex && y === currentYear;
      });

      // Meta de faturamento = meta do mês selecionado
      const metaFaturamento = mesSelecionado.meta;

      // Resultado financeiro
      const resultadoFinanceiro = resultado;

      // Criar HTML do relatório com dados REAIS
      tempElement.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f59e0b; font-size: 28px; margin: 0; font-weight: bold;">ALYA VELAS</h1>
          <h2 style="color: #374151; font-size: 24px; margin: 10px 0; font-weight: bold;">Relatório de Metas - ${mesSelecionado.nome} ${new Date().getFullYear()}</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="color: #f59e0b; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #f59e0b; padding-bottom: 5px;">📊 Resumo Executivo</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div style="background: #fffbeb; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <div style="font-weight: bold; color: #f59e0b; margin-bottom: 5px;">Meta de Faturamento</div>
              <div style="font-size: 18px; font-weight: bold; color: #d97706;">R$ ${metaFaturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
            </div>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
              <div style="font-weight: bold; color: #10b981; margin-bottom: 5px;">Faturamento Realizado</div>
              <div style="font-size: 18px; font-weight: bold; color: #059669;">R$ ${totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
            </div>
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
              <div style="font-weight: bold; color: #ef4444; margin-bottom: 5px;">Total de Despesas</div>
              <div style="font-size: 18px; font-weight: bold; color: #dc2626;">R$ ${totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
            </div>
            <div style="background: ${resultadoFinanceiro >= 0 ? "#f0fdf4" : "#fef2f2"}; padding: 15px; border-radius: 8px; border-left: 4px solid ${resultadoFinanceiro >= 0 ? "#10b981" : "#ef4444"};">
              <div style="font-weight: bold; color: ${resultadoFinanceiro >= 0 ? "#10b981" : "#ef4444"}; margin-bottom: 5px;">Resultado Financeiro</div>
              <div style="font-size: 18px; font-weight: bold; color: ${resultadoFinanceiro >= 0 ? "#059669" : "#dc2626"};">R$ ${resultadoFinanceiro.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="color: #f59e0b; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #f59e0b; padding-bottom: 5px;">📈 Análise de Performance</h3>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="margin-bottom: 15px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="font-weight: bold;">Meta vs Realizado:</span>
                <span style="font-weight: bold; color: ${totalReceitas >= metaFaturamento ? "#10b981" : "#ef4444"};">${totalReceitas >= metaFaturamento ? "✅ Meta Atingida" : "❌ Meta Não Atingida"}</span>
              </div>
              <div style="background: #e2e8f0; height: 20px; border-radius: 10px; overflow: hidden;">
                <div style="background: ${totalReceitas >= metaFaturamento ? "#10b981" : "#ef4444"}; height: 100%; width: ${metaFaturamento > 0 ? Math.min((totalReceitas / metaFaturamento) * 100, 100) : 0}%; transition: width 0.3s ease;"></div>
              </div>
              <div style="text-align: center; margin-top: 5px; font-size: 14px; color: #6b7280;">
                ${metaFaturamento > 0 ? ((totalReceitas / metaFaturamento) * 100).toFixed(1) : 0}% da meta
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
              <div>
                <div style="font-weight: bold; color: #374151; margin-bottom: 5px;">Diferença da Meta:</div>
                <div style="font-size: 16px; color: ${totalReceitas >= metaFaturamento ? "#10b981" : "#ef4444"}; font-weight: bold;">
                  R$ ${(totalReceitas - metaFaturamento).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div style="font-weight: bold; color: #374151; margin-bottom: 5px;">Margem de Lucro:</div>
                <div style="font-size: 16px; color: ${resultadoFinanceiro >= 0 ? "#10b981" : "#ef4444"}; font-weight: bold;">
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
                <div style="font-size: 16px; color: #10b981; font-weight: bold;">R$ ${totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
              </div>
              <div>
                <div style="font-weight: bold; color: #374151; margin-bottom: 5px;">Despesas Reais:</div>
                <div style="font-size: 16px; color: #ef4444; font-weight: bold;">R$ ${totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
              </div>
              <div>
                <div style="font-weight: bold; color: #374151; margin-bottom: 5px;">Meta de Faturamento:</div>
                <div style="font-size: 16px; color: #f59e0b; font-weight: bold;">R$ ${metaFaturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
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
      `;

      document.body.appendChild(tempElement);

      // Capturar o elemento como imagem
      const canvas = await html2canvas(tempElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      // Remover elemento temporário
      document.body.removeChild(tempElement);

      // Criar PDF
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Salvar PDF
      const fileName = `Metas_${mesSelecionado.nome}_${new Date().getFullYear()}_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(fileName);

      alert(
        `✅ Relatório PDF exportado com sucesso!\nArquivo: ${fileName}\n\n📊 Dados incluídos:\n• Meta de Faturamento: R$ ${metaFaturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n• Faturamento Realizado: R$ ${totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n• Total de Despesas: R$ ${totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n• Resultado Financeiro: R$ ${resultadoFinanceiro.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      );
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      alert("❌ Erro ao exportar PDF. Tente novamente.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Render Metas
  const renderMetas = () => {
    // Encontrar o mês selecionado na lista
    const mesSelecionado = mesesMetas.find(
      (mes) => mes.indice === selectedMonth,
    );

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
              disabled={isGeneratingPDF}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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

        {/* Metas derivadas da Projeção */}
        {Array.isArray(projectionSnapshot?.revenueTotals?.previsto) &&
        projectionSnapshot.revenueTotals.previsto.length >= 12 ? (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-2xl">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-bold text-amber-900">
                  Metas integradas à Projeção
                </h3>
                <p className="text-sm text-amber-800 mt-1">
                  As metas de faturamento deste módulo são derivadas do{" "}
                  <b>Faturamento Total</b> da Projeção (cenário <b>Previsto</b>
                  ).
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-gray-400 p-4 rounded-2xl">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-gray-500" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-bold text-gray-800">
                  Projeção indisponível
                </h3>
                <p className="text-sm text-gray-700 mt-1">
                  Ainda não foi possível carregar a Projeção. Usando metas
                  padrão (fallback).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Renderizar Mês Selecionado com navegador horizontal */}
        {mesSelecionado && (
          <div className="space-y-6 mb-12">
            {/* Navegador de Mês */}
            <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-6 rounded-2xl shadow-lg flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedMonth((m) => (m - 1 + 12) % 12)}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors duration-150"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
              <h2 className="text-3xl font-bold text-white text-center uppercase tracking-wider">
                {mesSelecionado.nome} - {new Date().getFullYear()}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedMonth((m) => (m + 1) % 12)}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors duration-150"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            </div>

            {/* Conteúdo do Mês */}
            {renderMonthContent(
              mesSelecionado.nome,
              mesSelecionado.indice,
              mesSelecionado.meta,
            )}
          </div>
        )}

        {/* Renderizar todos os 12 meses em ordem normal (exceto o já exibido no topo) */}
        {mesesMetas
          .filter((mes) => mes.indice !== selectedMonth)
          .map((mes) => renderMonth(mes.nome, mes.indice, mes.meta))}

        {/* Renderizar Total do Ano — sempre por último */}
        {renderTotalAno()}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <ImpersonationBanner />
      {user && <FeedbackButton paginaAtual={activeTab} />}
      <ThemeToggle />
      {/* Container fixo para Header e Navigation */}
      <div className="fixed top-0 left-0 right-0 z-[60]">
        {/* Header */}
        <header className="bg-white/95 backdrop-blur-md shadow-sm border-b border-amber-200 dark:bg-gray-900/95 dark:border-amber-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3 overflow-x-auto scrollbar-hide">
              <div className="flex items-center min-w-max flex-shrink-0">
                <img
                  src={isDemoMode ? "/app/alya-logo.png" : "/alya-logo.png"}
                  alt="Alya Velas Logo"
                  className="w-10 h-10 mr-3 rounded-lg shadow-sm object-contain"
                />
                <div className="min-w-0 flex-shrink">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent whitespace-nowrap">
                    Alya Velas
                  </h1>
                  <p className="text-sm text-amber-600/70 font-medium break-words">
                    Sistema de Gestão Inteligente
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 min-w-max flex-shrink-0 ml-4">
                <MenuUsuario />
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm whitespace-nowrap"
                  title="Sair"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Sair</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation - sempre abaixo do header */}
        <nav className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-amber-100 dark:bg-gray-900/90 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center overflow-x-auto scrollbar-hide">
              <div className="flex items-center space-x-2 min-w-max">
                {(() => {
                  const iconMap: Record<string, React.ElementType> = {
                    dashboard: Home,
                    metas: TrendingUp,
                    reports: BarChart3,
                    projecao: Calculator,
                    transactions: DollarSign,
                    products: Package,
                    clients: Users,
                    nuvemshop: ShoppingBag,
                    dre: BarChart3,
                    activeSessions: Lock,
                    anomalies: Activity,
                    securityAlerts: Bell,
                    admin: Shield,
                    roadmap: Map,
                    faq: HelpCircle,
                    documentacao: BookOpen,
                  };

                  const visibleModules = getVisibleModules();

                  // Filtrar respeitando restrições de role, na ordem definida pelos módulos
                  const filteredTabs = visibleModules.filter((m) => {
                    if (m.key === "admin" || m.key === "roadmap") {
                      return user?.role === "superadmin" || user?.role === "admin";
                    }
                    return true;
                  });

                  return filteredTabs.map((m) => {
                    const Icon = iconMap[m.key] ?? Package;
                    return (
                      <button
                        key={m.key}
                        onClick={() => {
                          setActiveTab(m.key as TabType);
                          setExpandedCharts([]); // Limpa todos os gráficos ao trocar de aba
                          window.scrollTo({ top: 0, behavior: "instant" });
                        }}
                        className={`flex items-center px-6 py-4 text-sm font-medium rounded-t-xl transition-all duration-300 whitespace-nowrap ${
                          activeTab === m.key
                            ? "bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-lg"
                            : "text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-t-lg dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-900/30"
                        }`}
                      >
                        <Icon className="h-5 w-5 mr-2" />
                        {m.name}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Main Content - padding-top para compensar header + nav (altura dinâmica) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-[140px]">
        {activeTab === "dashboard" && renderDashboard()}
        {activeTab === "metas" && renderMetas()}
        {activeTab === "projecao" && (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Carregando projeção...</div>
              </div>
            }
          >
            <Projection />
          </Suspense>
        )}
        {activeTab === "transactions" && renderTransactions()}
        {activeTab === "products" && renderProducts()}
        {activeTab === "reports" && renderReports()}
        {activeTab === "clients" && <Clients />}
        {activeTab === "nuvemshop" && (
          <Suspense fallback={<div className="flex items-center justify-center py-20 text-gray-500">Carregando Nuvemshop...</div>}>
            <NuvemshopIntegration />
          </Suspense>
        )}
        {activeTab === "dre" && <DRE />}
        {activeTab === "roadmap" && (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Carregando roadmap...</div>
              </div>
            }
          >
            <Roadmap />
          </Suspense>
        )}
        {activeTab === "faq" && (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Carregando FAQ...</div>
              </div>
            }
          >
            <FAQ />
          </Suspense>
        )}
        {activeTab === "documentacao" && (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Carregando Documentação...</div>
              </div>
            }
          >
            <Documentation />
          </Suspense>
        )}
        {activeTab === "admin" && (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">
                  Carregando painel administrativo...
                </div>
              </div>
            }
          >
            <AdminPanel />
          </Suspense>
        )}
        {activeTab === "activeSessions" && (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">
                  Carregando sessões ativas...
                </div>
              </div>
            }
          >
            <ActiveSessions />
          </Suspense>
        )}
        {activeTab === "anomalies" && (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">
                  Carregando dashboard de anomalias...
                </div>
              </div>
            }
          >
            <AnomalyDashboard />
          </Suspense>
        )}
        {activeTab === "securityAlerts" && (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">
                  Carregando portal de alertas...
                </div>
              </div>
            }
          >
            <SecurityAlerts />
          </Suspense>
        )}
      </main>

      {/* Modal de Produto */}
      {isProductModalOpen && (
        <div
          className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 pb-4 pt-[120px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsProductModalOpen(false);
              setEditingProduct(null);
              setProductForm({
                name: "",
                category: "",
                price: "",
                cost: "",
                stock: "",
                sold: "",
              });
              setProductFormErrors({
                name: false,
                category: false,
                price: false,
                cost: false,
                stock: false,
                sold: false,
              });
            }
          }}
        >
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[calc(100vh-220px)] overflow-y-auto shadow-2xl border border-gray-200/50 dark:border-gray-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-amber-200/50 dark:border-amber-800/30">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2">
                  <Package className="w-6 h-6 text-amber-700" />
                  {editingProduct ? "Editar Produto" : "Novo Produto"}
                </h2>
                <button
                  onClick={() => {
                    setIsProductModalOpen(false);
                    setEditingProduct(null);
                    setProductForm({
                      name: "",
                      category: "",
                      price: "",
                      cost: "",
                      stock: "",
                      sold: "",
                    });
                    setProductFormErrors({
                      name: false,
                      category: false,
                      price: false,
                      cost: false,
                      stock: false,
                      sold: false,
                    });
                  }}
                  className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 p-2 rounded-full transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Formulário */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();

                // Validar formulário antes de prosseguir
                if (!validateProductForm()) {
                  return;
                }

                if (editingProduct) {
                  // Editar produto existente
                  try {
                    const updatedProduct = await updateProduct(
                      editingProduct.id,
                      {
                        name: productForm.name,
                        category: productForm.category,
                        price: parseFloat(productForm.price) || 0,
                        cost: parseFloat(productForm.cost) || 0,
                        stock: parseInt(productForm.stock) || 0,
                        sold: parseInt(productForm.sold) || 0,
                      },
                    );

                    if (updatedProduct) {
                      setProducts((prev) =>
                        prev.map((p) =>
                          p.id === editingProduct.id ? updatedProduct : p,
                        ),
                      );
                    }
                  } catch (error) {
                    console.error("Erro ao atualizar produto:", error);
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
                      sold: parseInt(productForm.sold) || 0,
                    });

                    if (newProduct) {
                      setProducts((prev) => [newProduct, ...prev]);
                    }
                  } catch (error) {
                    console.error("Erro ao salvar produto:", error);
                  }
                }

                // Limpar formulário e fechar modal
                setEditingProduct(null);
                setIsProductModalOpen(false);
                setProductForm({
                  name: "",
                  category: "",
                  price: "",
                  cost: "",
                  stock: "",
                  sold: "",
                });
              }}
              className="space-y-4"
            >
              {/* Nome do Produto */}
              <div>
                <label htmlFor="product-name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Nome do Produto <span className="text-red-500">*</span>
                </label>
                <input
                  id="product-name"
                  type="text"
                  name="name"
                  required
                  value={productForm.name}
                  onChange={handleProductInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-700 transition-all duration-200 shadow-sm dark:text-gray-200 ${
                    productFormErrors.name
                      ? "bg-red-50 border-red-300 focus:ring-red-500 dark:bg-red-900/20"
                      : "bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600"
                  }`}
                  placeholder="Ex: Vela Aromática Lavanda"
                />
              </div>

              {/* Categoria */}
              <div>
                <label htmlFor="product-category" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Categoria <span className="text-red-500">*</span>
                </label>
                <input
                  id="product-category"
                  type="text"
                  name="category"
                  required
                  value={productForm.category}
                  onChange={handleProductInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-700 transition-all duration-200 shadow-sm dark:text-gray-200 ${
                    productFormErrors.category
                      ? "bg-red-50 border-red-300 focus:ring-red-500 dark:bg-red-900/20"
                      : "bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600"
                  }`}
                  placeholder="Ex: Velas Aromáticas"
                />
              </div>

              {/* Preço de Venda */}
              <div>
                <label htmlFor="product-price" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Preço de Venda (R$) <span className="text-red-500">*</span>
                </label>
                <input
                  id="product-price"
                  type="number"
                  name="price"
                  step="0.01"
                  min="0"
                  required
                  value={productForm.price}
                  onChange={handleProductInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white transition-all duration-200 shadow-sm ${
                    productFormErrors.price
                      ? "bg-red-50 border-red-300 focus:ring-red-500"
                      : "bg-gray-50 border-gray-200"
                  }`}
                  placeholder="0,00"
                />
              </div>

              {/* Custo */}
              <div>
                <label htmlFor="product-cost" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Custo (R$)
                </label>
                <input
                  id="product-cost"
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
                <label htmlFor="product-stock" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Estoque
                </label>
                <input
                  id="product-stock"
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
                <label htmlFor="product-sold" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Quantidade Vendida
                </label>
                <input
                  id="product-sold"
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
                    setIsProductModalOpen(false);
                    setEditingProduct(null);
                    setProductForm({
                      name: "",
                      category: "",
                      price: "",
                      cost: "",
                      stock: "",
                      sold: "",
                    });
                    setProductFormErrors({
                      name: false,
                      category: false,
                      price: false,
                      cost: false,
                      stock: false,
                      sold: false,
                    });
                  }}
                  className="flex-1 px-6 py-3 text-gray-700 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-200 font-semibold shadow-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  {editingProduct ? "Atualizar" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Nova Transação */}
      {isTransactionModalOpen && (
        <div
          className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center px-4 pb-4 pt-[120px] z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsTransactionModalOpen(false);
              setTransactionForm({
                date: new Date().toISOString().split("T")[0],
                description: "",
                value: "",
                type: "Receita",
                category: "",
              });
              setTransactionFormErrors({
                date: false,
                description: false,
                value: false,
                type: false,
                category: false,
              });
            }
          }}
        >
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[calc(100vh-220px)] overflow-y-auto shadow-2xl border border-gray-200/50 dark:border-gray-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-amber-200/50 dark:border-amber-800/30">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-amber-700" />
                  {editingTransaction ? "Editar Transação" : "Nova Transação"}
                </h2>
                <button
                  onClick={() => {
                    setIsTransactionModalOpen(false);
                    setEditingTransaction(null);
                    setTransactionForm({
                      date: new Date().toISOString().split("T")[0],
                      description: "",
                      value: "",
                      type: "Receita",
                      category: "",
                    });
                    setTransactionFormErrors({
                      date: false,
                      description: false,
                      value: false,
                      type: false,
                      category: false,
                    });
                    setIsCalendarOpen(false);
                  }}
                  className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 p-2 rounded-full transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Formulário */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();

                // Validar formulário antes de prosseguir
                if (!validateTransactionForm()) {
                  return;
                }

                if (editingTransaction) {
                  // Editar transação existente
                  try {
                    const updatedTransaction = await updateTransaction(
                      editingTransaction.id,
                      {
                        date: transactionForm.date,
                        description: transactionForm.description,
                        value: parseFloat(transactionForm.value) || 0,
                        type: transactionForm.type as "Receita" | "Despesa",
                        category: transactionForm.category,
                      },
                    );

                    if (updatedTransaction) {
                      setTransactions((prev) =>
                        prev.map((t) =>
                          t.id === editingTransaction.id
                            ? updatedTransaction
                            : t,
                        ),
                      );
                    }
                  } catch (error) {
                    console.error("Erro ao atualizar transação:", error);
                  }
                } else {
                  // Criar nova transação
                  try {
                    const newTransaction = await saveTransaction({
                      date: transactionForm.date,
                      description: transactionForm.description,
                      value: parseFloat(transactionForm.value) || 0,
                      type: transactionForm.type as "Receita" | "Despesa",
                      category: transactionForm.category,
                    });

                    if (newTransaction) {
                      setTransactions((prev) => [newTransaction, ...prev]);
                    }
                  } catch (error) {
                    console.error("Erro ao salvar transação:", error);
                  }
                }

                // Limpar formulário e fechar modal
                setEditingTransaction(null);
                setTransactionForm({
                  date: new Date().toISOString().split("T")[0],
                  description: "",
                  value: "",
                  type: "Receita",
                  category: "",
                });
                setIsTransactionModalOpen(false);
              }}
              className="space-y-5"
            >
              {/* Data */}
              <div className="relative">
                <label htmlFor="tx-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Data <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="tx-date"
                    type="text"
                    name="date"
                    value={
                      transactionForm.date
                        ? formatDateToDisplay(transactionForm.date)
                        : ""
                    }
                    readOnly
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 focus:bg-white dark:focus:bg-gray-700 cursor-pointer dark:text-gray-200 ${
                      transactionFormErrors.date
                        ? "bg-red-50 border-red-300 focus:ring-red-500 dark:bg-red-900/20"
                        : "bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600"
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
                            <span className="text-white text-xs font-bold">
                              !
                            </span>
                          </div>
                          <span className="text-gray-700 text-sm">
                            Preencha este campo.
                          </span>
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
                <label htmlFor="tx-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descrição <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="tx-description"
                    type="text"
                    name="description"
                    value={transactionForm.description}
                    onChange={handleTransactionInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 focus:bg-white ${
                      transactionFormErrors.description
                        ? "bg-red-50 border-red-300 focus:ring-red-500"
                        : "bg-gray-100 border-gray-300"
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
                            <span className="text-white text-xs font-bold">
                              !
                            </span>
                          </div>
                          <span className="text-gray-700 text-sm">
                            Preencha este campo.
                          </span>
                        </div>
                        <div className="absolute -top-1 left-4 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-gray-50"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Valor */}
              <div className="relative">
                <label htmlFor="tx-value" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Valor (R$) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="tx-value"
                    type="number"
                    name="value"
                    value={transactionForm.value}
                    onChange={handleTransactionInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 focus:bg-white dark:focus:bg-gray-700 dark:text-gray-200 ${
                      transactionFormErrors.value
                        ? "bg-red-50 border-red-300 focus:ring-red-500 dark:bg-red-900/20"
                        : "bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600"
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
                            <span className="text-white text-xs font-bold">
                              !
                            </span>
                          </div>
                          <span className="text-gray-700 text-sm">
                            Preencha este campo.
                          </span>
                        </div>
                        <div className="absolute -top-1 left-4 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-gray-50"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tipo */}
              <div>
                <label htmlFor="tx-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="tx-type"
                    name="type"
                    value={transactionForm.type}
                    onChange={handleTransactionInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 focus:bg-white dark:focus:bg-gray-700 dark:text-gray-200 ${
                      transactionFormErrors.type
                        ? "bg-red-50 border-red-300 focus:ring-red-500 dark:bg-red-900/20"
                        : "bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600"
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
                            <span className="text-white text-xs font-bold">
                              !
                            </span>
                          </div>
                          <span className="text-gray-700 text-sm">
                            Preencha este campo.
                          </span>
                        </div>
                        <div className="absolute -top-1 left-4 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-gray-50"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Categoria */}
              <div>
                <label htmlFor="tx-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Categoria <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="tx-category"
                    name="category"
                    value={transactionForm.category}
                    onChange={handleTransactionInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 focus:bg-white dark:focus:bg-gray-700 dark:text-gray-200 ${
                      transactionFormErrors.category
                        ? "bg-red-50 border-red-300 focus:ring-red-500 dark:bg-red-900/20"
                        : "bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600"
                    }`}
                    required
                  >
                    <option value="" disabled>
                      Selecione uma categoria
                    </option>
                    {getCategoriesByType(transactionForm.type).map(
                      (category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ),
                    )}
                  </select>

                  {/* Ícone de erro e tooltip */}
                  {transactionFormErrors.category && (
                    <div className="absolute -bottom-8 left-0 z-50">
                      <div className="relative">
                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg shadow-sm flex items-center gap-2">
                          <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              !
                            </span>
                          </div>
                          <span className="text-gray-700 text-sm">
                            Preencha este campo.
                          </span>
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
                    setIsTransactionModalOpen(false);
                    setEditingTransaction(null);
                    setTransactionForm({
                      date: new Date().toISOString().split("T")[0],
                      description: "",
                      value: "",
                      type: "Receita",
                      category: "",
                    });
                    setTransactionFormErrors({
                      date: false,
                      description: false,
                      value: false,
                      type: false,
                      category: false,
                    });
                    setIsCalendarOpen(false);
                  }}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  {editingTransaction ? "Atualizar" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Importar/Exportar */}
      {isImportExportModalOpen && (
        <div
          className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 pb-4 pt-[120px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsImportExportModalOpen(false);
              setSelectedFile(null);
            }
          }}
        >
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[calc(100vh-220px)] overflow-y-auto shadow-2xl border border-gray-200/50 dark:border-gray-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-amber-200/50 dark:border-amber-800/30">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2">
                  <Download className="w-6 h-6 text-amber-700" />
                  Importar/Exportar{" "}
                  {importExportType === "transactions"
                    ? "Transações"
                    : "Produtos"}
                </h2>
                <button
                  onClick={() => {
                    setIsImportExportModalOpen(false);
                    setSelectedFile(null);
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
                  Baixe o arquivo modelo, preencha com seus dados e depois faça
                  o upload.
                </p>
                <button
                  onClick={async () => {
                    try {
                      console.log("Baixando modelo para:", importExportType);

                      // Tentar baixar do servidor
                      const response = await fetch(
                        `${API_BASE_URL}/modelo/${importExportType}`,
                      );

                      if (response.ok) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `modelo-${importExportType === "transactions" ? "transacoes" : "produtos"}.xlsx`;
                        document.body.appendChild(a);
                        a.click();
                        setTimeout(() => window.URL.revokeObjectURL(url), 150);
                        document.body.removeChild(a);

                        alert(
                          `Modelo baixado! Preencha o arquivo e depois importe.`,
                        );
                      } else {
                        throw new Error("Servidor offline");
                      }
                    } catch (error) {
                      console.error(
                        "Servidor offline, criando modelo local:",
                        error,
                      );

                      // Fallback: criar CSV modelo localmente
                      let csvContent = "";
                      let filename = "";

                      if (importExportType === "transactions") {
                        csvContent = "Data,Descrição,Valor,Tipo,Categoria\n";
                        csvContent +=
                          '2025-09-23,"Exemplo de venda",150.00,Entrada,Vendas\n';
                        csvContent +=
                          '2025-09-23,"Exemplo de compra",75.50,Saída,Compras\n';
                        csvContent +=
                          '2025-09-23,"Exemplo de serviço",200.00,Saída,Serviços';
                        filename = "modelo-transacoes.csv";
                      } else {
                        csvContent =
                          "Nome,Categoria,Preço,Custo,Estoque,Vendido\n";
                        csvContent +=
                          "Produto Exemplo 1,Eletrônicos,299.90,150.00,25,8\n";
                        csvContent +=
                          "Produto Exemplo 2,Roupas,89.90,45.00,50,15\n";
                        csvContent +=
                          "Produto Exemplo 3,Casa,149.90,75.00,10,3";
                        filename = "modelo-produtos.csv";
                      }

                      const blob = new Blob([csvContent], {
                        type: "text/csv;charset=utf-8;",
                      });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = filename;
                      document.body.appendChild(a);
                      a.click();
                      setTimeout(() => window.URL.revokeObjectURL(url), 150);
                      document.body.removeChild(a);

                      alert(
                        "Modelo CSV criado localmente! Preencha o arquivo e importe.",
                      );
                    }
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Baixar Modelo{" "}
                  {importExportType === "transactions"
                    ? "de Transações"
                    : "de Produtos"}
                </button>
              </div>

              {/* Botão Selecionar Arquivo ou Arquivo Selecionado */}
              {!selectedFile ? (
                <button
                  onClick={() => {
                    // Criar input de arquivo dinamicamente
                    const fileInput = document.createElement("input");
                    fileInput.type = "file";
                    fileInput.accept = ".xlsx";
                    fileInput.style.display = "none";

                    fileInput.onchange = (event) => {
                      const file = (event.target as HTMLInputElement)
                        .files?.[0];
                      if (file) {
                        // Verificar se é arquivo xlsx
                        if (file.name.toLowerCase().endsWith(".xlsx")) {
                          setSelectedFile(file);
                        } else {
                          alert(
                            "Por favor, selecione apenas arquivos no formato .xlsx",
                          );
                        }
                      }
                      document.body.removeChild(fileInput);
                    };

                    document.body.appendChild(fileInput);
                    fileInput.click();
                  }}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                >
                  <Upload className="h-6 w-6" />
                  <div className="text-left">
                    <div className="font-bold">Selecionar Arquivo</div>
                    <div className="text-sm opacity-90">
                      Carregar arquivo .xlsx
                    </div>
                  </div>
                </button>
              ) : (
                <div className="w-full p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Upload className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-green-800">
                        Arquivo selecionado:
                      </div>
                      <div className="text-sm text-green-600 truncate">
                        {selectedFile.name}
                      </div>
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
                    setIsUploading(true);

                    // Preparar dados para exportação
                    const dataToExport =
                      importExportType === "transactions"
                        ? transactions
                        : products;

                    if (dataToExport.length === 0) {
                      alert(
                        `Nenhuma ${importExportType === "transactions" ? "transação" : "produto"} encontrada para exportar!`,
                      );
                      return;
                    }

                    // Chamar API de exportação
                    const response = await fetch(`${API_BASE_URL}/export`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        type: importExportType,
                        data: dataToExport,
                      }),
                    });

                    if (response.ok) {
                      // Baixar arquivo
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${importExportType === "transactions" ? "transacoes" : "produtos"}_${new Date().toISOString().split("T")[0]}.xlsx`;
                      document.body.appendChild(a);
                      a.click();
                      setTimeout(() => window.URL.revokeObjectURL(url), 150);
                      document.body.removeChild(a);

                      alert(
                        `Arquivo ${importExportType === "transactions" ? "de transações" : "de produtos"} exportado com sucesso!`,
                      );
                    } else {
                      const error = await response.text();
                      console.error("Erro do servidor:", error);
                      alert(`Erro ao exportar arquivo: ${error}`);
                    }
                  } catch (error) {
                    console.error("Erro ao exportar:", error);
                    alert(
                      `Erro ao exportar arquivo: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
                    );
                  } finally {
                    setIsUploading(false);
                  }
                }}
                disabled={isUploading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <Download className="h-6 w-6" />
                <div className="text-left">
                  <div className="font-bold">{isUploading ? "Exportando..." : "Exportar"}</div>
                  <div className="text-sm opacity-90">
                    Salvar dados em arquivo
                  </div>
                </div>
              </button>

              {/* Botão Importar (quando arquivo selecionado) */}
              {selectedFile && (
                <button
                  onClick={async () => {
                    setIsUploading(true);
                    try {
                      // Criar FormData para enviar o arquivo
                      const formData = new FormData();
                      formData.append("file", selectedFile);
                      formData.append("type", importExportType); // 'transactions' ou 'products'

                      console.log(
                        `Enviando arquivo: ${selectedFile.name} (${importExportType})`,
                      );

                      // Tentar fazer requisição para o servidor backend
                      try {
                        const headers: HeadersInit = {};
                        if (token) {
                          headers["Authorization"] = `Bearer ${token}`;
                        }
                        const response = await fetch(`${API_BASE_URL}/import`, {
                          method: "POST",
                          headers,
                          body: formData,
                        });

                        if (response.ok) {
                          const result = await response.json();
                          console.log("Resposta do servidor:", result);

                          // Backend já salvou — apenas atualizar estado local
                          if (
                            importExportType === "transactions" &&
                            result.data?.length
                          ) {
                            setTransactions((prev) => [
                              ...prev,
                              ...result.data,
                            ]);
                          } else if (
                            importExportType === "products" &&
                            result.data?.length
                          ) {
                            setProducts((prev) => [...prev, ...result.data]);
                          }

                          alert(
                            `Arquivo "${selectedFile.name}" importado com sucesso!\n\n${result.message || "Dados processados com sucesso."}`,
                          );
                        } else {
                          const error = await response.text();
                          console.error("Erro do servidor:", error);
                          alert(`Erro ao importar arquivo: ${error}`);
                        }
                      } catch (networkError) {
                        console.error(
                          "Erro de conexão com servidor:",
                          networkError,
                        );

                        // Fallback: processar dados mock localmente quando servidor não estiver disponível
                        console.log(
                          "Servidor não disponível, usando dados de exemplo...",
                        );

                        if (importExportType === "transactions") {
                          const mockTransactions = [
                            {
                              id: (Date.now() + 1).toString(),
                              date: new Date().toISOString().split("T")[0],
                              description: "Transação Importada 1",
                              value: 150,
                              type: "Receita" as const,
                              category: "Vendas",
                              createdAt: new Date(),
                            },
                            {
                              id: (Date.now() + 2).toString(),
                              date: new Date().toISOString().split("T")[0],
                              description: "Transação Importada 2",
                              value: 75,
                              type: "Despesa" as const,
                              category: "Compras",
                              createdAt: new Date(),
                            },
                          ];
                          const storage = getStorage();
                          setTransactions((prev) => {
                            const updated = [...prev, ...mockTransactions];
                            storage.setItem("transactions", JSON.stringify(updated));
                            return updated;
                          });
                          alert(
                            `Arquivo "${selectedFile.name}" processado localmente!\n\n${mockTransactions.length} transações adicionadas como exemplo.`,
                          );
                        } else if (importExportType === "products") {
                          const mockProducts = [
                            {
                              id: (Date.now() + 1).toString(),
                              name: "Produto Importado 1",
                              category: "Importados",
                              price: 120,
                              cost: 60,
                              stock: 15,
                              sold: 3,
                            },
                            {
                              id: (Date.now() + 2).toString(),
                              name: "Produto Importado 2",
                              category: "Importados",
                              price: 80,
                              cost: 40,
                              stock: 25,
                              sold: 8,
                            },
                          ];
                          const storage = getStorage();
                          setProducts((prev) => {
                            const updated = [...prev, ...mockProducts];
                            storage.setItem("products", JSON.stringify(updated));
                            return updated;
                          });
                          alert(
                            `Arquivo "${selectedFile.name}" processado localmente!\n\n${mockProducts.length} produtos adicionados como exemplo.`,
                          );
                        }
                      }
                    } catch (error) {
                      console.error("Erro na requisição:", error);
                      alert(
                        `Erro ao enviar arquivo: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
                      );
                    } finally {
                      setIsUploading(false);
                    }

                    // Fechar modal e limpar arquivo após tentativa
                    setSelectedFile(null);
                    setIsImportExportModalOpen(false);
                  }}
                  disabled={isUploading}
                  className={`w-full px-6 py-3 font-semibold rounded-lg shadow-lg transition-all duration-200 ${
                    isUploading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 hover:shadow-xl transform hover:-translate-y-0.5"
                  }`}
                >
                  {isUploading ? "Enviando arquivo..." : "Importar Arquivo"}
                </button>
              )}

              {/* Botão Cancelar */}
              <button
                onClick={() => {
                  setIsImportExportModalOpen(false);
                  setSelectedFile(null);
                }}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all duration-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importar Extrato Bancário */}
      {isImportExtratoModalOpen && (
        <div
          className={`fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center px-4 pb-4 ${extratoStep === 3 ? 'z-[70] pt-4' : 'z-50 pt-[180px]'}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsImportExtratoModalOpen(false);
              setSelectedBank(null);
              setExtratoStep(0);
              setExtratoFile(null);
              setExtratoPassword('');
              setExtratoPreview([]);
            }
          }}
        >
          <div className={`bg-white dark:bg-gray-800 rounded-2xl w-full ${extratoStep === 3 ? 'max-w-4xl max-h-[calc(100vh-40px)]' : 'max-w-lg max-h-[calc(100vh-220px)]'} overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {extratoStep === 0
                      ? 'Importar lançamentos'
                      : extratoStep === 3
                        ? 'Revisar antes de importar'
                        : importType === 'fatura'
                          ? 'Importar Fatura de Cartão'
                          : 'Importar Extrato Bancário'}
                  </h2>
                  <p className="text-blue-100 text-xs mt-0.5">
                    {extratoStep === 0 && 'Escolha o tipo de arquivo que deseja importar'}
                    {extratoStep === 1 && <>Selecione o banco · Arquivos aceitos: <span className="font-semibold">PDF</span> e <span className="font-semibold">XLSX</span></>}
                    {extratoStep === 2 && `Passo 2 de 3 · Envie o arquivo da ${importType === 'fatura' ? 'fatura' : 'extrato'}`}
                    {extratoStep === 3 && `Passo 3 de 3 · ${extratoPreview.length} transação${extratoPreview.length !== 1 ? 'ões' : ''} encontrada${extratoPreview.length !== 1 ? 's' : ''} · Edite, remova ou adicione antes de confirmar`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportExtratoModalOpen(false);
                  setImportType(null);
                  setSelectedBank(null);
                  setExtratoStep(0);
                  setExtratoFile(null);
                  setExtratoPassword('');
                  setExtratoPreview([]);
                }}
                className="text-white/70 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-5">
              {/* Passo 0 — Escolha entre extrato ou fatura */}
              {extratoStep === 0 && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">O que você deseja importar?</p>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Extrato Bancário */}
                    <button
                      type="button"
                      onClick={() => { setImportType('extrato'); setExtratoStep(1); }}
                      className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-blue-400 hover:shadow-md transition-all duration-200 group"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                        <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Extrato Bancário</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Movimentações da conta corrente</p>
                      </div>
                    </button>
                    {/* Fatura de Cartão */}
                    <button
                      type="button"
                      onClick={() => { setImportType('fatura'); setExtratoStep(1); }}
                      className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-purple-400 hover:shadow-md transition-all duration-200 group"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors">
                        <svg className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Fatura de Cartão</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Compras e gastos no crédito</p>
                      </div>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setIsImportExtratoModalOpen(false); setImportType(null); setExtratoStep(0); setExtratoFile(null); }}
                    className="mt-1 w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {/* Passo 1 — Seleção do banco */}
              {extratoStep === 1 && (<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {/* Banco do Brasil */}
                <button
                  type="button"
                  onClick={() => setSelectedBank(selectedBank === 'bb' ? null : 'bb')}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                    selectedBank === 'bb'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md scale-[1.02]'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-blue-300'
                  }`}
                >
                  {selectedBank === 'bb' && <CheckCircle2 className="w-4 h-4 text-blue-500 absolute top-2 right-2" />}
                  <div className="w-14 h-14 rounded-xl bg-[#003882] flex items-center justify-center overflow-hidden p-1 shadow-sm">
                    <img
                      src="https://logo.clearbit.com/bb.com.br"
                      alt="Banco do Brasil"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                        (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
                      }}
                    />
                    <span className="hidden w-full h-full items-center justify-center text-white font-bold text-xl">BB</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 text-center leading-tight">Banco do Brasil</span>
                </button>

                {/* Sicoob — desabilitado em faturas */}
                {importType === 'fatura' ? (
                  <div className="relative group">
                    <button
                      type="button"
                      disabled
                      className="relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 opacity-60 cursor-not-allowed w-full"
                    >
                      <div className="w-14 h-14 rounded-xl bg-[#007A4B] flex items-center justify-center overflow-hidden p-1 shadow-sm">
                        <img
                          src="https://logo.clearbit.com/sicoob.com.br"
                          alt="Sicoob"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                            (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
                          }}
                        />
                        <span className="hidden w-full h-full items-center justify-center text-white font-bold text-xl">SC</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-center leading-tight">Sicoob</span>
                    </button>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                      <span className="bg-gray-900/80 text-white text-[10px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap">Em desenvolvimento</span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedBank(selectedBank === 'sicoob' ? null : 'sicoob')}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                      selectedBank === 'sicoob'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md scale-[1.02]'
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-blue-300'
                    }`}
                  >
                    {selectedBank === 'sicoob' && <CheckCircle2 className="w-4 h-4 text-blue-500 absolute top-2 right-2" />}
                    <div className="w-14 h-14 rounded-xl bg-[#007A4B] flex items-center justify-center overflow-hidden p-1 shadow-sm">
                      <img
                        src="https://logo.clearbit.com/sicoob.com.br"
                        alt="Sicoob"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                          (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
                        }}
                      />
                      <span className="hidden w-full h-full items-center justify-center text-white font-bold text-xl">SC</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 text-center leading-tight">Sicoob</span>
                  </button>
                )}

                {/* C6 Bank */}
                <button
                  type="button"
                  onClick={() => setSelectedBank(selectedBank === 'c6' ? null : 'c6')}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                    selectedBank === 'c6'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md scale-[1.02]'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-blue-300'
                  }`}
                >
                  {selectedBank === 'c6' && <CheckCircle2 className="w-4 h-4 text-blue-500 absolute top-2 right-2" />}
                  <div className="w-14 h-14 rounded-xl bg-[#242424] flex items-center justify-center overflow-hidden p-1 shadow-sm">
                    <img
                      src="https://logo.clearbit.com/c6bank.com.br"
                      alt="C6 Bank"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                        (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
                      }}
                    />
                    <span className="hidden w-full h-full items-center justify-center text-white font-bold text-xl">C6</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 text-center leading-tight">C6 Bank</span>
                </button>

                {/* Mercado Pago — em desenvolvimento */}
                <div className="relative group">
                  <button
                    type="button"
                    disabled
                    className="relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 opacity-60 cursor-not-allowed w-full"
                  >
                    <div className="w-14 h-14 rounded-xl bg-[#009EE3] flex items-center justify-center overflow-hidden p-1 shadow-sm">
                      <img
                        src="https://logo.clearbit.com/mercadopago.com.br"
                        alt="Mercado Pago"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                          (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
                        }}
                      />
                      <span className="hidden w-full h-full items-center justify-center text-white font-bold text-sm">MP</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-center leading-tight">Mercado Pago</span>
                  </button>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <span className="bg-gray-900/80 text-white text-[10px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap">Em desenvolvimento</span>
                  </div>
                </div>

                {/* InfinityPay — em desenvolvimento */}
                <div className="relative group">
                  <button
                    type="button"
                    disabled
                    className="relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 opacity-60 cursor-not-allowed w-full"
                  >
                    <div className="w-14 h-14 rounded-xl bg-[#00C853] flex items-center justify-center overflow-hidden p-1 shadow-sm">
                      <img
                        src="https://logo.clearbit.com/infinitepay.io"
                        alt="InfinityPay"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                          (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
                        }}
                      />
                      <span className="hidden w-full h-full items-center justify-center text-white font-bold text-sm">IP</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-center leading-tight">InfinityPay</span>
                  </button>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <span className="bg-gray-900/80 text-white text-[10px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap">Em desenvolvimento</span>
                  </div>
                </div>
              </div>)}

              {/* Rodapé passo 1 */}
              {extratoStep === 1 && (
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBank(null);
                      setExtratoStep(0);
                    }}
                    className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={!selectedBank}
                    onClick={() => setExtratoStep(2)}
                    className={`flex-1 px-4 py-3 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                      selectedBank
                        ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800 shadow-lg hover:shadow-xl'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                    Continuar
                  </button>
                </div>
              )}

              {/* Passo 2 — Upload do arquivo */}
              {extratoStep === 2 && (
                <div className="mt-4 space-y-4">
                  {/* Tipo + Banco selecionado */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <span className="text-sm text-purple-700 dark:text-purple-300">
                        Tipo: <span className="font-semibold">{importType === 'fatura' ? 'Fatura de Cartão' : 'Extrato Bancário'}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="text-sm text-blue-700 dark:text-blue-300">
                        Banco: <span className="font-semibold">
                          {{ bb: 'Banco do Brasil', sicoob: 'Sicoob', c6: 'C6 Bank', mercadopago: 'Mercado Pago', infinitypay: 'InfinityPay' }[selectedBank!]}
                        </span>
                      </span>
                      <button type="button" onClick={() => { setExtratoStep(1); setExtratoFile(null); }} className="ml-auto text-blue-400 hover:text-blue-600 text-xs underline">
                        Alterar
                      </button>
                    </div>
                  </div>

                  {/* Área de upload */}
                  {!extratoFile ? (
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.pdf,.xlsx';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) setExtratoFile(file);
                          document.body.removeChild(input);
                        };
                        document.body.appendChild(input);
                        input.click();
                      }}
                      className="w-full border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    >
                      <Upload className="w-8 h-8 text-blue-400" />
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Clique para selecionar o arquivo</span>
                      <span className="text-xs text-gray-400">PDF ou XLSX · Máx. 10 MB</span>
                    </button>
                  ) : (
                    <div className="w-full p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-full">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-green-800 dark:text-green-300 truncate">{extratoFile.name}</p>
                        <p className="text-xs text-green-600 dark:text-green-400">{(extratoFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button type="button" onClick={() => setExtratoFile(null)} className="text-green-500 hover:text-green-700 p-1 rounded-full hover:bg-green-100">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Senha do PDF (opcional) */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Senha do PDF <span className="text-gray-400">(deixe em branco se não houver)</span>
                    </label>
                    <input
                      type="password"
                      value={extratoPassword}
                      onChange={(e) => setExtratoPassword(e.target.value)}
                      placeholder="Senha do arquivo PDF"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                    />
                  </div>

                  {/* Botões passo 2 */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setExtratoStep(1); setExtratoFile(null); }}
                      className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Voltar
                    </button>
                    <button
                      type="button"
                      disabled={!extratoFile || isUploadingExtrato}
                      onClick={async () => {
                        if (!extratoFile || !selectedBank) return;
                        setIsUploadingExtrato(true);
                        try {
                          const formData = new FormData();
                          formData.append('file', extratoFile);
                          formData.append('bank', selectedBank);
                          formData.append('importType', importType ?? 'extrato');
                          if (extratoPassword) formData.append('password', extratoPassword);
                          const headers: HeadersInit = {};
                          if (token) headers['Authorization'] = `Bearer ${token}`;
                          const response = await fetch(`${API_BASE_URL}/import/extrato`, { method: 'POST', headers, body: formData });
                          if (response.ok) {
                            const result = await response.json();
                            const withIds: PreviewTx[] = (result.data ?? []).map((t: Omit<PreviewTx, '_id'>, i: number) => ({
                              ...t,
                              _id: `preview-${Date.now()}-${i}`,
                            }));
                            setExtratoPreview(withIds);
                            setExtratoStep(3);
                          } else {
                            const errBody = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
                            alert(`Erro ao processar arquivo: ${errBody.error || 'Tente novamente.'}`);
                          }
                        } catch (e) {
                          alert(`Erro ao enviar arquivo: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
                        } finally {
                          setIsUploadingExtrato(false);
                        }
                      }}
                      className={`flex-1 px-4 py-3 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                        extratoFile && !isUploadingExtrato
                          ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800 shadow-lg hover:shadow-xl'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      {isUploadingExtrato ? 'Processando...' : 'Processar arquivo'}
                    </button>
                  </div>
                </div>
              )}

              {/* Passo 3 — Preview / Sandbox */}
              {extratoStep === 3 && (() => {
                const selectedIds = extratoPreview.filter(t => (t as any)._selected).map(t => t._id);
                const allSelected = extratoPreview.length > 0 && selectedIds.length === extratoPreview.length;
                const someSelected = selectedIds.length > 0 && !allSelected;
                const toggleAll = () => setExtratoPreview(prev => prev.map(t => ({ ...t, _selected: !allSelected })));
                const toggleOne = (id: string) => setExtratoPreview(prev => prev.map(t => t._id === id ? { ...t, _selected: !(t as any)._selected } : t));
                const deleteSelected = () => setExtratoPreview(prev => prev.filter(t => !(t as any)._selected));

                const totalReceita = extratoPreview.filter(t => t.type === 'Receita').reduce((s, t) => s + t.value, 0);
                const totalDespesa = extratoPreview.filter(t => t.type === 'Despesa').reduce((s, t) => s + t.value, 0);
                const saldo = totalReceita - totalDespesa;

                return (
                <div className="mt-2 space-y-4">
                  {/* Totalizadores */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">Receitas</p>
                      <p className="text-sm font-bold text-green-700 dark:text-green-300">R$ {totalReceita.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium">Despesas</p>
                      <p className="text-sm font-bold text-red-700 dark:text-red-300">R$ {totalDespesa.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div className={`rounded-xl p-3 text-center ${saldo >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
                      <p className={`text-xs font-medium ${saldo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>Saldo</p>
                      <p className={`text-sm font-bold ${saldo >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>{saldo < 0 ? '-' : ''}R$ {Math.abs(saldo).toFixed(2).replace('.', ',')}</p>
                    </div>
                  </div>

                  {/* Barra de ações em massa — aparece quando há seleção */}
                  {selectedIds.length > 0 && (
                    <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5">
                      <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                        {selectedIds.length} selecionada{selectedIds.length !== 1 ? 's' : ''}
                      </span>
                      <button
                        type="button"
                        onClick={deleteSelected}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Excluir selecionadas
                      </button>
                    </div>
                  )}

                  {/* Tabela editável */}
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          <th className="px-3 py-2 w-8">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              ref={el => { if (el) el.indeterminate = someSelected; }}
                              onChange={toggleAll}
                              className="w-3.5 h-3.5 rounded accent-blue-500 cursor-pointer"
                            />
                          </th>
                          <th className="px-3 py-2 text-left font-semibold w-28">Data</th>
                          <th className="px-3 py-2 text-left font-semibold">Descrição</th>
                          <th className="px-3 py-2 text-left font-semibold w-24">Valor</th>
                          <th className="px-3 py-2 text-left font-semibold w-24">Tipo</th>
                          <th className="px-3 py-2 text-left font-semibold w-28">Categoria</th>
                          <th className="px-3 py-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {extratoPreview.map((tx) => {
                          const isSelected = !!(tx as any)._selected;
                          return (
                          <tr key={tx._id} className={`transition-colors ${isSelected ? 'bg-red-50 dark:bg-red-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                            <td className="px-3 py-1 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleOne(tx._id)}
                                className="w-3.5 h-3.5 rounded accent-blue-500 cursor-pointer"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="date"
                                value={tx.date}
                                onChange={(e) => setExtratoPreview(prev => prev.map(t => t._id === tx._id ? { ...t, date: e.target.value } : t))}
                                className="w-full bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-400 rounded px-1 py-0.5 text-xs text-gray-700 dark:text-gray-300 focus:outline-none transition-colors"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={tx.description}
                                onChange={(e) => setExtratoPreview(prev => prev.map(t => t._id === tx._id ? { ...t, description: e.target.value } : t))}
                                className="w-full bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-400 rounded px-1 py-0.5 text-xs text-gray-700 dark:text-gray-300 focus:outline-none transition-colors"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="number"
                                step="0.01"
                                value={tx.value}
                                onChange={(e) => setExtratoPreview(prev => prev.map(t => t._id === tx._id ? { ...t, value: parseFloat(e.target.value) || 0 } : t))}
                                className="w-full bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-400 rounded px-1 py-0.5 text-xs text-gray-700 dark:text-gray-300 focus:outline-none transition-colors"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <button
                                type="button"
                                onClick={() => setExtratoPreview(prev => prev.map(t => t._id === tx._id ? { ...t, type: t.type === 'Receita' ? 'Despesa' : 'Receita' } : t))}
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${tx.type === 'Receita' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 hover:bg-green-200' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 hover:bg-red-200'}`}
                              >
                                {tx.type}
                              </button>
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={tx.category}
                                onChange={(e) => setExtratoPreview(prev => prev.map(t => t._id === tx._id ? { ...t, category: e.target.value } : t))}
                                className="w-full bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-400 rounded px-1 py-0.5 text-xs text-gray-700 dark:text-gray-300 focus:outline-none transition-colors"
                              />
                            </td>
                            <td className="px-2 py-1 text-center">
                              <button
                                type="button"
                                onClick={() => setExtratoPreview(prev => prev.filter(t => t._id !== tx._id))}
                                className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors"
                                title="Remover"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {extratoPreview.length === 0 && (
                    <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">Nenhuma transação. Adicione manualmente abaixo.</p>
                  )}

                  {/* Adicionar nova linha */}
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setExtratoPreview(prev => [...prev, { _id: `preview-new-${Date.now()}`, date: today, description: '', value: 0, type: 'Despesa', category: 'Outros' }]);
                    }}
                    className="w-full py-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-all text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar transação
                  </button>

                  {/* Ações */}
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => { setExtratoStep(2); setExtratoPreview([]); }}
                      className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Voltar
                    </button>
                    <button
                      type="button"
                      disabled={extratoPreview.length === 0 || isConfirmingImport}
                      onClick={async () => {
                        if (extratoPreview.length === 0) return;
                        const label = importType === 'fatura' ? 'fatura' : 'extrato';
                        const confirmed = window.confirm(`Confirmar a importação de ${extratoPreview.length} transação${extratoPreview.length !== 1 ? 'ões' : ''} do ${label}?\n\nEssa ação pode ser desfeita nos próximos 15 segundos após a importação.`);
                        if (!confirmed) return;
                        setIsConfirmingImport(true);
                        try {
                          const headers: HeadersInit = { 'Content-Type': 'application/json' };
                          if (token) headers['Authorization'] = `Bearer ${token}`;
                          const body = JSON.stringify({ transactions: extratoPreview.map(({ _id: _r, ...t }) => { const { _selected: _s, ...rest } = t as any; return rest; }) });
                          const response = await fetch(`${API_BASE_URL}/import/extrato/confirm`, { method: 'POST', headers, body });
                          if (response.ok) {
                            const result = await response.json();
                            const savedIds: string[] = (result.data ?? []).map((t: { id: string }) => t.id);
                            if (result.data?.length) {
                              setTransactions((prev) => [...result.data, ...prev]);
                            }
                            // Fechar modal
                            setIsImportExtratoModalOpen(false);
                            setImportType(null);
                            setSelectedBank(null);
                            setExtratoStep(0);
                            setExtratoFile(null);
                            setExtratoPassword('');
                            setExtratoPreview([]);
                            // Ativar toast de undo
                            setLastImportBatch(savedIds);
                            setUndoCountdown(15);
                            setShowUndoToast(true);
                          } else {
                            const errBody = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
                            alert(`Erro ao importar: ${errBody.error || 'Tente novamente.'}`);
                          }
                        } catch (e) {
                          alert(`Erro ao importar: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
                        } finally {
                          setIsConfirmingImport(false);
                        }
                      }}
                      className={`flex-1 px-4 py-3 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                        extratoPreview.length > 0 && !isConfirmingImport
                          ? 'bg-gradient-to-r from-green-500 to-green-700 text-white hover:from-green-600 hover:to-green-800 shadow-lg hover:shadow-xl'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isConfirmingImport ? (
                        <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Importando...</>
                      ) : (
                        <><CheckCircle2 className="w-4 h-4" />Confirmar importação</>
                      )}
                    </button>
                  </div>
                </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seleção de Período para Exportar Relatórios */}
      {isPeriodoExportModalOpen && (
        <div
          className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 pb-4 pt-[120px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsPeriodoExportModalOpen(false);
            }
          }}
        >
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[calc(100vh-220px)] overflow-y-auto shadow-2xl border border-gray-200/50 dark:border-gray-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-amber-200/50 dark:border-amber-800/30">
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
                  onClick={() => exportarRelatoriosPDF("Semana")}
                  disabled={isGeneratingPDF}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border-2 border-amber-200 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <span className="font-semibold text-gray-800">Semana</span>
                  </div>
                  <ArrowUpCircle className="w-5 h-5 text-amber-600" />
                </button>

                <button
                  onClick={() => exportarRelatoriosPDF("Mês")}
                  disabled={isGeneratingPDF}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border-2 border-amber-200 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <span className="font-semibold text-gray-800">Mês</span>
                  </div>
                  <ArrowUpCircle className="w-5 h-5 text-amber-600" />
                </button>

                <button
                  onClick={() => exportarRelatoriosPDF("Trimestre")}
                  disabled={isGeneratingPDF}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border-2 border-amber-200 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <span className="font-semibold text-gray-800">
                      Trimestre
                    </span>
                  </div>
                  <ArrowUpCircle className="w-5 h-5 text-amber-600" />
                </button>

                <button
                  onClick={() => exportarRelatoriosPDF("Ano")}
                  disabled={isGeneratingPDF}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border-2 border-amber-200 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <span className="font-semibold text-gray-800">Ano</span>
                  </div>
                  <ArrowUpCircle className="w-5 h-5 text-amber-600" />
                </button>

                <button
                  onClick={() => exportarRelatoriosPDF("Todos")}
                  disabled={isGeneratingPDF}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-2 border-amber-400 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
          className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 pb-4 pt-[120px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsExportTransacoesModalOpen(false);
            }
          }}
        >
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[calc(100vh-220px)] overflow-y-auto shadow-2xl border border-gray-200/50 dark:border-gray-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-amber-200/50 dark:border-amber-800/30">
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
                  <label
                    htmlFor="exportarFiltradas"
                    className="font-semibold text-gray-800 cursor-pointer block mb-1"
                  >
                    Exportar apenas transações filtradas
                  </label>
                  <p className="text-sm text-gray-600">
                    {exportarFiltradas
                      ? "Serão exportadas apenas as transações que estão visíveis na lista (com filtros aplicados)."
                      : "Todas as transações serão exportadas, independente dos filtros ativos."}
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
                  <label
                    htmlFor="incluirResumo"
                    className="font-semibold text-gray-800 cursor-pointer block mb-1"
                  >
                    Incluir resumo financeiro
                  </label>
                  <p className="text-sm text-gray-600">
                    {incluirResumo
                      ? "O PDF incluirá um resumo com totais de receitas, despesas, saldo e quantidade de transações."
                      : "Apenas a tabela de transações será incluída no PDF."}
                  </p>
                </div>
              </div>

              {/* Informações sobre filtros ativos */}
              {(transactionFilters.type ||
                transactionFilters.category ||
                transactionFilters.dateFrom ||
                transactionFilters.dateTo) &&
                exportarFiltradas && (
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-sm font-semibold text-blue-800 mb-2">
                      Filtros ativos:
                    </p>
                    <ul className="text-sm text-blue-700 space-y-1">
                      {transactionFilters.type && (
                        <li>• Tipo: {transactionFilters.type}</li>
                      )}
                      {transactionFilters.category && (
                        <li>• Categoria: {transactionFilters.category}</li>
                      )}
                      {transactionFilters.dateFrom && (
                        <li>
                          • Data início:{" "}
                          {formatDateToDisplay(transactionFilters.dateFrom)}
                        </li>
                      )}
                      {transactionFilters.dateTo && (
                        <li>
                          • Data fim:{" "}
                          {formatDateToDisplay(transactionFilters.dateTo)}
                        </li>
                      )}
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
                  disabled={isGeneratingPDF}
                  className="flex-1 py-2 px-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingPDF ? "Gerando..." : "Exportar PDF"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuração de Exportação de Produtos */}
      {isExportProdutosModalOpen && (
        <div
          className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 pb-4 pt-[120px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsExportProdutosModalOpen(false);
            }
          }}
        >
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[calc(100vh-220px)] overflow-y-auto shadow-2xl border border-gray-200/50 dark:border-gray-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-amber-200/50 dark:border-amber-800/30">
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
                  <label
                    htmlFor="exportarFiltrados"
                    className="font-semibold text-gray-800 cursor-pointer block mb-1"
                  >
                    Exportar apenas produtos filtrados
                  </label>
                  <p className="text-sm text-gray-600">
                    {exportarFiltrados
                      ? "Serão exportados apenas os produtos que estão visíveis na lista (com filtros aplicados)."
                      : "Todos os produtos serão exportados, independente dos filtros ativos."}
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
                  <label
                    htmlFor="incluirResumoProdutos"
                    className="font-semibold text-gray-800 cursor-pointer block mb-1"
                  >
                    Incluir resumo estatístico
                  </label>
                  <p className="text-sm text-gray-600">
                    {incluirResumoProdutos
                      ? "O PDF incluirá um resumo com totais de estoque, custos, lucro potencial, margem média e distribuição por categoria."
                      : "Apenas a tabela de produtos será incluída no PDF."}
                  </p>
                </div>
              </div>

              {/* Informações sobre filtros ativos */}
              {(productFilters.category ||
                productFilters.stockFilter ||
                productFilters.soldFilter ||
                productFilters.costFilter) &&
                exportarFiltrados && (
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-sm font-semibold text-blue-800 mb-2">
                      Filtros ativos:
                    </p>
                    <ul className="text-sm text-blue-700 space-y-1">
                      {productFilters.category && (
                        <li>• Categoria: {productFilters.category}</li>
                      )}
                      {productFilters.stockFilter === "inStock" && (
                        <li>• Em estoque</li>
                      )}
                      {productFilters.stockFilter === "outOfStock" && (
                        <li>• Sem estoque</li>
                      )}
                      {productFilters.soldFilter === "sold" && (
                        <li>• Vendidos</li>
                      )}
                      {productFilters.soldFilter === "notSold" && (
                        <li>• Não vendidos</li>
                      )}
                      {productFilters.costFilter === "withCost" && (
                        <li>• Com preço de custo</li>
                      )}
                      {productFilters.costFilter === "withoutCost" && (
                        <li>• Sem preço de custo</li>
                      )}
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
                  disabled={isGeneratingPDF}
                  className="flex-1 py-2 px-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingPDF ? "Gerando..." : "Exportar PDF"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer dinâmico */}
      <Footer />

      {/* Modal de confirmação de commit pendente (somente superadmin) */}
      {commitPendente && (
        <CommitVersionModal
          commitHash={commitPendente.commitHash}
          versaoAtual={commitPendente.versaoAtual}
          mensagemOriginal={commitPendente.mensagem}
          data={commitPendente.data}
          onClose={() => setCommitPendente(null)}
          onConfirm={async ({ action, novaVersao, mensagem, data, rolesNotificados }) => {
            const res = await fetch(`${API_BASE_URL}/admin/rodape/confirmar-commit`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                action,
                novaVersao,
                commitHash: commitPendente.commitHash,
                mensagem,
                data,
                rolesNotificados,
              }),
            });
            if (!res.ok) throw new Error('Falha na requisição');
            setCommitPendente(null);
            window.dispatchEvent(new Event('rodape-updated'));
          }}
        />
      )}

      {/* Modal de nova versão para usuários */}
      {versaoNova && (
        <VersaoNovaModal
          versao={versaoNova.versao}
          texto={versaoNova.texto}
          onClose={async () => {
            const versao = versaoNova.versao;
            setVersaoNova(null);
            try {
              await fetch(`${API_BASE_URL}/notificacao-versao/vista`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ versao }),
              });
            } catch { /* silently ignore */ }
          }}
        />
      )}

      {/* Toast de Desfazer Importação */}
      {showUndoToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 bg-gray-900 dark:bg-gray-800 text-white rounded-2xl shadow-2xl px-5 py-4 min-w-[320px] border border-gray-700">
            {/* Countdown ring */}
            <div className="relative flex-shrink-0">
              <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15" fill="none" stroke="#4ade80" strokeWidth="3"
                  strokeDasharray={`${(undoCountdown / 15) * 94.2} 94.2`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-green-400">{undoCountdown}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">Importação concluída!</p>
              <p className="text-xs text-gray-400 mt-0.5">Deseja desfazer?</p>
            </div>
            <button
              type="button"
              disabled={isUndoing}
              onClick={async () => {
                if (lastImportBatch.length === 0) return;
                setIsUndoing(true);
                try {
                  const headers: HeadersInit = { 'Content-Type': 'application/json' };
                  if (token) headers['Authorization'] = `Bearer ${token}`;
                  const response = await fetch(`${API_BASE_URL}/transactions/bulk`, {
                    method: 'DELETE',
                    headers,
                    body: JSON.stringify({ ids: lastImportBatch }),
                  });
                  if (response.ok) {
                    setTransactions((prev) => prev.filter((t) => !lastImportBatch.includes(String(t.id))));
                    setShowUndoToast(false);
                    setLastImportBatch([]);
                  } else {
                    alert('Não foi possível desfazer a importação. Tente excluir as transações manualmente.');
                  }
                } catch {
                  alert('Erro ao desfazer a importação.');
                } finally {
                  setIsUndoing(false);
                }
              }}
              className="px-3 py-1.5 bg-green-500 hover:bg-green-400 disabled:bg-gray-600 text-white text-xs font-bold rounded-xl transition-colors flex-shrink-0"
            >
              {isUndoing ? '...' : 'Desfazer'}
            </button>
            <button
              type="button"
              onClick={() => { setShowUndoToast(false); setLastImportBatch([]); }}
              className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente principal que envolve AppContent com AuthProvider
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
