// =============================================================================
// Metas — módulo de Metas (Fase 1.6.3 do alya)
// =============================================================================
//
// Extraído de App.tsx > renderMetas() (linhas ~5645-5758 antes da reorg).
// Comportamento 100% preservado.
//
// As funções renderMonthContent / renderMonth / renderTotalAno (sub-
// renderers) continuam no AppContent porque usam dezenas de state/handlers
// internos. Aqui elas são passadas como props.
// =============================================================================

import type React from 'react';
import { Target, Download, Plus, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface MesMeta { nome: string; indice: number; meta: number }

interface MetasProps {
  mesesMetas: MesMeta[];
  selectedMonth: number;
  setSelectedMonth: React.Dispatch<React.SetStateAction<number>>;
  projectionSnapshot: any;
  isGeneratingPDF: boolean;
  exportarMetasPDF: () => void | Promise<void>;
  renderMonthContent: (nome: string, indice: number, meta: number) => React.ReactNode;
  renderMonth: (nome: string, indice: number, meta: number) => React.ReactNode;
  renderTotalAno: () => React.ReactNode;
}

export default function Metas({
  mesesMetas,
  selectedMonth,
  setSelectedMonth,
  projectionSnapshot,
  isGeneratingPDF,
  exportarMetasPDF,
  renderMonthContent,
  renderMonth,
  renderTotalAno,
}: MetasProps) {
  const mesSelecionado = mesesMetas.find((mes) => mes.indice === selectedMonth);

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
            onClick={() => alert('Ferramenta em construção')}
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
                As metas de faturamento deste módulo são derivadas do{' '}
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
}
