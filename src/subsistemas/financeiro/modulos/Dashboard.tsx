// =============================================================================
// Dashboard — módulo de Dashboard (Fase 1.6.4 do alya)
// =============================================================================
//
// Extraído de App.tsx > renderDashboard() (linhas ~2172-3210 antes da reorg).
// Comportamento 100% preservado.
//
// Última (e mais pesada) das 5 extrações da Fase 1.6 — 1039 linhas. Os 4
// sub-renderers de gráfico (renderPieChart, renderBarChart, renderLineChart,
// renderPieChartCategorias) ficam INTERNOS ao componente Dashboard (não vão
// para fora), porque dependem de variáveis locais (lineChartData, isDark,
// pieChartDataCategorias, etc) que só fazem sentido dentro do Dashboard.
// =============================================================================

import { useMemo } from 'react';
import type React from 'react';
import { BarChart3, Plus, PieChart, ChevronLeft, ChevronRight, Target, TrendingUp, TrendingDown, Wallet, Zap, Clock, DollarSign, ArrowUpCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
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
} from 'recharts';
import PendingTransactionsBanner from '@/components/PendingTransactionsBanner';
import { parseLocalDate } from '@/utils/dateUtils';
import type { TabType } from '@/types/tabType';

const isReceita = (type: string) => /receita/i.test(type || '');
const isDespesa = (type: string) => /despesa/i.test(type || '');

interface DashboardProps {
  isDemoMode: boolean;
  isDark: boolean;
  selectedMonth: number;
  setSelectedMonth: React.Dispatch<React.SetStateAction<number>>;
  mesesMetas: Array<{ nome: string; indice: number; meta: number }>;
  transactions: any[];
  calculateTotalsForMonth: (monthIndex: number, year: number) => { receitas: number; despesas: number; resultado: number };
  // O AppContent retorna mais campos (faturamentoTotal/Varejo/Atacado/etc).
  // O Dashboard só usa despesasTotal — tipamos com index signature pra
  // aceitar o objeto inteiro sem precisar listar todos os campos aqui.
  getProjectionMetasForMonth: (monthIndex: number) => { despesasTotal: number; [key: string]: any };
  getProjectionMetasAnual: () => { despesasTotal: number; [key: string]: any };
  getMonthYearFromDate: (date: string) => { month: number; year: number };
  getYearFromDate: (date: string) => number;
  setActiveTab: React.Dispatch<React.SetStateAction<TabType>>;
  setIsTransactionModalOpen: (v: boolean) => void;
  formatDateToDisplay: (date: string) => string;
  expandedCharts: string[];
  toggleChart: (chartId: string) => void;
}

export default function Dashboard({
  isDemoMode,
  isDark,
  selectedMonth,
  setSelectedMonth,
  mesesMetas,
  transactions,
  calculateTotalsForMonth,
  getProjectionMetasForMonth,
  getProjectionMetasAnual,
  getMonthYearFromDate,
  getYearFromDate,
  setActiveTab,
  setIsTransactionModalOpen,
  formatDateToDisplay,
  expandedCharts,
  toggleChart,
}: DashboardProps) {
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

    // Fase 1.9 — memoizado: filter+reduce sobre `transactions` inteiro só
    // refaz quando o array muda ou o trimestre selecionado muda.
    const transacoesTrimestre = useMemo(() => transactions.filter((t) => {
      if (!t.date) return false;
      const { month, year } = getMonthYearFromDate(t.date);
      return mesesDoTrimestre.includes(month) && year === currentYear;
    }), [transactions, mesesDoTrimestre.join(','), currentYear, getMonthYearFromDate]);

    // Dados trimestrais (usando dados reais das transações)
    const { totalReceitasTrimestre, totalDespesasTrimestre } = useMemo(() => ({
      totalReceitasTrimestre: transacoesTrimestre
        .filter((t) => isReceita(t.type) && !t.isHidden)
        .reduce((sum, t) => sum + (Number(t.value) || 0), 0),
      totalDespesasTrimestre: transacoesTrimestre
        .filter((t) => isDespesa(t.type) && !t.isHidden)
        .reduce((sum, t) => sum + (Number(t.value) || 0), 0),
    }), [transacoesTrimestre]);
    const lucroLiquidoTrimestre =
      totalReceitasTrimestre - totalDespesasTrimestre;

    // Meta do trimestre (soma das metas dos 3 meses)
    const metaTrimestre = mesesDoTrimestre.reduce(
      (total, mesIndex) => total + (mesesMetas[mesIndex]?.meta || 0),
      0,
    );

    // Fase 1.9 — memoizado: re-filtra transactions só quando array/ano mudam.
    const transacoesAno = useMemo(() => transactions.filter((t) => {
      if (!t.date) return false;
      return getYearFromDate(t.date) === currentYear;
    }), [transactions, currentYear, getYearFromDate]);

    // Dados anuais (usando dados reais das transações)
    const { totalReceitasAno, totalDespesasAno } = useMemo(() => ({
      totalReceitasAno: transacoesAno
        .filter((t) => isReceita(t.type) && !t.isHidden)
        .reduce((sum, t) => sum + (Number(t.value) || 0), 0),
      totalDespesasAno: transacoesAno
        .filter((t) => isDespesa(t.type) && !t.isHidden)
        .reduce((sum, t) => sum + (Number(t.value) || 0), 0),
    }), [transacoesAno]);
    const lucroLiquidoAno = totalReceitasAno - totalDespesasAno;

    // Transações recentes (últimas 5). Fase 1.9 — memoizado: evita re-sort
    // do array inteiro de transactions em cada render. Importante: clonar
    // antes de sort, porque .sort() muta o array (efeito colateral nojento
    // no array recebido por prop).
    const transacoesRecentes = useMemo(() => [...transactions]
      .sort(
        (a, b) =>
          parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime(),
      )
      .slice(0, 5), [transactions]);

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
    // Fase 1.9 — memoizado: o map dispara 12 chamadas a calculateTotalsForMonth,
    // cada uma rodando filter+reduce no array inteiro de transactions. Era um
    // dos pontos mais caros do dashboard.
    const mesesNomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const lineChartData = useMemo(() => mesesNomes.map((nome, idx) => {
      const { receitas: rec, despesas: desp, resultado: saldo } = calculateTotalsForMonth(idx, currentYear);
      return { mes: nome, Receitas: rec, Despesas: desp, Saldo: saldo };
    }), [calculateTotalsForMonth, currentYear]);

    // Dados para PieChart de categorias de despesas do mês selecionado.
    // Fase 1.9 — memoizado em bloco: filtra + agrupa + ordena só quando muda
    // transactions ou o mês selecionado.
    const CORES_CATEGORIAS = ["#ef4444","#f97316","#f59e0b","#8b5cf6","#06b6d4","#ec4899","#10b981","#3b82f6","#84cc16","#6366f1"];
    const pieChartDataCategorias = useMemo(() => {
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
      return Object.entries(categoriasDespesas)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value], i) => ({ name, value, color: CORES_CATEGORIAS[i % CORES_CATEGORIAS.length] }));
    }, [transactions, selectedMonth, currentYear, getMonthYearFromDate]);

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
        <PendingTransactionsBanner />
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
}
