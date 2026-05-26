// =============================================================================
// Reports — módulo de Relatórios (Fase 1.6 do alya)
// =============================================================================
//
// Extraído de App.tsx > renderReports() (linhas ~6386-6823 antes da reorg).
// Comportamento 100% preservado — mesmas funções auxiliares e JSX. Mudou só
// que agora vive em componente isolado, com props explícitas em vez de
// closure sobre o state do AppContent.
// =============================================================================

import { useMemo } from 'react';
import {
  BarChart3,
  Download,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  AlertTriangle,
  Award,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  BarChart,
  Bar,
  Cell,
  LabelList,
} from 'recharts';
import { parseLocalDate } from '@/utils/dateUtils';

type Periodo = 'semana' | 'mes' | 'trimestre' | 'ano';

interface ReportsProps {
  transactions: any[];
  periodoRelatorio: Periodo;
  setPeriodoRelatorio: React.Dispatch<React.SetStateAction<Periodo>>;
  periodoOffset: number;
  setPeriodoOffset: React.Dispatch<React.SetStateAction<number>>;
  abrirModalSelecaoPeriodo: () => void;
}

// Helpers redeclarados localmente (são triviais — não vale passar como prop)
const isReceita = (type: string) => /receita/i.test(type || '');
const isDespesa = (type: string) => /despesa/i.test(type || '');

export default function Reports({
  transactions,
  periodoRelatorio,
  setPeriodoRelatorio,
  periodoOffset,
  setPeriodoOffset,
  abrirModalSelecaoPeriodo,
}: ReportsProps) {
  const agora = new Date();
  const off = periodoOffset;

  // ── Helpers para calcular início/fim de cada período com offset ──────────
  const calcRangeAtual = (tipo: Periodo, offset: number): [Date, Date] => {
    if (tipo === 'semana') {
      const ini = new Date(agora);
      ini.setDate(agora.getDate() - ((agora.getDay() + 6) % 7) + offset * 7);
      ini.setHours(0, 0, 0, 0);
      const fim = new Date(ini);
      fim.setDate(ini.getDate() + 6);
      fim.setHours(23, 59, 59, 999);
      return [ini, fim];
    }
    if (tipo === 'mes') {
      const ano = agora.getFullYear();
      const mesBase = agora.getMonth() + offset;
      const ini = new Date(ano, mesBase, 1);
      const fim = new Date(ano, mesBase + 1, 0, 23, 59, 59, 999);
      return [ini, fim];
    }
    if (tipo === 'trimestre') {
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

  const labelPeriodo = (tipo: Periodo, offset: number): string => {
    const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    if (tipo === 'semana') {
      const [ini, fim] = calcRangeAtual(tipo, offset);
      const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      return `${fmt(ini)} – ${fmt(fim)}/${fim.getFullYear()}`;
    }
    if (tipo === 'mes') {
      const mesBase = agora.getMonth() + offset;
      const ano = agora.getFullYear() + Math.floor(mesBase / 12);
      const mesNorm = ((mesBase % 12) + 12) % 12;
      return `${mesesNomes[mesNorm]} ${ano}`;
    }
    if (tipo === 'trimestre') {
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
  // Fase 1.9 — memoizado: o filtro sobre `transactions` é o gargalo principal
  // do componente. Recalcula apenas quando muda transactions, período ou
  // offset. Atenção: `calcRangeAtual` depende de `agora` (capturado por
  // closure no escopo do componente), portanto incluímos `agora` nas deps —
  // se a página fica aberta atravessando meia-noite o range será revalidado
  // no próximo render que disparar mudança em outra dep.
  const [iniAtual, fimAtual] = useMemo(() => calcRangeAtual(p, off), [p, off, agora]);
  const tsAtual = useMemo(() => filtrar(iniAtual, fimAtual), [transactions, iniAtual, fimAtual]);
  const tsAnt = useMemo(() => {
    const [ini, fim] = calcRangeAtual(p, off - 1);
    return filtrar(ini, fim);
  }, [transactions, p, off, agora]);

  const somarReceitas = (ts: any[]) => ts.filter((t) => isReceita(t.type)).reduce((s, t) => s + (Number(t.value) || 0), 0);
  const somarDespesas = (ts: any[]) => ts.filter((t) => isDespesa(t.type)).reduce((s, t) => s + (Number(t.value) || 0), 0);

  const calcPorCategoria = (ts: any[], tipo: 'receita' | 'despesa') => {
    const acc: { [k: string]: number } = {};
    ts.forEach((t) => {
      if (tipo === 'receita' ? isReceita(t.type) : isDespesa(t.type)) {
        const cat = t.category || 'Sem categoria';
        acc[cat] = (acc[cat] || 0) + (Number(t.value) || 0);
      }
    });
    const cores = tipo === 'receita'
      ? ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']
      : ['#ef4444', '#f97316', '#84cc16', '#f59e0b', '#8b5cf6'];
    return Object.entries(acc)
      .sort(([, a], [, b]) => b - a)
      .map(([nome, valor], i) => ({ nome, valor, cor: cores[i % cores.length] }));
  };

  const calcProdutos = (ts: any[]) => {
    const acc: { [k: string]: number } = {};
    ts.filter((t) => isReceita(t.type)).forEach((t) => {
      const nome = t.description || 'Sem descrição';
      acc[nome] = (acc[nome] || 0) + (Number(t.value) || 0);
    });
    const cores = ['#8b5cf6', '#ec4899', '#06b6d4', '#22c55e', '#3b82f6'];
    return Object.entries(acc)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([nome, valor], i) => ({ nome, valor, cor: cores[i % cores.length] }));
  };

  const calcTendencia = (ts: any[], periodo: Periodo) => {
    const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const grupos: { [k: string]: { rec: number; desp: number; ordem: number } } = {};
    ts.forEach((t) => {
      const d = parseLocalDate(t.date);
      let chave: string;
      let ordem: number;
      if (periodo === 'semana') {
        const diaSemana = (d.getDay() + 6) % 7; // 0=Seg ... 6=Dom
        chave = diasSemana[diaSemana];
        ordem = diaSemana;
      } else if (periodo === 'mes') {
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

  // Fase 1.9 — totais memoizados por bloco. Cada reduce roda sobre tsAtual/tsAnt
  // que já são estáveis quando os filtros não mudaram.
  const { recAtual, despAtual, lucroAtual } = useMemo(() => {
    const rec = somarReceitas(tsAtual);
    const desp = somarDespesas(tsAtual);
    return { recAtual: rec, despAtual: desp, lucroAtual: rec - desp };
  }, [tsAtual]);

  const { recAnt, despAnt, lucroAnt } = useMemo(() => {
    const rec = somarReceitas(tsAnt);
    const desp = somarDespesas(tsAnt);
    return { recAnt: rec, despAnt: desp, lucroAnt: rec - desp };
  }, [tsAnt]);

  const varRec = recAnt > 0 ? ((recAtual - recAnt) / recAnt) * 100 : 0;
  const varDesp = despAnt > 0 ? ((despAtual - despAnt) / despAnt) * 100 : 0;
  const varLucro = lucroAnt !== 0 ? ((lucroAtual - lucroAnt) / Math.abs(lucroAnt)) * 100 : 0;
  const margemAtual = recAtual > 0 ? (lucroAtual / recAtual) * 100 : 0;

  // Fase 1.9 — agregações memoizadas. catReceitas/catDespesas/produtos/tendencia
  // fazem forEach+Object.entries+sort+map sobre tsAtual; barato por iteração
  // mas dispara em todo render do AppContent (e tem muitos).
  const catReceitas = useMemo(() => calcPorCategoria(tsAtual, 'receita'), [tsAtual]);
  const catDespesas = useMemo(() => calcPorCategoria(tsAtual, 'despesa'), [tsAtual]);
  const produtos = useMemo(() => calcProdutos(tsAtual), [tsAtual]);
  const tendencia = useMemo(() => calcTendencia(tsAtual, p), [tsAtual, p]);

  const totalCatRec = catReceitas.reduce((s, i) => s + i.valor, 0);
  const totalCatDesp = catDespesas.reduce((s, i) => s + i.valor, 0);

  const periodoLabels: Record<string, string> = {
    semana: periodoOffset === 0 ? 'Esta Semana' : periodoOffset === -1 ? 'Semana Passada' : `Semana (${periodoOffset})`,
    mes: periodoOffset === 0 ? 'Este Mês' : periodoOffset === -1 ? 'Mês Passado' : labelPeriodo('mes', periodoOffset),
    trimestre: periodoOffset === 0 ? 'Este Trimestre' : periodoOffset === -1 ? 'Trimestre Passado' : labelPeriodo('trimestre', periodoOffset),
    ano: periodoOffset === 0 ? 'Este Ano' : periodoOffset === -1 ? 'Ano Passado' : String(new Date().getFullYear() + periodoOffset),
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
        const periodos = ['ano', 'trimestre', 'mes', 'semana'] as const;
        const labels: Record<string, string> = { semana: 'Semana', mes: 'Mês', trimestre: 'Trimestre', ano: 'Ano' };
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
                    periodoRelatorio === per ? 'text-white' : 'text-gray-500 hover:text-gray-800'
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
          { label: 'Receitas', valor: recAtual as number | null, margem: null as number | null, vari: varRec, temBase: recAnt > 0, invertido: false,
            gradFrom: 'from-emerald-500', gradTo: 'to-green-400', icon: <TrendingUp className="w-5 h-5" /> },
          { label: 'Despesas', valor: despAtual, margem: null, vari: varDesp, temBase: despAnt > 0, invertido: true,
            gradFrom: 'from-rose-500', gradTo: 'to-red-400', icon: <TrendingDown className="w-5 h-5" /> },
          { label: 'Lucro', valor: lucroAtual, margem: null, vari: varLucro, temBase: lucroAnt !== 0, invertido: false,
            gradFrom: lucroAtual >= 0 ? 'from-teal-500' : 'from-orange-500', gradTo: lucroAtual >= 0 ? 'to-emerald-400' : 'to-red-400', icon: lucroAtual >= 0 ? <Sparkles className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" /> },
          { label: 'Margem', valor: null, margem: margemAtual, vari: varMargem, temBase: recAnt > 0, invertido: false,
            gradFrom: margemAtual >= 0 ? 'from-violet-500' : 'from-orange-500', gradTo: margemAtual >= 0 ? 'to-purple-400' : 'to-red-400', icon: <BarChart3 className="w-5 h-5" /> },
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
                    ? `R$ ${card.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : `${card.margem!.toFixed(1)}%`}
                </p>
                <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-2">
                  {semTransacoes ? (
                    <span className="text-xs text-white/60 italic">sem dados no período</span>
                  ) : card.temBase ? (
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                      (card.invertido ? card.vari < 0 : card.vari >= 0)
                        ? 'bg-white/25 text-white'
                        : 'bg-black/20 text-white/90'
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
        const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
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
                    <YAxis tickFormatter={(v: any) => `R$${Number(v).toLocaleString('pt-BR')}`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => [`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']} />
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
                      const qtd = tsAtual.filter((t) => isReceita(t.type) && (t.category || 'Sem categoria') === item.nome).length;
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
                                R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                      <span className="text-sm font-bold text-green-600">R$ {totalCatRec.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
                      const qtd = tsAtual.filter((t) => isDespesa(t.type) && (t.category || 'Sem categoria') === item.nome).length;
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
                                R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                      <span className="text-sm font-bold text-red-600">R$ {totalCatDesp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
              <XAxis type="number" tickFormatter={(v: any) => `R$${Number(v).toLocaleString('pt-BR')}`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="nome" width={150} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => [`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']} />
              <Bar dataKey="valor" radius={[0, 6, 6, 0]} minPointSize={4}>
                {produtos.map((entry, i) => (
                  <Cell key={i} fill={entry.cor} />
                ))}
                <LabelList dataKey="valor" position="right" formatter={(v: any) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`} style={{ fontSize: 11, fill: '#374151' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
